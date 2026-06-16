# Escritor · Editor de texto

Un editor de texto enriquecido **tipo Microsoft Word** que funciona en el
navegador, construido con **React + Vite + TypeScript** y **Tailwind CSS**. No
necesita servidor ni conexión: todo ocurre en tu equipo.

> Esta app vive en la rama `word-editor`. Otras ramas del repositorio conservan
> apps distintas (Enfoque, clon de Minecraft).

## Características

- ✍️ **Edición enriquecida**: negrita, cursiva, subrayado, tachado, subíndice y
  superíndice.
- 🔤 **Fuentes y tamaños** reales en puntos, color de texto y resaltado.
- 🧩 **Estilos de párrafo**: texto normal, Título 1/2/3, cita y bloque de código.
- ↔️ **Alineación** (izquierda, centro, derecha, justificado), listas con
  viñetas y numeradas, y sangrías.
- 🔗 **Insertar** enlaces, imágenes (por URL o subiéndolas), **tablas** y líneas.
- 🔍 **Buscar y reemplazar** (con opción de distinguir mayúsculas).
- 🗂️ **Gestor de documentos**: crea, abre, renombra y elimina varios documentos.
  Se **autoguardan** en el navegador.
- 💾 **Exporta a archivos reales**: Word (`.doc`), HTML (`.html`), texto
  (`.txt`) y **PDF** (mediante imprimir).
- 📥 **Importa** archivos `.txt`, `.html` y `.doc`.
- 🌗 **Tema claro/oscuro**, zoom y tamaño de página A4 / Carta.

## Atajos de teclado

| Acción              | Atajo            |
| ------------------- | ---------------- |
| Negrita             | `Ctrl/Cmd + B`   |
| Cursiva             | `Ctrl/Cmd + I`   |
| Subrayado           | `Ctrl/Cmd + U`   |
| Guardar             | `Ctrl/Cmd + S`   |
| Buscar y reemplazar | `Ctrl/Cmd + F`   |
| Imprimir / PDF      | `Ctrl/Cmd + P`   |
| Deshacer / Rehacer  | `Ctrl/Cmd + Z/Y` |

## Uso en tu PC

```bash
# 1. Instalar dependencias (solo la primera vez)
npm install

# 2. Arrancar en modo desarrollo
npm run dev          # abre la URL que muestra la terminal (p. ej. http://localhost:5173)

# 3. Compilar para producción
npm run build        # genera la carpeta dist/
npm run preview      # sirve la versión compilada para probarla
```

## Estructura (`src/word/`)

| Archivo           | Responsabilidad                                          |
| ----------------- | -------------------------------------------------------- |
| `WordApp.tsx`     | App principal: layout, menú, documentos, estado          |
| `Toolbar.tsx`     | Barra de herramientas (cinta) con todos los controles    |
| `useEditor.ts`    | Hook del editor: comandos de formato y estado            |
| `FindReplace.tsx` | Panel de buscar y reemplazar                             |
| `exporters.ts`    | Exportar/importar `.doc`, `.html`, `.txt` y PDF          |
| `storage.ts`      | Guardado de documentos en `localStorage`                 |
| `icons.tsx`       | Iconos SVG de la interfaz                                 |
| `types.ts`        | Tipos compartidos                                        |
