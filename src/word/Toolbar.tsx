// Barra de herramientas tipo "cinta" (ribbon) de Word con todos los controles
// de formato. Gestiona sus propios popovers (color, resaltado, tabla) y delega
// las acciones en el hook useEditor recibido por props.

import { useEffect, useRef, useState } from "react";
import type { useEditor } from "./useEditor";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ClearFormatIcon,
  CodeIcon,
  HighlightIcon,
  HrIcon,
  ImageIcon,
  IndentIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  ListOrderedIcon,
  OutdentIcon,
  QuoteIcon,
  RedoIcon,
  StrikeIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TableIcon,
  TextColorIcon,
  UnderlineIcon,
  UndoIcon,
  UnlinkIcon,
} from "./icons";

type Editor = ReturnType<typeof useEditor>;

const FONTS = [
  "Calibri",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Comic Sans MS",
  "Tahoma",
  "Garamond",
  "Inter",
];

const SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "24", "28", "36", "48", "72"];

const BLOCKS: { value: string; label: string }[] = [
  { value: "p", label: "Texto normal" },
  { value: "h1", label: "Título 1" },
  { value: "h2", label: "Título 2" },
  { value: "h3", label: "Título 3" },
  { value: "blockquote", label: "Cita" },
  { value: "pre", label: "Código" },
];

const TEXT_COLORS = [
  "#1f2937", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#0ea5e9", "#1d56f5", "#8b5cf6", "#ec4899", "#000000",
  "#6b7280", "#ffffff",
];

const HIGHLIGHTS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa",
  "#e9d5ff", "#fecaca", "transparent",
];

/** Botón de la barra; preserva la selección con preventDefault en mousedown. */
function TBtn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors " +
        "disabled:opacity-40 " +
        (active
          ? "bg-brand-100 text-brand-700 dark:bg-brand-500/25 dark:text-brand-200"
          : "text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700/60")
      }
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px self-center bg-slate-300/70 dark:bg-slate-600/60" />;
}

/** Popover sencillo anclado a un botón. */
function Popover({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800"
    >
      {children}
    </div>
  );
}

