// Aplicación principal del editor de texto tipo Word.
// Reúne la barra de herramientas, la página de documento, el menú de archivo,
// el gestor de documentos, la barra de estado, el autoguardado y el tema.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toolbar from "./Toolbar";
import FindReplace from "./FindReplace";
import { useEditor } from "./useEditor";
import {
  exportDoc,
  exportHtml,
  exportTxt,
  importFile,
  printDocument,
} from "./exporters";
import {
  deleteDoc as deleteDocStore,
  getCurrentId,
  loadDocs,
  newDoc,
  setCurrentId,
  upsertDoc,
} from "./storage";
import type { PageSize, WordDoc } from "./types";
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  MenuIcon,
  MoonIcon,
  NewDocIcon,
  OpenIcon,
  PrintIcon,
  SaveIcon,
  SearchIcon,
  SunIcon,
  TrashIcon,
} from "./icons";

const PAGE_DIMS: Record<PageSize, { w: number; minH: number; label: string }> = {
  a4: { w: 794, minH: 1123, label: "A4" },
  letter: { w: 816, minH: 1056, label: "Carta" },
};

export default function WordApp() {
  const editorRef = useRef<HTMLDivElement>(null);
  const editor = useEditor(editorRef);

  const [docs, setDocs] = useState<WordDoc[]>(() => loadDocs());
  const [current, setCurrent] = useState<WordDoc>(() => {
    const all = loadDocs();
    const id = getCurrentId();
    return all.find((d) => d.id === id) || all[0] || newDoc();
  });
  const loadedId = useRef<string>("");
  const currentRef = useRef<WordDoc>(current);

  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("word.theme") === "dark";
    } catch {
      return false;
    }
  });
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [zoom, setZoom] = useState(1);
  const [showFind, setShowFind] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const [savedAt, setSavedAt] = useState<number>(current.updatedAt);
  const [toast, setToast] = useState<string>("");

  const openFileInput = useRef<HTMLInputElement>(null);
  const imageFileInput = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  // --- Mantener currentRef sincronizada con el documento activo ---
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  // --- Tema ---
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("word.theme", dark ? "dark" : "light");
    } catch {
      /* noop */
    }
  }, [dark]);

  // --- Cargar el HTML del documento en el editor al cambiar de documento ---
  useEffect(() => {
    if (loadedId.current === current.id) return;
    loadedId.current = current.id;
    if (editorRef.current) {
      editorRef.current.innerHTML = current.html || "<p><br></p>";
    }
    setCurrentId(current.id);
    updateCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  }, []);

  const updateCounts = useCallback(() => {
    const text = editorRef.current?.innerText ?? "";
    const trimmed = text.replace(/\u00a0/g, " ").trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    setCounts({ words, chars: text.replace(/\n/g, "").length });
  }, []);

  // --- Guardado (con y sin debounce) ---
  const persist = useCallback((patch: Partial<WordDoc>) => {
    const updated: WordDoc = {
      ...currentRef.current,
      ...patch,
      updatedAt: Date.now(),
    };
    currentRef.current = updated;
    setCurrent(updated);
    const list = upsertDoc(updated);
    setDocs(list);
    setSavedAt(updated.updatedAt);
  }, []);

  const handleInput = useCallback(() => {
    updateCounts();
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      persist({ html: editorRef.current?.innerHTML ?? "" });
    }, 700);
  }, [persist, updateCounts]);

  const saveNow = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    persist({ html: editorRef.current?.innerHTML ?? "" });
    showToast("Documento guardado");
  }, [persist, showToast]);

  // --- Acciones de documento ---
  const createNew = useCallback(() => {
    saveNow();
    const doc = newDoc();
    const list = upsertDoc(doc);
    setDocs(list);
    setCurrent(doc);
    setShowDocs(false);
    setShowMenu(false);
  }, [saveNow]);

  const openDocById = useCallback(
    (id: string) => {
      // Guardar el actual antes de cambiar.
      persist({ html: editorRef.current?.innerHTML ?? "" });
      const doc = loadDocs().find((d) => d.id === id);
      if (doc) {
        setCurrent(doc);
        setShowDocs(false);
      }
    },
    [persist],
  );

  const removeDoc = useCallback(
    (id: string) => {
      const list = deleteDocStore(id);
      setDocs(list);
      if (id === current.id) {
        const next = list[0] || newDoc();
        if (!list[0]) upsertDoc(next);
        setCurrent(next);
        loadedId.current = ""; // forzar recarga del editor
      }
    },
    [current.id],
  );

  // --- Importar / exportar ---
  const onOpenFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        const { title, html } = await importFile(file);
        const doc = { ...newDoc(title), html };
        const list = upsertDoc(doc);
        setDocs(list);
        setCurrent(doc);
        loadedId.current = "";
        setShowMenu(false);
        showToast(`Importado: ${title}`);
      } catch {
        showToast("No se pudo importar el archivo");
      }
    },
    [showToast],
  );

  const onImageFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => editor.insertImage(String(reader.result));
      reader.readAsDataURL(file);
    },
    [editor],
  );

  const doExport = useCallback(
    (kind: "doc" | "html" | "txt" | "pdf") => {
      const html = editorRef.current?.innerHTML ?? "";
      const text = editorRef.current?.innerText ?? "";
      const title = current.title || "documento";
      if (kind === "doc") exportDoc(title, html);
      else if (kind === "html") exportHtml(title, html);
      else if (kind === "txt") exportTxt(title, text);
      else printDocument(title, html);
      setShowMenu(false);
    },
    [current.title],
  );

  // --- Atajos de teclado globales ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      } else if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFind(true);
      } else if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        doExport("pdf");
      } else if (e.key === "Escape") {
        setShowFind(false);
        setShowMenu(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doExport, saveNow]);

  // Guardar al cerrar la pestaña.
  useEffect(() => {
    const onUnload = () => {
      try {
        upsertDoc({
          ...current,
          html: editorRef.current?.innerHTML ?? current.html,
          updatedAt: Date.now(),
        });
      } catch {
        /* noop */
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [current]);

  const dims = PAGE_DIMS[pageSize];
  const savedLabel = useMemo(() => formatTime(savedAt), [savedAt]);

  return (
    <div className="flex h-full flex-col bg-slate-200 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Inputs ocultos para abrir / insertar imagen */}
      <input
        ref={openFileInput}
        type="file"
        accept=".txt,.html,.htm,.doc"
        className="hidden"
        onChange={onOpenFile}
      />
      <input
        ref={imageFileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageFile}
      />

      {/* ===== Barra superior ===== */}
      <header className="flex items-center gap-2 border-b border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow">
            W
          </div>
          <span className="hidden text-sm font-semibold text-slate-700 dark:text-slate-200 sm:block">
            Escritor
          </span>
        </div>

        {/* Menú Archivo */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Archivo
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
              <div className="absolute left-0 top-full z-40 mt-1 w-60 rounded-lg border border-slate-200 bg-white py-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                <MenuItem icon={<NewDocIcon />} label="Nuevo documento" onClick={createNew} />
                <MenuItem
                  icon={<OpenIcon />}
                  label="Abrir archivo…"
                  hint=".txt .html .doc"
                  onClick={() => openFileInput.current?.click()}
                />
                <MenuItem icon={<SaveIcon />} label="Guardar" hint="Ctrl+S" onClick={saveNow} />
                <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                <MenuItem
                  icon={<DownloadIcon />}
                  label="Descargar Word (.doc)"
                  onClick={() => doExport("doc")}
                />
                <MenuItem
                  icon={<DownloadIcon />}
                  label="Descargar HTML (.html)"
                  onClick={() => doExport("html")}
                />
                <MenuItem
                  icon={<DownloadIcon />}
                  label="Descargar texto (.txt)"
                  onClick={() => doExport("txt")}
                />
                <MenuItem
                  icon={<PrintIcon />}
                  label="Imprimir / Guardar PDF"
                  hint="Ctrl+P"
                  onClick={() => doExport("pdf")}
                />
              </div>
            </>
          )}
        </div>

        {/* Título del documento */}
        <input
          value={current.title}
          onChange={(e) => persist({ title: e.target.value })}
          spellCheck={false}
          className="mx-1 min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-center text-sm font-medium text-slate-700 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:outline-none dark:text-slate-200 dark:hover:border-slate-600 dark:focus:bg-slate-800"
          aria-label="Título del documento"
        />

        {/* Acciones derechas */}
        <button
          type="button"
          onClick={() => setShowFind(true)}
          title="Buscar y reemplazar (Ctrl+F)"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <SearchIcon />
        </button>
        <button
          type="button"
          onClick={() => setShowDocs(true)}
          title="Mis documentos"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <MenuIcon />
        </button>
        <button
          type="button"
          onClick={() => setDark((v) => !v)}
          title={dark ? "Modo claro" : "Modo oscuro"}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      {/* ===== Cinta de formato ===== */}
      <div className="border-b border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70">
        <Toolbar editor={editor} />
      </div>

      {/* ===== Área de documento ===== */}
      <div className="relative flex-1 overflow-auto">
        {showFind && (
          <FindReplace
            editorRef={editorRef}
            onClose={() => setShowFind(false)}
            onChanged={() => {
              updateCounts();
              persist({ html: editorRef.current?.innerHTML ?? "" });
            }}
          />
        )}

        <div className="flex justify-center px-4 py-8">
          <div
            className="bg-white shadow-xl ring-1 ring-black/5 transition-all dark:shadow-black/40"
            style={{
              width: dims.w,
              minHeight: dims.minH,
              padding: "96px",
              zoom,
            }}
          >
            <div
              ref={editorRef}
              className="word-content"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              onInput={handleInput}
              role="textbox"
              aria-multiline="true"
            />
          </div>
        </div>
      </div>

      {/* ===== Barra de estado ===== */}
      <footer className="flex items-center gap-4 border-t border-slate-300 bg-white px-4 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>{counts.words} palabras</span>
        <span>{counts.chars} caracteres</span>
        <span className="hidden items-center gap-1 sm:flex">
          <CheckIcon className="h-3.5 w-3.5 text-green-500" />
          Guardado {savedLabel}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value as PageSize)}
            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-800"
            title="Tamaño de página"
          >
            <option value="a4">A4</option>
            <option value="letter">Carta</option>
          </select>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            className="rounded px-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Alejar"
          >
            −
          </button>
          <span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
            className="rounded px-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Acercar"
          >
            +
          </button>
        </div>
      </footer>

      {/* ===== Gestor de documentos ===== */}
      {showDocs && (
        <DocsPanel
          docs={docs}
          currentId={current.id}
          onClose={() => setShowDocs(false)}
          onOpen={openDocById}
          onNew={createNew}
          onDelete={removeDoc}
        />
      )}

      {/* ===== Aviso (toast) ===== */}
      {toast && (
        <div className="pointer-events-none fixed bottom-12 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-white/90 dark:text-slate-900">
          {toast}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <span className="text-slate-400 dark:text-slate-400">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </button>
  );
}

function DocsPanel({
  docs,
  currentId,
  onClose,
  onOpen,
  onNew,
  onDelete,
}: {
  docs: WordDoc[];
  currentId: string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative ml-auto flex h-full w-80 flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Mis documentos
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onNew}
          className="m-3 flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <NewDocIcon className="h-4 w-4" /> Documento nuevo
        </button>

        <div className="flex-1 overflow-auto px-2 pb-3">
          {docs.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400">
              Aún no hay documentos guardados.
            </p>
          )}
          {docs.map((d) => (
            <div
              key={d.id}
              className={
                "group mb-1 flex items-center gap-2 rounded-lg px-3 py-2 " +
                (d.id === currentId
                  ? "bg-brand-50 dark:bg-brand-500/15"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800")
              }
            >
              <button
                type="button"
                onClick={() => onOpen(d.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {d.title || "Sin título"}
                </div>
                <div className="text-xs text-slate-400">{formatTime(d.updatedAt)}</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Eliminar "${d.title || "Sin título"}"?`)) onDelete(d.id);
                }}
                className="rounded p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-500/15"
                aria-label="Eliminar documento"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

/** Formatea una marca de tiempo a texto legible y relativo. */
function formatTime(ts: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "hace un momento";
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`;
  const d = new Date(ts);
  return d.toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
