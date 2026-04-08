import {
  createGame,
  applyAction,
  getCounterTotal,
  getPlayerTrios,
  getPlayerScore,
  getAllowedColors,
  getAllowedSizes,
  type ColorFace,
  type SizeFace,
  type GameState,
  type Action,
  type Color,
  type Size
} from './game/rules';
import { createVirtualDicePrototype, type VirtualDicePrototypeControls } from './virtualDicePrototype';

// Asset URLs
const COLOR_FACE_ASSETS: Record<string, string> = {
  azure: new URL('../art/SVG/Die Symbols/Club.svg', import.meta.url).href,
  violet: new URL('../art/SVG/Die Symbols/HEart.svg', import.meta.url).href,
  amber: new URL('../art/SVG/Die Symbols/Diamond.svg', import.meta.url).href,
  emerald: new URL('../art/SVG/Die Symbols/Star.svg', import.meta.url).href,
  coral: new URL('../art/SVG/Die Symbols/Clover.svg', import.meta.url).href,
  atom: new URL('../art/SVG/Die Symbols/Atom.svg', import.meta.url).href
};

const SIZE_FACE_ASSETS: Record<string, string> = {
  small: new URL('../art/SVG/Die Shapes/Pyramid Dice Single Sm.svg', import.meta.url).href,
  medium: new URL('../art/SVG/Die Shapes/Pyramid Dice Single Md.svg', import.meta.url).href,
  large: new URL('../art/SVG/Die Shapes/Pyramid Dice Single Lg.svg', import.meta.url).href,
  'small-medium': new URL('../art/SVG/Die Shapes/Pyramid Dice Sm and Md.svg', import.meta.url).href,
  'medium-large': new URL('../art/SVG/Die Shapes/Pyramid Dice Sm amd Lg.svg', import.meta.url).href,
  'small-large': new URL('../art/SVG/Die Shapes/Pyramid Dice Sm and Lg.svg', import.meta.url).href
};

const BACKGROUND_ASSET = new URL('../art/SVG/Backgrounds/Background Ice.svg', import.meta.url).href;

type ColorKey = 'azure' | 'violet' | 'amber' | 'emerald' | 'coral';
type SizeKey = 'small' | 'medium' | 'large';

interface PyramidPrototypeOptions {
  title?: string;
  subtitle?: string;
}

export interface PyramidPrototypeControls {
  root: HTMLElement;
  dispose: () => void;
}

interface PyramidAsset {
  color: ColorKey;
  size: SizeKey;
  src: string;
  alt: string;
}

const COLOR_ORDER: readonly ColorKey[] = ['emerald', 'amber', 'coral', 'violet', 'azure'];
const SIZE_ORDER: readonly SizeKey[] = ['small', 'medium', 'large'];

const COLOR_LABELS: Record<ColorKey, string> = {
  azure: 'Blue',
  violet: 'Purple',
  amber: 'Yellow',
  emerald: 'Green',
  coral: 'Red'
};

const SIZE_LABELS: Record<SizeKey, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large'
};

const PYRAMID_ASSETS: readonly PyramidAsset[] = [
  { color: 'azure', size: 'small', src: new URL('../art/SVG/Pyramids/Small/Blue Pyramid Sm.svg', import.meta.url).href, alt: 'Blue small pyramid' },
  { color: 'azure', size: 'medium', src: new URL('../art/SVG/Pyramids/Med/Blue Pyramid Med.svg', import.meta.url).href, alt: 'Blue medium pyramid' },
  { color: 'azure', size: 'large', src: new URL('../art/SVG/Pyramids/Large/blue Pyramid Lg.svg', import.meta.url).href, alt: 'Blue large pyramid' },
  { color: 'violet', size: 'small', src: new URL('../art/SVG/Pyramids/Small/Purple Pyramid Sm.svg', import.meta.url).href, alt: 'Purple small pyramid' },
  { color: 'violet', size: 'medium', src: new URL('../art/SVG/Pyramids/Med/Purple Pyramid Med.svg', import.meta.url).href, alt: 'Purple medium pyramid' },
  { color: 'violet', size: 'large', src: new URL('../art/SVG/Pyramids/Large/Purple Pyramid Lg.svg', import.meta.url).href, alt: 'Purple large pyramid' },
  { color: 'amber', size: 'small', src: new URL('../art/SVG/Pyramids/Small/Yellow Pyramid Sm.svg', import.meta.url).href, alt: 'Yellow small pyramid' },
  { color: 'amber', size: 'medium', src: new URL('../art/SVG/Pyramids/Med/Yellow Pyramid Med.svg', import.meta.url).href, alt: 'Yellow medium pyramid' },
  { color: 'amber', size: 'large', src: new URL('../art/SVG/Pyramids/Large/yellow Pyramid Lg.svg', import.meta.url).href, alt: 'Yellow large pyramid' },
  { color: 'emerald', size: 'small', src: new URL('../art/SVG/Pyramids/Small/Green Pyramid Sm.svg', import.meta.url).href, alt: 'Green small pyramid' },
  { color: 'emerald', size: 'medium', src: new URL('../art/SVG/Pyramids/Med/Green Pyramid Med.svg', import.meta.url).href, alt: 'Green medium pyramid' },
  { color: 'emerald', size: 'large', src: new URL('../art/SVG/Pyramids/Large/Green Pyramid Lg.svg', import.meta.url).href, alt: 'Green large pyramid' },
  { color: 'coral', size: 'small', src: new URL('../art/SVG/Pyramids/Small/Red Pyramid Sm.svg', import.meta.url).href, alt: 'Red small pyramid' },
  { color: 'coral', size: 'medium', src: new URL('../art/SVG/Pyramids/Med/Red Pyramid Med.svg', import.meta.url).href, alt: 'Red medium pyramid' },
  { color: 'coral', size: 'large', src: new URL('../art/SVG/Pyramids/Large/Red Pyramid Lg.svg', import.meta.url).href, alt: 'Red large pyramid' }
];

