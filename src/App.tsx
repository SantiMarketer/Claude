import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { Timer } from "./components/Timer";
import { Tasks } from "./components/Tasks";
import { AmbientSounds } from "./components/AmbientSounds";
import { Stats } from "./components/Stats";
import { SettingsModal } from "./components/Settings";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { usePomodoro } from "./hooks/usePomodoro";
import { useTheme } from "./hooks/useTheme";
import { AmbientEngine } from "./lib/ambient";
import { playChime, showNotification } from "./lib/notify";
import { formatClock, todayKey } from "./lib/time";
import { STORAGE_KEYS } from "./lib/storage";
import {
  DEFAULT_SETTINGS,
  MODE_LABEL,
  type DayLog,
  type Settings,
  type SoundId,
  type Task,
  type TimerMode,
} from "./types";

const CARD =
  "rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm shadow-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none";

export default function App() {
  const [settings, setSettings] = useLocalStorage<Settings>(
    STORAGE_KEYS.settings,
    DEFAULT_SETTINGS
  );
  const [tasks, setTasks] = useLocalStorage<Task[]>(STORAGE_KEYS.tasks, []);
  const [logs, setLogs] = useLocalStorage<Record<string, DayLog>>(
    STORAGE_KEYS.logs,
    {}
  );
  const [activeTaskId, setActiveTaskId] = useLocalStorage<string | null>(
    STORAGE_KEYS.activeTask,
    null
  );
  const [volume, setVolume] = useLocalStorage<number>("volume", 0.5);

  const [showSettings, setShowSettings] = useState(false);
  const [sound, setSound] = useState<SoundId | null>(null);
  const [isDark, setIsDark] = useState(false);

  useTheme(settings.theme);

  // Detecta el tema efectivo para el icono del encabezado.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const compute = () =>
      settings.theme === "dark" ||
      (settings.theme === "system" && media.matches);
    setIsDark(compute());
    const handler = () => setIsDark(compute());
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [settings.theme]);

  // Motor de sonido ambiental (Web Audio).
  const engineRef = useRef<AmbientEngine | null>(null);
  if (!engineRef.current) engineRef.current = new AmbientEngine();

  useEffect(() => {
    engineRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const engine = engineRef.current;
    return () => engine?.dispose();
  }, []);

  const handleToggleSound = (id: SoundId) => {
    setSound(engineRef.current!.toggle(id));
  };

  // Al completar una fase: avisos, estadísticas y progreso de la tarea.
  const handleComplete = useCallback(
    (finished: TimerMode, plannedSeconds: number) => {
      if (settings.chime) playChime();

      if (finished === "focus") {
        const minutes = Math.round(plannedSeconds / 60);
        setLogs((prev) => {
          const key = todayKey();
          const cur =
            prev[key] ?? { date: key, focusSessions: 0, focusMinutes: 0 };
          return {
            ...prev,
            [key]: {
              ...cur,
              focusSessions: cur.focusSessions + 1,
              focusMinutes: cur.focusMinutes + minutes,
            },
          };
        });
        if (activeTaskId) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === activeTaskId ? { ...t, completed: t.completed + 1 } : t
            )
          );
        }
        if (settings.notifications) {
          showNotification(
            "¡Pomodoro completado!",
            "Buen trabajo. Tómate un respiro."
          );
        }
      } else if (settings.notifications) {
        showNotification(
          "Descanso terminado",
          "Listo para volver a concentrarte."
        );
      }
    },
    [settings.chime, settings.notifications, activeTaskId, setLogs, setTasks]
  );

  const pomo = usePomodoro(settings, handleComplete);

  // Título de la pestaña sincronizado con el temporizador.
  useEffect(() => {
    document.title = `${formatClock(pomo.secondsLeft)} · ${MODE_LABEL[pomo.mode]} — Enfoque`;
  }, [pomo.secondsLeft, pomo.mode]);

  // Atajo: barra espaciadora para iniciar/pausar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing =
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable;
      if (e.code === "Space" && !typing) {
        e.preventDefault();
        pomo.toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pomo]);

  const toggleTheme = () =>
    setSettings((prev) => ({ ...prev, theme: isDark ? "light" : "dark" }));

  const activeTask = tasks.find((t) => t.id === activeTaskId && !t.done);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Fondo decorativo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl dark:bg-brand-800/20" />
        <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-900/20" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Header
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setShowSettings(true)}
        />

        <main className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Tareas */}
          <div className={`${CARD} order-2 flex min-h-[440px] flex-col lg:order-1`}>
            <Tasks
              tasks={tasks}
              setTasks={setTasks}
              activeTaskId={activeTaskId}
              setActiveTaskId={setActiveTaskId}
            />
          </div>

          {/* Temporizador */}
          <div
            className={`${CARD} order-1 flex items-center justify-center lg:order-2`}
          >
            <Timer
              api={pomo}
              settings={settings}
              activeTaskTitle={activeTask?.title}
            />
          </div>

          {/* Estadísticas + sonidos */}
          <div className="order-3 flex flex-col gap-6 lg:order-3">
            <div className={CARD}>
              <Stats logs={logs} dailyGoal={settings.dailyGoal} />
            </div>
            <div className={CARD}>
              <AmbientSounds
                current={sound}
                volume={volume}
                onToggle={handleToggleSound}
                onVolume={setVolume}
              />
            </div>
          </div>
        </main>

        <footer className="mt-8 text-center text-xs text-slate-400">
          Presiona{" "}
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800">
            espacio
          </kbd>{" "}
          para iniciar o pausar · Tus datos se guardan en este dispositivo
        </footer>
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
