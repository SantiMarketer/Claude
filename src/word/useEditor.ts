// Hook que encapsula el editor enriquecido basado en contentEditable.
// Usa document.execCommand (ampliamente soportado en navegadores actuales)
// y añade utilidades para tamaño de fuente en puntos, tablas, enlaces e
// imágenes, además del seguimiento del estado de formato de la selección.

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormatState } from "./types";

const EMPTY_STATE: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  subscript: false,
  superscript: false,
  justifyLeft: true,
  justifyCenter: false,
  justifyRight: false,
  justifyFull: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  fontName: "Calibri",
  fontSize: "11",
  block: "p",
  foreColor: "#1f2937",
};

export function useEditor(editorRef: React.RefObject<HTMLDivElement>) {
  const [state, setState] = useState<FormatState>(EMPTY_STATE);
  const savedRange = useRef<Range | null>(null);

  /** Devuelve el editor enfocado y listo para recibir comandos. */
  const focusEditor = useCallback(() => {
    const el = editorRef.current;
    if (el && document.activeElement !== el) el.focus();
  }, [editorRef]);

  /** Guarda la selección/cursor actual para restaurarla más tarde. */
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
      }
    }
  }, [editorRef]);

  /** Restaura la selección guardada (tras usar un input de color o diálogo). */
  const restoreSelection = useCallback(() => {
    const range = savedRange.current;
    if (!range) return;
    focusEditor();
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [focusEditor]);

  /** Ejecuta un comando del editor sobre la selección actual. */
  const exec = useCallback(
    (command: string, value?: string) => {
      focusEditor();
      try {
        document.execCommand("styleWithCSS", false, "true");
      } catch {
        /* algunos navegadores no lo soportan; no es crítico */
      }
      document.execCommand(command, false, value);
      refreshState();
    },
    [focusEditor],
  );

  /** Aplica un tamaño de fuente real en puntos (px → pt no, usamos pt). */
  const setFontSize = useCallback(
    (pt: string) => {
      focusEditor();
      // execCommand("fontSize") solo admite 1–7; usamos 7 como marcador y
      // luego reescribimos esos nodos con el tamaño en puntos deseado.
      document.execCommand("fontSize", false, "7");
      const editor = editorRef.current;
      if (!editor) return;
      const fonts = editor.querySelectorAll('font[size="7"]');
      fonts.forEach((f) => {
        const el = f as HTMLElement;
        el.removeAttribute("size");
        el.style.fontSize = `${pt}pt`;
      });
      refreshState();
    },
    [editorRef, focusEditor],
  );

  const setFontName = useCallback(
    (name: string) => exec("fontName", name),
    [exec],
  );

  /** Cambia el bloque (párrafo, encabezados, cita, código). */
  const setBlock = useCallback(
    (tag: string) => exec("formatBlock", tag),
    [exec],
  );

  const setForeColor = useCallback(
    (color: string) => {
      restoreSelection();
      exec("foreColor", color);
    },
    [exec, restoreSelection],
  );

  const setHighlight = useCallback(
    (color: string) => {
      restoreSelection();
      // hiliteColor funciona en la mayoría de navegadores con styleWithCSS;
      // backColor es el alternativo.
      focusEditor();
      try {
        document.execCommand("styleWithCSS", false, "true");
      } catch {
        /* noop */
      }
      if (!document.execCommand("hiliteColor", false, color)) {
        document.execCommand("backColor", false, color);
      }
      refreshState();
    },
    [focusEditor, restoreSelection],
  );

  /** Inserta un enlace sobre la selección. */
  const insertLink = useCallback(
    (url: string) => {
      restoreSelection();
      exec("createLink", url);
      // Abrir en pestaña nueva por defecto.
      const editor = editorRef.current;
      editor?.querySelectorAll('a[href="' + url + '"]').forEach((a) => {
        (a as HTMLAnchorElement).target = "_blank";
        (a as HTMLAnchorElement).rel = "noopener noreferrer";
      });
    },
    [editorRef, exec, restoreSelection],
  );

  const removeLink = useCallback(() => exec("unlink"), [exec]);

  /** Inserta HTML arbitrario en la posición del cursor. */
  const insertHTML = useCallback(
    (html: string) => {
      restoreSelection();
      focusEditor();
      document.execCommand("insertHTML", false, html);
      refreshState();
    },
    [focusEditor, restoreSelection],
  );

  /** Inserta una imagen desde una URL o data-URL. */
  const insertImage = useCallback(
    (src: string) => {
      insertHTML(
        `<img src="${src}" alt="" style="max-width:100%;height:auto;" />`,
      );
    },
    [insertHTML],
  );

  /** Inserta una tabla de filas × columnas con bordes. */
  const insertTable = useCallback(
    (rows: number, cols: number) => {
      const cell =
        '<td style="border:1px solid #bbb;padding:6px 8px;min-width:40px;">&nbsp;</td>';
      let html =
        '<table style="border-collapse:collapse;width:100%;margin:8px 0;">';
      for (let r = 0; r < rows; r++) {
        html += "<tr>" + cell.repeat(cols) + "</tr>";
      }
      html += "</table><p><br></p>";
      insertHTML(html);
    },
    [insertHTML],
  );

  const insertHR = useCallback(() => exec("insertHorizontalRule"), [exec]);

  const clearFormatting = useCallback(() => {
    exec("removeFormat");
    exec("unlink");
    setBlock("p");
  }, [exec, setBlock]);

  /** Lee el estado de formato actual desde la selección. */
  const refreshState = useCallback(() => {
    if (!editorRef.current) return;
    const q = (c: string) => {
      try {
        return document.queryCommandState(c);
      } catch {
        return false;
      }
    };
    const v = (c: string) => {
      try {
        return document.queryCommandValue(c) || "";
      } catch {
        return "";
      }
    };
    let block = (v("formatBlock") || "p").toLowerCase();
    if (block === "" || block === "div") block = "p";

    let fontSize = "11";
    const rawSize = v("fontSize");
    // Si hay un nodo con estilo de tamaño, intentamos leerlo de la selección.
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).startContainer;
      if (node && node.nodeType === 3) node = node.parentElement;
      if (node && (node as HTMLElement).closest) {
        const el = (node as HTMLElement).closest(
          "[style*='font-size']",
        ) as HTMLElement | null;
        if (el && el.style.fontSize) {
          fontSize = el.style.fontSize.replace(/pt|px/g, "").trim();
        } else if (rawSize) {
          // Mapeo aproximado de la escala 1–7 a puntos.
          const map: Record<string, string> = {
            "1": "8",
            "2": "10",
            "3": "12",
            "4": "14",
            "5": "18",
            "6": "24",
            "7": "36",
          };
          fontSize = map[rawSize] || "11";
        }
      }
    }

    let fontName = v("fontName").replace(/['"]/g, "").split(",")[0].trim();
    if (!fontName) fontName = "Calibri";

    let foreColor = v("foreColor") || "#1f2937";
    foreColor = rgbToHex(foreColor);

    setState({
      bold: q("bold"),
      italic: q("italic"),
      underline: q("underline"),
      strikeThrough: q("strikeThrough"),
      subscript: q("subscript"),
      superscript: q("superscript"),
      justifyLeft: q("justifyLeft"),
      justifyCenter: q("justifyCenter"),
      justifyRight: q("justifyRight"),
      justifyFull: q("justifyFull"),
      insertUnorderedList: q("insertUnorderedList"),
      insertOrderedList: q("insertOrderedList"),
      fontName,
      fontSize,
      block,
      foreColor,
    });
  }, [editorRef]);

  // Mantener el estado sincronizado con la selección del usuario.
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (
        sel &&
        sel.rangeCount > 0 &&
        editorRef.current?.contains(sel.anchorNode)
      ) {
        saveSelection();
        refreshState();
      }
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [editorRef, refreshState, saveSelection]);

  return {
    state,
    exec,
    setFontSize,
    setFontName,
    setBlock,
    setForeColor,
    setHighlight,
    insertLink,
    removeLink,
    insertImage,
    insertTable,
    insertHR,
    insertHTML,
    clearFormatting,
    saveSelection,
    restoreSelection,
    refreshState,
  };
}

/** Convierte "rgb(r, g, b)" a hexadecimal; deja el valor si ya es hex. */
function rgbToHex(color: string): string {
  if (!color) return "#1f2937";
  if (color.startsWith("#")) return color;
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return "#1f2937";
  const hex = (n: string) => Number(n).toString(16).padStart(2, "0");
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}
