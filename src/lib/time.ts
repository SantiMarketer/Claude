/** Convierte segundos a "MM:SS". */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Devuelve la fecha local en formato YYYY-MM-DD. */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Resta n días a una fecha y devuelve su clave YYYY-MM-DD. */
export function dayKeyOffset(offset: number, base: Date = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return todayKey(d);
}

const FULL_DATE = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function prettyDate(d: Date = new Date()): string {
  const text = FULL_DATE.format(d);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const WEEKDAY_SHORT = new Intl.DateTimeFormat("es-ES", { weekday: "short" });

export function weekdayShort(key: string): string {
  const [y, m, day] = key.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  const t = WEEKDAY_SHORT.format(d).replace(".", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Saludo según la hora del día. */
export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}
