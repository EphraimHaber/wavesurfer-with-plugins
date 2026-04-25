import WaveSurfer from 'wavesurfer.js'
import type { BasePluginEvents } from 'wavesurfer.js/dist/base-plugin.js'

const ALIGNABLE_ANNOTATION = 'ALIGNABLE_ANNOTATION'
const REF_ANNOTATION = 'REF_ANNOTATION'

export type ElanAnnotation = {
  type: string
  id: string
  ref: string | null
  value: string
  start?: number
  end?: number
  reference?: ElanAnnotation
  /** ELAN `TIME_SLOT_REF1` / `TIME_SLOT_REF2` for alignable annotations (for XML sync) */
  timeSlotRef1?: string | null
  timeSlotRef2?: string | null
}

export type ElanTier = {
  id: string
  linguisticTypeRef: string | null
  defaultLocale: string | null
  annotations: ElanAnnotation[]
}

/** Parsed ELAN document (same shape as the legacy v6 plugin). */
export type ElanParsedData = {
  media: { url: string; type: string }
  timeOrder: Record<string, number>
  tiers: ElanTier[]
  annotations: Record<string, ElanAnnotation>
  alignableAnnotations: ElanAnnotation[]
  length: number
}

/** One transcript cell in the alignable-row × tier-column grid (for client rendering). */
export type ElanTableCell = {
  tierId: string
  tierIndex: number
  /** Alignable row id (time row anchor). */
  alignableId: string
  start: number
  end: number
  /** Annotation shown in this cell, if any. */
  annotationId: string | null
  value: string
}

export type ElanTableColumn = {
  tierId: string
  tierIndex: number
  /** Optional CSS width when `tiers` option maps tier id → width. */
  width?: string
}

export type ElanTableRow = {
  alignableId: string
  start: number
  end: number
  cells: ElanTableCell[]
}

/** Serializable snapshot for rendering a time + tier transcription table. */
export type ElanTableViewModel = {
  columns: ElanTableColumn[]
  rows: ElanTableRow[]
}

export type ElanPluginCallbacks = {
  /** Parsed data and XML are ready. */
  onReady?: (data: ElanParsedData) => void
  /** Emitted whenever the table snapshot should be re-rendered (load, tier filter, edit, time sync). */
  onTableViewChange?: (model: ElanTableViewModel) => void
  /** User or host requested seeking to an alignable interval (plugin does not call WaveSurfer). */
  onTimeRangeSelect?: (start: number, end: number) => void
  /** Underlying EAF / in-memory model changed (export with `getEafXml()`). */
  onEafUpdated?: () => void
}

export type ElanPluginOptions = {
  /** ELAN `.eaf` URL (omit if using `deferInit` and calling `load()` later) */
  url?: string
  /** When true, `onInit` does not fetch; call `load(url)` yourself */
  deferInit?: boolean
  /** If set, only tiers whose `TIER_ID` is a key are shown; values can be column widths (CSS) */
  tiers?: Record<string, string>
  /** Host-driven rendering and side effects (optional; events are emitted in parallel). */
  callbacks?: ElanPluginCallbacks
}

export type ElanPluginEvents = BasePluginEvents & {
  ready: [ElanParsedData]
  select: [start: number, end: number]
  /** Latest table snapshot for headless UIs. */
  tableViewChange: [ElanTableViewModel]
  /** Fired after in-memory EAF/XML was changed (e.g. use `getEafXml()` to download) */
  eafUpdated: []
}

/** Walk `reference` until reaching the underlying ALIGNABLE_ANNOTATION (or null). */
export function resolveAlignable(
  annot: ElanAnnotation | undefined | null,
): ElanAnnotation | null {
  let cur: ElanAnnotation | undefined | null = annot
  const seen = new Set<string>()
  while (cur && cur.type !== ALIGNABLE_ANNOTATION) {
    if (seen.has(cur.id)) return null
    seen.add(cur.id)
    cur = cur.reference
  }
  return cur ?? null
}

/**
 * Build the same row/column grid the legacy in-plugin table used, from parsed data.
 * Safe to call from React render; does not read plugin state.
 */
