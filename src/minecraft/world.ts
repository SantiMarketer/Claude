import { Block, BlockId } from "./blocks";
import { Perlin } from "./noise";

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 64;
export const SEA_LEVEL = 24;

const SNOW_LEVEL = 45;

export function chunkKey(cx: number, cz: number): string {
  return cx + "," + cz;
}

export class Chunk {
  readonly cx: number;
  readonly cz: number;
  readonly data: Uint8Array;
  generated = false;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.data = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
  }

  static index(lx: number, ly: number, lz: number): number {
    return (ly * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
  }

  get(lx: number, ly: number, lz: number): BlockId {
    return this.data[Chunk.index(lx, ly, lz)];
  }

  set(lx: number, ly: number, lz: number, id: BlockId): void {
    this.data[Chunk.index(lx, ly, lz)] = id;
  }
}

// Deterministic hash in [0, 1) from two integers — used for tree placement.
function hash2(x: number, z: number, salt: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(salt, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class World {
  private chunks = new Map<string, Chunk>();
  private perlin: Perlin;
  // Chunk keys whose voxel data changed and whose mesh must be rebuilt.
  readonly dirty = new Set<string>();

  constructor(seed = 20260610) {
    this.perlin = new Perlin(seed);
  }

  private heightAt(wx: number, wz: number): number {
    const base = this.perlin.fbm(wx * 0.008, wz * 0.008, 4) * 18;
    const detail = this.perlin.fbm(wx * 0.04, wz * 0.04, 2) * 4;
    const h = Math.floor(SEA_LEVEL + 4 + base + detail);
    return Math.max(1, Math.min(WORLD_HEIGHT - 2, h));
  }

  ensureChunk(cx: number, cz: number): Chunk {
    const key = chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz);
      this.chunks.set(key, chunk);
    }
    if (!chunk.generated) this.generateChunk(chunk);
    return chunk;
  }

  getChunkIfLoaded(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cz));
  }

  private generateChunk(chunk: Chunk): void {
    const { cx, cz } = chunk;
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const h = this.heightAt(wx, wz);
        const beach = h <= SEA_LEVEL + 1;

        for (let y = 0; y < WORLD_HEIGHT; y++) {
          let id: BlockId = Block.AIR;
          if (y === 0) {
            id = Block.BEDROCK;
          } else if (y < h) {
            if (y === h - 1) {
              // surface block
              if (beach) id = Block.SAND;
              else if (h > SNOW_LEVEL) id = Block.SNOW;
              else id = Block.GRASS;
            } else if (y >= h - 4) {
              id = beach ? Block.SAND : Block.DIRT;
            } else {
              id = Block.STONE;
            }
          } else if (y <= SEA_LEVEL) {
            id = Block.WATER;
          }
          if (id !== Block.AIR) chunk.set(lx, y, lz, id);
        }
      }
    }

    // Trees — kept fully inside the chunk to avoid cross-chunk writes.
    for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
      for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const h = this.heightAt(wx, wz);
        if (h <= SEA_LEVEL + 1 || h > SNOW_LEVEL) continue; // only on grass
        if (chunk.get(lx, h - 1, lz) !== Block.GRASS) continue;
        if (hash2(wx, wz, 7) > 0.018) continue;
        this.plantTree(chunk, lx, h, lz, wx, wz);
      }
    }

    chunk.generated = true;
  }

  private plantTree(chunk: Chunk, lx: number, baseY: number, lz: number, wx: number, wz: number): void {
    const trunk = 4 + Math.floor(hash2(wx, wz, 31) * 3);
    const topY = baseY + trunk;

    // Canopy
    for (let dy = -2; dy <= 1; dy++) {
      const y = topY + dy;
      if (y < 0 || y >= WORLD_HEIGHT) continue;
      const radius = dy >= 0 ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          // round off the corners of the widest layers
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && radius === 2) continue;
          const x = lx + dx;
          const z = lz + dz;
          if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) continue;
          if (chunk.get(x, y, z) === Block.AIR) chunk.set(x, y, z, Block.LEAVES);
        }
      }
    }

    // Trunk (drawn after leaves so it stays visible through the canopy).
    for (let y = baseY; y < topY; y++) {
      if (y >= 0 && y < WORLD_HEIGHT) chunk.set(lx, y, lz, Block.WOOD);
    }
  }

  getBlock(x: number, y: number, z: number): BlockId {
    if (y < 0 || y >= WORLD_HEIGHT) return Block.AIR;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.ensureChunk(cx, cz);
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    return chunk.get(lx, y, lz);
  }

  setBlock(x: number, y: number, z: number, id: BlockId): void {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.ensureChunk(cx, cz);
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    chunk.set(lx, y, lz, id);

    this.dirty.add(chunkKey(cx, cz));
    // Neighbouring chunk meshes also change when editing a border block.
    if (lx === 0) this.dirty.add(chunkKey(cx - 1, cz));
    if (lx === CHUNK_SIZE - 1) this.dirty.add(chunkKey(cx + 1, cz));
    if (lz === 0) this.dirty.add(chunkKey(cx, cz - 1));
    if (lz === CHUNK_SIZE - 1) this.dirty.add(chunkKey(cx, cz + 1));
  }
}
