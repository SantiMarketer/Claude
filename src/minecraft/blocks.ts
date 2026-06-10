// Block type definitions and per-face texture-atlas tile assignments.

export const Block = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4, // log
  LEAVES: 5,
  SAND: 6,
  WATER: 7,
  PLANKS: 8,
  COBBLESTONE: 9,
  BEDROCK: 10,
  GLASS: 11,
  SNOW: 12,
  BRICK: 13,
} as const;

export type BlockId = number;

// Tile indices into the procedural texture atlas (see textures.ts).
export const Tile = {
  GRASS_TOP: 0,
  DIRT: 1,
  GRASS_SIDE: 2,
  STONE: 3,
  LOG_TOP: 4,
  LOG_SIDE: 5,
  LEAVES: 6,
  SAND: 7,
  WATER: 8,
  PLANKS: 9,
  COBBLE: 10,
  BEDROCK: 11,
  GLASS: 12,
  SNOW: 13,
  BRICK: 14,
} as const;

export interface FaceTiles {
  top: number;
  bottom: number;
  side: number;
}

const FACE_TILES: Record<number, FaceTiles> = {
  [Block.GRASS]: { top: Tile.GRASS_TOP, bottom: Tile.DIRT, side: Tile.GRASS_SIDE },
  [Block.DIRT]: { top: Tile.DIRT, bottom: Tile.DIRT, side: Tile.DIRT },
  [Block.STONE]: { top: Tile.STONE, bottom: Tile.STONE, side: Tile.STONE },
  [Block.WOOD]: { top: Tile.LOG_TOP, bottom: Tile.LOG_TOP, side: Tile.LOG_SIDE },
  [Block.LEAVES]: { top: Tile.LEAVES, bottom: Tile.LEAVES, side: Tile.LEAVES },
  [Block.SAND]: { top: Tile.SAND, bottom: Tile.SAND, side: Tile.SAND },
  [Block.WATER]: { top: Tile.WATER, bottom: Tile.WATER, side: Tile.WATER },
  [Block.PLANKS]: { top: Tile.PLANKS, bottom: Tile.PLANKS, side: Tile.PLANKS },
  [Block.COBBLESTONE]: { top: Tile.COBBLE, bottom: Tile.COBBLE, side: Tile.COBBLE },
  [Block.BEDROCK]: { top: Tile.BEDROCK, bottom: Tile.BEDROCK, side: Tile.BEDROCK },
  [Block.GLASS]: { top: Tile.GLASS, bottom: Tile.GLASS, side: Tile.GLASS },
  [Block.SNOW]: { top: Tile.SNOW, bottom: Tile.DIRT, side: Tile.SNOW },
  [Block.BRICK]: { top: Tile.BRICK, bottom: Tile.BRICK, side: Tile.BRICK },
};

const EMPTY_TILES: FaceTiles = { top: 0, bottom: 0, side: 0 };

export function faceTiles(block: BlockId): FaceTiles {
  return FACE_TILES[block] ?? EMPTY_TILES;
}

// Opaque blocks completely hide the faces behind them and cast ambient occlusion.
export function isOpaque(block: BlockId): boolean {
  return block !== Block.AIR && block !== Block.WATER && block !== Block.GLASS;
}

// Solid blocks stop the player (everything except air and water).
export function isSolid(block: BlockId): boolean {
  return block !== Block.AIR && block !== Block.WATER;
}

// Transparent blocks render in a separate, alpha-blended pass.
export function isTransparent(block: BlockId): boolean {
  return block === Block.WATER || block === Block.GLASS;
}

// Blocks the player can break/place against (water can't be targeted).
export function isTargetable(block: BlockId): boolean {
  return block !== Block.AIR && block !== Block.WATER;
}

// Display names for the HUD.
export const BLOCK_NAMES: Record<number, string> = {
  [Block.GRASS]: "Hierba",
  [Block.DIRT]: "Tierra",
  [Block.STONE]: "Piedra",
  [Block.COBBLESTONE]: "Roca",
  [Block.PLANKS]: "Tablones",
  [Block.WOOD]: "Tronco",
  [Block.LEAVES]: "Hojas",
  [Block.SAND]: "Arena",
  [Block.GLASS]: "Cristal",
  [Block.BRICK]: "Ladrillo",
  [Block.SNOW]: "Nieve",
};

// The blocks available in the hotbar, in order.
export const HOTBAR: BlockId[] = [
  Block.GRASS,
  Block.DIRT,
  Block.STONE,
  Block.COBBLESTONE,
  Block.PLANKS,
  Block.WOOD,
  Block.LEAVES,
  Block.SAND,
  Block.GLASS,
];