const BUTTON_ASSETS = {
  small: new URL('../art/SVG/Buttons and Controls/Asset 3.svg', import.meta.url).href,
  medium: new URL('../art/SVG/Buttons and Controls/Asset 4.svg', import.meta.url).href,
  large: new URL('../art/SVG/Buttons and Controls/Asset 5.svg', import.meta.url).href
};

const UI_ASSETS = {
  rowLabel: new URL('../art/SVG/Buttons and Controls/Asset 10.svg', import.meta.url).href,
  slotCount: new URL('../art/SVG/Buttons and Controls/Asset 12.svg', import.meta.url).href
};

function pieceAsset(color: ColorKey, size: SizeKey): PyramidAsset {
  const asset = PYRAMID_ASSETS.find((entry) => entry.color === color && entry.size === size);
  if (!asset) throw new Error(`Missing pyramid asset for ${color}/${size}.`);
  return asset;
}

function renderRackRow(color: ColorKey, bank: Record<string, number>): string {
  const colorLabel = COLOR_LABELS[color];
  const slots = SIZE_ORDER.map((size) => {
    const asset = pieceAsset(color, size);
    const key = `${color}:${size}`;
    const count = bank[key] ?? 0;
    return `
      <div class="rack-slot rack-slot-${size} ${count === 0 ? 'depleted' : ''}">
        <img src="${asset.src}" alt="${asset.alt}" />
        <span class="slot-count">
          <img src="${UI_ASSETS.slotCount}" alt="" aria-hidden="true" />
          <span class="slot-count-text">x${count}</span>
        </span>
      </div>
    `;
  }).join('');
  return `
    <div class="rack-row">
      <div class="rack-label">
        <img src="${UI_ASSETS.rowLabel}" alt="" aria-hidden="true" />
        <span class="rack-label-text">${colorLabel}</span>
      </div>
      <div class="rack-slots">${slots}</div>
    </div>
  `;
}

function renderZone(title: string, description: string, size: string): string {
  return `
    <div class="zone zone-${size}">
      <div class="zone-title">
        <p class="label">${title}</p>
        <h3>${description}</h3>
      </div>
      <div class="zone-content">
        <span class="zoneplaceholder">Empty</span>
      </div>
    </div>
  `;
}

function renderBankCount(bank: Record<string, number>): string {
  const total = Object.values(bank).reduce((sum, v) => sum + v, 0);
  return `${total} pieces`;
}

function renderPyramidPieces(counts: Record<string, number>, scope: 'counter' | 'vault'): string {
  const pieces: string[] = [];
  for (const color of COLOR_ORDER) {
    for (const size of SIZE_ORDER) {
      const key = `${color}:${size}`;
      const count = counts[key] ?? 0;
      if (count <= 0) {
        continue;
      }
      const asset = pieceAsset(color, size);
      for (let i = 0; i < count; i += 1) {
        pieces.push(
          `<span class="piece-token ${scope}" title="${COLOR_LABELS[color]} ${SIZE_LABELS[size]}">` +
          `<img src="${asset.src}" alt="${asset.alt}" />` +
          '</span>'
        );
      }
    }
  }
  return pieces.join('');
}

function renderCounter(counter: Record<string, number>): { title: string; pieces: string } {
  const piecesHTML = renderPyramidPieces(counter, 'counter');
  const colorCount = new Set(
    Object.entries(counter)
      .filter(([, count]) => count > 0)
      .map(([key]) => key.split(':')[0])
  ).size;
  const title = piecesHTML ? `${colorCount} colors in play` : 'Empty at the moment';
  const pieces = piecesHTML || '<span class="zoneplaceholder">The Counter is clear</span>';
  return { title, pieces };
}

