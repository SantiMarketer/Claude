import * as THREE from "three";
import { Block, isSolid } from "./blocks";
import { buildChunkGeometry } from "./mesher";
import { createAtlasTexture } from "./textures";
import { InputState, Player, MAX_HEALTH } from "./player";
import { World, CHUNK_SIZE, WORLD_HEIGHT, chunkKey } from "./world";
import { Item, DEFAULT_HOTBAR, miningTime, attackDamage } from "./items";
import { ViewModel } from "./viewmodel";
import { MobManager } from "./mobs";

export interface GameHooks {
  onSelect: (index: number) => void;
  onHotbar: (items: Item[]) => void;
  onFps: (fps: number) => void;
  onLockChange: (locked: boolean) => void;
  onPosition: (x: number, y: number, z: number) => void;
  onHealth: (hp: number, max: number) => void;
  onHurt: () => void;
  onDeath: () => void;
  onInventory: (open: boolean) => void;
  onSprint: (sprinting: boolean) => void;
  onMineProgress: (progress: number) => void;
}

interface ChunkMeshes {
  opaque: THREE.Mesh | null;
  transparent: THREE.Mesh | null;
}

const RENDER_DISTANCE = 7;
const BUILD_PER_FRAME = 3;
const BLOCK_REACH = 5;
const MOB_REACH = 3.6;

export class Game {
  private container: HTMLElement;
  private hooks: GameHooks;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private world: World;
  private player: Player;
  private viewModel: ViewModel;
  private mobs: MobManager;

  private opaqueMaterial: THREE.MeshBasicMaterial;
  private transparentMaterial: THREE.MeshBasicMaterial;
  private highlight: THREE.LineSegments;

  private meshes = new Map<string, ChunkMeshes>();
  private buildQueue: Array<[number, number]> = [];
  private queued = new Set<string>();
  private offsets: Array<[number, number]> = [];

  private keys = new Set<string>();
  private hotbar: Item[] = DEFAULT_HOTBAR.map((it) => ({ ...it }));
  private selected = 0;
  private locked = false;
  private inventoryOpen = false;
  private dead = false;

  // interaction state
  private leftHeld = false;
  private miningKey = "";
  private miningProgress = 0;
  private miningNeeded = 0;
  private lastMineBucket = -1;

  // health bookkeeping
  private lastHealth = MAX_HEALTH;
  private sinceDamage = 99;
  private regenAccum = 0;

  // double-tap W sprint
  private lastWTap = 0;
  private sprintDouble = false;
  private lastSprint = false;

  private spawnPos = new THREE.Vector3(0.5, 40, 0.5);

  private running = false;
  private lastTime = 0;
  private frameAccum = 0;
  private frameCount = 0;
  private lastChunkKey = "";
  private rafId = 0;

