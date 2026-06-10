import * as THREE from "three";
import { faceTiles } from "./blocks";
import { tileIconDataURL } from "./textures";
import { Item, Tool } from "./items";

// Procedurally drawn 16x16 pixel-art tool sprites, used both as HUD icons and
// as the texture for the first-person view-model.

const SIZE = 16;

type Setter = (x: number, y: number, color: string) => void;

function makeSetter(ctx: CanvasRenderingContext2D): Setter {
  return (x, y, color) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };
}

function line(set: Setter, x0: number, y0: number, x1: number, y1: number, color: string, thick = 1): void {
  // Bresenham with optional thickness.
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  const half = Math.floor(thick / 2);
  for (;;) {
    for (let ox = -half; ox <= half; ox++) {
      for (let oy = -half; oy <= half; oy++) set(x + ox, y + oy, color);
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

const WOOD = "#6b4f2a";
const WOOD_DARK = "#503a1d";
const STONE = "#9a9a9e";
const STONE_DARK = "#6f6f73";
const IRON = "#d7dae0";
const IRON_DARK = "#9aa0ab";

function paintTool(ctx: CanvasRenderingContext2D, tool: Tool): void {
  const set = makeSetter(ctx);
  switch (tool) {
    case "pickaxe":
      line(set, 6, 12, 10, 6, WOOD, 2);
      line(set, 3, 7, 8, 4, STONE, 2);
      line(set, 8, 4, 13, 7, STONE, 2);
      line(set, 4, 6, 8, 4, STONE_DARK, 1);
      break;
    case "axe":
      line(set, 6, 13, 10, 5, WOOD, 2);
      // head
      for (let y = 3; y <= 8; y++) {
        const w = 5 - Math.abs(y - 5);
        for (let x = 0; x < w; x++) set(9 + x, y, x === w - 1 ? STONE_DARK : STONE);
      }
      break;
    case "shovel":
      line(set, 8, 12, 8, 6, WOOD, 2);
      // blade
      for (let y = 2; y <= 6; y++) {
        for (let x = 6; x <= 10; x++) {
          set(x, y, x === 10 || y === 6 ? STONE_DARK : STONE);
        }
      }
      break;
    case "sword":
      // blade
      for (let y = 2; y <= 10; y++) set(8, y, y % 2 === 0 ? IRON : IRON_DARK);
      set(8, 1, IRON);
      set(9, 3, IRON_DARK);
      // guard + handle
      line(set, 6, 11, 10, 11, WOOD, 1);
      line(set, 8, 12, 8, 14, WOOD_DARK, 1);
      break;
  }
}

const toolCanvasCache = new Map<Tool, HTMLCanvasElement>();

function getToolCanvas(tool: Tool): HTMLCanvasElement {
  const cached = toolCanvasCache.get(tool);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    paintTool(ctx, tool);
  }
  toolCanvasCache.set(tool, canvas);
  return canvas;
}

const toolTextureCache = new Map<Tool, THREE.CanvasTexture>();

export function getToolTexture(tool: Tool): THREE.CanvasTexture {
  const cached = toolTextureCache.get(tool);
  if (cached) return cached;
  const tex = new THREE.CanvasTexture(getToolCanvas(tool));
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  toolTextureCache.set(tool, tex);
  return tex;
}

const toolIconCache = new Map<Tool, string>();

export function toolIconDataURL(tool: Tool, scale = 3): string {
  const cached = toolIconCache.get(tool);
  if (cached) return cached;
  const src = getToolCanvas(tool);
  const out = document.createElement("canvas");
  out.width = SIZE * scale;
  out.height = SIZE * scale;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, out.width, out.height);
  const url = out.toDataURL();
  toolIconCache.set(tool, url);
  return url;
}

// Unified icon helper for any item (block or tool), for the HUD.
export function itemIconDataURL(item: Item): string {
  return item.type === "tool" ? toolIconDataURL(item.tool) : tileIconDataURL(faceTiles(item.block).side);
}
