import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLOR_FACE_OPTIONS, SIZE_FACES, type ColorFace, type SizeFace } from './game/rules';

type DieKind = 'color' | 'size';
type PrototypePhase = 'idle' | 'gather' | 'tumble' | 'settle';

interface FaceAsset {
  key: ColorFace | SizeFace;
  label: string;
  url: string;
}

interface TextureLoadOptions {
  tintNearBlackTo?: string;
}

interface VirtualDicePrototypeOptions {
  title?: string;
  subtitle?: string;
  mode?: 'full' | 'modal';
  disableGlowEffects?: boolean;
  backgroundAssetUrl?: string;
  showInteractiveControls?: boolean;
  onRollComplete?: (result: { colorFace: ColorFace; sizeFace: SizeFace }) => void;
}

export interface VirtualDicePrototypeControls {
  root: HTMLElement;
  roll: () => void;
  rollToFaces: (colorFace: ColorFace, sizeFace: SizeFace) => void;
  dispose: () => void;
}

interface DieRuntime {
  kind: DieKind;
  group: THREE.Group;
  mesh: THREE.Mesh<RoundedBoxGeometry, THREE.MeshBasicMaterial[]>;
  edgeLines: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  shadow: THREE.Sprite;
  glow: THREE.Sprite;
  materials: THREE.MeshBasicMaterial[];
  basePosition: THREE.Vector3;
  gatherPosition: THREE.Vector3;
  settleQuaternion: THREE.Quaternion;
  settleStartQuaternion: THREE.Quaternion;
  tumbleAxis: THREE.Vector3;
  tumbleSpeed: number;
  tumbleTwist: number;
  faceIndex: number;
  targetFaceIndex: number;
}

interface PrototypeState {
  phase: PrototypePhase;
  phaseStartedAt: number;
  rollStartedAt: number;
  phaseEndsAt: number;
  status: string;
  ready: boolean;
  hasRolled: boolean;
  colorFaceIndex: number;
  sizeFaceIndex: number;
}

const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1)
] as const;

const GATHER_DURATION = 340;
const TUMBLE_DURATION = 2800;
const SETTLE_DURATION = 1400;
const TOTAL_ROLL_DURATION = GATHER_DURATION + TUMBLE_DURATION + SETTLE_DURATION;
const DICE_RADIUS = 0.88;
const DICE_EDGE_RADIUS = 0.18;
const DICE_SEGMENTS = 6;

const COLOR_FACE_REGISTRY: readonly FaceAsset[] = [
  {
    key: 'azure',
    label: 'Azure',
    url: new URL('../art/SVG/Die Symbols/Club.svg', import.meta.url).href
  },
  {
    key: 'violet',
    label: 'Violet',
    url: new URL('../art/SVG/Die Symbols/HEart.svg', import.meta.url).href
  },
  {
    key: 'amber',
    label: 'Amber',
    url: new URL('../art/SVG/Die Symbols/Diamond.svg', import.meta.url).href
  },
  {
    key: 'emerald',
    label: 'Emerald',
    url: new URL('../art/SVG/Die Symbols/Star.svg', import.meta.url).href
  },
  {
    key: 'coral',
    label: 'Coral',
    url: new URL('../art/SVG/Die Symbols/Clover.svg', import.meta.url).href
  },
  {
    key: 'atom',
    label: 'Atom',
    url: new URL('../art/SVG/Die Symbols/Atom.svg', import.meta.url).href
  }
];

const SIZE_FACE_REGISTRY: readonly FaceAsset[] = [
  {
    key: 'small',
    label: 'Small',
    url: new URL('../art/SVG/Die Shapes/Pyramid Dice Single Sm.svg', import.meta.url).href
  },
  {
    key: 'medium',
    label: 'Medium',
    url: new URL('../art/SVG/Die Shapes/Pyramid Dice Single Md.svg', import.meta.url).href
  },
  {
    key: 'large',
    label: 'Large',
    url: new URL('../art/SVG/Die Shapes/Pyramid Dice Single Lg.svg', import.meta.url).href
  },
  {
    key: 'small-medium',
    label: 'Small / Medium',
    url: new URL('../art/SVG/Die Shapes/Pyramid Dice Sm and Md.svg', import.meta.url).href
  },
  {
    key: 'medium-large',
    label: 'Medium / Large',
    url: new URL('../art/SVG/Die Shapes/Pyramid Dice Sm amd Lg.svg', import.meta.url).href
  },
  {
    key: 'small-large',
    label: 'Small / Large',
    url: new URL('../art/SVG/Die Shapes/Pyramid Dice Sm and Lg.svg', import.meta.url).href
  }
];

const COLOR_FACE_LABELS: Record<ColorFace, string> = {
  azure: 'Azure',
  violet: 'Violet',
  amber: 'Amber',
  emerald: 'Emerald',
  coral: 'Coral',
  atom: 'Atom'
};

const SIZE_FACE_LABELS: Record<SizeFace, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  'small-medium': 'Small / Medium',
  'medium-large': 'Medium / Large',
  'small-large': 'Small / Large'
};

const FACE_ORDER = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1)
] as const;
const FACE_ALIGN_TOP = new THREE.Vector3(0, 1, 0);
const FACE_ALIGN_FRONT = new THREE.Vector3(0, 0, 1);

