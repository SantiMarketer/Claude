# Minecraft · Voxel Clone

Un clon de Minecraft que corre en el navegador, construido con **React + Vite +
TypeScript** y un motor de voxels propio sobre **Three.js**.

> Nota: este clon vive en la rama `minecraft-clone`. La rama `main` conserva la
> app original "Enfoque".

## Características

- 🌍 **Mundo procedural infinito** generado con ruido Perlin (colinas, playas,
  océanos y árboles). Los chunks se cargan y descargan alrededor del jugador.
- ⛏️ **Romper y colocar bloques** con raycasting de voxels (algoritmo DDA).
- 🧱 **Atlas de texturas pixel-art** generado proceduralmente en un `<canvas>`
  (hierba, tierra, piedra, roca, tablones, tronco, hojas, arena, cristal…).
- 🚶 **Física en primera persona**: gravedad, salto, colisión AABB con el mundo
  y un **modo vuelo**.
- 💡 **Iluminación por oclusión ambiental** horneada en los vértices y agua
  semitransparente.
- 🎒 **Hotbar** con 9 bloques seleccionables.

## Controles

| Acción            | Tecla / Ratón                |
| ----------------- | ---------------------------- |
| Moverse           | `W` `A` `S` `D`              |
| Mirar             | Ratón                        |
| Saltar            | `Espacio`                    |
| Correr            | `Ctrl`                       |
| Romper bloque     | Clic izquierdo               |
| Colocar bloque    | Clic derecho                 |
| Elegir bloque     | `1`–`9` o rueda del ratón    |
| Volar (toggle)    | `F`                          |
| Volar arriba/abajo| `Espacio` / `Shift`          |
| Liberar el ratón  | `Esc`                        |

Necesita teclado y ratón (usa el control de puntero del navegador), así que
juégalo en un ordenador de escritorio.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # comprobación de tipos + build de producción
```

## Estructura del motor (`src/minecraft/`)

| Archivo             | Responsabilidad                                        |
| ------------------- | ------------------------------------------------------ |
| `noise.ts`          | Ruido Perlin 2D + fBm para el terreno                  |
| `blocks.ts`         | Tipos de bloque, tiles del atlas y propiedades         |
| `textures.ts`       | Generación procedural del atlas de texturas            |
| `world.ts`          | Chunks, generación de terreno, agua y árboles          |
| `mesher.ts`         | Construcción de la malla por chunk (culling + AO)      |
| `player.ts`         | Física, colisión y raycast de voxels                   |
| `game.ts`           | Bucle, render, streaming de chunks e interacción       |
| `MinecraftGame.tsx` | Componente React + HUD (mira, hotbar, instrucciones)   |
