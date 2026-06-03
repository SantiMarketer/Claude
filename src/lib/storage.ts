const PREFIX = "enfoque:";

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // almacenamiento lleno o no disponible: ignorar de forma segura
  }
}

export const STORAGE_KEYS = {
  settings: "settings",
  tasks: "tasks",
  logs: "logs",
  activeTask: "activeTask",
} as const;
