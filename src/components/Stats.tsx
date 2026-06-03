import type { DayLog } from "../types";
import { dayKeyOffset, todayKey, weekdayShort } from "../lib/time";
import { Clock, Flame, Sparkle, Target } from "./icons";

interface Props {
  logs: Record<string, DayLog>;
  dailyGoal: number;
}

export function Stats({ logs, dailyGoal }: Props) {
  const today = logs[todayKey()] ?? { focusSessions: 0, focusMinutes: 0 };

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const count = logs[dayKeyOffset(-i)]?.focusSessions ?? 0;
    if (count > 0) streak++;
    else if (i === 0) continue; // hoy aún sin sesiones: no rompe la racha
    else break;
  }

  const week = Array.from({ length: 7 }).map((_, i) => {
    const key = dayKeyOffset(-(6 - i));
    return {
      key,
      label: weekdayShort(key),
      sessions: logs[key]?.focusSessions ?? 0,
      isToday: key === todayKey(),
    };
  });
  const maxWeek = Math.max(1, ...week.map((d) => d.sessions));

  const totalSessions = Object.values(logs).reduce(
    (acc, d) => acc + d.focusSessions,
    0
  );

  const goalPct = Math.min(100, Math.round((today.focusSessions / dailyGoal) * 100));

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
        <Sparkle width={18} height={18} className="text-brand-500" />
        Tu progreso
      </h2>

      {/* Meta diaria */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
            <Target width={15} height={15} className="text-brand-500" />
            Meta de hoy
          </span>
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {today.focusSessions}/{dailyGoal}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </div>

      {/* Tarjetas */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatCard
          icon={<Clock width={16} height={16} />}
          value={today.focusMinutes}
          label="min hoy"
          tint="text-sky-500"
        />
        <StatCard
          icon={<Flame width={16} height={16} />}
          value={streak}
          label={streak === 1 ? "día seguido" : "días seguidos"}
          tint="text-orange-500"
        />
        <StatCard
          icon={<Sparkle width={16} height={16} />}
          value={totalSessions}
          label="totales"
          tint="text-violet-500"
        />
      </div>

      {/* Semana */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          Últimos 7 días
        </p>
        <div className="flex h-24 items-end justify-between gap-1.5">
          {week.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-md transition-all duration-500 ${
                    d.isToday
                      ? "bg-brand-500"
                      : d.sessions > 0
                        ? "bg-brand-300 dark:bg-brand-700"
                        : "bg-slate-100 dark:bg-slate-700/60"
                  }`}
                  style={{
                    height: `${d.sessions > 0 ? Math.max(8, (d.sessions / maxWeek) * 100) : 6}%`,
                  }}
                  title={`${d.sessions} pomodoros`}
                />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  d.isToday ? "text-brand-500" : "text-slate-400"
                }`}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  tint,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800/60">
      <div className={`mb-1 flex justify-center ${tint}`}>{icon}</div>
      <div className="text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
        {value}
      </div>
      <div className="text-[10px] leading-tight text-slate-400">{label}</div>
    </div>
  );
}
