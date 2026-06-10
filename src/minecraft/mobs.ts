import * as THREE from "three";
import { isSolid } from "./blocks";
import { World, WORLD_HEIGHT, SEA_LEVEL } from "./world";

// Simple hostile mobs (zombies): wander toward the player, deal contact damage,
// take damage from the player, and obey basic gravity/collision.

const MOB_HALF_WIDTH = 0.3;
const MOB_HEIGHT = 1.85;
const GRAVITY = 28;
const MAX_FALL = 55;
const MOVE_SPEED = 2.6;
const DETECT_RANGE = 26;
const ATTACK_RANGE = 1.7;
const ATTACK_DAMAGE = 3;
const ATTACK_COOLDOWN = 1.0;
const MAX_MOBS = 6;
const SPAWN_INTERVAL = 3.0;
const DESPAWN_RANGE = 60;

const SKIN = 0x4a7a3a;
const SHIRT = 0x2f6f6f;
const PANTS = 0x2d2d5a;

function collides(world: World, x: number, y: number, z: number): boolean {
  const minX = Math.floor(x - MOB_HALF_WIDTH);
  const maxX = Math.floor(x + MOB_HALF_WIDTH);
  const minY = Math.floor(y);
  const maxY = Math.floor(y + MOB_HEIGHT - 0.001);
  const minZ = Math.floor(z - MOB_HALF_WIDTH);
  const maxZ = Math.floor(z + MOB_HALF_WIDTH);
  for (let bx = minX; bx <= maxX; bx++) {
    for (let by = minY; by <= maxY; by++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        if (isSolid(world.getBlock(bx, by, bz))) return true;
      }
    }
  }
  return false;
}

interface PartMaterials {
  materials: THREE.MeshBasicMaterial[];
  baseColors: number[];
}

function buildZombieMesh(): { group: THREE.Group; parts: PartMaterials } {
  const group = new THREE.Group();
  const materials: THREE.MeshBasicMaterial[] = [];
  const baseColors: number[] = [];

  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, color: number) => {
    const mat = new THREE.MeshBasicMaterial({ color });
    materials.push(mat);
    baseColors.push(color);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };

  // y measured from the feet (group origin at feet centre).
  addBox(0.22, 0.7, 0.22, -0.12, 0.35, 0, PANTS); // left leg
  addBox(0.22, 0.7, 0.22, 0.12, 0.35, 0, PANTS); // right leg
  addBox(0.5, 0.6, 0.26, 0, 1.0, 0, SHIRT); // torso
  addBox(0.18, 0.55, 0.18, -0.34, 1.05, 0.06, SKIN); // left arm (slightly forward)
  addBox(0.18, 0.55, 0.18, 0.34, 1.05, 0.06, SKIN); // right arm
  addBox(0.5, 0.5, 0.5, 0, 1.55, 0, SKIN); // head

  return { group, parts: { materials, baseColors } };
}

export class Mob {
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  health = 10;
  dead = false;
  onGround = false;
  private cooldown = 0;
  private hurtTimer = 0;
  readonly mesh: THREE.Group;
  private parts: PartMaterials;

  constructor(x: number, y: number, z: number) {
    const { group, parts } = buildZombieMesh();
    this.mesh = group;
    this.parts = parts;
    this.pos.set(x, y, z);
    this.mesh.position.copy(this.pos);
  }

  applyHit(damage: number, dirX: number, dirZ: number, world: World): void {
    this.health -= damage;
    this.hurtTimer = 0.25;
    if (this.health <= 0) {
      this.dead = true;
      return;
    }
    // Knock-back: nudge position directly so it is visible despite AI steering.
    const nx = this.pos.x + dirX * 0.55;
    const nz = this.pos.z + dirZ * 0.55;
    if (!collides(world, nx, this.pos.y, nz)) {
      this.pos.x = nx;
      this.pos.z = nz;
    }
    if (this.onGround) this.vel.y = 4.5;
  }

  private moveAxis(world: World, dx: number, dz: number): boolean {
    let blocked = false;
    if (dx !== 0) {
      if (!collides(world, this.pos.x + dx, this.pos.y, this.pos.z)) this.pos.x += dx;
      else blocked = true;
    }
    if (dz !== 0) {
      if (!collides(world, this.pos.x, this.pos.y, this.pos.z + dz)) this.pos.z += dz;
      else blocked = true;
    }
    return blocked;
  }

  private moveY(world: World, dy: number): void {
    const ny = this.pos.y + dy;
    if (!collides(world, this.pos.x, ny, this.pos.z)) {
      this.pos.y = ny;
      if (dy < 0) this.onGround = false;
    } else {
      if (dy < 0) this.onGround = true;
      this.vel.y = 0;
    }
  }

