import * as THREE from "three";
import { isSolid, isTargetable } from "./blocks";
import { World } from "./world";

export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.62;

const GRAVITY = 28;
const JUMP_SPEED = 8.6;
const WALK_SPEED = 4.8;
const SPRINT_SPEED = 7.5;
const FLY_SPEED = 9;
const FLY_SPRINT_SPEED = 18;
const MAX_FALL = 55;

export interface RaycastHit {
  // The targeted block.
  bx: number;
  by: number;
  bz: number;
  // The empty cell adjacent to the hit face (where a new block would go).
  px: number;
  py: number;
  pz: number;
}

export class Player {
  // Feet position (centre of the player's base).
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  onGround = false;
  fly = false;

  private world: World;

  constructor(world: World) {
    this.world = world;
  }

  // True if the player's AABB at the given feet position overlaps a solid block.
  private collidesAt(x: number, y: number, z: number): boolean {
    const minX = Math.floor(x - PLAYER_HALF_WIDTH);
    const maxX = Math.floor(x + PLAYER_HALF_WIDTH);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + PLAYER_HEIGHT - 0.001);
    const minZ = Math.floor(z - PLAYER_HALF_WIDTH);
    const maxZ = Math.floor(z + PLAYER_HALF_WIDTH);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          if (isSolid(this.world.getBlock(bx, by, bz))) return true;
        }
      }
    }
    return false;
  }

  // Used by block placement: would a solid block at (bx,by,bz) trap the player?
  intersectsBlock(bx: number, by: number, bz: number): boolean {
    const minX = this.pos.x - PLAYER_HALF_WIDTH;
    const maxX = this.pos.x + PLAYER_HALF_WIDTH;
    const minY = this.pos.y;
    const maxY = this.pos.y + PLAYER_HEIGHT;
    const minZ = this.pos.z - PLAYER_HALF_WIDTH;
    const maxZ = this.pos.z + PLAYER_HALF_WIDTH;
    return (
      maxX > bx &&
      minX < bx + 1 &&
      maxY > by &&
      minY < by + 1 &&
      maxZ > bz &&
      minZ < bz + 1
    );
  }

  update(dt: number, input: InputState): void {
    // Desired horizontal direction relative to the yaw.
    const forward = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // In THREE, yaw=0 looks toward -Z. Forward vector = (-sin, 0, -cos).
    let dx = -sin * forward + cos * strafe;
    let dz = -cos * forward - sin * strafe;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }

    if (this.fly) {
      const speed = input.sprint ? FLY_SPRINT_SPEED : FLY_SPEED;
      this.vel.x = dx * speed;
      this.vel.z = dz * speed;
      let vy = 0;
      if (input.jump) vy += 1;
      if (input.crouch) vy -= 1;
      this.vel.y = vy * speed;
    } else {
      const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
      this.vel.x = dx * speed;
      this.vel.z = dz * speed;
      this.vel.y -= GRAVITY * dt;
      if (this.vel.y < -MAX_FALL) this.vel.y = -MAX_FALL;
      if (input.jump && this.onGround) {
        this.vel.y = JUMP_SPEED;
        this.onGround = false;
      }
    }

    // Move with per-axis collision resolution, sub-stepped to avoid tunnelling.
    const move = new THREE.Vector3(this.vel.x * dt, this.vel.y * dt, this.vel.z * dt);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(move.x), Math.abs(move.y), Math.abs(move.z)) / 0.25));
    const step = move.divideScalar(steps);

    for (let i = 0; i < steps; i++) {
      this.moveAxis(step.x, 0, 0);
      this.moveAxis(0, 0, step.z);
      this.moveAxisY(step.y);
    }
  }

  private moveAxis(dx: number, _dy: number, dz: number): void {
    if (dx === 0 && dz === 0) return;
    const nx = this.pos.x + dx;
    const nz = this.pos.z + dz;
    if (!this.collidesAt(nx, this.pos.y, nz)) {
      this.pos.x = nx;
      this.pos.z = nz;
    } else {
      // try sliding along each axis independently
      if (dx !== 0 && !this.collidesAt(this.pos.x + dx, this.pos.y, this.pos.z)) {
        this.pos.x += dx;
        this.vel.x = 0;
      } else if (dx !== 0) {
        this.vel.x = 0;
      }
      if (dz !== 0 && !this.collidesAt(this.pos.x, this.pos.y, this.pos.z + dz)) {
        this.pos.z += dz;
        this.vel.z = 0;
      } else if (dz !== 0) {
        this.vel.z = 0;
      }
    }
  }

  private moveAxisY(dy: number): void {
    if (dy === 0) return;
    const ny = this.pos.y + dy;
    if (!this.collidesAt(this.pos.x, ny, this.pos.z)) {
      this.pos.y = ny;
      if (dy < 0) this.onGround = false;
    } else {
      if (dy < 0) {
        this.onGround = true;
      }
      this.vel.y = 0;
    }
  }

  get eyePosition(): THREE.Vector3 {
    return new THREE.Vector3(this.pos.x, this.pos.y + EYE_HEIGHT, this.pos.z);
  }

  // Fast voxel ray traversal (Amanatides & Woo) from the camera.
  raycast(maxDist = 6): RaycastHit | null {
    const origin = this.eyePosition;
    const dir = new THREE.Vector3(0, 0, -1);
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, "YXZ");
    dir.applyEuler(euler);

    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = Math.sign(dir.x);
    const stepY = Math.sign(dir.y);
    const stepZ = Math.sign(dir.z);

    const tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;

    const boundary = (o: number, s: number) => (s > 0 ? Math.floor(o) + 1 - o : o - Math.floor(o));
    let tMaxX = dir.x !== 0 ? boundary(origin.x, stepX) * tDeltaX : Infinity;
    let tMaxY = dir.y !== 0 ? boundary(origin.y, stepY) * tDeltaY : Infinity;
    let tMaxZ = dir.z !== 0 ? boundary(origin.z, stepZ) * tDeltaZ : Infinity;

    let px = x;
    let py = y;
    let pz = z;

    for (let i = 0; i < 256; i++) {
      if (isTargetable(this.world.getBlock(x, y, z))) {
        return { bx: x, by: y, bz: z, px, py, pz };
      }
      px = x;
      py = y;
      pz = z;
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        if (tMaxX > maxDist) break;
        x += stepX;
        tMaxX += tDeltaX;
      } else if (tMaxY < tMaxZ) {
        if (tMaxY > maxDist) break;
        y += stepY;
        tMaxY += tDeltaY;
      } else {
        if (tMaxZ > maxDist) break;
        z += stepZ;
        tMaxZ += tDeltaZ;
      }
    }
    return null;
  }
}

export interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  sprint: boolean;
}
