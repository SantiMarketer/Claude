import type { Settings as SettingsType, ThemePref } from "../types";
import { requestNotificationPermission } from "../lib/notify";
import { Close } from "./icons";

interface Props {
  settings: SettingsType;
  setSettings: React.Dispatch<React.SetStateAction<SettingsType>>;
  onClose: () => void;
}

const THEMES: { id: ThemePref; label: string }[] = [
  { id: "system", label: "Sistema" },
  { id: "light", label: "Claro" },
  { id: "dark", label: "Oscuro" },
];

export function SettingsModal({ settings, setSettings, onClose }: Props) {
  const update = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const toggleNotifications = async (next: boolean) => {
    if (next) {
      const ok = await requestNotificationPermission();
      update("notifications", ok);
    } else {
      update("notifications", false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md animate-scale-in overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Ajustes
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <Close width={18} height={18} />
          </button>
        </div>

        <Group title="Duración (minutos)">
          <Stepper
            label="Concentración"
            value={settings.focusMinutes}
            min={5}
            max={90}
            step={5}
            onChange={(v) => update("focusMinutes", v)}
          />
          <Stepper
            label="Descanso corto"
            value={settings.shortBreakMinutes}
            min={1}
            max={30}
            onChange={(v) => update("shortBreakMinutes", v)}
          />
          <Stepper
            label="Descanso largo"
            value={settings.longBreakMinutes}
            min={5}
            max={45}
            step={5}
            onChange={(v) => update("longBreakMinutes", v)}
          />
          <Stepper
            label="Rondas antes del descanso largo"
            value={settings.roundsBeforeLongBreak}
            min={2}
            max={8}
            onChange={(v) => update("roundsBeforeLongBreak", v)}
          />
          <Stepper
            label="Meta de pomodoros al día"
            value={settings.dailyGoal}
            min={1}
            max={16}
            onChange={(v) => update("dailyGoal", v)}
          />
        </Group>

        <Group title="Automatización">
          <Toggle
            label="Iniciar descansos automáticamente"
            checked={settings.autoStartBreaks}
            onChange={(v) => update("autoStartBreaks", v)}
          />
          <Toggle
            label="Iniciar concentración automáticamente"
            checked={settings.autoStartFocus}
            onChange={(v) => update("autoStartFocus", v)}
          />
        </Group>

        <Group title="Avisos">
          <Toggle
            label="Sonido al terminar"
            checked={settings.chime}
            onChange={(v) => update("chime", v)}
          />
          <Toggle
            label="Notificaciones del navegador"
            checked={settings.notifications}
            onChange={toggleNotifications}
          />
        </Group>

        <Group title="Apariencia">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">Tema</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => update("theme", t.id)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    settings.theme === t.id
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </Group>

        <button
          onClick={onClose}
          className="mt-2 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        <button
          onClick={dec}
          className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-white dark:hover:bg-slate-700"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
          {value}
        </span>
        <button
          onClick={inc}
          className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-white dark:hover:bg-slate-700"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