  constructor(container: HTMLElement, hooks: GameHooks) {
    this.container = container;
    this.hooks = hooks;

    this.world = new World();
    this.player = new Player(this.world);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x87ceeb);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x9fd2ec, (RENDER_DISTANCE - 2) * CHUNK_SIZE, RENDER_DISTANCE * CHUNK_SIZE);

    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      (RENDER_DISTANCE + 1) * CHUNK_SIZE
    );
    this.camera.rotation.order = "YXZ";

    const atlas = createAtlasTexture();
    this.opaqueMaterial = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true });
    this.transparentMaterial = new THREE.MeshBasicMaterial({
      map: atlas,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlight = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })
    );
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    this.viewModel = new ViewModel();
    this.viewModel.setAspect(container.clientWidth / container.clientHeight);
    this.viewModel.setItem(this.currentItem());

    this.mobs = new MobManager(this.scene, this.world);

    this.precomputeOffsets();
    this.spawnPlayer();
    this.bindEvents();
  }

  // --- setup helpers -------------------------------------------------------

  private precomputeOffsets(): void {
    const r = RENDER_DISTANCE;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz <= r * r) this.offsets.push([dx, dz]);
      }
    }
    this.offsets.sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1]));
  }

  private spawnPlayer(): void {
    let groundY = WORLD_HEIGHT - 1;
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      if (isSolid(this.world.getBlock(0, y, 0))) {
        groundY = y;
        break;
      }
    }
    this.spawnPos.set(0.5, groundY + 1, 0.5);
    this.player.pos.copy(this.spawnPos);
    this.player.yaw = Math.PI / 4;
    this.player.onSpawn();

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        this.buildChunkMesh(dx, dz);
      }
    }
  }

  private currentItem(): Item {
    return this.hotbar[this.selected];
  }

  // --- chunk mesh management ----------------------------------------------

  private disposeMeshes(entry: ChunkMeshes): void {
    if (entry.opaque) {
      this.scene.remove(entry.opaque);
      entry.opaque.geometry.dispose();
    }
    if (entry.transparent) {
      this.scene.remove(entry.transparent);
      entry.transparent.geometry.dispose();
    }
  }

  private buildChunkMesh(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    const existing = this.meshes.get(key);
    if (existing) this.disposeMeshes(existing);

    const { opaque, transparent } = buildChunkGeometry(this.world, cx, cz);
    const entry: ChunkMeshes = { opaque: null, transparent: null };

    if (opaque) {
      const mesh = new THREE.Mesh(opaque, this.opaqueMaterial);
      mesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
      this.scene.add(mesh);
      entry.opaque = mesh;
    }
    if (transparent) {
      const mesh = new THREE.Mesh(transparent, this.transparentMaterial);
      mesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
      mesh.renderOrder = 1;
      this.scene.add(mesh);
      entry.transparent = mesh;
    }
    this.meshes.set(key, entry);
  }

  private updateChunks(): void {
    const pcx = Math.floor(this.player.pos.x / CHUNK_SIZE);
    const pcz = Math.floor(this.player.pos.z / CHUNK_SIZE);
    const key = pcx + "," + pcz;

    if (key !== this.lastChunkKey) {
      this.lastChunkKey = key;
      this.buildQueue = [];
      this.queued.clear();
      for (const [dx, dz] of this.offsets) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const k = chunkKey(cx, cz);
        if (!this.meshes.has(k)) {
          this.buildQueue.push([cx, cz]);
          this.queued.add(k);
        }
      }
      const maxR = RENDER_DISTANCE + 1;
      for (const [k, entry] of this.meshes) {
        const [cxs, czs] = k.split(",");
        const cx = parseInt(cxs, 10);
        const cz = parseInt(czs, 10);
        if (Math.abs(cx - pcx) > maxR || Math.abs(cz - pcz) > maxR) {
          this.disposeMeshes(entry);
          this.meshes.delete(k);
        }
      }
    }

    if (this.world.dirty.size > 0) {
      for (const k of this.world.dirty) {
        const [cxs, czs] = k.split(",");
        this.buildChunkMesh(parseInt(cxs, 10), parseInt(czs, 10));
      }
      this.world.dirty.clear();
    }

    let built = 0;
    while (built < BUILD_PER_FRAME && this.buildQueue.length > 0) {
      const next = this.buildQueue.shift()!;
      const k = chunkKey(next[0], next[1]);
      this.queued.delete(k);
      if (!this.meshes.has(k)) {
        this.buildChunkMesh(next[0], next[1]);
        built++;
      }
    }
  }

  // --- interaction ---------------------------------------------------------

  private updateHighlight(): void {
    const hit = this.player.raycast(BLOCK_REACH);
    if (hit) {
      this.highlight.visible = true;
      this.highlight.position.set(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5);
    } else {
      this.highlight.visible = false;
    }
  }

  private resetMining(): void {
    if (this.miningKey !== "" || this.miningProgress !== 0) {
      this.miningKey = "";
      this.miningProgress = 0;
      this.lastMineBucket = -1;
      this.hooks.onMineProgress(0);
    }
  }

  private updateMining(dt: number): void {
    if (!this.leftHeld) {
      this.resetMining();
      return;
    }
    // Don't mine through a mob standing in front of us.
    const eye = this.player.eyePosition;
    const fwd = this.player.getForward();
    if (this.mobs.raycast(eye, fwd, MOB_REACH)) {
      this.resetMining();
      return;
    }

    const hit = this.player.raycast(BLOCK_REACH);
    if (!hit) {
      this.resetMining();
      return;
    }
    const block = this.world.getBlock(hit.bx, hit.by, hit.bz);
    if (block === Block.BEDROCK) {
      this.resetMining();
      return;
    }

    const key = hit.bx + "," + hit.by + "," + hit.bz;
    if (key !== this.miningKey) {
      this.miningKey = key;
      this.miningProgress = 0;
      this.miningNeeded = miningTime(block, this.currentItem());
    }

    this.miningProgress += dt;
    this.viewModel.triggerSwing();

    const p = Math.min(1, this.miningProgress / this.miningNeeded);
    const bucket = Math.floor(p * 10);
    if (bucket !== this.lastMineBucket) {
      this.lastMineBucket = bucket;
      this.hooks.onMineProgress(p);
    }

    if (this.miningProgress >= this.miningNeeded) {
      this.world.setBlock(hit.bx, hit.by, hit.bz, Block.AIR);
      this.resetMining();
    }
  }

  private attack(): void {
    const eye = this.player.eyePosition;
    const fwd = this.player.getForward();
    const mob = this.mobs.raycast(eye, fwd, MOB_REACH);
    this.viewModel.triggerSwing();
    if (mob) {
      const dmg = attackDamage(this.currentItem());
      const horiz = Math.hypot(fwd.x, fwd.z) || 1;
      mob.applyHit(dmg, fwd.x / horiz, fwd.z / horiz, this.world);
    }
  }

  private placeBlock(): void {
    const item = this.currentItem();
    if (item.type !== "block") return;
    const hit = this.player.raycast(BLOCK_REACH);
    if (!hit) return;
    if (isSolid(item.block) && this.player.intersectsBlock(hit.px, hit.py, hit.pz)) return;
    if (this.world.getBlock(hit.px, hit.py, hit.pz) !== Block.AIR) return;
    this.world.setBlock(hit.px, hit.py, hit.pz, item.block);
    this.viewModel.triggerSwing();
  }

  private setSelected(index: number): void {
    const n = this.hotbar.length;
    this.selected = ((index % n) + n) % n;
    this.resetMining();
    this.viewModel.setItem(this.currentItem());
    this.hooks.onSelect(this.selected);
  }

  selectSlot(index: number): void {
    if (index >= 0 && index < this.hotbar.length) this.setSelected(index);
  }

  assignToSelected(item: Item): void {
    this.hotbar[this.selected] = { ...item };
    this.resetMining();
    this.viewModel.setItem(this.currentItem());
    this.hooks.onHotbar(this.hotbar.map((it) => ({ ...it })));
  }

  // --- inventory / death ---------------------------------------------------

  private openInventory(): void {
    if (this.dead || this.inventoryOpen) return;
    this.inventoryOpen = true;
    this.leftHeld = false;
    this.resetMining();
    document.exitPointerLock();
    this.hooks.onInventory(true);
  }

  closeInventory(): void {
    if (!this.inventoryOpen) return;
    this.inventoryOpen = false;
    this.hooks.onInventory(false);
    this.container.requestPointerLock();
  }

  private enterDeath(): void {
    if (this.dead) return;
    this.dead = true;
    this.leftHeld = false;
    this.resetMining();
    document.exitPointerLock();
    this.hooks.onDeath();
  }

  respawn(): void {
    this.player.respawn(this.spawnPos.x, this.spawnPos.y, this.spawnPos.z);
    this.dead = false;
    this.mobs.clear();
    this.lastHealth = MAX_HEALTH;
    this.sinceDamage = 99;
    this.hooks.onHealth(MAX_HEALTH, MAX_HEALTH);
    this.container.requestPointerLock();
  }

  // --- event handling ------------------------------------------------------

  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    this.keys.add(code);

    if (code === "KeyW" && !e.repeat) {
      const now = performance.now();
      if (now - this.lastWTap < 280) this.sprintDouble = true;
      this.lastWTap = now;
    }

    if (code.startsWith("Digit")) {
      const n = parseInt(code.slice(5), 10);
      if (n >= 1 && n <= this.hotbar.length) this.setSelected(n - 1);
    }
    if (code === "KeyF" && !this.inventoryOpen && !this.dead) this.player.fly = !this.player.fly;
    if (code === "KeyE") {
      if (this.inventoryOpen) this.closeInventory();
      else if (this.locked) this.openInventory();
    }
    if (code === "Escape" && this.inventoryOpen) this.closeInventory();
    if (this.locked && (code === "Space" || code.startsWith("Arrow"))) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    if (e.code === "KeyW") this.sprintDouble = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.locked) return;
    const sens = 0.0022;
    this.player.yaw -= e.movementX * sens;
    this.player.pitch -= e.movementY * sens;
    const limit = Math.PI / 2 - 0.01;
    this.player.pitch = Math.max(-limit, Math.min(limit, this.player.pitch));
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (this.inventoryOpen || this.dead) return;
    if (!this.locked) {
      this.container.requestPointerLock();
      return;
    }
    if (e.button === 0) {
      this.leftHeld = true;
      this.attack();
    } else if (e.button === 2) {
      this.placeBlock();
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.leftHeld = false;
      this.resetMining();
    }
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.locked) return;
    e.preventDefault();
    this.setSelected(this.selected + (e.deltaY > 0 ? 1 : -1));
  };

  private onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private onPointerLockChange = (): void => {
    this.locked = document.pointerLockElement === this.container;
    if (!this.locked) {
      this.leftHeld = false;
      this.resetMining();
    }
    this.hooks.onLockChange(this.locked);
  };

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewModel.setAspect(w / h);
  };

  private bindEvents(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    this.container.addEventListener("mousedown", this.onMouseDown);
    this.container.addEventListener("contextmenu", this.onContextMenu);
    this.container.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private unbindEvents(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    this.container.removeEventListener("mousedown", this.onMouseDown);
    this.container.removeEventListener("contextmenu", this.onContextMenu);
    this.container.removeEventListener("wheel", this.onWheel);
  }

  private readInput(): InputState {
    const sprint = this.keys.has("ControlLeft") || this.keys.has("KeyR") || this.sprintDouble;
    if (sprint !== this.lastSprint) {
      this.lastSprint = sprint;
      this.hooks.onSprint(sprint);
    }
    return {
      forward: this.keys.has("KeyW"),
      back: this.keys.has("KeyS"),
      left: this.keys.has("KeyA"),
      right: this.keys.has("KeyD"),
      jump: this.keys.has("Space"),
      crouch: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"),
      sprint,
    };
  }

  private onPlayerDamage = (dmg: number): void => {
    if (this.dead) return;
    this.player.applyDamage(dmg);
    this.sinceDamage = 0;
    this.regenAccum = 0;
    this.hooks.onHurt();
    if (this.player.onGround) this.player.vel.y = 4;
  };

  private updateRegen(dt: number): void {
    this.sinceDamage += dt;
    if (this.player.health < MAX_HEALTH && this.sinceDamage > 5) {
      this.regenAccum += dt;
      if (this.regenAccum >= 1.5) {
        this.regenAccum = 0;
        this.player.heal(1);
      }
    }
  }

  private reportHealth(): void {
    if (this.player.health !== this.lastHealth) {
      this.lastHealth = this.player.health;
      this.hooks.onHealth(this.player.health, MAX_HEALTH);
    }
  }

  // --- main loop -----------------------------------------------------------

  private tick = (time: number): void => {
    if (!this.running) return;
    const dt = this.lastTime === 0 ? 0 : Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    const active = this.locked && !this.inventoryOpen && !this.dead;
    const moving =
      active && (this.keys.has("KeyW") || this.keys.has("KeyA") || this.keys.has("KeyS") || this.keys.has("KeyD"));

    if (active) {
      this.player.update(dt, this.readInput());
      this.updateMining(dt);
      this.updateRegen(dt);
    }

    const eye = this.player.eyePosition;
    this.camera.position.copy(eye);
    this.camera.rotation.set(this.player.pitch, this.player.yaw, 0);

    this.updateChunks();

    if (active) {
      this.mobs.update(dt, this.player.pos, this.onPlayerDamage);
      this.updateHighlight();
    } else {
      this.highlight.visible = false;
    }

    if (this.player.dead) this.enterDeath();
    this.reportHealth();

    this.viewModel.update(dt, moving);

    this.renderer.render(this.scene, this.camera);
    this.viewModel.render(this.renderer);

    this.frameAccum += dt;
    this.frameCount++;
    if (this.frameAccum >= 0.25) {
      this.hooks.onFps(Math.round(this.frameCount / this.frameAccum));
      this.hooks.onPosition(this.player.pos.x, this.player.pos.y, this.player.pos.z);
      this.frameAccum = 0;
      this.frameCount = 0;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = 0;
    this.hooks.onSelect(this.selected);
    this.hooks.onHotbar(this.hotbar.map((it) => ({ ...it })));
    this.hooks.onHealth(this.player.health, MAX_HEALTH);
    this.rafId = requestAnimationFrame(this.tick);
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.unbindEvents();
    for (const entry of this.meshes.values()) this.disposeMeshes(entry);
    this.meshes.clear();
    this.mobs.dispose();
    this.viewModel.dispose();
    this.opaqueMaterial.dispose();
    this.transparentMaterial.dispose();
    (this.highlight.material as THREE.Material).dispose();
    this.highlight.geometry.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
