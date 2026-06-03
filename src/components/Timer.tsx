import type { PomodoroApi } from "../hooks/usePomodoro";
import type { Settings, TimerMode } from "../types";
import { MODE_LABEL } from "../types";
import { formatClock } from "../lib/time";
import { Pause, Play, Reset, Skip } from "./icons";

const MODES: TimerMode[] = ["focus", "short", "long"];

const RING = {
  size: 280,
  stroke: 14,
};

interface Props {
  api: PomodoroApi;
  settings: Settings;
  activeTaskTitle?: string;
}

export function Timer({ api, settings, activeTaskTitle }: Props) {
  const radius = (RING.size - RING.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - api.progress);

  const accent =
    api.mode === "focus"
      ? "text-brand-500"
      : api.mode === "short"
        ? "text-emerald-500"
        : "text-violet-500";

  const ring =
    api.mode === "focus"
      ? "stroke-brand-500"
      : api.mode === "short"
        ? "stroke-emerald-500"
        : "stroke-violet-500";

  return (
    <section className="flex flex-col items-center gap-7">
      {/* Selector de modo */}
      <div className="inline-flex rounded-full bg-slate-200/70 p-1 dark:bg-slate-800/70">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => api.selectMode(m)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              api.mode === m
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      {/* Anillo de progreso */}
      <div
        className="relative grid place-items-center"
        style={{ width: RING.size, height: RING.size }}
      >
        <div
          className={`absolute inset-6 rounded-full bg-gradient-to-br opacity-40 blur-2xl ${
            api.mode === "focus"
              ? "from-brand-400 to-brand-600"
              : api.mode === "short"
                ? "from-emerald-300 to-emerald-500"
                : "from-violet-300 to-violet-500"
          } ${api.isRunning ? "animate-breathe" : ""}`}
        />
        <svg
          width={RING.size}
          height={RING.size}
          className="absolute -rotate-90"
        >
          <circle
            cx={RING.size / 2}
            cy={RING.size / 2}
            r={radius}
            fill="none"
            strokeWidth={RING.stroke}
            className="stroke-slate-200 dark:stroke-slate-800"
          />
          <circle
            cx={RING.size / 2}
            cy={RING.size / 2}
            r={radius}
            fill="none"
            strokeWidth={RING.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${ring} transition-[stroke-dashoffset] duration-500 ease-linear`}
          />
        </svg>

        <div className="relative flex flex-col items-center">
          <span className="text-6xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {formatClock(api.secondsLeft)}
          </span>
          <span className={`mt-1 text-sm font-semibold uppercase tracking-wider ${accent}`}>
            {MODE_LABEL[api.mode]}
          </span>
          {activeTaskTitle && (
            <span className="mt-3 max-w-[200px] truncate text-center text-sm text-slate-500 dark:text-slate-400">
              {activeTaskTitle}
            </span>
          )}
        </div>
      </div>

      {/* Indicador de rondas */}
      <div className="flex items-center gap-2">
        {Array.from({ length: settings.roundsBeforeLongBreak }).map((_, i) => {
          const filled = i < api.round % settings.roundsBeforeLongBreak ||
            (api.round > 0 && api.round % settings.roundsBeforeLongBreak === 0);
          return (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition ${
                filled
                  ? "bg-brand-500"
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            />
          );
        })}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-4">
        <button
          onClick={api.reset}
          title="Reiniciar"
          className="grid h-12 w-12 place-items-center rounded-full bg-slate-200/70 text-slate-600 transition hover:bg-slate-300/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Reset width={20} height={20} />
        </button>

        <button
          onClick={api.toggle}
          className="grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-95"
        >
          {api.isRunning ? (
            <Pause width={32} height={32} />
          ) : (
            <Play width={32} height={32} className="ml-1" />
          )}
        </button>

        <button
          onClick={api.skip}
          title="Saltar fase"
          className="grid h-12 w-12 place-items-center rounded-full bg-slate-200/70 text-slate-600 transition hover:bg-slate-300/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Skip width={18} height={18} />
        </button>
      </div>
    </section>
  );
}
