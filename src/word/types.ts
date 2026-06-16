// Tipos compartidos del editor de texto tipo Word.

/** Un documento guardado en el almacenamiento local. */
export interface WordDoc {
  id: string;
  title: string;
  /** Contenido HTML enriquecido del cuerpo del documento. */
  html: string;
  createdAt: number;
  updatedAt: number;
}

/** Tamaño de página soportado para la vista y la exportación. */
export type PageSize = "a4" | "letter";

/** Estado de formato de la selección actual, usado para resaltar la barra. */
export interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  subscript: boolean;
  superscript: boolean;
  justifyLeft: boolean;
  justifyCenter: boolean;
  justifyRight: boolean;
  justifyFull: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
  fontName: string;
  fontSize: string;
  block: string;
  foreColor: string;
}