const TEMPS = {
  up: new THREE.Vector3(0, 1, 0),
  zero: new THREE.Vector3(0, 0, 0),
  axis: new THREE.Vector3(),
  quatA: new THREE.Quaternion(),
  quatB: new THREE.Quaternion(),
  quatC: new THREE.Quaternion()
};

function assertFaceIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  if (x < 0.5) {
    return 4 * x * x * x;
  }
  return 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function createRadialTexture(inner: string, outer: string, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  const gradient = context.createRadialGradient(size * 0.5, size * 0.5, 8, size * 0.5, size * 0.5, size * 0.5);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createFallbackTexture(label: string, tint: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  context.fillStyle = '#f5f2ea';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = tint;
  context.lineWidth = 20;
  context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  context.fillStyle = '#111827';
  context.font = 'bold 48px Trebuchet MS, Segoe UI, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function loadTexture(url: string, options: TextureLoadOptions = {}): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || 512;
      canvas.height = image.naturalHeight || 512;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas 2D context is unavailable.'));
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      if (options.tintNearBlackTo) {
        const tint = new THREE.Color(options.tintNearBlackTo);
        const tintR = Math.round(tint.r * 255);
        const tintG = Math.round(tint.g * 255);
        const tintB = Math.round(tint.b * 255);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
          const alpha = pixels[i + 3] ?? 0;
          if (alpha < 16) {
            continue;
          }
          const r = pixels[i] ?? 0;
          const g = pixels[i + 1] ?? 0;
          const b = pixels[i + 2] ?? 0;
          const nearBlack = r < 56 && g < 56 && b < 56;
          if (!nearBlack) {
            continue;
          }
          pixels[i] = tintR;
          pixels[i + 1] = tintG;
          pixels[i + 2] = tintB;
        }
        context.putImageData(imageData, 0, 0);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      resolve(texture);
    };
    image.onerror = () => {
      reject(new Error(`Failed to load SVG texture: ${url}`));
    };
    image.src = url;
  });
}

function buildOverlayStyle(backgroundAssetUrl?: string): HTMLStyleElement {
  const modalBackground = backgroundAssetUrl
    ? `background:
        linear-gradient(160deg, rgba(36, 105, 148, 0.16), rgba(28, 84, 122, 0.18)),
        url('${backgroundAssetUrl}');
      background-size: cover, cover;
      background-position: center center, center center;`
    : `background:
        radial-gradient(circle at 50% 32%, rgba(98, 214, 255, 0.08), transparent 28%),
        radial-gradient(circle at 22% 76%, rgba(255, 211, 109, 0.09), transparent 24%),
        linear-gradient(180deg, rgba(8, 17, 31, 0.88), rgba(5, 10, 20, 0.96));`;

  const style = document.createElement('style');
  style.textContent = `
    body.virtual-dice-page {
      margin: 0;
      min-height: 100vh;
      overflow: hidden;
      background:
        radial-gradient(circle at top, rgba(96, 214, 255, 0.15), transparent 30%),
        radial-gradient(circle at 78% 18%, rgba(255, 211, 109, 0.16), transparent 28%),
        linear-gradient(160deg, #05101d, #081427 48%, #0c1b31);
      color: #eef5ff;
      font-family: 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif;
    }

    .vdp-root {
      position: relative;
      min-height: 100vh;
      width: 100vw;
    }

    .vdp-shell {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 18px;
      padding: clamp(16px, 2.6vw, 28px);
    }

    .vdp-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: end;
      width: min(1280px, 100%);
      margin: 0 auto;
    }

    .vdp-kicker {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.24em;
      font-size: 0.72rem;
      color: rgba(172, 197, 236, 0.72);
    }

    .vdp-title {
      margin: 6px 0 8px;
      font-size: clamp(2.6rem, 4vw, 4.4rem);
      line-height: 0.95;
      letter-spacing: 0.01em;
    }

    .vdp-subtitle {
      margin: 0;
      max-width: 68ch;
      color: rgba(216, 227, 247, 0.78);
      font-size: 1rem;
      line-height: 1.55;
    }

    .vdp-status {
      display: grid;
      justify-items: end;
      gap: 10px;
    }

    .vdp-chip {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(10, 21, 39, 0.72);
      border: 1px solid rgba(148, 171, 214, 0.18);
      box-shadow: 0 14px 32px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(14px);
      color: rgba(236, 243, 255, 0.9);
      font-size: 0.92rem;
      line-height: 1;
    }

    .vdp-chip strong {
      color: #ffffff;
      font-weight: 700;
    }

    .vdp-stage {
      position: relative;
      width: min(1280px, 100%);
      margin: 0 auto;
      border-radius: 32px;
      overflow: hidden;
      border: 1px solid rgba(153, 185, 225, 0.16);
      ${modalBackground}
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 30px 60px rgba(0, 0, 0, 0.38);
    }

    .vdp-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }

    .vdp-overlay {
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 20px;
      width: 100%;
      height: 100%;
      padding: clamp(16px, 2vw, 24px);
      pointer-events: none;
    }

    .vdp-panel {
      pointer-events: auto;
      display: grid;
      gap: 12px;
      align-self: end;
      max-width: 390px;
      padding: 16px 18px 18px;
      border-radius: 22px;
      background: rgba(8, 17, 31, 0.72);
      border: 1px solid rgba(153, 185, 225, 0.18);
      backdrop-filter: blur(16px);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
    }

    .vdp-panel h3,
    .vdp-panel p {
      margin: 0;
    }

    .vdp-panel h3 {
      font-size: 1.08rem;
      line-height: 1.2;
      letter-spacing: 0.01em;
    }

    .vdp-panel p {
      color: rgba(216, 227, 247, 0.76);
      line-height: 1.5;
      font-size: 0.93rem;
    }

    .vdp-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .vdp-button {
      pointer-events: auto;
      border: 0;
      border-radius: 999px;
      padding: 12px 16px;
      font: inherit;
      font-weight: 700;
      color: #06101d;
      background: linear-gradient(135deg, #6ae0ff, #f5d46d);
      box-shadow: 0 10px 24px rgba(106, 224, 255, 0.2);
      cursor: pointer;
      transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease;
    }

    .vdp-button:hover {
      transform: translateY(-1px);
      filter: brightness(1.03);
    }

    .vdp-button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }

    .vdp-secondary {
      pointer-events: auto;
      border-radius: 999px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.04);
      color: rgba(240, 246, 255, 0.92);
      border: 1px solid rgba(153, 185, 225, 0.18);
    }

    .vdp-note {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 2px;
      color: rgba(216, 227, 247, 0.78);
      font-size: 0.88rem;
    }

    .vdp-meter {
      width: 100%;
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.08);
    }

    .vdp-meter > span {
      display: block;
      width: 100%;
      height: 100%;
      transform-origin: left center;
      transform: scaleX(0);
      background: linear-gradient(90deg, #6ae0ff, #f5d46d);
      transition: transform 100ms linear;
    }

    @media (max-width: 760px) {
      .vdp-header {
        flex-direction: column;
        align-items: start;
      }

      .vdp-status {
        justify-items: start;
      }

      .vdp-overlay {
        align-items: end;
      }

      .vdp-panel {
        max-width: none;
        width: 100%;
      }
    }

    .vdp-root.vdp-modal .vdp-shell {
      padding: 0;
      gap: 0;
      min-height: 100%;
      width: 100%;
    }

    .vdp-root.vdp-modal {
      width: 100%;
      min-height: 100%;
    }

    .vdp-root.vdp-modal .vdp-header {
      display: none;
    }

    .vdp-root.vdp-modal .vdp-stage {
      width: 100%;
      min-height: clamp(300px, 52vh, 460px);
      border-radius: 24px;
      border: 1px solid rgba(222, 244, 252, 0.72);
      box-shadow: none;
    }

    .vdp-root.vdp-modal .vdp-canvas {
      transform: translateY(-64px);
    }

    .vdp-root.vdp-modal .vdp-overlay {
      display: none;
    }

    .vdp-root.vdp-modal .vdp-panel {
      width: min(560px, 100%);
      max-width: none;
      background: rgba(125, 188, 224, 0.28);
      border: 1px solid rgba(206, 238, 252, 0.65);
      box-shadow: none;
    }
  `;
  return style;
}

function makeDiceFaceMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false
  });
}

function buildDieMaterials(): THREE.MeshBasicMaterial[] {
  return [
    makeDiceFaceMaterial(),
    makeDiceFaceMaterial(),
    makeDiceFaceMaterial(),
    makeDiceFaceMaterial(),
    makeDiceFaceMaterial(),
    makeDiceFaceMaterial()
  ];
}

function makeShadowSprite(color: string): THREE.Sprite {
  const texture = createRadialTexture(`${color}66`, '#00000000', 256);
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    opacity: 0.85
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.4, 3.4, 1);
  sprite.renderOrder = 0;
  return sprite;
}

function makeGlowSprite(color: string): THREE.Sprite {
  const texture = createRadialTexture(`${color}88`, '#00000000', 256);
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    opacity: 0.65
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.8, 4.8, 1);
  sprite.renderOrder = 0;
  return sprite;
}

function makeCubeGeometry(): RoundedBoxGeometry {
  return new RoundedBoxGeometry(1.54, 1.54, 1.54, DICE_SEGMENTS, DICE_EDGE_RADIUS);
}

function createDie(kind: DieKind, accent: string, faceTextures: THREE.Texture[]): DieRuntime {
  const geometry = makeCubeGeometry();
  const materials = buildDieMaterials();
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;

  const edgeGeometry = new THREE.EdgesGeometry(geometry, 20);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.45
  });
  const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  edgeLines.renderOrder = 3;
  mesh.add(edgeLines);

  const glow = makeGlowSprite(accent);
  glow.position.y = -1.25;
  mesh.add(glow);

  const shadow = makeShadowSprite(accent);
  shadow.position.y = -1.42;
  mesh.add(shadow);

  const group = new THREE.Group();
  group.add(mesh);
  group.position.set(0, 0.88, 0);

  faceTextures.forEach((texture, index) => {
    const material = materials[index];
    if (!material) {
      return;
    }
    material.map = texture;
    material.color.set('#ffffff');
    material.needsUpdate = true;
  });

  return {
    kind,
    group,
    mesh,
    edgeLines,
    shadow,
    glow,
    materials,
    basePosition: new THREE.Vector3(),
    gatherPosition: new THREE.Vector3(),
    settleQuaternion: new THREE.Quaternion(),
    settleStartQuaternion: new THREE.Quaternion(),
    tumbleAxis: new THREE.Vector3(1, 0.3, 0.8).normalize(),
    tumbleSpeed: 0,
    tumbleTwist: 0,
    faceIndex: 0,
    targetFaceIndex: 0
  };
}

