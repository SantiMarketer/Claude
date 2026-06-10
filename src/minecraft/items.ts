// Item model: the hotbar/inventory can hold either a placeable block or a tool.
import { Block, BlockId, BLOCK_NAMES } from "./blocks";

export type Tool = "pickaxe" | "axe" | "shovel" | "sword";

export type Item =
  | { type: "block"; block: BlockId }
  | { type: "tool"; tool: Tool };

export const TOOL_NAMES: Record<Tool, string> = {
  pickaxe: "Pico",
  axe: "Hacha",
  shovel: "Pala",
  sword: "Espada",
};

interface MineInfo {
  hardness: number; // seconds to break by hand
  tool: Tool | null; // tool that speeds it up
}

const MINE: Record<number, MineInfo> = {
  [Block.GRASS]: { hardness: 0.6, tool: "shovel" },
  [Block.DIRT]: { hardness: 0.6, tool: "shovel" },
  [Block.SAND]: { hardness: 0.6, tool: "shovel" },
  [Block.SNOW]: { hardness: 0.4, tool: "shovel" },
  [Block.LEAVES]: { hardness: 0.3, tool: null },
  [Block.WOOD]: { hardness: 1.4, tool: "axe" },
  [Block.PLANKS]: { hardness: 1.4, tool: "axe" },
  [Block.STONE]: { hardness: 2.6, tool: "pickaxe" },
  [Block.COBBLESTONE]: { hardness: 2.6, tool: "pickaxe" },
  [Block.BRICK]: { hardness: 2.8, tool: "pickaxe" },
  [Block.GLASS]: { hardness: 0.4, tool: null },
  [Block.BEDROCK]: { hardness: Infinity, tool: null },
};

// Time (seconds) needed to break a block with the currently held item.
export function miningTime(block: BlockId, held: Item): number {
  const info = MINE[block] ?? { hardness: 1, tool: null };
  if (!isFinite(info.hardness)) return Infinity;
  let mult = 1;
  if (held.type === "tool" && info.tool && held.tool === info.tool) mult = 5;
  return info.hardness / mult;
}

// Damage dealt to a mob with the currently held item (out of 20 HP).
export function attackDamage(held: Item): number {
  if (held.type === "tool") return held.tool === "sword" ? 6 : 2;
  return 1;
}

export function isPlaceable(item: Item): item is { type: "block"; block: BlockId } {
  return item.type === "block";
}

export function itemName(item: Item): string {
  return item.type === "tool" ? TOOL_NAMES[item.tool] : BLOCK_NAMES[item.block] ?? "Bloque";
}

export function itemKey(item: Item): string {
  return item.type === "tool" ? "t:" + item.tool : "b:" + item.block;
}

export const TOOLS: Tool[] = ["sword", "pickaxe", "axe", "shovel"];

const PLACEABLE_BLOCKS: BlockId[] = [
  Block.GRASS,
  Block.DIRT,
  Block.STONE,
  Block.COBBLESTONE,
  Block.PLANKS,
  Block.WOOD,
  Block.LEAVES,
  Block.SAND,
  Block.GLASS,
  Block.BRICK,
  Block.SNOW,
];

// All items shown in the (creative-style) inventory.
export const PALETTE: Item[] = [
  ...TOOLS.map((t): Item => ({ type: "tool", tool: t })),
  ...PLACEABLE_BLOCKS.map((b): Item => ({ type: "block", block: b })),
];

export const DEFAULT_HOTBAR: Item[] = [
  { type: "tool", tool: "sword" },
  { type: "tool", tool: "pickaxe" },
  { type: "tool", tool: "axe" },
  { type: "tool", tool: "shovel" },
  { type: "block", block: Block.GRASS },
  { type: "block", block: Block.STONE },
  { type: "block", block: Block.PLANKS },
  { type: "block", block: Block.WOOD },
  { type: "block", block: Block.GLASS },
];
