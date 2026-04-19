import {
  createGame,
  applyAction,
  getCounterTotal,
  getUniqueCounterColors,
  getPlayerTrios,
  getPlayerScore,
  getAllowedColors,
  getAllowedSizes,
  type GameState,
  type Action,
  type Color,
  type Size
} from './game/rules';

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

function pieceAsset(color: ColorKey, size: SizeKey): PyramidAsset {
  const asset = PYRAMID_ASSETS.find((entry) => entry.color === color && entry.size === size);
  if (!asset) throw new Error(`Missing pyramid asset for ${color}/${size}.`);
  return asset;
}

function renderRackRow(color: ColorKey): string {
  const colorLabel = COLOR_LABELS[color];
  const slots = SIZE_ORDER.map((size) => {
    const asset = pieceAsset(color, size);
    return `
      <div class="rack-slot rack-slot-${size}">
        <img src="${asset.src}" alt="${asset.alt}" />
        <span class="slot-count">×2</span>
      </div>
    `;
  }).join('');
  return `
    <div class="rack-row">
      <div class="rack-label">${colorLabel}</div>
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

function renderCounter(counter: Record<string, number>): { title: string; pieces: string } {
  const entries = Object.entries(counter).filter(([, count]) => count > 0);
  const colors = entries.map(([key, count]) => {
    const parts = key.split(':');
    const color = parts[0] as ColorKey;
    const size = parts[1] as SizeKey;
    const label = `${COLOR_LABELS[color] || color} ${SIZE_LABELS[size] || size}`;
    return `<span class="counter-piece">${label} ×${count}</span>`;
  });
  const colorCount = new Set(entries.map(([key]) => key.split(':')[0])).size;
  const title = colors.length > 0 ? `${colorCount} colors in play` : 'Empty at the moment';
  const pieces = colors.length > 0 ? colors.join('') : '<span class="zoneplaceholder">The Counter is clear</span>';
  return { title, pieces };
}

function renderVault(vault: Record<string, number>): string {
  const pieces = Object.entries(vault)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const parts = key.split(":");
      const color = parts[0] as ColorKey;
      const size = parts[1] as SizeKey;
      return `<span class="vault-piece">${COLOR_LABELS[color] || color} ${SIZE_LABELS[size] || size} ×${count}</span>`;
    });
  return pieces.length > 0 ? pieces.join('') : '<span class="zoneplaceholder">Empty</span>';
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
          <h3 id="modalTitle">The ice is stirring</h3>
          <p class="dice-roll-copy" id="modalSubtitle">The dice are gathering frost before they settle.</p>
          <div class="dice-roll-stage" id="diceRollStage" style="opacity: 0;">
            <article class="roll-die roll-die-color rolling">
              <img id="modalColorDie" src="${COLOR_FACE_ASSETS.azure}" alt="" />
              <span id="modalColorLabel">Azure</span>
            </article>
            <article class="roll-die roll-die-size rolling">
              <img id="modalSizeDie" src="${SIZE_FACE_ASSETS.small}" alt="" />
              <span id="modalSizeLabel">Small</span>
            </article>
          </div>
          <div class="dice-roll-sparkline" id="diceSparkline">
            <span></span><span></span><span></span><span></span><span></span><span></span>
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
      --ice-white: #f0f8ff;
      --ice-frost: rgba(255, 255, 255, 0.85);
      --ice-glow: rgba(138, 230, 255, 0.4);
      --ice-accent: #62d6ff;
      --ice-accent-dark: #3cbde8;
      --text: #0a1628;
      --text-muted: rgba(10, 22, 40, 0.7);
      --accent: #62d6ff;
      --accent-gold: #f5d46d;
      --muted: rgba(10, 22, 40, 0.6);
      --muted-2: rgba(10, 22, 40, 0.5);
      --shadow-frost: rgba(138, 220, 255, 0.15);
      --font-display: 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif;
      color-scheme: light;
    }
    html, body { margin: 0; min-height: 100%; background: linear-gradient(160deg, #e8f4fc 0%, #d0e8f5 40%, #c5e1f0 100%); color: #0a1628; font-family: var(--font-display); }
    .pyramid-prototype-page .pyramid-prototype { min-height: 100vh; display: flex; flex-direction: column; }
    .prototype-shell { position: relative; flex: 1; display: flex; flex-direction: column; padding: clamp(14px, 2vw, 28px); gap: clamp(14px, 1.8vw, 22px); }
    .shell-glow { position: absolute; inset: -8% -12% auto -8%; height: 42%; background: radial-gradient(ellipse at top, rgba(98, 214, 255, 0.2), transparent 58%); pointer-events: none; }
    .shell-inner { position: relative; z-index: 1; display: flex; flex-direction: column; gap: clamp(14px, 1.8vw, 22px); }
    .top-strip { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .nameplate { display: flex; align-items: center; gap: 12px; }
    .nameplate img { width: clamp(42px, 8vw, 64px); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
    .nameplate-copy { display: flex; flex-direction: column; font-size: 0.72rem; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; }
    .nameplate-copy strong { font-size: clamp(1.4rem, 3vw, 2rem); color: var(--text); text-transform: none; letter-spacing: 0; }
    .status-chip { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: var(--ice-frost); border: 1px solid var(--ice-glow); box-shadow: 0 2px 8px var(--shadow-frost); }
    .status-chip img { width: 20px; opacity: 0.7; }
    .status-chip span { font-size: 0.78rem; color: var(--muted); }
    .board-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(14px, 1.8vw, 22px); }
    @media (max-width: 780px) { .board-grid { grid-template-columns: 1fr; } }
    .panel { display: flex; flex-direction: column; gap: 14px; padding: clamp(14px, 1.8vw, 22px); border-radius: 24px; background: var(--ice-frost); border: 1px solid rgba(138, 220, 255, 0.3); box-shadow: 0 8px 32px rgba(0, 40, 80, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8); }
    .panel-head h2 { margin: 4px 0 6px; font-size: clamp(1.2rem, 2vw, 1.5rem); }
    .panel-head p { margin: 0; font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; }
    .label { margin: 0; letter-spacing: 0.2em; text-transform: uppercase; font-size: 0.68rem; color: var(--muted); }
    .rack-list { display: flex; flex-direction: column; gap: 12px; }
    .rack-row { display: flex; align-items: center; gap: 12px; }
    .rack-label { width: 72px; font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; flex-shrink: 0; }
    .rack-slots { display: flex; gap: 8px; flex: 1; }
    .rack-slot { position: relative; display: flex; align-items: flex-end; justify-content: center; }
    .rack-slot img { width: clamp(42px, 14vw, 68px); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15)); transition: transform 0.2s; }
    .rack-slot img:hover { transform: translateY(-2px); }
    .slot-count { position: absolute; bottom: 2px; right: 4px; font-size: 0.64rem; color: var(--muted); text-shadow: 0 1px 2px rgba(255,255,255,0.8); }
    .playfield-stack { display: flex; flex-direction: column; gap: 12px; }
    .zone { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 16px; background: rgba(255, 255, 255, 0.6); border: 1px solid var(--ice-glow); box-shadow: 0 4px 12px var(--shadow-frost); }
    .zone-small { padding: 10px; }
    .zone-title { display: flex; flex-direction: column; gap: 2px; }
    .zone-title h3 { margin: 0; font-size: 0.94rem; }
    .zone-content { min-height: 48px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .zoneplaceholder { color: var(--muted); font-size: 0.82rem; font-style: italic; }
    .counter-piece, .vault-piece { padding: 4px 10px; border-radius: 8px; background: rgba(98, 214, 255, 0.2); border: 1px solid var(--ice-accent); font-size: 0.76rem; }
    .footer-note { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--ice-glow); }
    .footer-note p { margin: 0; font-size: 0.82rem; color: var(--text-muted); }
    .footer-pill { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: var(--ice-frost); border: 1px solid var(--ice-glow); }
    .footer-pill img { width: 18px; opacity: 0.7; }
    .footer-pill span { font-size: 0.74rem; color: var(--muted); }
    /* Game controls */
    .game-controls { display: flex; gap: 10px; margin-top: 8px; }
    .game-button { padding: 10px 18px; border: none; border-radius: 12px; font-family: inherit; font-size: 0.86rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .game-button:disabled { opacity: 0.4; cursor: not-allowed; }
    .primary-button { background: linear-gradient(135deg, #62d6ff, #3cbde8); color: #06101d; font-weight: 700; }
    .primary-button:hover:not(:disabled) { background: linear-gradient(135deg, #8ef4ff, #5ceffc); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(98, 214, 255, 0.3); }
    .secondary-button { background: rgba(255, 255, 255, 0.9); color: var(--text); border: 1px solid var(--ice-accent); }
    .secondary-button:hover:not(:disabled) { background: rgba(255, 255, 255, 1); border-color: var(--accent); }
    /* Turn status banner */
    .turn-status { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: 12px; background: var(--ice-frost); border: 1px solid var(--ice-glow); margin-bottom: 10px; box-shadow: 0 4px 12px var(--shadow-frost); }
    .turn-status-info { font-size: 0.86rem; }
    .turn-status-info strong { color: var(--accent); }
    .turn-number { font-size: 0.78rem; color: var(--muted); }
    /* Last roll display */
    .last-roll { padding: 10px; border-radius: 10px; background: var(--ice-frost); border: 1px solid var(--ice-glow); margin-bottom: 10px; box-shadow: 0 4px 12px var(--shadow-frost); }
    .outcome-safe { color: #2a9d8f; }
    .outcome-bust { color: #e76f51; }
    .outcome-pending { color: var(--accent-gold); }
    /* Dice roll modal - ICE theme */
    .dice-roll-modal { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 16px; }
    .dice-roll-backdrop { position: absolute; inset: 0; background: radial-gradient(circle at top, rgba(200, 235, 255, 0.4), transparent 36%), radial-gradient(circle at bottom, rgba(255, 255, 255, 0.3), transparent 32%), rgba(200, 230, 255, 0.85); backdrop-filter: blur(12px); }
    .dice-roll-panel { position: relative; width: min(760px, 100%); min-height: 520px; padding: 0; border-radius: 30px; border: 1px solid var(--ice-accent); background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 255, 0.98)); box-shadow: 0 28px 84px rgba(0, 80, 140, 0.25), 0 0 0 1px var(--ice-glow); overflow: hidden; }
    .dice-roll-bg { position: absolute; inset: 0; background-image: url('${BACKGROUND_ASSET}'); background-repeat: no-repeat; background-position: center center; background-size: 85%; opacity: 0.25; pointer-events: none; }
    .modal-close-btn { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--ice-frost); color: var(--text); font-size: 1.4rem; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.2s; }
    .modal-close-btn:hover { background: var(--accent); color: white; transform: scale(1.1); }
    .dice-roll-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; min-height: 520px; background: radial-gradient(circle at center, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.95) 60%, rgba(230, 242, 250, 0.98) 100%); }
    .dice-roll-content .label { margin-bottom: 8px; color: var(--muted); }
    .dice-roll-content h3 { margin: 0 0 10px; font-size: 1.8rem; color: var(--text); }
    .dice-roll-copy { color: var(--text-muted); max-width: 46ch; text-align: center; margin-bottom: 20px; }
    .dice-roll-stage { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-bottom: 20px; }
    .roll-die { min-height: 200px; animation: dice-shake 0.15s linear infinite;  padding: 18px; display: grid; place-items: center; border-radius: 26px; border: 1px solid var(--ice-glow); background: radial-gradient(circle at top left, rgba(255, 255, 255, 0.9), rgba(240, 248, 255, 0.8)), linear-gradient(160deg, rgba(255, 255, 255, 0.4), rgba(240, 248, 255, 0.2)); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 8px 24px rgba(0, 60, 100, 0.12); }
    .roll-die img { width: min(62%, 160px); max-height: 130px; object-fit: contain; filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.15)); }
    .roll-die span { margin-top: 12px; font-family: var(--font-display); letter-spacing: 0.12em; text-transform: uppercase; color: var(--text); font-size: 0.75rem; }
    /* Selection grid */
    .selection-grid { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; max-width: 500px; }
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
  let selectedPyramid: { color: ColorKey; size: SizeKey } | null = null;
  
  // Render functions
  const rackRows = COLOR_ORDER.map((color) => renderRackRow(color)).join('');
  function render(): void {
  
    const counterData = renderCounter(gameState.counter);
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
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
    
    const bottomVault = renderZone('Vault', 'Player 2', 'small');
    
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
      updateModalContent();
    }
  }
  
  function handleRollClick(): void {
    if (gameState.phase !== 'turn' || rolling || showModal) return;
    
    rolling = true;
    selectedPyramid = null;
    
    // Show modal immediately with rolling state
    showModal = true;
    updateModalRolling();
    document.getElementById('diceRollModal')!.style.display = 'grid';
    
    if (rollTimeout) clearTimeout(rollTimeout);
    rollTimeout = window.setTimeout(() => {
      const action: Action = { type: 'roll' };
      gameState = applyAction(gameState, action);
      rolling = false;
      
      // Update modal to show selection UI
      try {
        updateModalContent();
        console.log("updateModalContent called successfully");
      } catch (e) {
        console.error("Error calling updateModalContent:", e);
      }
    }, 1500);
  }
  
  function updateModalRolling(): void {
    const modal = document.getElementById('diceRollModal');
    if (!modal) return;
    
    const labelEl = modal.querySelector('.label');
    const titleEl = modal.querySelector('.modal-result-title');
    const copyEl = modal.querySelector('.dice-roll-copy');
    const stage = modal.querySelector('.dice-roll-stage');
    const selectionGrid = document.getElementById('selectionGrid');
    
    if (labelEl) labelEl.textContent = 'Roll in progress';
    if (titleEl) titleEl.textContent = 'The ice is stirring';
    if (copyEl) copyEl.textContent = 'The dice are gathering frost before they settle...';
    
    // Add rolling animation to dice
    const dice = stage?.querySelectorAll('.roll-die');
    dice?.forEach(d => d.classList.add('rolling'));
    
    if (selectionGrid) selectionGrid.innerHTML = '';
  }
  
  function updateModalContent(): void {
    const modal = document.getElementById('diceRollModal');
    if (!modal) return;

    const pendingRoll = gameState.pendingRoll;
    if (!pendingRoll) return;

    // Update label and title using correct IDs
    const labelEl = document.getElementById('modalLabel');
    const titleEl = document.getElementById('modalTitle');
    const copyEl = document.getElementById('modalSubtitle');
    const stage = document.getElementById('diceRollStage');
    const sparkline = document.getElementById('diceSparkline');

    if (labelEl) labelEl.textContent = 'Roll Result';
    if (titleEl) titleEl.textContent = 'Choose Your Pyramid';
    if (copyEl) copyEl.textContent = 'Select the piece that matches your roll.';

    // Update visual state - hide sparkline, show dice and selection
    console.log('Updating visual state - sparkline:', !!sparkline, 'stage:', !!stage);
    if (sparkline) {
      sparkline.style.display = 'none';
      console.log('Set sparkline display to none');
    }
    if (stage) {
      stage.style.opacity = '1';
      console.log('Set stage opacity to 1');
    }

    // Update dice display - remove rolling animation
    const dice = stage?.querySelectorAll('.roll-die');
    dice?.forEach(d => d.classList.remove('rolling'));

    // Update dice images
    const colorDieImg = document.getElementById('modalColorDie') as HTMLImageElement | null;
    const sizeDieImg = document.getElementById('modalSizeDie') as HTMLImageElement | null;
    const colorLabel = document.getElementById('modalColorLabel');
    const sizeLabel = document.getElementById('modalSizeLabel');

    if (colorDieImg && COLOR_FACE_ASSETS[pendingRoll.colorFace]) {
      colorDieImg.src = COLOR_FACE_ASSETS[pendingRoll.colorFace] as string;
    }
    if (sizeDieImg && SIZE_FACE_ASSETS[pendingRoll.sizeFace]) {
      sizeDieImg.src = SIZE_FACE_ASSETS[pendingRoll.sizeFace] as string;
    }
    if (colorLabel) colorLabel.textContent = formatDiceFace(pendingRoll.colorFace);
    if (sizeLabel) sizeLabel.textContent = formatDiceFace(pendingRoll.sizeFace);

    // Generate selection options
    const allowedColors = getAllowedColors(pendingRoll.colorFace);
    const allowedSizes = getAllowedSizes(pendingRoll.sizeFace);

    // Auto-select if only one option available
    if (allowedColors.length === 1 && allowedSizes.length === 1 && !selectedPyramid) {
      selectedPyramid = { color: allowedColors[0] as ColorKey, size: allowedSizes[0] as SizeKey };
    }


    const selectionGrid = document.getElementById('selectionGrid');
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
      style.remove();
      root.innerHTML = '';
    }
  };
}
