# Minecraft · Voxel Clone

Un clon de Minecraft que corre en el navegador, construido con **React + Vite +
TypeScript** y un motor de voxels propio sobre **Three.js**.

> Nota: este clon vive en la rama `minecraft-clone`. La rama `main` conserva la
> app original "Enfoque".

## Características

- 🌍 **Mundo procedural infinito** generado con ruido Perlin (colinas, playas,
  océanos y árboles). Los chunks se cargan y descargan alrededor del jugador.
- ⛏️ **Romper y colocar bloques** con raycasting de voxels (algoritmo DDA). Romper
  bloques lleva tiempo según su **dureza** y la **herramienta** usada.
- 🧰 **Herramientas**: pico, hacha, pala y espada. Cada una acelera su tipo de
  bloque; la espada hace más daño en combate.
- 🧱 **Atlas de texturas pixel-art** generado proceduralmente en un `<canvas>`
  (hierba, tierra, piedra, roca, tablones, tronco, hojas, arena, cristal…).
- ✋ **Mano del jugador en primera persona** con el item sostenido y animación de
  golpeo/balanceo.
- 🎒 **Inventario** (tecla `E`) estilo creativo para asignar bloques y herramientas
  a la barra rápida.
- ❤️ **Vida** con corazones, **daño por caída**, daño de enemigos y regeneración
  lenta. Pantalla de muerte y reaparición.
- 🧟 **Enemigos (zombis)** que aparecen, te persiguen, saltan obstáculos y atacan;
  puedes derrotarlos golpeándolos (mejor con espada).
- 🏃 **Sprint** pulsando `Ctrl` o dando **doble toque a `W`**.
- 🚶 **Física en primera persona**: gravedad, salto, colisión AABB y modo vuelo.

## Controles

| Acción              | Tecla / Ratón                |
| ------------------- | ---------------------------- |
| Moverse             | `W` `A` `S` `D`              |
| Mirar               | Ratón                        |
| Correr              | Doble `W` o `Ctrl`           |
| Saltar              | `Espacio`                    |
| Romper / atacar     | Clic izquierdo (mantener para minar) |
| Colocar bloque      | Clic derecho                 |
| Elegir item         | `1`–`9` o rueda del ratón    |
| Inventario          | `E`                          |
| Volar (toggle)      | `F`                          |
| Volar arriba/abajo  | `Espacio` / `Shift`          |
| Liberar el ratón    | `Esc`                        |

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
| `items.ts`          | Items, herramientas, dureza y daño                     |
| `textures.ts`       | Generación procedural del atlas de texturas            |
| `itemTextures.ts`   | Sprites pixel-art de las herramientas e iconos         |
| `world.ts`          | Chunks, generación de terreno, agua y árboles          |
| `mesher.ts`         | Construcción de la malla por chunk (culling + AO)      |
| `player.ts`         | Física, colisión, vida, daño por caída y raycast       |
| `mobs.ts`           | Enemigos: IA, física, spawn y combate                  |
| `viewmodel.ts`      | Mano del jugador e item sostenido en primera persona   |
| `game.ts`           | Bucle, render, streaming de chunks e interacción       |
| `MinecraftGame.tsx` | Componente React + HUD (vida, hotbar, inventario, etc.)|
