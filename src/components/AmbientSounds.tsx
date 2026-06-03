import type { SVGProps } from "react";
import type { SoundId } from "../types";
import { Leaf } from "./icons";

interface Props {
  current: SoundId | null;
  volume: number;
  onToggle: (id: SoundId) => void;
  onVolume: (v: number) => void;
}

type IconType = (p: SVGProps<SVGSVGElement>) => JSX.Element;

const Rain: IconType = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20} {...p}>
    <path d="M7 16a4 4 0 0 1-1-7.9A5 5 0 0 1 16 7a3.5 3.5 0 0 1 1 6.85" />
    <path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />
  </svg>
);

const Cup: IconType = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20} {...p}>
    <path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
    <path d="M17 9h2a2 2 0 0 1 0 4h-2" />
    <path d="M8 2c-.5 1 .5 2 0 3M12 2c-.5 1 .5 2 0 3" />
  </svg>
);

const Waves: IconType = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20} {...p}>
    <path d="M2 8c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    <path d="M2 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    <path d="M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
  </svg>
);

const Wind: IconType = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20} {...p}>
    <path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5" />
    <path d="M3 12h14a2.5 2.5 0 1 1-2.5 2.5" />
    <path d="M3 16h8a2 2 0 1 1-2 2" />
  </svg>
);

const SOUNDS: { id: SoundId; label: string; Icon: IconType; color: string }[] = [
  { id: "lluvia", label: "Lluvia", Icon: Rain, color: "text-sky-500" },
  { id: "bosque", label: "Bosque", Icon: Leaf, color: "text-emerald-500" },
  { id: "cafe", label: "Cafetería", Icon: Cup, color: "text-amber-600" },
  { id: "olas", label: "Olas", Icon: Waves, color: "text-cyan-500" },
  { id: "viento", label: "Viento", Icon: Wind, color: "text-slate-400" },
];

export function AmbientSounds({ current, volume, onToggle, onVolume }: Props) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Sonido ambiental
        </h2>
        {current && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand-500">
            <span className="flex gap-0.5">
              <Bar delay="0ms" />
              <Bar delay="150ms" />
              <Bar delay="300ms" />
            </span>
            sonando
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {SOUNDS.map(({ id, label, Icon, color }) => {
          const on = current === id;
          return (
            <button
              key={id}
              onClick={() => onToggle(id)}
              title={label}
              className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[11px] font-medium transition ${
                on
                  ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-slate-600"
              }`}
            >
              <Icon className={on ? "text-brand-500" : color} width={20} height={20} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <VolumeIcon muted={volume === 0} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          className="h-1.5 flex-1"
          aria-label="Volumen del sonido ambiental"
        />
        <span className="w-9 text-right text-xs tabular-nums text-slate-400">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}

function Bar({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block w-0.5 animate-pulse rounded-full bg-brand-500"
      style={{ height: "12px", animationDelay: delay, animationDuration: "1s" }}
    />
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18} className="text-slate-400">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      {muted ? (
        <path d="M22 9l-6 6M16 9l6 6" />
      ) : (
        <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
      )}
    </svg>
  );
}