  update(dt: number, target: THREE.Vector3, world: World, onAttack: (dmg: number, fromX: number, fromZ: number) => void): void {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (this.hurtTimer <= 0) this.restoreColors();
      else this.flashColors();
    }

    const dx = target.x - this.pos.x;
    const dz = target.z - this.pos.z;
    const distH = Math.hypot(dx, dz);
    const dy = target.y - this.pos.y;

    let wishX = 0;
    let wishZ = 0;
    if (distH > 0.001 && distH < DETECT_RANGE && distH > ATTACK_RANGE * 0.6) {
      wishX = (dx / distH) * MOVE_SPEED;
      wishZ = (dz / distH) * MOVE_SPEED;
      this.mesh.rotation.y = Math.atan2(dx, dz);
    }

    // Gravity.
    this.vel.y -= GRAVITY * dt;
    if (this.vel.y < -MAX_FALL) this.vel.y = -MAX_FALL;

    const blocked = this.moveAxis(world, wishX * dt, wishZ * dt);
    if (blocked && this.onGround && (wishX !== 0 || wishZ !== 0)) {
      this.vel.y = 7.2; // hop over a one-block step
      this.onGround = false;
    }
    this.moveY(world, this.vel.y * dt);

    // Attack the player on contact.
    if (distH < ATTACK_RANGE && Math.abs(dy) < 2.0 && this.cooldown <= 0) {
      this.cooldown = ATTACK_COOLDOWN;
      const inv = distH > 0.001 ? 1 / distH : 0;
      onAttack(ATTACK_DAMAGE, this.pos.x, this.pos.z);
      // small lunge
      this.pos.x += dx * inv * 0.1;
      this.pos.z += dz * inv * 0.1;
    }

    this.mesh.position.copy(this.pos);
  }

  private flashColors(): void {
    for (const m of this.parts.materials) m.color.setRGB(1, 0.3, 0.3);
  }

  private restoreColors(): void {
    for (let i = 0; i < this.parts.materials.length; i++) {
      this.parts.materials[i].color.setHex(this.parts.baseColors[i]);
    }
  }

  dispose(): void {
    this.mesh.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) (mesh.material as THREE.Material).dispose();
    });
  }
}

export class MobManager {
  private scene: THREE.Scene;
  private world: World;
  readonly mobs: Mob[] = [];
  private spawnAccum = 0;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
  }

  private surfaceHeight(x: number, z: number): number {
    for (let y = WORLD_HEIGHT - 1; y >= 1; y--) {
      if (isSolid(this.world.getBlock(x, y, z))) return y;
    }
    return -1;
  }

  private trySpawn(player: THREE.Vector3): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 16 + Math.random() * 10;
    const x = Math.floor(player.x + Math.cos(angle) * dist) + 0.5;
    const z = Math.floor(player.z + Math.sin(angle) * dist) + 0.5;
    const surf = this.surfaceHeight(Math.floor(x), Math.floor(z));
    if (surf < 1 || surf <= SEA_LEVEL) return; // skip water / invalid
    const feetY = surf + 1;
    if (collides(this.world, x, feetY, z)) return;
    const mob = new Mob(x, feetY, z);
    this.scene.add(mob.mesh);
    this.mobs.push(mob);
  }

  update(dt: number, player: THREE.Vector3, onPlayerDamage: (dmg: number, fromX: number, fromZ: number) => void): void {
    this.spawnAccum += dt;
    if (this.spawnAccum >= SPAWN_INTERVAL) {
      this.spawnAccum = 0;
      if (this.mobs.length < MAX_MOBS) this.trySpawn(player);
    }

    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      mob.update(dt, player, this.world, onPlayerDamage);
      const far = Math.hypot(mob.pos.x - player.x, mob.pos.z - player.z) > DESPAWN_RANGE;
      if (mob.dead || far || mob.pos.y < -8) {
        this.scene.remove(mob.mesh);
        mob.dispose();
        this.mobs.splice(i, 1);
      }
    }
  }

  // Ray vs mob test for the player's attack. Returns the nearest mob hit.
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): Mob | null {
    let best: Mob | null = null;
    let bestT = maxDist;
    const toMob = new THREE.Vector3();
    for (const mob of this.mobs) {
      // aim at the mob's chest
      toMob.set(mob.pos.x - origin.x, mob.pos.y + 1.0 - origin.y, mob.pos.z - origin.z);
      const t = toMob.dot(dir);
      if (t < 0 || t > bestT) continue;
      const perp = Math.sqrt(Math.max(0, toMob.lengthSq() - t * t));
      if (perp < 0.7) {
        best = mob;
        bestT = t;
      }
    }
    return best;
  }

  clear(): void {
    for (const mob of this.mobs) {
      this.scene.remove(mob.mesh);
      mob.dispose();
    }
    this.mobs.length = 0;
  }

  dispose(): void {
    this.clear();
  }
}