function buildTargetQuaternion(
  faceIndex: number,
  twistRadians: number,
  alignTo: THREE.Vector3 = FACE_ALIGN_TOP
): THREE.Quaternion {
  const normal = FACE_ORDER[assertFaceIndex(faceIndex, FACE_ORDER.length)];
  if (!normal) {
    return new THREE.Quaternion();
  }

  const targetNormal = TEMPS.axis.copy(alignTo).normalize();
  const align = TEMPS.quatA.setFromUnitVectors(normal, targetNormal);
  const twist = TEMPS.quatB.setFromAxisAngle(targetNormal, twistRadians);
  return TEMPS.quatC.copy(twist).multiply(align);
}

function updatePhaseLabel(state: PrototypeState): string {
  switch (state.phase) {
    case 'gather':
      return 'Charging';
    case 'tumble':
      return 'Rolling';
    case 'settle':
      return 'Settling';
    default:
      return state.ready ? 'Ready to roll' : 'Loading art assets';
  }
}

function applyMaterialsToDie(
  die: DieRuntime,
  textures: THREE.Texture[],
  fallbackTint: string
): void {
  die.materials.forEach((material, index) => {
    const texture = textures[index];
    if (texture) {
      material.map = texture;
      material.color.set('#ffffff');
    } else {
      material.map = createFallbackTexture(`${die.kind} ${index + 1}`, fallbackTint);
      material.color.set('#ffffff');
    }
    material.needsUpdate = true;
  });
}

function setFaceEmphasis(die: DieRuntime, targetFaceIndex: number, emphasize: boolean): void {
  die.materials.forEach((material, index) => {
    if (!emphasize) {
      material.color.set('#ffffff');
      return;
    }
    if (index === assertFaceIndex(targetFaceIndex, die.materials.length)) {
      material.color.set('#ffffff');
    } else {
      material.color.set('#c6cfda');
    }
  });
}

