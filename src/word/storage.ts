// Persistencia de documentos en localStorage. Soporta múltiples documentos,
// uno "actual", y es tolerante a errores (modo incógnito, cuota llena, etc.).

import type { WordDoc } from "./types";

const DOCS_KEY = "word.docs.v1";
const CURRENT_KEY = "word.current.v1";

/** Genera un id único razonablemente seguro sin dependencias. */
export function createId(): string {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9)
  );
}

/** Plantilla de un documento nuevo y vacío. */
export function newDoc(title = "Documento sin título"): WordDoc {
  const now = Date.now();
  return {
    id: createId(),
    title,
    html: "<p><br></p>",
    createdAt: now,
    updatedAt: now,
  };
}

/** Lee todos los documentos guardados, ordenados por última edición. */
export function loadDocs(): WordDoc[] {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WordDoc[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d) => d && typeof d.id === "string")
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/** Guarda la lista completa de documentos. */
export function saveDocs(docs: WordDoc[]): void {
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch {
    // Almacenamiento no disponible: se ignora silenciosamente.
  }
}

/** Inserta o actualiza un documento y devuelve la lista resultante. */
export function upsertDoc(doc: WordDoc): WordDoc[] {
  const docs = loadDocs();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) docs[idx] = doc;
  else docs.push(doc);
  saveDocs(docs);
  return docs;
}

/** Elimina un documento por id. */
export function deleteDoc(id: string): WordDoc[] {
  const docs = loadDocs().filter((d) => d.id !== id);
  saveDocs(docs);
  return docs;
}

export function getCurrentId(): string | null {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

export function setCurrentId(id: string): void {
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {
    // Ignorado.
  }
}
