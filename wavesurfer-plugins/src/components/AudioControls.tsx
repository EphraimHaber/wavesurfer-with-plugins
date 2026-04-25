import { Play, RotateCcw, RotateCw } from "lucide-react";
import type WaveSurfer from "wavesurfer.js";

export function CtrlBtn({
  onClick,
  icon,
  children,
  disabled,
  variant = "default",
}: {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "default" | "danger" | "primary";
}) {
  const variantClasses = {
    default:
      "bg-cream text-ink border-ink hover:bg-ink hover:text-cream",
    primary:
      "bg-ochre text-cream border-ochre hover:bg-ochre-2",
    danger:
      "bg-cream text-blood border-blood hover:bg-blood hover:text-cream",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-2 px-3 py-2 rounded-paper",
        "font-mono text-[0.72rem] tracking-[0.08em] uppercase font-medium",
        "border transition-[transform,background-color,color] duration-150",
        "hover:-translate-y-px active:translate-y-0",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        variantClasses,
      ].join(" ")}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function AudioControls({
  wsRef,
}: {
  wsRef: React.RefObject<WaveSurfer | null>;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <CtrlBtn
        onClick={() => wsRef.current?.playPause()}
        icon={<Play size={14} strokeWidth={1.75} />}
      >
        Play / Pause
      </CtrlBtn>
      <CtrlBtn
        onClick={() => wsRef.current?.skip(-5)}
        icon={<RotateCcw size={14} strokeWidth={1.75} />}
      >
        Back 5s
      </CtrlBtn>
      <CtrlBtn
        onClick={() => wsRef.current?.skip(5)}
        icon={<RotateCw size={14} strokeWidth={1.75} />}
      >
        Fwd 5s
      </CtrlBtn>
    </div>
  );
}
