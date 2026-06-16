// Exportación e importación de documentos a archivos reales que el usuario
// puede abrir fuera de la app: Word (.doc), HTML (.html), texto (.txt) e
// impresión/PDF mediante el diálogo del navegador.

/** Descarga un Blob con el nombre indicado. */
function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberar la URL tras un breve margen para que el descargador la use.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Limpia el título para usarlo como nombre de archivo. */
function safeName(title: string, ext: string): string {
  const base =
    title.trim().replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80) || "documento";
  return `${base}.${ext}`;
}

/** Estilos base que se incrustan en las exportaciones para fidelidad visual. */
const BASE_STYLES = `
  body { font-family: Calibri, "Segoe UI", Arial, sans-serif; font-size: 11pt; color: #1f2937; line-height: 1.5; }
  h1 { font-size: 22pt; } h2 { font-size: 17pt; } h3 { font-size: 14pt; }
  blockquote { border-left: 3px solid #c7ccd6; margin: 8px 0; padding: 4px 14px; color: #555; }
  pre { background: #f3f4f6; padding: 10px 12px; border-radius: 6px; font-family: "Consolas", monospace; white-space: pre-wrap; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #999; padding: 6px 8px; }
  img { max-width: 100%; height: auto; }
  a { color: #1d56f5; }
`;

/**
 * Exporta a un archivo .doc que Microsoft Word, LibreOffice y Google Docs
 * abren conservando el formato. Es HTML con la cabecera de Office/Word.
 */
export function exportDoc(title: string, bodyHtml: string): void {
  const header =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
    'xmlns="http://www.w3.org/TR/REC-html40">';
  const html = `${header}<head><meta charset="utf-8"><title>${escapeHtml(
    title,
  )}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>@page { size: A4; margin: 2.5cm; } ${BASE_STYLES}</style>
</head><body>${bodyHtml}</body></html>`;
  // El BOM ayuda a Word a detectar UTF-8 correctamente.
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  download(blob, safeName(title, "doc"));
}

/** Exporta a un archivo HTML autónomo y bien formado. */
export function exportHtml(title: string, bodyHtml: string): void {
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>body{max-width:820px;margin:40px auto;padding:0 24px;}${BASE_STYLES}</style>
</head><body>${bodyHtml}</body></html>`;
  download(new Blob([html], { type: "text/html;charset=utf-8" }), safeName(title, "html"));
}

/** Exporta solo el texto plano del documento. */
export function exportTxt(title: string, plainText: string): void {
  download(
    new Blob([plainText], { type: "text/plain;charset=utf-8" }),
    safeName(title, "txt"),
  );
}

/**
 * Abre el diálogo de impresión del navegador para guardar como PDF.
 * Se renderiza el contenido en una ventana nueva con los estilos del documento.
 */
export function printDocument(title: string, bodyHtml: string): void {
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) {
    alert(
      "El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.",
    );
    return;
  }
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>@page { size: A4; margin: 2cm; } ${BASE_STYLES}</style>
</head><body>${bodyHtml}</body></html>`);
  win.document.close();
  win.focus();
  // Pequeña espera para que las imágenes/fuentes carguen antes de imprimir.
  setTimeout(() => {
    win.print();
  }, 350);
}

/**
 * Importa un archivo y devuelve { title, html } listo para cargar en el editor.
 * Soporta .txt, .html, .htm y .doc (HTML de Word).
 */
export function importFile(file: File): Promise<{ title: string; html: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const name = file.name.replace(/\.[^.]+$/, "");
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".txt")) {
        const html = text
          .split(/\r?\n/)
          .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : "<p><br></p>"))
          .join("");
        resolve({ title: name, html: html || "<p><br></p>" });
        return;
      }
      // HTML o DOC (que en realidad es HTML): extraer el contenido del body.
      const body = extractBody(text);
      resolve({ title: name, html: body || "<p><br></p>" });
    };
    reader.readAsText(file);
  });
}

/** Extrae el contenido interior de <body> de una cadena HTML. */
function extractBody(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const inner = match ? match[1] : html;
  // Quitar comentarios condicionales de Office y etiquetas de script/style.
  return inner
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
