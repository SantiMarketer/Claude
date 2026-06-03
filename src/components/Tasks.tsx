import { useState } from "react";
import type { Task } from "../types";
import { Check, Plus, Target, Trash } from "./icons";

interface Props {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function Tasks({ tasks, setTasks, activeTaskId, setActiveTaskId }: Props) {
  const [title, setTitle] = useState("");
  const [estimated, setEstimated] = useState(1);

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const addTask = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const task: Task = {
      id: uid(),
      title: trimmed,
      done: false,
      createdAt: Date.now(),
      estimated: Math.max(1, estimated),
      completed: 0,
    };
    setTasks((prev) => [task, ...prev]);
    if (!activeTaskId) setActiveTaskId(task.id);
    setTitle("");
    setEstimated(1);
  };

  const toggleDone = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const remove = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const clearDone = () => setTasks((prev) => prev.filter((t) => !t.done));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
          <Target width={18} height={18} className="text-brand-500" />
          Tareas del día
        </h2>
        <span className="text-xs font-medium text-slate-400">
          {pending.length} pendientes
        </span>
      </div>

      {/* Alta de tarea */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="¿En qué vas a trabajar?"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-900/40"
          />
          <button
            onClick={addTask}
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 active:scale-95"
            title="Añadir tarea"
          >
            <Plus width={20} height={20} />
          </button>
        </div>
        <div className="flex items-center gap-2 px-1 text-xs text-slate-400">
          <span>Pomodoros estimados:</span>
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              onClick={() => setEstimated((n) => Math.max(1, n - 1))}
              className="h-6 w-6 rounded-md text-slate-500 hover:bg-white dark:hover:bg-slate-700"
            >
              −
            </button>
            <span className="w-5 text-center font-semibold text-slate-700 dark:text-slate-200">
              {estimated}
            </span>
            <button
              onClick={() => setEstimated((n) => Math.min(12, n + 1))}
              className="h-6 w-6 rounded-md text-slate-500 hover:bg-white dark:hover:bg-slate-700"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="-mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
            Añade tu primera tarea para empezar a concentrarte.
          </div>
        )}

        {pending.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            active={activeTaskId === t.id}
            onToggle={() => toggleDone(t.id)}
            onRemove={() => remove(t.id)}
            onSelect={() => setActiveTaskId(activeTaskId === t.id ? null : t.id)}
          />
        ))}

        {done.length > 0 && (
          <div className="pt-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Completadas ({done.length})
              </span>
              <button
                onClick={clearDone}
                className="text-xs font-medium text-slate-400 hover:text-rose-500"
              >
                Limpiar
              </button>
            </div>
            <div className="space-y-2">
              {done.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  active={false}
                  onToggle={() => toggleDone(t.id)}
                  onRemove={() => remove(t.id)}
                  onSelect={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  task: Task;
  active: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onSelect: () => void;
}

function TaskRow({ task, active, onToggle, onRemove, onSelect }: RowProps) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        active
          ? "border-brand-300 bg-brand-50/60 dark:border-brand-700 dark:bg-brand-900/20"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600"
      }`}
    >
      <button
        onClick={onToggle}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${
          task.done
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-slate-300 text-transparent hover:border-brand-400 dark:border-slate-600"
        }`}
      >
        <Check width={12} height={12} />
      </button>

      <button onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p
          className={`truncate text-sm font-medium ${
            task.done
              ? "text-slate-400 line-through"
              : "text-slate-800 dark:text-slate-100"
          }`}
        >
          {task.title}
        </p>
        <p className="text-xs text-slate-400">
          {task.completed}/{task.estimated} pomodoros
          {active && !task.done && " · en curso"}
        </p>
      </button>

      <button
        onClick={onRemove}
        className="shrink-0 text-slate-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100 dark:text-slate-600"
        title="Eliminar"
      >
        <Trash width={16} height={16} />
      </button>
    </div>
  );
}