function renderVault(vault: Record<string, number>): string {
  const pieces = renderPyramidPieces(vault, 'vault');
  return pieces || '<span class="zoneplaceholder">Empty</span>';
}

function renderLastRoll(lastRoll: { colorFace: string; sizeFace: string; outcome: string } | null): string {
  if (!lastRoll) return '<span class="zoneplaceholder">Ready to roll</span>';
  if (lastRoll.outcome === 'pending') return '<span class="outcome-pending">Rolling...</span>';
  const colorLabel = lastRoll.colorFace === 'atom' ? 'Atom' : COLOR_LABELS[lastRoll.colorFace as ColorKey] || lastRoll.colorFace;
  const sizeLabel = SIZE_LABELS[lastRoll.sizeFace as SizeKey] || lastRoll.sizeFace;
  const outcomeClass = `outcome-${lastRoll.outcome}`;
  return `<span class="${outcomeClass}">${colorLabel} / ${sizeLabel} - ${lastRoll.outcome.toUpperCase()}</span>`;
}

function formatDiceFace(value: string): string {
  if (value === 'atom') return 'Atom';
  if (value.includes('-')) {
    return value.split('-').map((part) => part[0]!.toUpperCase() + part.slice(1)).join(' / ');
  }
  return value[0]!.toUpperCase() + value.slice(1);
}

function createDiceRollModal(): string {
  return `
    <div class="dice-roll-modal" id="diceRollModal" style="display: none;">
      <div class="dice-roll-backdrop"></div>
      <div class="dice-roll-panel">
        <div class="dice-roll-bg" aria-hidden="true"></div>
        <button class="modal-close-btn" id="modalCloseBtn" aria-label="Close modal">×</button>
        <div class="dice-roll-content">
          <p class="label" id="modalLabel">Roll in progress</p>
          <h3 id="modalTitle">Rolling the dice...</h3>
          <p class="dice-roll-copy" id="modalSubtitle">The model window will pause until you confirm a piece.</p>
          <div class="dice-roll-stage-3d" id="diceRoll3dMount">
            <div class="dice-roll-loading">Preparing dice model...</div>
          </div>
          <div class="selection-grid" id="selectionGrid" style="display: none;">
            <!-- Pyramid selections go here -->
          </div>
        </div>
      </div>
    </div>
  `;
}

