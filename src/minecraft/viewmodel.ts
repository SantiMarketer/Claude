import * as THREE from "three";
import { faceTiles } from "./blocks";
import { createAtlasTexture, tileUV } from "./textures";
import { getToolTexture } from "./itemTextures";
import { Item, itemKey } from "./items";

// First-person "view-model": the player's arm plus the held block/tool,
// rendered in a separate overlay pass so it always draws on top of the world.

// Builds a small textured cube for a held block, with simple face shading.
function buildBlockCube(block: number): THREE.BufferGeometry {
  const tiles = faceTiles(block);
  const faces = [
    { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], tile: tiles.side, s: 0.72 },
    { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], tile: tiles.side, s: 0.72 },
    { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], tile: tiles.top, s: 1.0 },
    { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], tile: tiles.bottom, s: 0.5 },
    { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], tile: tiles.side, s: 0.86 },
    { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], tile: tiles.side, s: 0.86 },
  ];

  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const f of faces) {
    const { u0, v0, u1, v1 } = tileUV(f.tile);
    const uvc = [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ];
    const start = positions.length / 3;
    for (let i = 0; i < 4; i++) {
      const c = f.c[i];
      positions.push(c[0] - 0.5, c[1] - 0.5, c[2] - 0.5);
      colors.push(f.s, f.s, f.s);
      uvs.push(uvc[i][0], uvc[i][1]);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return geom;
}

export class ViewModel {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private root: THREE.Group; // overall sway/swing transform
  private arm: THREE.Mesh;
  private itemHolder: THREE.Group;
  private currentKey = "";

  private blockMaterial: THREE.MeshBasicMaterial;
  private disposables: THREE.BufferGeometry[] = [];

  private swing = 0; // 0..1 animation progress
  private swinging = false;
  private bob = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.01, 10);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    const atlas = createAtlasTexture();
    this.blockMaterial = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true });

    // Skin-coloured forearm, always visible.
    const armGeom = new THREE.BoxGeometry(0.16, 0.5, 0.16);
    this.disposables.push(armGeom);
    this.arm = new THREE.Mesh(armGeom, new THREE.MeshBasicMaterial({ color: 0xc98a5a }));
    this.arm.position.set(0.42, -0.5, -0.7);
    this.arm.rotation.set(-0.5, 0.2, 0.3);
    this.root.add(this.arm);

    this.itemHolder = new THREE.Group();
    this.root.add(this.itemHolder);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setItem(item: Item): void {
    const key = itemKey(item);
    if (key === this.currentKey) return;
    this.currentKey = key;

    // Clear previous held object.
    while (this.itemHolder.children.length > 0) {
      const child = this.itemHolder.children[0] as THREE.Mesh;
      this.itemHolder.remove(child);
      if (child.material && (child.material as THREE.Material).dispose && child.material !== this.blockMaterial) {
        (child.material as THREE.Material).dispose();
      }
    }

    if (item.type === "block") {
      const geom = buildBlockCube(item.block);
      this.disposables.push(geom);
      const cube = new THREE.Mesh(geom, this.blockMaterial);
      cube.scale.setScalar(0.32);
      cube.position.set(0.5, -0.42, -0.85);
      cube.rotation.set(0.1, -0.5, 0);
      this.itemHolder.add(cube);
      this.arm.position.set(0.36, -0.62, -0.62);
    } else {
      const tex = getToolTexture(item.tool);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), mat);
      this.disposables.push(plane.geometry as THREE.BufferGeometry);
      plane.position.set(0.5, -0.4, -0.85);
      plane.rotation.set(0, -0.3, -0.5);
      this.itemHolder.add(plane);
      this.arm.position.set(0.34, -0.66, -0.66);
    }
  }

  triggerSwing(): void {
    if (!this.swinging) {
      this.swinging = true;
      this.swing = 0;
    }
  }

  update(dt: number, moving: boolean): void {
    // Swing animation.
    if (this.swinging) {
      this.swing += dt / 0.22;
      if (this.swing >= 1) {
        this.swing = 0;
        this.swinging = false;
      }
    }
    const s = this.swinging ? Math.sin(this.swing * Math.PI) : 0;

    // Walk bob.
    this.bob += moving ? dt * 9 : 0;
    const bobX = moving ? Math.cos(this.bob) * 0.012 : 0;
    const bobY = moving ? Math.abs(Math.sin(this.bob)) * 0.02 : 0;

    this.root.position.set(bobX, -bobY - s * 0.18, 0);
    this.root.rotation.set(-s * 0.9, s * 0.4, 0);
  }

  render(renderer: THREE.WebGLRenderer): void {
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = prevAutoClear;
  }

  dispose(): void {
    for (const g of this.disposables) g.dispose();
    this.blockMaterial.dispose();
    (this.arm.material as THREE.Material).dispose();
  }
}
