export type TimerMode = "focus" | "short" | "long";

export type ThemePref = "system" | "light" | "dark";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  estimated: number; // pomodoros planificados
  completed: number; // pomodoros completados en esta tarea
}

export interface Settings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  roundsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  notifications: boolean;
  chime: boolean;
  theme: ThemePref;
  dailyGoal: number; // meta de pomodoros por día
}

/** Registro diario para estadísticas. La clave es la fecha YYYY-MM-DD. */
export interface DayLog {
  date: string;
  focusSessions: number;
  focusMinutes: number;
}

export type SoundId = "lluvia" | "bosque" | "cafe" | "olas" | "viento";

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  notifications: true,
  chime: true,
  theme: "system",
  dailyGoal: 8,
};

export const MODE_LABEL: Record<TimerMode, string> = {
  focus: "Concentración",
  short: "Descanso corto",
  long: "Descanso largo",
};
