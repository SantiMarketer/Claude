import * as THREE from "three";
import { Block, BlockId, faceTiles, isOpaque, isTransparent } from "./blocks";
import { tileUV } from "./textures";
import { World, CHUNK_SIZE, WORLD_HEIGHT } from "./world";

type FaceKind = "top" | "bottom" | "side";

interface FaceDef {
  // outward normal (also the direction of the occluding/neighbour cell)
  n: [number, number, number];
  // the two axis indices tangent to this face (0 = x, 1 = y, 2 = z)
  tangents: [number, number];
  // 4 corner offsets, CCW seen from outside
  corners: [number, number, number][];
  kind: FaceKind;
  shade: number;
}

// Known-good CCW (front-facing) winding for a unit cube [0,1]^3.
const FACES: FaceDef[] = [
  {
    n: [1, 0, 0],
    tangents: [1, 2],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    kind: "side",
    shade: 0.72,
  },
  {
    n: [-1, 0, 0],
    tangents: [1, 2],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    kind: "side",
    shade: 0.72,
  },
  {
    n: [0, 1, 0],
    tangents: [0, 2],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    kind: "top",
    shade: 1.0,
  },
  {
    n: [0, -1, 0],
    tangents: [0, 2],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    kind: "bottom",
    shade: 0.5,
  },
  {
    n: [0, 0, 1],
    tangents: [0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    kind: "side",
    shade: 0.86,
  },
  {
    n: [0, 0, -1],
    tangents: [0, 1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    kind: "side",
    shade: 0.86,
  },
];

const AO_LEVELS = [0.45, 0.62, 0.82, 1.0];

function faceVisible(current: BlockId, neighbor: BlockId): boolean {
  if (neighbor === Block.AIR) return true;
  if (isOpaque(neighbor)) return false;
  // neighbour is transparent (water / glass)
  if (neighbor === current) return false; // hide shared faces between same type
  return true;
}

export interface ChunkGeometryResult {
  opaque: THREE.BufferGeometry | null;
  transparent: THREE.BufferGeometry | null;
}

interface MeshBuffer {
  positions: number[];
  colors: number[];
  uvs: number[];
  indices: number[];
}

function emptyBuffer(): MeshBuffer {
  return { positions: [], colors: [], uvs: [], indices: [] };
}

function finalize(buf: MeshBuffer): THREE.BufferGeometry | null {
  if (buf.positions.length === 0) return null;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(buf.positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(buf.colors, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(buf.uvs, 2));
  geom.setIndex(buf.indices);
  geom.computeBoundingSphere();
  return geom;
}

export function buildChunkGeometry(world: World, cx: number, cz: number): ChunkGeometryResult {
  const chunk = world.ensureChunk(cx, cz);
  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;

  const opaque = emptyBuffer();
  const transparent = emptyBuffer();

  for (let ly = 0; ly < WORLD_HEIGHT; ly++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const block = chunk.get(lx, ly, lz);
        if (block === Block.AIR) continue;

        const wx = baseX + lx;
        const wy = ly;
        const wz = baseZ + lz;
        const buf = isTransparent(block) ? transparent : opaque;
        const tiles = faceTiles(block);

        for (const face of FACES) {
          const nx = wx + face.n[0];
          const ny = wy + face.n[1];
          const nz = wz + face.n[2];
          const neighbor = world.getBlock(nx, ny, nz);
          if (!faceVisible(block, neighbor)) continue;

          const tile =
            face.kind === "top" ? tiles.top : face.kind === "bottom" ? tiles.bottom : tiles.side;
          const { u0, v0, u1, v1 } = tileUV(tile);
          const uvCorners = [
            [u0, v0],
            [u1, v0],
            [u1, v1],
            [u0, v1],
          ];

          const start = buf.positions.length / 3;
          const [ta, tb] = face.tangents;

          for (let i = 0; i < 4; i++) {
            const corner = face.corners[i];
            // local position relative to chunk origin
            buf.positions.push(lx + corner[0], ly + corner[1], lz + corner[2]);
            buf.uvs.push(uvCorners[i][0], uvCorners[i][1]);

            // Ambient occlusion from the three neighbours around this vertex.
            const sa = corner[ta] === 1 ? 1 : -1;
            const sb = corner[tb] === 1 ? 1 : -1;
            const off1 = [face.n[0], face.n[1], face.n[2]];
            const off2 = [face.n[0], face.n[1], face.n[2]];
            const offc = [face.n[0], face.n[1], face.n[2]];
            off1[ta] += sa;
            off2[tb] += sb;
            offc[ta] += sa;
            offc[tb] += sb;

            const s1 = isOpaque(world.getBlock(wx + off1[0], wy + off1[1], wz + off1[2])) ? 1 : 0;
            const s2 = isOpaque(world.getBlock(wx + off2[0], wy + off2[1], wz + off2[2])) ? 1 : 0;
            const cc = isOpaque(world.getBlock(wx + offc[0], wy + offc[1], wz + offc[2])) ? 1 : 0;
            const level = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
            const brightness = face.shade * AO_LEVELS[level];
            buf.colors.push(brightness, brightness, brightness);
          }

          buf.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
        }
      }
    }
  }

  return { opaque: finalize(opaque), transparent: finalize(transparent) };
}
