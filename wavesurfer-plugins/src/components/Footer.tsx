import { AUDIO_URL } from "../lib/constants";

export function Footer() {
  return (
    <footer className="mt-10 pt-4 border-t border-rule font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ink-mute flex justify-between items-center gap-4">
      <span>
        Audio source{" "}
        <span className="text-ochre normal-case tracking-normal">
          {AUDIO_URL}
        </span>
      </span>
      <span aria-hidden>⁘ ⁘ ⁘</span>
    </footer>
  );
}