export function buildElanTableViewModel(
  data: ElanParsedData,
  tiersFilter?: Record<string, string>,
): ElanTableViewModel {
  let tiers = data.tiers
  if (tiersFilter) {
    tiers = tiers.filter((tier) => tier.id in tiersFilter)
  }

  const backRefs: Record<string, Record<number, ElanAnnotation>> = {}
  const columnTierIndices: Record<string, boolean> = {}

  tiers.forEach((tier, index) => {
    if (tier.annotations.some((a) => a.type === ALIGNABLE_ANNOTATION)) {
      columnTierIndices[String(index)] = true
    }
  })

  tiers.forEach((tier, index) => {
    tier.annotations.forEach((annot) => {
      if (
        annot.reference &&
        annot.reference.type === ALIGNABLE_ANNOTATION &&
        annot.ref
      ) {
        if (!(annot.reference.id in backRefs)) {
          backRefs[annot.ref] = {}
        }
        backRefs[annot.ref][index] = annot
        columnTierIndices[String(index)] = true
      }
    })
  })

  const indeces = Object.keys(columnTierIndices).sort((a, b) => Number(a) - Number(b))

  const columns: ElanTableColumn[] = indeces.map((indexStr) => {
    const index = Number(indexStr)
    const tier = tiers[index]
    const width = tiersFilter?.[tier.id]
    return { tierId: tier.id, tierIndex: index, width: width || undefined }
  })

  const visibleTierId = new Set(tiers.map((t) => t.id))
  const allTiers = data.tiers
  const renderedAlignable = data.alignableAnnotations.filter((alignable) => {
    const parentTier = allTiers.find((t) =>
      t.annotations.some((ann) => ann.id === alignable.id && ann.type === ALIGNABLE_ANNOTATION),
    )
    return parentTier && visibleTierId.has(parentTier.id)
  })

  const rows: ElanTableRow[] = renderedAlignable.map((alignable) => {
    const backRef = backRefs[alignable.id] ?? {}
    const start = alignable.start ?? 0
    const end = alignable.end ?? 0

    const cells: ElanTableCell[] = indeces.map((indexStr) => {
      const index = Number(indexStr)
      const tier = tiers[index]
      const alignableInTier = tier.annotations.find(
        (a) => a.id === alignable.id && a.type === ALIGNABLE_ANNOTATION,
      )
      const refAnnotation = backRef[index]
      const cellAnnot = alignableInTier ?? refAnnotation
      return {
        tierId: tier.id,
        tierIndex: index,
        alignableId: alignable.id,
        start,
        end,
        annotationId: cellAnnot?.id ?? null,
        value: cellAnnot?.value ?? '',
      }
    })

    return { alignableId: alignable.id, start, end, cells }
  })

  return { columns, rows }
}

export default class ElanPlugin extends WaveSurfer.BasePlugin<ElanPluginEvents, ElanPluginOptions> {
  private data: ElanParsedData | null = null
  /** Live DOM for the loaded `.eaf`; mutated when alignable times or text change */
  private xmlDoc: Document | null = null
  private inMilliseconds = false

  static readonly annotationTypes = {
    ALIGNABLE_ANNOTATION,
    REF_ANNOTATION,
  } as const

  static create(options: ElanPluginOptions): ElanPlugin {
    return new ElanPlugin(options)
  }

  override onInit(): void {
    if (this.options.url && !this.options.deferInit) {
      this.load(this.options.url)
    }
  }

  override destroy(): void {
    this.xmlDoc = null
    super.destroy()
  }

  load(url: string): void {
    void this.loadXML(url).then((xml) => {
      if (!xml) return
      const parseError = xml.querySelector('parsererror')
      if (parseError) {
        console.error('ELAN XML parse error', parseError.textContent)
        return
      }
      this.xmlDoc = xml
      const header = xml.querySelector('HEADER')
      this.inMilliseconds = header?.getAttribute('TIME_UNITS') === 'milliseconds'
      this.data = this.parseElan(xml)
      this.emit('ready', this.data)
      this.options.callbacks?.onReady?.(this.data)
      this.refreshTableView()
    })
  }

