// Panel flotante de Buscar y reemplazar. Recorre los nodos de texto del
// editor para localizar coincidencias, seleccionarlas y reemplazarlas, sin
// depender de APIs no estándar del navegador.

import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "./icons";

interface NodeIndex {
  node: Text;
  start: number;
}

function buildIndex(root: HTMLElement): { nodes: NodeIndex[]; text: string } {
  const nodes: NodeIndex[] = [];
  let text = "";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    nodes.push({ node: t, start: text.length });
    text += t.nodeValue ?? "";
  }
  return { nodes, text };
}

function locate(nodes: NodeIndex[], abs: number): { node: Text; offset: number } {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (abs >= nodes[i].start) {
      return { node: nodes[i].node, offset: abs - nodes[i].start };
    }
  }
  return { node: nodes[0].node, offset: 0 };
}

export default function FindReplace({
  editorRef,
  onClose,
  onChanged,
}: {
  editorRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [info, setInfo] = useState("");
  const cursor = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const findNext = (backwards = false) => {
    const root = editorRef.current;
    if (!root || !query) return;
    const { nodes, text } = buildIndex(root);
    if (nodes.length === 0) {
      setInfo("Sin texto");
      return;
    }
    const hay = caseSensitive ? text : text.toLowerCase();
    const needle = caseSensitive ? query : query.toLowerCase();

    let idx: number;
    if (backwards) {
      idx = hay.lastIndexOf(needle, Math.max(0, cursor.current - needle.length - 1));
      if (idx < 0) idx = hay.lastIndexOf(needle);
    } else {
      idx = hay.indexOf(needle, cursor.current);
      if (idx < 0) idx = hay.indexOf(needle); // dar la vuelta
    }
    if (idx < 0) {
      setInfo("No se encontró");
      return;
    }

    const startInfo = locate(nodes, idx);
    const endInfo = locate(nodes, idx + needle.length);
    const range = document.createRange();
    range.setStart(startInfo.node, startInfo.offset);
    range.setEnd(endInfo.node, endInfo.offset);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    (startInfo.node.parentElement as HTMLElement | null)?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
    cursor.current = backwards ? idx : idx + needle.length;

    // Contar el total de coincidencias para informar.
    let count = 0;
    let from = hay.indexOf(needle);
    while (from >= 0) {
      count++;
      from = hay.indexOf(needle, from + needle.length);
    }
    setInfo(`${count} coincidencia${count === 1 ? "" : "s"}`);
  };

  const replaceCurrent = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !query) {
      findNext();
      return;
    }
    const selected = sel.toString();
    const matches = caseSensitive
      ? selected === query
      : selected.toLowerCase() === query.toLowerCase();
    if (matches) {
      document.execCommand("insertText", false, replacement);
      cursor.current = Math.max(0, cursor.current - query.length + replacement.length);
      onChanged();
    }
    findNext();
  };

  const replaceAll = () => {
    const root = editorRef.current;
    if (!root || !query) return;
    const needle = caseSensitive ? query : query.toLowerCase();
    let count = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) texts.push(n as Text);

    for (const t of texts) {
      const value = t.nodeValue ?? "";
      const hay = caseSensitive ? value : value.toLowerCase();
      if (!hay.includes(needle)) continue;
      let result = "";
      let i = 0;
      while (i < value.length) {
        const slice = caseSensitive
          ? value.slice(i, i + query.length)
          : value.slice(i, i + query.length).toLowerCase();
        if (slice === needle) {
          result += replacement;
          i += query.length;
          count++;
        } else {
          result += value[i];
          i++;
        }
      }
      t.nodeValue = result;
    }
    cursor.current = 0;
    setInfo(count > 0 ? `${count} reemplazo${count === 1 ? "" : "s"}` : "No se encontró");
    if (count > 0) onChanged();
  };

  return (
    <div className="absolute right-4 top-3 z-40 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <SearchIcon className="h-4 w-4" />
          Buscar y reemplazar
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
          aria-label="Cerrar"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          cursor.current = 0;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            findNext(e.shiftKey);
          }
        }}
        placeholder="Buscar…"
        className="mb-2 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <input
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        placeholder="Reemplazar con…"
        className="mb-2 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />

      <label className="mb-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(e) => setCaseSensitive(e.target.checked)}
        />
        Distinguir mayúsculas
        <span className="ml-auto">{info}</span>
      </label>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => findNext(false)}
          className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Siguiente
        </button>
        <button
          type="button"
          onClick={() => findNext(true)}
          className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={replaceCurrent}
          className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Reemplazar
        </button>
        <button
          type="button"
          onClick={replaceAll}
          className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          Reemplazar todo
        </button>
      </div>
    </div>
  );
}