function createStyleTag(): HTMLElement {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --ice-white: #eef8ff;
      --ice-frost: rgba(218, 233, 245, 0.8);
      --ice-glow: rgba(142, 206, 236, 0.5);
      --ice-accent: #37c8f3;
      --ice-accent-dark: #159fce;
      --text: #e7f2fa;
      --text-muted: rgba(214, 232, 244, 0.82);
      --accent: #37c8f3;
      --accent-gold: #f5d46d;
      --muted: rgba(183, 212, 232, 0.86);
      --muted-2: rgba(173, 204, 225, 0.74);
      --shadow-frost: rgba(20, 53, 80, 0.2);
      --font-display: 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif;
      color-scheme: light;
    }
    html, body { margin: 0; min-height: 100%; background-image: linear-gradient(160deg, rgba(25, 87, 128, 0.22), rgba(20, 74, 112, 0.2)), url('${BACKGROUND_ASSET}'); background-size: cover, cover; background-position: center center, center center; background-repeat: no-repeat, no-repeat; color: #eef8ff; font-family: var(--font-display); }
    .pyramid-prototype-page .pyramid-prototype { min-height: 100vh; display: flex; flex-direction: column; }
    .prototype-shell { position: relative; flex: 1; display: flex; flex-direction: column; padding: clamp(14px, 2vw, 28px); gap: clamp(14px, 1.8vw, 22px); max-width: 1540px; width: 100%; margin: 0 auto; }
    .shell-glow { position: absolute; inset: -8% -12% auto -8%; height: 42%; background: radial-gradient(ellipse at top, rgba(145, 213, 241, 0.24), transparent 58%); pointer-events: none; }
    .shell-inner { position: relative; z-index: 1; display: flex; flex-direction: column; gap: clamp(14px, 1.8vw, 22px); padding: clamp(12px, 1.2vw, 20px); border-radius: 22px; border: 1px solid rgba(176, 224, 246, 0.58); background: linear-gradient(150deg, rgba(100, 154, 190, 0.34), rgba(93, 145, 179, 0.3)); backdrop-filter: blur(1px); }
    .top-strip { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .nameplate { display: flex; align-items: center; gap: 12px; }
    .nameplate img { width: clamp(42px, 8vw, 64px); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
    .nameplate-copy { display: flex; flex-direction: column; font-size: 0.82rem; color: #ecf8ff; letter-spacing: 0.12em; text-transform: uppercase; text-shadow: 0 1px 2px rgba(10, 38, 62, 0.62); }
    .nameplate-copy strong { font-size: clamp(1.72rem, 3.5vw, 2.32rem); color: #f9fdff; text-transform: none; letter-spacing: 0; text-shadow: 0 2px 4px rgba(8, 32, 52, 0.65); }
    .status-chip { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: linear-gradient(135deg, rgba(55, 200, 243, 0.84), rgba(17, 150, 198, 0.92)); border: 1px solid rgba(124, 224, 255, 0.65); box-shadow: 0 2px 8px var(--shadow-frost); }
    .status-chip img { width: 20px; opacity: 0.7; }
    .status-chip span { font-size: 0.88rem; color: #f1fbff; font-weight: 700; text-shadow: 0 1px 2px rgba(7, 36, 58, 0.55); }
    .board-grid { display: grid; grid-template-columns: minmax(300px, 0.84fr) minmax(420px, 1.16fr); gap: clamp(12px, 1.5vw, 18px); align-items: stretch; }
    @media (max-width: 780px) { .board-grid { grid-template-columns: 1fr; } }
    .panel { display: flex; flex-direction: column; gap: 12px; padding: clamp(10px, 1.2vw, 16px); border-radius: 24px; background: linear-gradient(160deg, rgba(92, 145, 181, 0.4), rgba(86, 136, 171, 0.36)); border: 1px solid rgba(190, 230, 248, 0.5); box-shadow: 0 8px 32px rgba(12, 48, 76, 0.24), inset 0 1px 0 rgba(226, 245, 255, 0.2); }
    .panel-head h2 { margin: 4px 0 6px; font-size: clamp(1.3rem, 2.2vw, 1.7rem); color: #f0f8ff; text-shadow: 0 2px 4px rgba(11, 43, 67, 0.6); }
    .panel-head p { margin: 0; font-size: 0.95rem; color: rgba(228, 243, 251, 0.96); line-height: 1.5; text-shadow: 0 1px 2px rgba(11, 43, 67, 0.45); }
    .label { margin: 0; letter-spacing: 0.2em; text-transform: uppercase; font-size: 0.72rem; color: #dff3ff; text-shadow: 0 1px 2px rgba(11, 43, 67, 0.55); }
    .rack-list { display: flex; flex-direction: column; gap: 6px; }
    .rack-row { display: flex; align-items: center; gap: 4px; padding: 1px 0; }
    .rack-label { position: relative; width: 94px; flex-shrink: 0; display: grid; place-items: center; }
    .rack-label img { width: 100%; height: auto; display: block; filter: drop-shadow(0 3px 6px rgba(5, 22, 40, 0.35)); }
    .rack-label-text { position: absolute; inset: 0; display: grid; place-items: center; font-size: 0.72rem; font-weight: 900; color: #f2fbff; text-transform: uppercase; letter-spacing: 0.08em; text-shadow: 0 1px 2px rgba(5, 22, 40, 0.95); pointer-events: none; }
    .rack-slots { display: grid; grid-template-columns: repeat(3, max-content); gap: 2px; flex: 1; align-items: end; justify-content: start; }
    .rack-slot { position: relative; display: flex; align-items: flex-end; justify-content: center; }
    .rack-slot.depleted > img { opacity: 0.25; filter: grayscale(0.4) drop-shadow(0 3px 4px rgba(0, 0, 0, 0.14)); }
    .rack-slot > img { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15)); transition: transform 0.2s; }
    .rack-slot-small > img { width: clamp(44px, 9vw, 68px); }
    .rack-slot-medium > img { width: clamp(54px, 10.5vw, 84px); }
    .rack-slot-large > img { width: clamp(64px, 12vw, 98px); }
    .rack-slot > img:hover { transform: translateY(-2px); }
    .slot-count { position: absolute; bottom: 2px; left: 2px; width: 38px; height: 32px; display: grid; place-items: center; }
    .slot-count img { width: 100%; height: 100%; object-fit: contain; display: block; filter: drop-shadow(0 2px 4px rgba(5, 22, 40, 0.45)); }
    .slot-count-text { position: absolute; font-size: 0.82rem; font-weight: 900; color: #e9f9ff; letter-spacing: 0.01em; text-shadow: 0 1px 2px rgba(5, 22, 40, 0.95); transform: translateY(1px); }
    .playfield-stack { display: flex; flex-direction: column; gap: 10px; min-height: 100%; }
    .zone { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 16px; background: rgba(108, 159, 193, 0.26); border: 1px solid rgba(191, 230, 248, 0.46); box-shadow: 0 4px 12px rgba(15, 50, 76, 0.22); }
    .zone-small { padding: 10px; min-height: 150px; flex: 1 1 0; }
    .zone-medium { min-height: 220px; flex: 1.25 1 0; }
    .zone-title { display: flex; flex-direction: column; gap: 2px; }
    .zone-title h3 { margin: 0; font-size: 1.15rem; color: #f0f8ff; text-shadow: 0 2px 4px rgba(12, 42, 66, 0.6); }
    .zone-content { min-height: 88px; display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; align-content: flex-start; }
    .zoneplaceholder { color: rgba(225, 242, 251, 0.95); font-size: 0.98rem; font-style: italic; text-shadow: 0 1px 2px rgba(12, 42, 66, 0.5); }
    .piece-token { position: relative; display: inline-flex; align-items: flex-end; justify-content: center; }
    .piece-token img { width: clamp(42px, 5vw, 66px); filter: drop-shadow(0 4px 5px rgba(9, 30, 47, 0.42)); }
    .piece-token.counter img { width: clamp(46px, 5.8vw, 76px); }
    .footer-note { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(168, 212, 236, 0.28); }
    .footer-note p { margin: 0; font-size: 0.82rem; color: rgba(215, 232, 245, 0.9); }
    .footer-pill { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: rgba(82, 125, 150, 0.55); border: 1px solid rgba(164, 211, 235, 0.4); }
    .footer-pill img { width: 18px; opacity: 0.7; }
    .footer-pill span { font-size: 0.74rem; color: var(--muted); }
    /* Game controls */
    .game-controls { display: flex; gap: 10px; margin-top: 8px; }
    .game-button { padding: 10px 18px; border: none; border-radius: 12px; font-family: inherit; font-size: 0.86rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .game-button:disabled { opacity: 0.4; cursor: not-allowed; }
    .primary-button { background: linear-gradient(135deg, #62d6ff, #3cbde8); color: #06101d; font-weight: 700; }
    .primary-button:hover:not(:disabled) { background: linear-gradient(135deg, #8ef4ff, #5ceffc); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(98, 214, 255, 0.3); }
    .secondary-button { background: rgba(185, 216, 235, 0.28); color: #e8f4fd; border: 1px solid rgba(146, 221, 249, 0.5); }
    .secondary-button:hover:not(:disabled) { background: rgba(185, 216, 235, 0.45); border-color: var(--accent); }
    /* Turn status banner */
    .turn-status { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: 12px; background: rgba(89, 146, 183, 0.34); border: 1px solid rgba(190, 230, 248, 0.5); margin-bottom: 10px; box-shadow: 0 4px 12px rgba(12, 42, 66, 0.24); }
    .turn-status-info { font-size: 1.08rem; color: #f4fbff; text-shadow: 0 1px 2px rgba(12, 42, 66, 0.62); }
    .turn-status-info strong { color: var(--accent); }
    .turn-number { font-size: 1rem; color: #ebf7ff; text-shadow: 0 1px 2px rgba(12, 42, 66, 0.58); }
    /* Last roll display */
    .last-roll { padding: 10px; border-radius: 10px; background: rgba(89, 146, 183, 0.3); border: 1px solid rgba(190, 230, 248, 0.46); margin-bottom: 10px; box-shadow: 0 4px 12px rgba(12, 42, 66, 0.2); color: #f2faff; font-size: 1rem; font-weight: 600; }
    .outcome-safe { color: #2a9d8f; }
    .outcome-bust { color: #e76f51; }
    .outcome-pending { color: var(--accent-gold); }
    /* Dice roll modal - ICE theme */
    .dice-roll-modal { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 16px; }
    .dice-roll-backdrop { position: absolute; inset: 0; background: rgba(182, 220, 241, 0.12); backdrop-filter: blur(2px); }
    .dice-roll-panel { position: relative; width: min(820px, 100%); min-height: 560px; padding: 0; border-radius: 26px; border: 1px solid rgba(227, 246, 253, 0.82); background: rgba(194, 226, 244, 0.14); box-shadow: none; overflow: hidden; }
    .dice-roll-bg { position: absolute; inset: 0; background-image: linear-gradient(165deg, rgba(187, 225, 244, 0.08), rgba(175, 216, 238, 0.08)), url('${BACKGROUND_ASSET}'); background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; pointer-events: none; }
    .modal-close-btn { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--ice-frost); color: var(--text); font-size: 1.4rem; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.2s; }
    .modal-close-btn:hover { background: var(--accent); color: white; transform: scale(1.1); }
    .dice-roll-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 20px; min-height: 560px; gap: 12px; }
    .dice-roll-content .label { margin-bottom: 8px; color: var(--muted); }
    .dice-roll-content h3 { margin: 0 0 10px; font-size: 1.8rem; color: var(--text); }
    .dice-roll-copy { color: rgba(235, 246, 252, 0.96); max-width: 62ch; text-align: center; margin-bottom: 0; text-shadow: 0 1px 2px rgba(8, 30, 50, 0.6); }
    .dice-roll-stage-3d { width: min(760px, 100%); min-height: 340px; height: 48vh; max-height: 430px; border-radius: 20px; overflow: hidden; border: 1px solid rgba(205, 238, 251, 0.62); background: rgba(179, 216, 235, 0.2); box-shadow: inset 0 1px 0 rgba(241, 250, 255, 0.4); }
    .dice-roll-loading { width: 100%; height: 100%; display: grid; place-items: center; color: rgba(227, 243, 252, 0.95); font-size: 0.96rem; letter-spacing: 0.05em; text-transform: uppercase; text-shadow: 0 1px 2px rgba(8, 30, 50, 0.65); }
    /* Selection grid */
    .selection-grid { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; max-width: 640px; }
    .selection-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 16px; border-radius: 16px; border: 2px solid var(--ice-glow); background: var(--ice-frost); cursor: pointer; transition: all 0.2s; min-width: 90px; }
    .selection-btn:hover { border-color: var(--accent); background: rgba(98, 214, 255, 0.15); transform: translateY(-2px); box-shadow: 0 6px 16px var(--shadow-frost); }
    .selection-btn.selected { border-color: var(--accent); background: rgba(98, 214, 255, 0.25); box-shadow: 0 0 0 2px var(--accent); }
    .selection-btn img { width: 48px; height: 48px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
    .selection-btn span { font-size: 0.74rem; color: var(--text); font-weight: 600; }
    .selection-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
    @keyframes dice-shake { 0% { transform: translateX(0); } 25% { transform: translateX(-4px) rotate(-2deg); } 50% { transform: translateX(4px) rotate(2deg); } 75% { transform: translateX(-4px) rotate(-2deg); } 100% { transform: translateX(0); } }
  `;
  return style;
}

export function createPyramidPlayfieldPrototype(root: HTMLElement, options: PyramidPrototypeOptions = {}): PyramidPrototypeControls {
  const title = options.title ?? 'Pyramid rack layout with dice game integration';
  const subtitle = options.subtitle ?? 'Roll color and size dice to pull pyramids from the Bank.';
  
  const style = createStyleTag();
  document.head.appendChild(style);
  
  // Initialize game state
  let gameState = createGame(2, ['Player 1', 'Player 2'], 0x1f2e3d4c);
  let rolling = false;
  let rollTimeout: number | null = null;
  let showModal = false;
  let modalRollResolved = false;
  let selectedPyramid: { color: ColorKey; size: SizeKey } | null = null;
  let modalDice: VirtualDicePrototypeControls | null = null;

  function ensureModalDice(): void {
    const mount = document.getElementById('diceRoll3dMount');
    if (!mount) {
      return;
    }
    if (modalDice && modalDice.root.parentElement === mount) {
      return;
    }
    if (modalDice) {
      modalDice.dispose();
      modalDice = null;
    }

    modalDice = createVirtualDicePrototype(mount, {
      mode: 'modal',
      disableGlowEffects: true,
      backgroundAssetUrl: BACKGROUND_ASSET,
      showInteractiveControls: false,
      onRollComplete: () => {
        rolling = false;
        modalRollResolved = true;
        updateModalContent();
      }
    });
  }
  
  function render(): void {
    const rackRows = COLOR_ORDER.map((color) => renderRackRow(color, gameState.bank)).join('');
  
    const counterData = renderCounter(gameState.counter);
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const nextPlayer = gameState.players[(gameState.currentPlayerIndex + 1) % gameState.players.length];
    const playerName = currentPlayer?.name ?? 'Player 1';
    const playerScore = currentPlayer ? getPlayerScore(currentPlayer) : '0/3 trios';
    const canRoll = gameState.phase === 'turn' && !rolling && !showModal;
    const canStop = gameState.phase === 'turn' && getCounterTotal(gameState) > 0 && !rolling && !showModal;
    
    const counterHTML = `
      <div class="zone zone-medium">
        <div class="zone-title">
          <p class="label">Counter</p>
          <h3>${counterData.title}</h3>
        </div>
        <div class="zone-content">
          ${counterData.pieces}
        </div>
        <div class="game-controls">
          <button class="game-button primary-button" id="rollDiceBtn" ${!canRoll ? 'disabled' : ''}>Roll Dice</button>
          <button class="game-button secondary-button" id="endTurnBtn" ${!canStop ? 'disabled' : ''}>End Turn</button>
        </div>
      </div>
    `;
    
    const currentVault = currentPlayer?.vault ?? {};
    const topVaultContent = renderVault(currentVault);
    const topVault = `
      <div class="zone zone-small">
        <div class="zone-title">
          <p class="label">Vault</p>
          <h3>${playerName}</h3>
        </div>
        <div class="zone-content">
          ${topVaultContent}
        </div>
      </div>
    `;
    
    const nextVault = nextPlayer?.vault ?? {};
    const nextName = nextPlayer?.name ?? 'Player 2';
    const bottomVault = `
      <div class="zone zone-small">
        <div class="zone-title">
          <p class="label">Vault</p>
          <h3>${nextName}</h3>
        </div>
        <div class="zone-content">
          ${renderVault(nextVault)}
        </div>
      </div>
    `;
    
    root.innerHTML = `
      <div class="pyramid-prototype">
        <div class="prototype-shell">
          <div class="shell-glow" aria-hidden="true"></div>
          <div class="shell-inner">
            <header class="top-strip">
              <div class="nameplate">
                <img src="${BUTTON_ASSETS.large}" alt="" aria-hidden="true" />
                <div class="nameplate-copy">
                  Ice Dice
                  <strong>Playfield</strong>
                </div>
              </div>
              <div class="status-chip">
                <img src="${BUTTON_ASSETS.small}" alt="" aria-hidden="true" />
                <span>Turn ${gameState.turnNumber}</span>
              </div>
            </header>
            
            <div class="turn-status">
              <div class="turn-status-info"><strong>${playerName}</strong> is up</div>
              <div class="turn-number">Bank: ${renderBankCount(gameState.bank)} · Counter: ${getCounterTotal(gameState)} pieces</div>
            </div>
            
            <div class="last-roll">
              ${renderLastRoll(gameState.lastRoll)}
            </div>
            
            <div class="board-grid">
              <section class="panel rack-panel" aria-label="Pyramid bank rack">
                <div class="panel-head">
                  <p class="label">Bank</p>
                  <h2>Rows that read like the physical rack</h2>
                </div>
                <div class="rack-list">${rackRows}</div>
              </section>
              
              <section class="panel playfield-panel" aria-label="Playfield zones">
                <div class="panel-head">
                  <p class="label">Playfield</p>
                  <h2>Keep the center open</h2>
                </div>
                <div class="playfield-stack">
                  ${topVault}
                  ${counterHTML}
                  ${bottomVault}
                </div>
              </section>
            </div>
            
            <footer class="footer-note">
              <p><strong>Phase:</strong> ${gameState.phase}</p>
              <div class="footer-pill">
                <img src="${BUTTON_ASSETS.medium}" alt="" aria-hidden="true" />
                <span>${playerName} · ${playerScore}</span>
              </div>
            </footer>
          </div>
        </div>
        ${createDiceRollModal()}
      </div>
    `;
    
    // Attach event listeners
    document.getElementById('rollDiceBtn')?.addEventListener('click', handleRollClick);
    document.getElementById('endTurnBtn')?.addEventListener('click', handleStopClick);
    document.getElementById('modalCloseBtn')?.addEventListener('click', handleCloseModal);
    
    // If modal should be showing, update it
    if (showModal) {
      ensureModalDice();
      updateModalContent();
    }
  }
  
  function handleRollClick(): void {
    if (gameState.phase !== 'turn' || rolling || showModal) return;
    
    const action: Action = { type: 'roll' };
    gameState = applyAction(gameState, action);
    if (!gameState.pendingRoll) {
      return;
    }

    rolling = true;
    modalRollResolved = false;
    selectedPyramid = null;

    showModal = true;
    render();
    updateModalRolling();
    document.getElementById('diceRollModal')!.style.display = 'grid';

    ensureModalDice();
    const pending = gameState.pendingRoll;
    if (pending && modalDice) {
      modalDice.rollToFaces(pending.colorFace as ColorFace, pending.sizeFace as SizeFace);
    }
  }
  
  function updateModalRolling(): void {
    const modal = document.getElementById('diceRollModal');
    if (!modal) return;
    
    const labelEl = document.getElementById('modalLabel');
    const titleEl = document.getElementById('modalTitle');
    const copyEl = document.getElementById('modalSubtitle');
    const selectionGrid = document.getElementById('selectionGrid');
    
    if (labelEl) labelEl.textContent = 'Roll in progress';
    if (titleEl) titleEl.textContent = '3D dice are rolling';
    if (copyEl) copyEl.textContent = 'The turn is paused until the dice settle and you confirm a piece.';
    
    if (selectionGrid) {
      selectionGrid.style.display = 'none';
      selectionGrid.innerHTML = '';
    }
  }
  
  function updateModalContent(): void {
    const modal = document.getElementById('diceRollModal');
    if (!modal) return;

    const pendingRoll = gameState.pendingRoll;
    if (!pendingRoll) return;

    const labelEl = document.getElementById('modalLabel');
    const titleEl = document.getElementById('modalTitle');
    const copyEl = document.getElementById('modalSubtitle');
    const selectionGrid = document.getElementById('selectionGrid');

    if (!modalRollResolved || rolling) {
      if (labelEl) labelEl.textContent = 'Roll in progress';
      if (titleEl) titleEl.textContent = '3D dice are rolling';
      if (copyEl) copyEl.textContent = 'Waiting for final faces...';
      if (selectionGrid) {
        selectionGrid.style.display = 'none';
        selectionGrid.innerHTML = '';
      }
      return;
    }

    if (labelEl) labelEl.textContent = 'Roll Result';
    if (titleEl) titleEl.textContent = 'Choose Your Pyramid';
    if (copyEl) {
      copyEl.textContent = `Rolled: ${formatDiceFace(pendingRoll.colorFace)} / ${formatDiceFace(pendingRoll.sizeFace)}. Select your matching piece.`;
    }

    // Generate selection options
    const allowedColors = getAllowedColors(pendingRoll.colorFace);
    const allowedSizes = getAllowedSizes(pendingRoll.sizeFace);

    // Auto-select if only one option available
    if (allowedColors.length === 1 && allowedSizes.length === 1 && !selectedPyramid) {
      selectedPyramid = { color: allowedColors[0] as ColorKey, size: allowedSizes[0] as SizeKey };
    }


    if (selectionGrid) {
      // Show selection grid
      selectionGrid.style.display = 'flex';

      let selectionsHTML = '';

      for (const color of allowedColors) {
        for (const size of allowedSizes) {
          const isSelected = selectedPyramid?.color === color && selectedPyramid?.size === size;
          const asset = pieceAsset(color as ColorKey, size as SizeKey);
          selectionsHTML += '<button class="selection-btn ' + (isSelected ? 'selected' : '') + '" data-color="' + color + '" data-size="' + size + '">' +
            '<img src="' + asset.src + '" alt="' + asset.alt + '" />' +
            '<span>' + SIZE_LABELS[size as SizeKey] + '</span>' +
            '<span class="selection-label">' + COLOR_LABELS[color as ColorKey] + '</span>' +
            '</button>';
        }
      }

      // Add confirm button
      // Add confirm button
      selectionsHTML += '<button class="game-button primary-button" id="confirmSelectionBtn" ' + (!selectedPyramid ? 'disabled' : '') + ' style="margin-left: 12px;">Confirm</button>';
      selectionGrid.innerHTML = selectionsHTML;

      // Add click handlers for selection buttons
      selectionGrid.querySelectorAll('.selection-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.getAttribute('data-color') as Color;
          const size = btn.getAttribute('data-size') as Size;
          selectedPyramid = { color: color as ColorKey, size: size as SizeKey };

          // Update visual selection
          selectionGrid.querySelectorAll('.selection-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');

          // Enable confirm button
          const confirmBtn = document.getElementById('confirmSelectionBtn') as HTMLButtonElement | null;
          if (confirmBtn) confirmBtn.disabled = false;
        });
      });

      // Add confirm handler
      document.getElementById('confirmSelectionBtn')?.addEventListener('click', handleConfirmSelection);
    }
  }

  function handleConfirmSelection(): void {
    if (!selectedPyramid || !gameState.pendingRoll) return;
    
    const action: Action = {
      type: 'choosePiece',
      color: selectedPyramid.color as Color,
      size: selectedPyramid.size as Size
    };
    
    gameState = applyAction(gameState, action);
    selectedPyramid = null;
    showModal = false;
    modalRollResolved = false;
    hideDiceModal();
    render();
  }
  
  
  function handleStopClick(): void {
    if (gameState.phase !== 'turn' || getCounterTotal(gameState) === 0 || showModal) return;
    
    const action: Action = { type: 'stopTurn' };
    gameState = applyAction(gameState, action);
    render();
  }

  function handleCloseModal(): void {
    if (rolling || gameState.phase === 'choose') {
      return;
    }
    showModal = false;
    selectedPyramid = null;
    hideDiceModal();
    render();
  }
  
  function hideDiceModal(): void {
    const modal = document.getElementById('diceRollModal');
    if (modal) modal.style.display = 'none';
  }
  
  document.body.classList.add('pyramid-prototype-page');
  
  // Initial render
  render();
  
  return {
    root,
    dispose() {
      document.body.classList.remove('pyramid-prototype-page');
      if (rollTimeout) clearTimeout(rollTimeout);
      if (modalDice) {
        modalDice.dispose();
        modalDice = null;
      }
      style.remove();
      root.innerHTML = '';
    }
  };
}
