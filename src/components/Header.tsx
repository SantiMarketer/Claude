import { greeting, prettyDate } from "../lib/time";
import { Moon, Settings as SettingsIcon, Sun } from "./icons";

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export function Header({ isDark, onToggleTheme, onOpenSettings }: Props) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-lg shadow-brand-600/30">
          <span className="h-4 w-4 rounded-full bg-white/95 ring-4 ring-white/30" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold leading-tight text-slate-900 dark:text-white">
            Enfoque
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {greeting()} · {prettyDate()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleTheme}
          title="Cambiar tema"
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {isDark ? <Sun width={18} height={18} /> : <Moon width={18} height={18} />}
        </button>
        <button
          onClick={onOpenSettings}
          title="Ajustes"
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <SettingsIcon width={18} height={18} />
        </button>
      </div>
    </header>
  );
}
