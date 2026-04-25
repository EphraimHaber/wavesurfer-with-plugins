import { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import ZoomPlugin from "wavesurfer.js/dist/plugins/zoom.esm.js";
import ElanPlugin, {
  type ElanParsedData,
  type ElanTableViewModel,
} from "../../plugins/elan";
import {
  AUDIO_URL,
  ELAN_URL,
  WAVE_COLOR,
  WAVE_CURSOR,
  WAVE_CURSOR_WIDTH,
  WAVE_PROGRESS,
} from "../../lib/constants";
import { colorForIndex } from "../../lib/format";

export interface ElanWorkspace {
  waveformRef: React.RefObject<HTMLDivElement | null>;
  wsRef: React.RefObject<WaveSurfer | null>;
  elanData: ElanParsedData | null;
  elanTable: ElanTableViewModel | null;
  duration: number;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  setLoopEnabled: (enabled: boolean) => void;
  zoom: number;
  setZoom: (minPxPerSec: number) => void;
  zoomMin: number;
  zoomMax: number;
  createAlignableAtPlayhead: () => void;
  createRefAnnotation: (tierId: string, parentAlignableId: string) => void;
  deleteAnnotation: (id: string) => void;
  editValue: (id: string, value: string) => void;
  selectBlock: (id: string, start: number) => void;
  syncTiming: (alignableId: string, start: number, end: number) => void;
  getEafXml: () => string | null;
}

export function useElanWorkspace(): ElanWorkspace {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const elanPluginRef = useRef<InstanceType<typeof ElanPlugin> | null>(null);
  const regionsPluginRef = useRef<InstanceType<typeof RegionsPlugin> | null>(
    null,
  );
  const eafIdsRef = useRef<Set<string>>(new Set());
  const createTierRef = useRef<string>("");
  const loopEnabledRef = useRef(true);

  const ZOOM_MIN = 50;
  const ZOOM_MAX = 600;

  const [elanTable, setElanTable] = useState<ElanTableViewModel | null>(null);
  const [elanData, setElanData] = useState<ElanParsedData | null>(null);
  const [duration, setDuration] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoomState] = useState(ZOOM_MIN);

  const colorForAlignableOrder = useCallback(
    (annotationId: string, fallbackIndex = 0) => {
      const idx =
        elanPluginRef.current
          ?.getData()
          ?.alignableAnnotations.findIndex((ann) => ann.id === annotationId) ??
        -1;
      return colorForIndex(idx >= 0 ? idx : fallbackIndex);
    },
    [],
  );

  useEffect(() => {
    if (!waveformRef.current) return;

    const elan = ElanPlugin.create({ url: ELAN_URL });
    const regions = RegionsPlugin.create();
    const zoomPlugin = ZoomPlugin.create({ scale: 0.5, maxZoom: ZOOM_MAX });
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      url: AUDIO_URL,
      waveColor: WAVE_COLOR,
      progressColor: WAVE_PROGRESS,
      cursorColor: WAVE_CURSOR,
      cursorWidth: WAVE_CURSOR_WIDTH,
      minPxPerSec: ZOOM_MIN,
      plugins: [regions, elan, zoomPlugin],
    });
    wsRef.current = ws;
    elanPluginRef.current = elan;
    regionsPluginRef.current = regions;

    let activeRegion: ReturnType<typeof regions.addRegion> | null = null;
    let audioReady = false;
    let parsedElan: ElanParsedData | null = null;
    let elanRegionsApplied = false;
    const eafIds = eafIdsRef.current;

    const applyElanRegions = () => {
      if (elanRegionsApplied || !audioReady || !parsedElan) return;
      regions.clearRegions();
      eafIds.clear();
      parsedElan.alignableAnnotations.forEach((ann, i) => {
        if (ann.start == null) return;
        const end = ann.end ?? ann.start;
        const isMarker = end <= ann.start;
        eafIds.add(ann.id);
        regions.addRegion({
          id: ann.id,
          start: ann.start,
          ...(isMarker ? {} : { end }),
          content: ann.id,
          color: colorForAlignableOrder(ann.id, i),
          drag: true,
          resize: !isMarker,
          contentEditable: false,
        });
      });
      regions.enableDragSelection({ color: "rgba(178, 90, 31, 0.18)" });
      elanRegionsApplied = true;
    };

    ws.once("ready", () => {
      audioReady = true;
      setDuration(ws.getDuration());
      applyElanRegions();
    });

    elan.once("ready", (data) => {
      parsedElan = data;
      setElanData(data);
      createTierRef.current = data.tiers[0]?.id ?? "";
      applyElanRegions();
    });

    const unsubRegionCreated = regions.on("region-created", (region) => {
      if (eafIds.has(region.id)) return;
      const tierId = createTierRef.current;
      const start = region.start;
      const end = region.end ?? start;
      if (!tierId || !elanPluginRef.current) {
        region.remove();
        return;
      }
      const newId = elanPluginRef.current.createAlignableAnnotation(
        tierId,
        start,
        end,
        "",
      );
      if (!newId) {
        region.remove();
        return;
      }
      region.remove();
      eafIds.add(newId);
      regions.addRegion({
        id: newId,
        start,
        end,
        content: newId,
        color: colorForAlignableOrder(newId, eafIds.size),
        drag: true,
        resize: true,
        contentEditable: false,
      });
      setSelectedId(newId);
    });

    const unsubRegionClick = regions.on("region-clicked", (region, event) => {
      event.stopPropagation();
      activeRegion = region;
      setSelectedId(region.id);
      region.play(true);
    });
    const unsubRegionOut = regions.on("region-out", (region) => {
      if (loopEnabledRef.current && activeRegion === region) region.play();
    });
    const unsubRegionUpdated = regions.on("region-updated", (region) => {
      elan.syncAlignableTimes(region.id, region.start, region.end ?? region.start);
    });
    const unsubRegionContent = regions.on("region-content-changed", (region) => {
      const raw = region.getContent();
      const text =
        typeof raw === "string"
          ? raw.replace(/<[^>]*>/g, "").trim()
          : ((raw as HTMLElement | undefined)?.textContent ?? "").trim();
      elan.syncAlignableText(region.id, text);
    });
    const unsubZoom = ws.on("zoom", (next) => setZoomState(Math.round(next)));
    const unsubTable = elan.on("tableViewChange", (model) => setElanTable(model));
    const unsubSelect = elan.on("select", (start) => ws.setTime(start));
    const unsubEafUpdated = elan.on("eafUpdated", () => {
      setElanData(elan.getData());
    });

    return () => {
      unsubRegionCreated();
      unsubRegionClick();
      unsubRegionOut();
      unsubRegionUpdated();
      unsubRegionContent();
      unsubZoom();
      unsubTable();
      unsubSelect();
      unsubEafUpdated();
      setElanTable(null);
      setElanData(null);
      setSelectedId(null);
      eafIds.clear();
      regionsPluginRef.current = null;
      elanPluginRef.current = null;
      wsRef.current = null;
      ws.destroy();
    };
  }, [colorForAlignableOrder]);

  const createAlignableAtPlayhead = useCallback(() => {
    const ws = wsRef.current;
    const elan = elanPluginRef.current;
    const regions = regionsPluginRef.current;
    const tierId = createTierRef.current;
    if (!ws || !elan || !regions || !tierId) return;
    const start = ws.getCurrentTime();
    const end = Math.min(start + 1.5, ws.getDuration());
    const id = elan.createAlignableAnnotation(tierId, start, end, "");
    if (!id) return;
    eafIdsRef.current.add(id);
    regions.addRegion({
      id,
      start,
      end,
      content: id,
      color: colorForAlignableOrder(id, eafIdsRef.current.size),
      drag: true,
      resize: true,
      contentEditable: false,
    });
    setSelectedId(id);
  }, [colorForAlignableOrder]);

  const createRefAnnotation = useCallback(
    (tierId: string, parentAlignableId: string) => {
      const id = elanPluginRef.current?.createRefAnnotation(
        tierId,
        parentAlignableId,
        "",
      );
      if (id) setSelectedId(id);
    },
    [],
  );

  const deleteAnnotation = useCallback((id: string) => {
    const elan = elanPluginRef.current;
    const regions = regionsPluginRef.current;
    if (!elan) return;
    const r = regions?.getRegions().find((x) => x.id === id);
    r?.remove();
    eafIdsRef.current.delete(id);
    elan.deleteAnnotation(id);
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const editValue = useCallback((id: string, value: string) => {
    const elan = elanPluginRef.current;
    if (!elan) return;
    elan.updateAnnotationText(id, value);
    const r = regionsPluginRef.current?.getRegions().find((x) => x.id === id);
    if (r) r.setContent(id);
  }, []);

  const selectBlock = useCallback((id: string, start: number) => {
    setSelectedId(id);
    const annot = elanPluginRef.current?.getData()?.annotations[id];
    if (!annot) return;
    if (annot.type === "ALIGNABLE_ANNOTATION") {
      const r = regionsPluginRef.current?.getRegions().find((x) => x.id === id);
      if (r) {
        r.play(true);
        return;
      }
    }
    wsRef.current?.setTime(start);
  }, []);

  const syncTiming = useCallback(
    (alignableId: string, start: number, end: number) => {
      const elan = elanPluginRef.current;
      if (!elan) return;
      const total = duration > 0 ? duration : Number.MAX_SAFE_INTEGER;
      const safeStart = Math.max(0, Math.min(start, end, total));
      const safeEnd = Math.min(total, Math.max(safeStart + 0.01, end));
      elan.syncAlignableTimes(alignableId, safeStart, safeEnd);
      const region = regionsPluginRef.current
        ?.getRegions()
        .find((item) => item.id === alignableId) as
        | (ReturnType<InstanceType<typeof RegionsPlugin>["addRegion"]> & {
            setOptions?: (opts: { start?: number; end?: number }) => void;
          })
        | undefined;
      region?.setOptions?.({ start: safeStart, end: safeEnd });
    },
    [duration],
  );

  // Delete to remove, Enter to play/pause, Esc to deselect.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteAnnotation(selectedId);
      } else if (e.key === "Enter") {
        e.preventDefault();
        wsRef.current?.playPause();
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteAnnotation]);

  const setLoopEnabled = useCallback((enabled: boolean) => {
    loopEnabledRef.current = enabled;
  }, []);

  const setZoom = useCallback((minPxPerSec: number) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, minPxPerSec));
    wsRef.current?.zoom(clamped);
  }, []);

  const getEafXml = useCallback(
    () => elanPluginRef.current?.getEafXml() ?? null,
    [],
  );

  return {
    waveformRef,
    wsRef,
    elanData,
    elanTable,
    duration,
    selectedId,
    setSelectedId,
    setLoopEnabled,
    zoom,
    setZoom,
    zoomMin: ZOOM_MIN,
    zoomMax: ZOOM_MAX,
    createAlignableAtPlayhead,
    createRefAnnotation,
    deleteAnnotation,
    editValue,
    selectBlock,
    syncTiming,
    getEafXml,
  };
}