export function createVirtualDicePrototype(
  container: HTMLElement,
  options: VirtualDicePrototypeOptions = {}
): VirtualDicePrototypeControls {
  const modalMode = options.mode === 'modal';
  const showInteractiveControls = options.showInteractiveControls ?? !modalMode;
  const disableGlowEffects = options.disableGlowEffects ?? modalMode;

  const root = document.createElement('div');
  root.className = 'vdp-root';
  if (modalMode) {
    root.classList.add('vdp-modal');
  }
  container.replaceChildren(root);

  const style = buildOverlayStyle(options.backgroundAssetUrl);
  document.head.append(style);

  const shell = document.createElement('div');
  shell.className = 'vdp-shell';

  const header = document.createElement('header');
  header.className = 'vdp-header';

  const copy = document.createElement('div');
  const kicker = document.createElement('p');
  kicker.className = 'vdp-kicker';
  kicker.textContent = 'Virtual Dice Prototype';
  const title = document.createElement('h1');
  title.className = 'vdp-title';
  title.textContent = options.title ?? 'Anticipation before the reveal.';
  const subtitle = document.createElement('p');
  subtitle.className = 'vdp-subtitle';
  subtitle.textContent =
    options.subtitle ??
    'A standalone Three.js dice stage that uses the SVG art set as face textures and emphasizes the gather, tumble, and settle beats of a roll.';
  copy.append(kicker, title, subtitle);

  const statusWrap = document.createElement('div');
  statusWrap.className = 'vdp-status';

  const statusChip = document.createElement('div');
  statusChip.className = 'vdp-chip';
  statusChip.innerHTML = `<strong>Stage:</strong> <span>Loading art assets</span>`;

  const faceChip = document.createElement('div');
  faceChip.className = 'vdp-chip';
  faceChip.innerHTML = `<strong>Faces:</strong> <span>Waiting for textures</span>`;

  statusWrap.append(statusChip, faceChip);
  header.append(copy, statusWrap);

  const stage = document.createElement('section');
  stage.className = 'vdp-stage';
  stage.style.minHeight = 'clamp(640px, 76vh, 920px)';

  const canvas = document.createElement('canvas');
  canvas.className = 'vdp-canvas';

  const overlay = document.createElement('div');
  overlay.className = 'vdp-overlay';

  const panel = document.createElement('div');
  panel.className = 'vdp-panel';

  const panelHeading = document.createElement('h3');
  panelHeading.textContent = 'Roll the dice';
  const panelBody = document.createElement('p');
  panelBody.textContent =
    'The dice gather, spin with a little breath-hold tension, then settle into their final symbol and shape.';
  const meter = document.createElement('div');
  meter.className = 'vdp-meter';
  const meterFill = document.createElement('span');
  meter.append(meterFill);

  const actions = document.createElement('div');
  actions.className = 'vdp-actions';
  const rollButton = document.createElement('button');
  rollButton.className = 'vdp-button';
  rollButton.type = 'button';
  rollButton.textContent = 'Roll Dice';
  const randomizeButton = document.createElement('button');
  randomizeButton.className = 'vdp-secondary';
  randomizeButton.type = 'button';
  randomizeButton.textContent = 'Nudge Camera';
  actions.append(rollButton, randomizeButton);
  if (!showInteractiveControls) {
    actions.style.display = 'none';
  }

  const note = document.createElement('div');
  note.className = 'vdp-note';
  const noteText = document.createElement('span');
  noteText.textContent = 'Press Space or Enter to roll once the assets are loaded.';
  const noteFace = document.createElement('span');
  noteFace.textContent = 'Color / Size';
  note.append(noteText, noteFace);

  panel.append(panelHeading, panelBody, meter, actions, note);
  overlay.append(panel);
  stage.append(canvas, overlay);
  shell.append(header, stage);
  root.append(shell);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  if (modalMode) {
    camera.fov = 44;
    camera.position.set(0, 5.1, 6.6);
    camera.lookAt(0, 3.45, 0);
    camera.updateProjectionMatrix();
  } else {
    camera.position.set(0, 4.15, 8.65);
    camera.lookAt(0, 0.9, 0);
  }

  const ambient = new THREE.AmbientLight(0x8fb4ff, modalMode ? 1.45 : 1.15);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xdff3ff, modalMode ? 0x8fb6d3 : 0x101a30, modalMode ? 1.55 : 1.4);
  hemisphere.position.set(0, 10, 0);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xffffff, modalMode ? 2.4 : 2.2);
  keyLight.position.set(-4, 8, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x6fe1ff, modalMode ? 1.2 : 0.9);
  fillLight.position.set(4, 3, -2);
  scene.add(fillLight);

  const spot = new THREE.SpotLight(0xf6d98a, modalMode ? 2.6 : 4.2, 24, Math.PI / 5, 0.38, 1.6);
  spot.position.set(0, 8.5, 2.6);
  spot.target.position.set(0, 0.7, 0);
  spot.castShadow = false;
  scene.add(spot, spot.target);

  if (!modalMode) {
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(6.5, 7.2, 0.6, 48),
      new THREE.MeshStandardMaterial({
        color: 0x081220,
        roughness: 0.98,
        metalness: 0.04
      })
    );
    table.position.y = -1.3;
    table.receiveShadow = true;
    scene.add(table);

    const tableTop = new THREE.Mesh(
      new THREE.CircleGeometry(6.4, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0f1f37,
        roughness: 0.92,
        metalness: 0.05,
        transparent: true,
        opacity: 0.95
      })
    );
    tableTop.rotation.x = -Math.PI / 2;
    tableTop.position.y = -1.0;
    scene.add(tableTop);

    const grid = new THREE.GridHelper(11, 18, 0x35547f, 0x1a2f4f);
    const gridMaterial = grid.material;
    if (Array.isArray(gridMaterial)) {
      gridMaterial.forEach((material) => {
        const lineMaterial = material as THREE.LineBasicMaterial;
        lineMaterial.opacity = 0.18;
        lineMaterial.transparent = true;
      });
    } else {
      const lineMaterial = gridMaterial as THREE.LineBasicMaterial;
      lineMaterial.opacity = 0.18;
      lineMaterial.transparent = true;
    }
    grid.position.y = -0.99;
    scene.add(grid);
  }

  let colorDieTextures: THREE.Texture[] = COLOR_FACE_REGISTRY.map((entry) =>
    createFallbackTexture(entry.label, '#5ad8ff')
  );
  let sizeDieTextures: THREE.Texture[] = SIZE_FACE_REGISTRY.map((entry) =>
    createFallbackTexture(entry.label, '#f5d46d')
  );

  const colorDie = createDie('color', '#6fe1ff', colorDieTextures);
  const sizeDie = createDie('size', '#f5d46d', sizeDieTextures);

  if (disableGlowEffects) {
    colorDie.glow.visible = false;
    sizeDie.glow.visible = false;
    colorDie.edgeLines.visible = false;
    sizeDie.edgeLines.visible = false;
    colorDie.shadow.visible = false;
    sizeDie.shadow.visible = false;
    (colorDie.shadow.material as THREE.SpriteMaterial).opacity = 0;
    (sizeDie.shadow.material as THREE.SpriteMaterial).opacity = 0;
  }

  if (modalMode) {
    colorDie.basePosition.set(-0.82, 3.35, 0.0);
    colorDie.gatherPosition.set(-0.56, 3.58, -0.04);
    sizeDie.basePosition.set(0.82, 3.35, 0.0);
    sizeDie.gatherPosition.set(0.56, 3.58, 0.04);
    colorDie.group.scale.setScalar(0.98);
    sizeDie.group.scale.setScalar(0.98);
  } else {
    colorDie.basePosition.set(-1.55, 0.98, 0.0);
    colorDie.gatherPosition.set(-1.18, 1.12, -0.2);
    sizeDie.basePosition.set(1.55, 0.95, 0.08);
    sizeDie.gatherPosition.set(1.18, 1.15, 0.15);
  }

  colorDie.group.position.copy(colorDie.basePosition);
  sizeDie.group.position.copy(sizeDie.basePosition);

  scene.add(colorDie.group, sizeDie.group);

  const allMaterials = [...colorDie.materials, ...sizeDie.materials];
  const dieAccentColor = new THREE.Color('#6fe1ff');
  const sizeAccentColor = new THREE.Color('#f5d46d');
  const state: PrototypeState = {
    phase: 'idle',
    phaseStartedAt: performance.now(),
    rollStartedAt: performance.now(),
    phaseEndsAt: performance.now(),
    status: 'Loading art assets',
    ready: false,
    hasRolled: false,
    colorFaceIndex: 0,
    sizeFaceIndex: 0
  };

  let disposed = false;
  let rafId = 0;
  let cameraOrbit = 0;
  const clock = new THREE.Clock();
  let hasPendingReport = false;
  let queuedRollTarget: { colorFace?: ColorFace; sizeFace?: SizeFace } | null = null;

  const textureLoader = new THREE.TextureLoader();
  function setStatus(nextStatus: string, stage: PrototypeState['phase'], ready = state.ready): void {
    state.status = nextStatus;
    state.phase = stage;
    statusChip.querySelector('span')!.textContent = nextStatus;
    faceChip.querySelector('span')!.textContent =
      state.ready
        ? state.phase === 'idle'
          ? state.hasRolled
            ? `${COLOR_FACE_LABELS[COLOR_FACE_OPTIONS[state.colorFaceIndex] ?? 'azure']} / ${SIZE_FACE_LABELS[SIZE_FACES[state.sizeFaceIndex] ?? 'small']}`
            : 'Awaiting first roll'
          : 'Hidden while rolling'
        : 'Waiting for textures';
    meterFill.style.transform = state.phase === 'idle' && state.ready
      ? 'scaleX(0)'
      : `scaleX(${clamp01((performance.now() - state.rollStartedAt) / TOTAL_ROLL_DURATION)})`;
    rollButton.disabled = !ready || state.phase !== 'idle';
  }

  function refreshFaceReadout(): void {
    if (!state.ready) {
      faceChip.querySelector('span')!.textContent = 'Waiting for textures';
      return;
    }
    if (!state.hasRolled) {
      faceChip.querySelector('span')!.textContent = 'Awaiting first roll';
      return;
    }
    if (state.phase !== 'idle') {
      faceChip.querySelector('span')!.textContent = 'Hidden while rolling';
      return;
    }
    const colorFace = COLOR_FACE_OPTIONS[assertFaceIndex(state.colorFaceIndex, COLOR_FACE_OPTIONS.length)] ?? 'azure';
    const sizeFace = SIZE_FACES[assertFaceIndex(state.sizeFaceIndex, SIZE_FACES.length)] ?? 'small';
    faceChip.querySelector('span')!.textContent = `${COLOR_FACE_LABELS[colorFace]} / ${SIZE_FACE_LABELS[sizeFace]}`;
  }

  function transitionTo(stage: PrototypeState['phase']): void {
    state.phase = stage;
    state.phaseStartedAt = performance.now();
    state.phaseEndsAt = state.phaseStartedAt;
    statusChip.querySelector('span')!.textContent = updatePhaseLabel(state);
    meterFill.style.transform = 'scaleX(0)';
    rollButton.disabled = !state.ready || state.phase !== 'idle';
  }

  function beginRoll(target?: { colorFace?: ColorFace; sizeFace?: SizeFace }): void {
    if (!state.ready) {
      queuedRollTarget = target ?? {};
      return;
    }
    if (state.phase !== 'idle' || disposed) {
      return;
    }

    state.rollStartedAt = performance.now();
    state.hasRolled = true;
    state.colorFaceIndex = target?.colorFace
      ? Math.max(0, COLOR_FACE_OPTIONS.indexOf(target.colorFace))
      : randomIndex(COLOR_FACE_OPTIONS.length);
    state.sizeFaceIndex = target?.sizeFace
      ? Math.max(0, SIZE_FACES.indexOf(target.sizeFace))
      : randomIndex(SIZE_FACES.length);
    colorDie.targetFaceIndex = state.colorFaceIndex;
    sizeDie.targetFaceIndex = state.sizeFaceIndex;

    colorDie.tumbleAxis.set(1, 0.5, 0.22).normalize();
    sizeDie.tumbleAxis.set(-0.35, 0.65, 0.66).normalize();
    colorDie.tumbleSpeed = 6.4 + Math.random() * 2.4;
    sizeDie.tumbleSpeed = 6 + Math.random() * 2.3;
    colorDie.tumbleTwist = Math.PI / 2 * randomIndex(4);
    sizeDie.tumbleTwist = Math.PI / 2 * randomIndex(4);

    transitionTo('gather');
    hasPendingReport = true;
    colorDie.settleStartQuaternion.copy(colorDie.mesh.quaternion);
    sizeDie.settleStartQuaternion.copy(sizeDie.mesh.quaternion);
    const settleFaceTarget = modalMode ? FACE_ALIGN_FRONT : FACE_ALIGN_TOP;
    colorDie.settleQuaternion.copy(buildTargetQuaternion(colorDie.targetFaceIndex, colorDie.tumbleTwist, settleFaceTarget));
    sizeDie.settleQuaternion.copy(buildTargetQuaternion(sizeDie.targetFaceIndex, sizeDie.tumbleTwist, settleFaceTarget));
    setStatus('Gathering', 'gather');
  }

  function nudgeCamera(): void {
    cameraOrbit = (cameraOrbit + 0.28) % (Math.PI * 2);
  }

  const updateDieMaterials = (): void => {
    applyMaterialsToDie(colorDie, colorDieTextures, '#6fe1ff');
    applyMaterialsToDie(sizeDie, sizeDieTextures, '#f5d46d');
  };

  const loadAssets = async (): Promise<void> => {
    const colorResults = await Promise.allSettled(COLOR_FACE_REGISTRY.map((entry) => loadTexture(entry.url)));
    const sizeResults = await Promise.allSettled(
      SIZE_FACE_REGISTRY.map((entry) => loadTexture(entry.url, { tintNearBlackTo: '#e2384d' }))
    );

    const colorTextures = colorResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return createFallbackTexture(COLOR_FACE_REGISTRY[index]?.label ?? 'Color', '#6fe1ff');
    });
    const sizeTextures = sizeResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return createFallbackTexture(SIZE_FACE_REGISTRY[index]?.label ?? 'Size', '#f5d46d');
    });

    colorDieTextures.forEach((texture) => texture.dispose());
    sizeDieTextures.forEach((texture) => texture.dispose());
    colorDieTextures = colorTextures;
    sizeDieTextures = sizeTextures;
    applyMaterialsToDie(colorDie, colorTextures, '#6fe1ff');
    applyMaterialsToDie(sizeDie, sizeTextures, '#f5d46d');
    state.ready = true;
    state.phase = 'idle';
    state.status = 'Ready to roll';
    state.hasRolled = false;
    state.phaseStartedAt = performance.now();
    state.phaseEndsAt = state.phaseStartedAt;
    refreshFaceReadout();
    setStatus('Ready to roll', 'idle');
    rollButton.disabled = false;
    if (queuedRollTarget) {
      const target = queuedRollTarget;
      queuedRollTarget = null;
      beginRoll(target);
    }
  };

  void loadAssets().catch(() => {
    state.ready = true;
    state.phase = 'idle';
    state.status = 'Ready with fallback art';
    state.hasRolled = false;
    state.phaseStartedAt = performance.now();
    state.phaseEndsAt = state.phaseStartedAt;
    updateDieMaterials();
    refreshFaceReadout();
    setStatus('Ready with fallback art', 'idle');
    rollButton.disabled = false;
    if (queuedRollTarget) {
      const target = queuedRollTarget;
      queuedRollTarget = null;
      beginRoll(target);
    }
  });

  function updatePhase(now: number): void {
    if (!state.ready || state.phase === 'idle') {
      return;
    }

    const rollElapsed = now - state.rollStartedAt;
    const phaseElapsed = now - state.phaseStartedAt;
    const gatherCutoff = GATHER_DURATION;
    const tumbleCutoff = GATHER_DURATION + TUMBLE_DURATION;
    const settleCutoff = TOTAL_ROLL_DURATION;

    if (state.phase === 'gather' && rollElapsed >= gatherCutoff) {
      transitionTo('tumble');
      colorDie.settleStartQuaternion.copy(colorDie.mesh.quaternion);
      sizeDie.settleStartQuaternion.copy(sizeDie.mesh.quaternion);
      setStatus('Rolling', 'tumble');
      return;
    }

    if (state.phase === 'tumble' && rollElapsed >= tumbleCutoff) {
      transitionTo('settle');
      colorDie.settleStartQuaternion.copy(colorDie.mesh.quaternion);
      sizeDie.settleStartQuaternion.copy(sizeDie.mesh.quaternion);
      setStatus('Settling', 'settle');
      return;
    }

    if (state.phase === 'settle' && rollElapsed >= settleCutoff) {
      transitionTo('idle');
      colorDie.faceIndex = colorDie.targetFaceIndex;
      sizeDie.faceIndex = sizeDie.targetFaceIndex;
      colorDie.group.position.copy(colorDie.basePosition);
      sizeDie.group.position.copy(sizeDie.basePosition);
      colorDie.group.scale.setScalar(1);
      sizeDie.group.scale.setScalar(1);
      refreshFaceReadout();
      setStatus('Ready to roll', 'idle');
      if (hasPendingReport && options.onRollComplete) {
        const colorFace = COLOR_FACE_OPTIONS[assertFaceIndex(state.colorFaceIndex, COLOR_FACE_OPTIONS.length)] ?? 'azure';
        const sizeFace = SIZE_FACES[assertFaceIndex(state.sizeFaceIndex, SIZE_FACES.length)] ?? 'small';
        options.onRollComplete({ colorFace, sizeFace });
      }
      hasPendingReport = false;
    }
  }

  function updateDieTransform(die: DieRuntime, now: number, delta: number): void {
    const rollElapsed = now - state.rollStartedAt;
    const phaseElapsed = now - state.phaseStartedAt;
    const settleProgress = clamp01(phaseElapsed / SETTLE_DURATION);
    const tumbleProgress = clamp01((rollElapsed - GATHER_DURATION) / TUMBLE_DURATION);
    const gatherProgress = clamp01(rollElapsed / GATHER_DURATION);

    if (state.phase === 'gather') {
      const progress = easeOutCubic(gatherProgress);
      die.group.position.lerpVectors(die.basePosition, die.gatherPosition, progress);
      die.group.scale.setScalar(1 + progress * 0.08);
      die.mesh.quaternion.copy(die.settleStartQuaternion);
      return;
    }

    if (state.phase === 'tumble') {
      const wobble = Math.sin(rollElapsed * 0.01 + (die.kind === 'color' ? 0 : 1.2));
      die.group.position.lerpVectors(
        die.gatherPosition,
        die.basePosition,
        easeOutCubic(tumbleProgress)
      );
      die.group.position.y += Math.sin(rollElapsed * 0.012 + (die.kind === 'color' ? 0.3 : 1.1)) * 0.12;
      die.group.scale.setScalar(1.08 + Math.sin(rollElapsed * 0.02 + wobble) * 0.03);
      const decay = 1 - clamp01(tumbleProgress) * 0.82;
      const dampedSpeed = die.tumbleSpeed * decay * decay + 0.35;
      const spinDelta = new THREE.Quaternion().setFromAxisAngle(
        die.tumbleAxis,
        dampedSpeed * delta * (1 + Math.sin(rollElapsed * 0.006) * 0.12)
      );
      die.mesh.quaternion.multiply(spinDelta).normalize();
      return;
    }

    if (state.phase === 'settle') {
      const progress = easeInOutCubic(settleProgress);
      die.group.position.copy(die.basePosition);
      die.group.position.y += Math.sin(phaseElapsed * 0.018 + (die.kind === 'color' ? 0.4 : 1.5)) * (1 - progress) * 0.045;
      die.group.scale.setScalar(1.08 - progress * 0.08);
      die.mesh.quaternion.slerpQuaternions(die.settleStartQuaternion, die.settleQuaternion, progress);
      return;
    }

    die.group.position.copy(die.basePosition);
    die.group.scale.setScalar(1);
  }

  function renderFrame(now: number): void {
    if (disposed) {
      return;
    }

    const delta = clock.getDelta();
    updatePhase(now);
    updateDieTransform(colorDie, now, delta);
    updateDieTransform(sizeDie, now, delta);

    const emphasizeSettledFace = modalMode && state.ready && state.hasRolled && state.phase === 'idle';
    setFaceEmphasis(colorDie, colorDie.targetFaceIndex, emphasizeSettledFace);
    setFaceEmphasis(sizeDie, sizeDie.targetFaceIndex, emphasizeSettledFace);

    if (modalMode) {
      const orbitRadius = 6.6;
      camera.position.x = Math.sin(cameraOrbit) * 0.08;
      camera.position.y = 5.1;
      camera.position.z = orbitRadius;
      camera.lookAt(0, 3.45, 0);
    } else {
      const orbitRadius = 8.65;
      camera.position.x = Math.sin(cameraOrbit) * 0.45;
      camera.position.z = orbitRadius + Math.cos(cameraOrbit) * 0.25;
      camera.lookAt(0, 0.95, 0);
    }

    const pulse = disableGlowEffects ? 0 : (state.phase === 'idle' ? 0 : Math.sin(now * 0.012) * 0.18 + 0.18);
    spot.intensity = disableGlowEffects ? 1.9 : 4.2 + pulse * 1.8;
    keyLight.intensity = disableGlowEffects ? 1.45 : 2.2 + pulse * 0.35;
    fillLight.intensity = disableGlowEffects ? 0.72 : 0.9 + pulse * 0.2;
    ambient.intensity = disableGlowEffects ? 0.92 : 1.05 + pulse * 0.15;

    meterFill.style.transform = state.phase === 'idle'
      ? 'scaleX(0)'
      : `scaleX(${clamp01((now - state.phaseStartedAt) / TOTAL_ROLL_DURATION)})`;
    statusChip.querySelector('span')!.textContent = updatePhaseLabel(state);
    refreshFaceReadout();

    renderer.render(scene, camera);
    rafId = window.requestAnimationFrame(renderFrame);
  }

  function resize(): void {
    if (disposed) {
      return;
    }

    const bounds = stage.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
  });
  resizeObserver.observe(stage);
  resize();

  const rollClickHandler = () => beginRoll();
  const keydownHandler = (event: KeyboardEvent) => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      beginRoll();
    }
  };
  if (showInteractiveControls) {
    rollButton.addEventListener('click', rollClickHandler);
    randomizeButton.addEventListener('click', nudgeCamera);
    root.addEventListener('keydown', keydownHandler);
    root.tabIndex = 0;
    root.focus();
  }

  rafId = window.requestAnimationFrame(renderFrame);

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    window.cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    if (showInteractiveControls) {
      rollButton.removeEventListener('click', rollClickHandler);
      randomizeButton.removeEventListener('click', nudgeCamera);
      root.removeEventListener('keydown', keydownHandler);
    }

    allMaterials.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
    colorDie.mesh.geometry.dispose();
    sizeDie.mesh.geometry.dispose();
    colorDie.edgeLines.geometry.dispose();
    colorDie.edgeLines.material.dispose();
    sizeDie.edgeLines.geometry.dispose();
    sizeDie.edgeLines.material.dispose();
    (colorDie.shadow.material as THREE.SpriteMaterial).map?.dispose();
    (sizeDie.shadow.material as THREE.SpriteMaterial).map?.dispose();
    (colorDie.glow.material as THREE.SpriteMaterial).map?.dispose();
    (sizeDie.glow.material as THREE.SpriteMaterial).map?.dispose();
    (colorDie.shadow.material as THREE.SpriteMaterial).dispose();
    (sizeDie.shadow.material as THREE.SpriteMaterial).dispose();
    (colorDie.glow.material as THREE.SpriteMaterial).dispose();
    (sizeDie.glow.material as THREE.SpriteMaterial).dispose();
    renderer.dispose();
    root.remove();
    style.remove();
  }

  return {
    root,
    roll: () => beginRoll(),
    rollToFaces: (colorFace: ColorFace, sizeFace: SizeFace) => beginRoll({ colorFace, sizeFace }),
    dispose
  };
}
