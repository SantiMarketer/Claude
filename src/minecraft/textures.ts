import * as THREE from "three";
import { Tile } from "./blocks";

// Generates a pixel-art texture atlas on a <canvas> and returns it as a
// THREE.CanvasTexture. The atlas is a 4x4 grid of 16x16 tiles.

export const TILE_PX = 16;
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 4;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RGB = [number, number, number];

function shade([r, g, b]: RGB, f: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

interface Painter {
  (ctx: CanvasRenderingContext2D, ox: number, oy: number, rng: () => number): void;
}

// Fills the tile with a base colour and per-pixel brightness noise.
function noisy(base: RGB, spread = 0.18): Painter {
  return (ctx, ox, oy, rng) => {
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const f = 1 - spread / 2 + rng() * spread;
        ctx.fillStyle = shade(base, f);
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  };
}

function rect(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(ox + x, oy + y, w, h);
}

const PAINTERS: Record<number, Painter> = {
  [Tile.GRASS_TOP]: noisy([95, 159, 53], 0.22),
  [Tile.DIRT]: noisy([122, 80, 46], 0.22),
  [Tile.STONE]: noisy([130, 130, 134], 0.16),
  [Tile.SAND]: noisy([221, 209, 156], 0.14),
  [Tile.WATER]: noisy([54, 110, 209], 0.1),
  [Tile.SNOW]: noisy([242, 248, 255], 0.06),
  [Tile.BEDROCK]: (ctx, ox, oy, rng) => {
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const v = rng();
        const g = v < 0.5 ? 40 : v < 0.85 ? 70 : 110;
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  },
  [Tile.GRASS_SIDE]: (ctx, ox, oy, rng) => {
    // Dirt body...
    noisy([122, 80, 46], 0.22)(ctx, ox, oy, rng);
    // ...with a green crust on top (top of the texture => world-up).
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        if (y === 4 && rng() < 0.5) continue; // ragged edge
        const f = 0.85 + rng() * 0.3;
        ctx.fillStyle = shade([95, 159, 53], f);
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  },
  [Tile.LEAVES]: (ctx, ox, oy, rng) => {
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const v = rng();
        const base: RGB = v < 0.3 ? [44, 96, 32] : v < 0.7 ? [61, 122, 42] : [80, 150, 56];
        ctx.fillStyle = shade(base, 0.9 + rng() * 0.2);
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  },
  [Tile.LOG_TOP]: (ctx, ox, oy, rng) => {
    noisy([150, 110, 64], 0.12)(ctx, ox, oy, rng);
    const cx = ox + 8;
    const cy = oy + 8;
    for (let r = 6; r >= 1; r -= 2) {
      ctx.strokeStyle = shade([100, 70, 38], 1);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  [Tile.LOG_SIDE]: (ctx, ox, oy, rng) => {
    noisy([107, 79, 42], 0.14)(ctx, ox, oy, rng);
    for (let x = 0; x < TILE_PX; x += 3) {
      if (rng() < 0.6) rect(ctx, ox, oy, x, 0, 1, TILE_PX, shade([80, 56, 28], 1));
    }
  },
  [Tile.PLANKS]: (ctx, ox, oy, rng) => {
    noisy([176, 138, 79], 0.1)(ctx, ox, oy, rng);
    for (let y = 0; y < TILE_PX; y += 4) {
      rect(ctx, ox, oy, 0, y, TILE_PX, 1, shade([120, 90, 48], 1));
    }
    // Offset "nail" marks between planks.
    rect(ctx, ox, oy, 1, 1, 1, 1, shade([90, 66, 34], 1));
    rect(ctx, ox, oy, 14, 5, 1, 1, shade([90, 66, 34], 1));
    rect(ctx, ox, oy, 8, 9, 1, 1, shade([90, 66, 34], 1));
  },
  [Tile.COBBLE]: (ctx, ox, oy, rng) => {
    rect(ctx, ox, oy, 0, 0, TILE_PX, TILE_PX, shade([70, 70, 72], 1)); // mortar
    const cells = [
      [1, 1, 6, 6],
      [9, 1, 6, 5],
      [1, 9, 5, 6],
      [8, 8, 7, 7],
      [7, 0, 0, 0],
    ];
    for (const [x, y, w, h] of cells) {
      if (w === 0) continue;
      const g = 120 + Math.floor(rng() * 40);
      rect(ctx, ox, oy, x, y, w, h, `rgb(${g},${g},${g + 4})`);
    }
  },
  [Tile.GLASS]: (ctx, ox, oy) => {
    rect(ctx, ox, oy, 0, 0, TILE_PX, TILE_PX, "rgba(191,230,240,0.25)");
    rect(ctx, ox, oy, 0, 0, TILE_PX, 1, "rgba(255,255,255,0.8)");
    rect(ctx, ox, oy, 0, 0, 1, TILE_PX, "rgba(255,255,255,0.8)");
    rect(ctx, ox, oy, 0, TILE_PX - 1, TILE_PX, 1, "rgba(150,190,200,0.8)");
    rect(ctx, ox, oy, TILE_PX - 1, 0, 1, TILE_PX, "rgba(150,190,200,0.8)");
    // a subtle highlight streak
    rect(ctx, ox, oy, 3, 3, 1, 6, "rgba(255,255,255,0.5)");
    rect(ctx, ox, oy, 4, 3, 1, 3, "rgba(255,255,255,0.4)");
  },
  [Tile.BRICK]: (ctx, ox, oy, rng) => {
    rect(ctx, ox, oy, 0, 0, TILE_PX, TILE_PX, shade([200, 200, 195], 1)); // mortar
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 === 0 ? 0 : 4;
      for (let col = -1; col < 4; col++) {
        const x = col * 8 + offset;
        const g = 0.9 + rng() * 0.2;
        rect(ctx, ox, oy, x + 1, row * 4 + 1, 7, 3, shade([156, 74, 60], g));
      }
    }
  },
};

let cachedTexture: THREE.CanvasTexture | null = null;
let cachedCanvas: HTMLCanvasElement | null = null;

function getAtlasCanvas(): HTMLCanvasElement {
  if (cachedCanvas) return cachedCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * TILE_PX;
  canvas.height = ATLAS_ROWS * TILE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas context available for texture atlas");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < ATLAS_COLS * ATLAS_ROWS; i++) {
    const painter = PAINTERS[i];
    if (!painter) continue;
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    painter(ctx, col * TILE_PX, row * TILE_PX, mulberry32(0x9e37 + i * 2654435761));
  }

  cachedCanvas = canvas;
  return canvas;
}

export function createAtlasTexture(): THREE.CanvasTexture {
  if (cachedTexture) return cachedTexture;

  const texture = new THREE.CanvasTexture(getAtlasCanvas());
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  cachedTexture = texture;
  return texture;
}

// UV rectangle (with a tiny inset to prevent texture bleeding) for a tile.
export function tileUV(tile: number): { u0: number; v0: number; u1: number; v1: number } {
  const col = tile % ATLAS_COLS;
  const row = Math.floor(tile / ATLAS_COLS);
  const inset = 0.5 / (ATLAS_COLS * TILE_PX);
  const u0 = col / ATLAS_COLS + inset;
  const u1 = (col + 1) / ATLAS_COLS - inset;
  // Canvas row 0 is at the top; CanvasTexture flips Y, so map accordingly.
  const v1 = 1 - row / ATLAS_ROWS - inset;
  const v0 = 1 - (row + 1) / ATLAS_ROWS + inset;
  return { u0, v0, u1, v1 };
}


// Returns a scaled-up data URL for a single atlas tile, for use as an HUD icon.
const iconCache = new Map<number, string>();

export function tileIconDataURL(tile: number, size = 48): string {
  const cached = iconCache.get(tile);
  if (cached) return cached;

  const src = getAtlasCanvas();
  const col = tile % ATLAS_COLS;
  const row = Math.floor(tile / ATLAS_COLS);

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, col * TILE_PX, row * TILE_PX, TILE_PX, TILE_PX, 0, 0, size, size);

  const url = out.toDataURL();
  iconCache.set(tile, url);
  return url;
}