  private async loadXML(url: string): Promise<Document | null> {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const text = await res.text()
      return new DOMParser().parseFromString(text, 'application/xml')
    } catch (e) {
      console.error('ELAN fetch failed', e)
      return null
    }
  }

  parseElan(xml: Document): ElanParsedData {
    const data: ElanParsedData = {
      media: { url: '', type: '' },
      timeOrder: {},
      tiers: [],
      annotations: {},
      alignableAnnotations: [],
      length: 0,
    }

    const header = xml.querySelector('HEADER')
    if (!header) return data

    const inMilliseconds = header.getAttribute('TIME_UNITS') === 'milliseconds'
    const media = header.querySelector('MEDIA_DESCRIPTOR')
    if (media) {
      data.media.url = media.getAttribute('MEDIA_URL') ?? ''
      data.media.type = media.getAttribute('MIME_TYPE') ?? ''
    }

    const timeOrder: Record<string, number> = {}
    xml.querySelectorAll('TIME_ORDER TIME_SLOT').forEach((slot) => {
      let value = parseFloat(slot.getAttribute('TIME_VALUE') ?? '0')
      if (inMilliseconds) {
        value = Math.round(value * 1e2) / 1e5
      }
      const id = slot.getAttribute('TIME_SLOT_ID')
      if (id) timeOrder[id] = value
    })
    data.timeOrder = timeOrder

    data.tiers = Array.from(xml.querySelectorAll('TIER')).map((tier) => ({
      id: tier.getAttribute('TIER_ID') ?? '',
      linguisticTypeRef: tier.getAttribute('LINGUISTIC_TYPE_REF'),
      defaultLocale: tier.getAttribute('DEFAULT_LOCALE'),
      annotations: Array.from(
        tier.querySelectorAll('REF_ANNOTATION, ALIGNABLE_ANNOTATION'),
      ).map((node) => {
        const valueEl = node.querySelector('ANNOTATION_VALUE')
        const annot: ElanAnnotation = {
          type: node.nodeName,
          id: node.getAttribute('ANNOTATION_ID') ?? '',
          ref: node.getAttribute('ANNOTATION_REF'),
          value: (valueEl?.textContent ?? '').trim(),
        }

        if (annot.type === ALIGNABLE_ANNOTATION) {
          const ts1 = node.getAttribute('TIME_SLOT_REF1')
          const ts2 = node.getAttribute('TIME_SLOT_REF2')
          annot.timeSlotRef1 = ts1
          annot.timeSlotRef2 = ts2
          annot.start = ts1 ? timeOrder[ts1] : undefined
          annot.end = ts2 ? timeOrder[ts2] : undefined
          data.alignableAnnotations.push(annot)
        }

        data.annotations[annot.id] = annot
        return annot
      }),
    }))

    data.tiers.forEach((tier) => {
      tier.annotations.forEach((annot) => {
        if (annot.ref != null) {
          annot.reference = data.annotations[annot.ref]
        }
      })
    })

    data.alignableAnnotations.sort((a, b) => {
      const as = a.start ?? 0
      const bs = b.start ?? 0
      let d = as - bs
      if (d === 0) {
        const ae = a.end ?? 0
        const be = b.end ?? 0
        d = be - ae
      }
      return d
    })

    data.length = data.alignableAnnotations.length
    return data
  }

  /** Current parsed document, or null before `ready`. */
  getData(): ElanParsedData | null {
    return this.data
  }

  /** Table snapshot for the current data and `tiers` filter. */
  getTableViewModel(): ElanTableViewModel | null {
    if (!this.data) return null
    return buildElanTableViewModel(this.data, this.options.tiers)
  }

  private refreshTableView(): void {
    const model = this.getTableViewModel()
    if (!model) return
    this.emit('tableViewChange', model)
    this.options.callbacks?.onTableViewChange?.(model)
  }

  /**
   * Transcript text for any annotation id present in the loaded EAF (alignable or ref).
   */
  getAnnotationText(annotationId: string): string | null {
    const annot = this.data?.annotations[annotationId]
    return annot ? annot.value : null
  }

  /**
   * Set transcript text in XML and the parsed model for the given `ANNOTATION_ID`.
   */
  setAnnotationText(annotationId: string, text: string): boolean {
    return this.updateAnnotationText(annotationId, text)
  }

  /**
   * Same as `setAnnotationText`; name mirrors common CRUD wording.
   */
  updateAnnotationText(annotationId: string, text: string): boolean {
    if (!this.data || !this.xmlDoc) return false
    const annot = this.data.annotations[annotationId]
    if (!annot) return false

    const valueEl = this.xmlDoc.querySelector(
      `${annot.type}[ANNOTATION_ID="${annotationId}"] ANNOTATION_VALUE`,
    )
    if (!valueEl) return false

    const trimmed = text.trim()
    valueEl.textContent = trimmed
    annot.value = trimmed

    this.refreshTableView()
    this.emitEafUpdated()
    return true
  }

  private emitEafUpdated(): void {
    this.emit('eafUpdated')
    this.options.callbacks?.onEafUpdated?.()
  }

  private emitTimeRangeSelect(start: number, end: number): void {
    this.emit('select', start, end)
    this.options.callbacks?.onTimeRangeSelect?.(start, end)
  }

  /**
   * Host should call this when the user picks an alignable row/cell (seeks WaveSurfer in the demo).
   */
  notifyAlignableSelected(alignableId: string): boolean {
    const annot = this.data?.annotations[alignableId]
    if (!annot || annot.type !== ALIGNABLE_ANNOTATION) return false
    if (annot.start == null || annot.end == null) return false
    this.emitTimeRangeSelect(annot.start, annot.end)
    return true
  }

  /**
   * Serialize the current EAF (including edits). Returns `null` if nothing loaded.
   */
  getEafXml(): string | null {
    if (!this.xmlDoc) return null
    return new XMLSerializer().serializeToString(this.xmlDoc)
  }

  /**
   * Update alignable interval from a regions plugin `region` (use `region.id === ANNOTATION_ID`).
   * Mutates `TIME_SLOT` values in the loaded document and notifies table listeners.
   */
  syncAlignableTimes(regionId: string, startSec: number, endSec: number): boolean {
    if (!this.data || !this.xmlDoc) return false
    const annot = this.data.annotations[regionId]
    if (
      !annot ||
      annot.type !== ALIGNABLE_ANNOTATION ||
      !annot.timeSlotRef1 ||
      !annot.timeSlotRef2
    ) {
      return false
    }

    let start = Math.max(0, startSec)
    let end = Math.max(start, endSec)
    const dur = this.wavesurfer?.getDuration()
    if (dur != null && Number.isFinite(dur) && dur > 0) {
      end = Math.min(end, dur)
      start = Math.min(start, end)
    }

    this.writeTimeSlotSeconds(annot.timeSlotRef1, start)
    this.writeTimeSlotSeconds(annot.timeSlotRef2, end)

    this.data.timeOrder[annot.timeSlotRef1] = start
    this.data.timeOrder[annot.timeSlotRef2] = end
    annot.start = start
    annot.end = end

    this.sortAlignableAnnotationsInPlace()
    this.refreshTableView()
    this.emitEafUpdated()
    return true
  }

  /**
   * Update alignable transcript text from edited region content.
   */
  syncAlignableText(regionId: string, text: string): boolean {
    const annot = this.data?.annotations[regionId]
    if (!annot || annot.type !== ALIGNABLE_ANNOTATION) return false
    return this.updateAnnotationText(regionId, text)
  }

  private writeTimeSlotSeconds(slotId: string, seconds: number): void {
    if (!this.xmlDoc) return
    const slot = this.xmlDoc.querySelector(`TIME_SLOT[TIME_SLOT_ID="${slotId}"]`)
    if (!slot) return
    const raw = this.inMilliseconds
      ? String(Math.round(seconds * 1000))
      : String(seconds)
    slot.setAttribute('TIME_VALUE', raw)
  }

  private sortAlignableAnnotationsInPlace(): void {
    if (!this.data) return
    this.data.alignableAnnotations.sort((a, b) => {
      const as = a.start ?? 0
      const bs = b.start ?? 0
      let d = as - bs
      if (d === 0) {
        const ae = a.end ?? 0
        const be = b.end ?? 0
        d = be - ae
      }
      return d
    })
    this.data.length = this.data.alignableAnnotations.length
  }

  /**
   * Create a new ALIGNABLE_ANNOTATION on `tierId` spanning [startSec, endSec].
   * Allocates two new TIME_SLOTs and inserts the annotation into the EAF.
   * Returns the new ANNOTATION_ID, or null if the host isn't ready.
   */
  createAlignableAnnotation(
    tierId: string,
    startSec: number,
    endSec: number,
    value = '',
  ): string | null {
    if (!this.data || !this.xmlDoc) return null
    const tier = this.data.tiers.find((t) => t.id === tierId)
    if (!tier) return null
    const tierEl = this.xmlDoc.querySelector(`TIER[TIER_ID="${tierId}"]`)
    const timeOrderEl = this.xmlDoc.querySelector('TIME_ORDER')
    if (!tierEl || !timeOrderEl) return null

    let start = Math.max(0, startSec)
    let end = Math.max(start, endSec)
    const dur = this.wavesurfer?.getDuration()
    if (dur != null && Number.isFinite(dur) && dur > 0) {
      end = Math.min(end, dur)
      start = Math.min(start, end)
    }

    const ts1 = this.nextTimeSlotId(0)
    const ts2 = this.nextTimeSlotId(1)
    const annId = this.nextAnnotationId()

    const slot1 = this.xmlDoc.createElement('TIME_SLOT')
    slot1.setAttribute('TIME_SLOT_ID', ts1)
    slot1.setAttribute('TIME_VALUE', this.formatTimeValue(start))
    const slot2 = this.xmlDoc.createElement('TIME_SLOT')
    slot2.setAttribute('TIME_SLOT_ID', ts2)
    slot2.setAttribute('TIME_VALUE', this.formatTimeValue(end))
    timeOrderEl.appendChild(slot1)
    timeOrderEl.appendChild(slot2)

    const wrapper = this.xmlDoc.createElement('ANNOTATION')
    const alignableEl = this.xmlDoc.createElement('ALIGNABLE_ANNOTATION')
    alignableEl.setAttribute('ANNOTATION_ID', annId)
    alignableEl.setAttribute('TIME_SLOT_REF1', ts1)
    alignableEl.setAttribute('TIME_SLOT_REF2', ts2)
    const valueEl = this.xmlDoc.createElement('ANNOTATION_VALUE')
    valueEl.textContent = value
    alignableEl.appendChild(valueEl)
    wrapper.appendChild(alignableEl)
    tierEl.appendChild(wrapper)

    const annot: ElanAnnotation = {
      type: ALIGNABLE_ANNOTATION,
      id: annId,
      ref: null,
      value,
      start,
      end,
      timeSlotRef1: ts1,
      timeSlotRef2: ts2,
    }
    this.data.timeOrder[ts1] = start
    this.data.timeOrder[ts2] = end
    this.data.annotations[annId] = annot
    this.data.alignableAnnotations.push(annot)
    tier.annotations.push(annot)

    this.sortAlignableAnnotationsInPlace()
    this.refreshTableView()
    this.emitEafUpdated()
    return annId
  }

  /**
   * Create a new REF_ANNOTATION on `tierId` whose ANNOTATION_REF is `refAnnotationId`.
   * Returns the new ANNOTATION_ID, or null if inputs are invalid.
   */
  createRefAnnotation(
    tierId: string,
    refAnnotationId: string,
    value = '',
  ): string | null {
    if (!this.data || !this.xmlDoc) return null
    const tier = this.data.tiers.find((t) => t.id === tierId)
    const refAnnot = this.data.annotations[refAnnotationId]
    if (!tier || !refAnnot) return null
    const tierEl = this.xmlDoc.querySelector(`TIER[TIER_ID="${tierId}"]`)
    if (!tierEl) return null

    const annId = this.nextAnnotationId()
    const wrapper = this.xmlDoc.createElement('ANNOTATION')
    const refEl = this.xmlDoc.createElement('REF_ANNOTATION')
    refEl.setAttribute('ANNOTATION_ID', annId)
    refEl.setAttribute('ANNOTATION_REF', refAnnotationId)
    const valueEl = this.xmlDoc.createElement('ANNOTATION_VALUE')
    valueEl.textContent = value
    refEl.appendChild(valueEl)
    wrapper.appendChild(refEl)
    tierEl.appendChild(wrapper)

    const annot: ElanAnnotation = {
      type: REF_ANNOTATION,
      id: annId,
      ref: refAnnotationId,
      value,
      reference: refAnnot,
    }
    this.data.annotations[annId] = annot
    tier.annotations.push(annot)

    this.refreshTableView()
    this.emitEafUpdated()
    return annId
  }

  /**
   * Remove an annotation. Cascades: deleting an alignable also deletes any
   * REF_ANNOTATIONs that point to it (transitively), and prunes orphaned
   * TIME_SLOTs from the EAF.
   */
  deleteAnnotation(annotationId: string): boolean {
    if (!this.data || !this.xmlDoc) return false
    const annot = this.data.annotations[annotationId]
    if (!annot) return false

    if (annot.type === ALIGNABLE_ANNOTATION) {
      const dependents = Object.values(this.data.annotations)
        .filter((a) => a.ref === annotationId)
        .map((a) => a.id)
      for (const id of dependents) this.deleteAnnotation(id)
    }

    const xmlEl = this.xmlDoc.querySelector(
      `${annot.type}[ANNOTATION_ID="${annotationId}"]`,
    )
    const annotationWrapper = xmlEl?.parentElement
    annotationWrapper?.parentElement?.removeChild(annotationWrapper)

    if (annot.type === ALIGNABLE_ANNOTATION) {
      for (const ts of [annot.timeSlotRef1, annot.timeSlotRef2]) {
        if (!ts) continue
        const stillUsed = Object.values(this.data.annotations).some(
          (a) =>
            a.id !== annotationId &&
            (a.timeSlotRef1 === ts || a.timeSlotRef2 === ts),
        )
        if (!stillUsed) {
          const slot = this.xmlDoc.querySelector(
            `TIME_SLOT[TIME_SLOT_ID="${ts}"]`,
          )
          slot?.parentElement?.removeChild(slot)
          delete this.data.timeOrder[ts]
        }
      }
      const idx = this.data.alignableAnnotations.findIndex(
        (a) => a.id === annotationId,
      )
      if (idx >= 0) this.data.alignableAnnotations.splice(idx, 1)
      this.data.length = this.data.alignableAnnotations.length
    }

    for (const tier of this.data.tiers) {
      const idx = tier.annotations.findIndex((a) => a.id === annotationId)
      if (idx >= 0) tier.annotations.splice(idx, 1)
    }

    delete this.data.annotations[annotationId]

    this.refreshTableView()
    this.emitEafUpdated()
    return true
  }

  private formatTimeValue(seconds: number): string {
    return this.inMilliseconds
      ? String(Math.round(seconds * 1000))
      : String(seconds)
  }

  private nextAnnotationId(): string {
    if (!this.data) return 'a1'
    let max = 0
    for (const id of Object.keys(this.data.annotations)) {
      const m = id.match(/^a(\d+)$/i)
      if (m) max = Math.max(max, parseInt(m[1], 10))
    }
    return `a${max + 1}`
  }

  /** `offset` lets a single call site reserve two consecutive ids. */
  private nextTimeSlotId(offset = 0): string {
    let max = 0
    if (this.data) {
      for (const id of Object.keys(this.data.timeOrder)) {
        const m = id.match(/^ts(\d+)$/i)
        if (m) max = Math.max(max, parseInt(m[1], 10))
      }
    }
    if (this.xmlDoc) {
      this.xmlDoc.querySelectorAll('TIME_SLOT').forEach((el) => {
        const id = el.getAttribute('TIME_SLOT_ID') ?? ''
        const m = id.match(/^ts(\d+)$/i)
        if (m) max = Math.max(max, parseInt(m[1], 10))
      })
    }
    return `ts${max + 1 + offset}`
  }

  /** First visible alignable whose interval contains `time` (respects `tiers` filter). */
  getAnnotationAtTime(time: number): ElanAnnotation | undefined {
    const model = this.getTableViewModel()
    if (!model) return undefined
    for (const row of model.rows) {
      const s = row.start
      const en = row.end
      if (s <= time && en >= time) {
        return this.data?.annotations[row.alignableId]
      }
    }
    return undefined
  }

  /** @deprecated Use {@link getAnnotationAtTime} */
  getRenderedAnnotation(time: number): ElanAnnotation | undefined {
    return this.getAnnotationAtTime(time)
  }
}