export default function Toolbar({ editor }: { editor: Editor }) {
  const { state } = editor;
  const [colorOpen, setColorOpen] = useState(false);
  const [hlOpen, setHlOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [hover, setHover] = useState({ r: 0, c: 0 });

  const onLink = () => {
    editor.saveSelection();
    const url = window.prompt("Introduce la URL del enlace:", "https://");
    if (url) editor.insertLink(url);
  };

  const onImage = () => {
    editor.saveSelection();
    const url = window.prompt(
      "Pega la URL de la imagen (o usa el menú Insertar para subir una):",
      "https://",
    );
    if (url) editor.insertImage(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
      {/* Deshacer / Rehacer */}
      <TBtn title="Deshacer (Ctrl+Z)" onClick={() => editor.exec("undo")}>
        <UndoIcon />
      </TBtn>
      <TBtn title="Rehacer (Ctrl+Y)" onClick={() => editor.exec("redo")}>
        <RedoIcon />
      </TBtn>
      <Divider />

      {/* Estilo de bloque */}
      <select
        title="Estilo de párrafo"
        value={state.block}
        onMouseDown={() => editor.saveSelection()}
        onChange={(e) => {
          editor.restoreSelection();
          editor.setBlock(e.target.value);
        }}
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      >
        {BLOCKS.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>

      {/* Fuente */}
      <select
        title="Fuente"
        value={FONTS.includes(state.fontName) ? state.fontName : ""}
        onMouseDown={() => editor.saveSelection()}
        onChange={(e) => {
          editor.restoreSelection();
          editor.setFontName(e.target.value);
        }}
        className="ml-1 h-8 w-32 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        style={{ fontFamily: state.fontName }}
      >
        {!FONTS.includes(state.fontName) && <option value="">{state.fontName || "Fuente"}</option>}
        {FONTS.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </select>

      {/* Tamaño */}
      <select
        title="Tamaño de fuente"
        value={SIZES.includes(state.fontSize) ? state.fontSize : ""}
        onMouseDown={() => editor.saveSelection()}
        onChange={(e) => {
          editor.restoreSelection();
          editor.setFontSize(e.target.value);
        }}
        className="ml-1 h-8 w-16 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      >
        {!SIZES.includes(state.fontSize) && <option value="">{state.fontSize}</option>}
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Divider />

      {/* Estilos de carácter */}
      <TBtn title="Negrita (Ctrl+B)" active={state.bold} onClick={() => editor.exec("bold")}>
        <BoldIcon />
      </TBtn>
      <TBtn title="Cursiva (Ctrl+I)" active={state.italic} onClick={() => editor.exec("italic")}>
        <ItalicIcon />
      </TBtn>
      <TBtn
        title="Subrayado (Ctrl+U)"
        active={state.underline}
        onClick={() => editor.exec("underline")}
      >
        <UnderlineIcon />
      </TBtn>
      <TBtn
        title="Tachado"
        active={state.strikeThrough}
        onClick={() => editor.exec("strikeThrough")}
      >
        <StrikeIcon />
      </TBtn>
      <TBtn
        title="Subíndice"
        active={state.subscript}
        onClick={() => editor.exec("subscript")}
      >
        <SubscriptIcon />
      </TBtn>
      <TBtn
        title="Superíndice"
        active={state.superscript}
        onClick={() => editor.exec("superscript")}
      >
        <SuperscriptIcon />
      </TBtn>

      {/* Color de texto */}
      <div className="relative">
        <TBtn title="Color de texto" onClick={() => { editor.saveSelection(); setColorOpen((v) => !v); }}>
          <span className="flex flex-col items-center">
            <TextColorIcon />
            <span className="-mt-0.5 h-1 w-4 rounded" style={{ background: state.foreColor }} />
          </span>
        </TBtn>
        <Popover open={colorOpen} onClose={() => setColorOpen(false)}>
          <div className="grid grid-cols-6 gap-1">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { editor.setForeColor(c); setColorOpen(false); }}
                className="h-6 w-6 rounded border border-slate-300 dark:border-slate-600"
                style={{ background: c }}
              />
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            Personalizado
            <input
              type="color"
              onChange={(e) => { editor.setForeColor(e.target.value); }}
              className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
        </Popover>
      </div>

      {/* Resaltado */}
      <div className="relative">
        <TBtn title="Color de resaltado" onClick={() => { editor.saveSelection(); setHlOpen((v) => !v); }}>
          <HighlightIcon />
        </TBtn>
        <Popover open={hlOpen} onClose={() => setHlOpen(false)}>
          <div className="grid grid-cols-4 gap-1">
            {HIGHLIGHTS.map((c) => (
              <button
                key={c}
                type="button"
                title={c === "transparent" ? "Sin resaltado" : c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { editor.setHighlight(c); setHlOpen(false); }}
                className="h-6 w-8 rounded border border-slate-300 dark:border-slate-600"
                style={{
                  background: c === "transparent" ? "#fff" : c,
                  backgroundImage:
                    c === "transparent"
                      ? "linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%),linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%)"
                      : undefined,
                  backgroundSize: c === "transparent" ? "8px 8px" : undefined,
                  backgroundPosition: c === "transparent" ? "0 0,4px 4px" : undefined,
                }}
              />
            ))}
          </div>
        </Popover>
      </div>
      <Divider />

      {/* Alineación */}
      <TBtn title="Alinear a la izquierda" active={state.justifyLeft} onClick={() => editor.exec("justifyLeft")}>
        <AlignLeftIcon />
      </TBtn>
      <TBtn title="Centrar" active={state.justifyCenter} onClick={() => editor.exec("justifyCenter")}>
        <AlignCenterIcon />
      </TBtn>
      <TBtn title="Alinear a la derecha" active={state.justifyRight} onClick={() => editor.exec("justifyRight")}>
        <AlignRightIcon />
      </TBtn>
      <TBtn title="Justificar" active={state.justifyFull} onClick={() => editor.exec("justifyFull")}>
        <AlignJustifyIcon />
      </TBtn>
      <Divider />

      {/* Listas y sangría */}
      <TBtn
        title="Lista con viñetas"
        active={state.insertUnorderedList}
        onClick={() => editor.exec("insertUnorderedList")}
      >
        <ListBulletIcon />
      </TBtn>
      <TBtn
        title="Lista numerada"
        active={state.insertOrderedList}
        onClick={() => editor.exec("insertOrderedList")}
      >
        <ListOrderedIcon />
      </TBtn>
      <TBtn title="Aumentar sangría" onClick={() => editor.exec("indent")}>
        <IndentIcon />
      </TBtn>
      <TBtn title="Disminuir sangría" onClick={() => editor.exec("outdent")}>
        <OutdentIcon />
      </TBtn>
      <Divider />

      {/* Bloques especiales */}
      <TBtn
        title="Cita"
        active={state.block === "blockquote"}
        onClick={() => editor.setBlock(state.block === "blockquote" ? "p" : "blockquote")}
      >
        <QuoteIcon />
      </TBtn>
      <TBtn
        title="Bloque de código"
        active={state.block === "pre"}
        onClick={() => editor.setBlock(state.block === "pre" ? "p" : "pre")}
      >
        <CodeIcon />
      </TBtn>
      <Divider />

      {/* Insertar */}
      <TBtn title="Insertar enlace" onClick={onLink}>
        <LinkIcon />
      </TBtn>
      <TBtn title="Quitar enlace" onClick={() => editor.removeLink()}>
        <UnlinkIcon />
      </TBtn>
      <TBtn title="Insertar imagen por URL" onClick={onImage}>
        <ImageIcon />
      </TBtn>
      <div className="relative">
        <TBtn title="Insertar tabla" onClick={() => { editor.saveSelection(); setTableOpen((v) => !v); }}>
          <TableIcon />
        </TBtn>
        <Popover open={tableOpen} onClose={() => setTableOpen(false)}>
          <div className="text-center text-xs text-slate-500 dark:text-slate-400">
            {hover.r > 0 ? `${hover.r} × ${hover.c}` : "Elige el tamaño"}
          </div>
          <div
            className="mt-1 grid gap-0.5"
            style={{ gridTemplateColumns: "repeat(8, 1rem)" }}
            onMouseLeave={() => setHover({ r: 0, c: 0 })}
          >
            {Array.from({ length: 8 * 8 }).map((_, i) => {
              const r = Math.floor(i / 8) + 1;
              const c = (i % 8) + 1;
              const on = r <= hover.r && c <= hover.c;
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHover({ r, c })}
                  onClick={() => { editor.insertTable(hover.r || r, hover.c || c); setTableOpen(false); setHover({ r: 0, c: 0 }); }}
                  className={
                    "h-4 w-4 rounded-[2px] border " +
                    (on
                      ? "border-brand-500 bg-brand-300"
                      : "border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-700")
                  }
                />
              );
            })}
          </div>
        </Popover>
      </div>
      <TBtn title="Línea horizontal" onClick={() => editor.insertHR()}>
        <HrIcon />
      </TBtn>
      <Divider />

      <TBtn title="Borrar formato" onClick={() => editor.clearFormatting()}>
        <ClearFormatIcon />
      </TBtn>
    </div>
  );
}
