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
const PIECES_PER_COLOR = 2;

const COLOR_LABELS: Record<ColorKey, string> = {
  azure: 'Azure',
  violet: 'Violet',
  amber: 'Amber',
  emerald: 'Emerald',
  coral: 'Coral'
};

const SIZE_LABELS: Record<SizeKey, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large'
};

const PYRAMID_ASSETS: readonly PyramidAsset[] = [
  {
    color: 'azure',
    size: 'small',
    src: new URL('../art/SVG/Pyramids/Small/Blue Pyramid Sm.svg', import.meta.url).href,
    alt: 'Azure small pyramid'
  },
  {
    color: 'azure',
    size: 'medium',
    src: new URL('../art/SVG/Pyramids/Med/Blue Pyramid Med.svg', import.meta.url).href,
    alt: 'Azure medium pyramid'
  },
  {
    color: 'azure',
    size: 'large',
    src: new URL('../art/SVG/Pyramids/Large/blue Pyramid Lg.svg', import.meta.url).href,
    alt: 'Azure large pyramid'
  },
  {
    color: 'violet',
    size: 'small',
    src: new URL('../art/SVG/Pyramids/Small/Purple Pyramid Sm.svg', import.meta.url).href,
    alt: 'Violet small pyramid'
  },
  {
    color: 'violet',
    size: 'medium',
    src: new URL('../art/SVG/Pyramids/Med/Purple Pyramid Med.svg', import.meta.url).href,
    alt: 'Violet medium pyramid'
  },
  {
    color: 'violet',
    size: 'large',
    src: new URL('../art/SVG/Pyramids/Large/Purple Pyramid Lg.svg', import.meta.url).href,
    alt: 'Violet large pyramid'
  },
  {
    color: 'amber',
    size: 'small',
    src: new URL('../art/SVG/Pyramids/Small/Yellow Pyramid Sm.svg', import.meta.url).href,
    alt: 'Amber small pyramid'
  },
  {
    color: 'amber',
    size: 'medium',
    src: new URL('../art/SVG/Pyramids/Med/Yellow Pyramid Med.svg', import.meta.url).href,
    alt: 'Amber medium pyramid'
  },
  {
    color: 'amber',
    size: 'large',
    src: new URL('../art/SVG/Pyramids/Large/yellow Pyramid Lg.svg', import.meta.url).href,
    alt: 'Amber large pyramid'
  },
  {
    color: 'emerald',
    size: 'small',
    src: new URL('../art/SVG/Pyramids/Small/Green Pyramid Sm.svg', import.meta.url).href,
    alt: 'Emerald small pyramid'
  },
  {
    color: 'emerald',
    size: 'medium',
    src: new URL('../art/SVG/Pyramids/Med/Green Pyramid Med.svg', import.meta.url).href,
    alt: 'Emerald medium pyramid'
  },
  {
    color: 'emerald',
    size: 'large',
    src: new URL('../art/SVG/Pyramids/Large/Green Pyramid Lg.svg', import.meta.url).href,
    alt: 'Emerald large pyramid'
  },
  {
    color: 'coral',
    size: 'small',
    src: new URL('../art/SVG/Pyramids/Small/Red Pyramid Sm.svg', import.meta.url).href,
    alt: 'Coral small pyramid'
  },
  {
    color: 'coral',
    size: 'medium',
    src: new URL('../art/SVG/Pyramids/Med/Red Pyramid Med.svg', import.meta.url).href,
    alt: 'Coral medium pyramid'
  },
  {
    color: 'coral',
    size: 'large',
    src: new URL('../art/SVG/Pyramids/Large/Red Pyramid Lg.svg', import.meta.url).href,
    alt: 'Coral large pyramid'
  }
];

const BUTTON_ASSETS = {
  small: new URL('../art/SVG/Buttons and Controls/Asset 3.svg', import.meta.url).href,
  medium: new URL('../art/SVG/Buttons and Controls/Asset 4.svg', import.meta.url).href,
  large: new URL('../art/SVG/Buttons and Controls/Asset 5.svg', import.meta.url).href
};

const BACKGROUND_ASSET = new URL('../art/SVG/Backgrounds/Background Ice.svg', import.meta.url).href;

function pieceAsset(color: ColorKey, size: SizeKey): PyramidAsset {
  const asset = PYRAMID_ASSETS.find((entry) => entry.color === color && entry.size === size);
  if (!asset) {
    throw new Error(`Missing pyramid asset for ${color}/${size}.`);
  }
  return asset;
}

function renderRackRow(color: ColorKey): string {
  const colorLabel = COLOR_LABELS[color];
  const pieces = SIZE_ORDER.map((size, index) => {
    const asset = pieceAsset(color, size);
    return `
      <div class="rack-slot rack-slot-${size}">
        <img src="${asset.src}" alt="${asset.alt}" />
      </div>
    `;
  }).join('');

  return `
    <article class="rack-row" data-color="${color}">
      <div class="row-label">
        <img class="row-label-frame" src="${BUTTON_ASSETS.small}" alt="" aria-hidden="true" />
        <span class="row-label-text">${colorLabel}</span>
        <span class="row-count">x${PIECES_PER_COLOR}</span>
      </div>
      <div class="rack-track" aria-label="${colorLabel} pyramid row, small to large">
        ${pieces}
      </div>
    </article>
  `;
}

function renderZone(title: string, copy: string, size: 'small' | 'medium' | 'large'): string {
  const frame = BUTTON_ASSETS[size];
  return `
    <section class="zone zone-${size}">
      <div class="zone-title">
        <img class="zone-title-frame" src="${frame}" alt="" aria-hidden="true" />
        <span>${title}</span>
      </div>
      <div class="zone-body">
        <p>${copy}</p>
      </div>
    </section>
  `;
}

function createStyleTag(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      color-scheme: dark;
      --bg-0: #07111f;
      --bg-1: #0c1a2d;
      --bg-2: #15263f;
      --ink: #eef6ff;
      --muted: #aac0df;
      --muted-2: #7d95ba;
      --line: rgba(150, 179, 218, 0.2);
      --panel: rgba(12, 20, 34, 0.78);
      --panel-strong: rgba(9, 16, 28, 0.9);
      --shadow: 0 28px 72px rgba(0, 0, 0, 0.42);
      --radius-xl: 32px;
      --radius-lg: 24px;
      --radius-md: 18px;
      --radius-sm: 14px;
      --font-display: 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif;
      --font-body: 'Segoe UI', system-ui, sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body,
    #root {
      min-height: 100%;
    }

    body {
      margin: 0;
      font-family: var(--font-body);
      color: var(--ink);
      overflow-x: hidden;
      background:
        radial-gradient(circle at top left, rgba(98, 214, 255, 0.16), transparent 28%),
        radial-gradient(circle at right 20%, rgba(255, 211, 109, 0.16), transparent 22%),
        linear-gradient(160deg, var(--bg-0), var(--bg-1) 46%, var(--bg-2));
    }

    button,
    input {
      font: inherit;
    }

    .pyramid-prototype {
      min-height: 100vh;
      padding: clamp(14px, 2vw, 24px);
    }

    .prototype-shell {
      position: relative;
      width: min(1480px, 100%);
      margin: 0 auto;
      border-radius: 34px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background:
        linear-gradient(180deg, rgba(10, 19, 34, 0.96), rgba(7, 14, 25, 0.98));
      box-shadow: var(--shadow);
    }

    .shell-glow {
      position: absolute;
      inset: -5% auto auto -2%;
      width: 360px;
      height: 360px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(98, 214, 255, 0.2), transparent 64%);
      filter: blur(4px);
      pointer-events: none;
    }

    .shell-inner {
      position: relative;
      display: grid;
      gap: 18px;
      padding: clamp(18px, 2.8vw, 32px);
      background:
        linear-gradient(180deg, rgba(10, 19, 33, 0.4), rgba(8, 14, 25, 0.2)),
        url('${BACKGROUND_ASSET}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    .top-strip {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 16px;
    }

    .nameplate {
      position: relative;
      width: min(620px, 100%);
      min-height: 86px;
      display: grid;
      place-items: center;
      padding: 12px 20px;
      filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.35));
    }

    .nameplate img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      pointer-events: none;
      user-select: none;
    }

    .nameplate-copy {
      position: relative;
      z-index: 1;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 0.78rem;
      color: #f4fbff;
      text-align: center;
    }

    .nameplate-copy strong {
      display: block;
      margin-top: 7px;
      font-family: var(--font-display);
      font-size: clamp(1.08rem, 1.55vw, 1.86rem);
      line-height: 1;
      letter-spacing: 0.02em;
      text-wrap: balance;
    }

    .status-chip {
      position: relative;
      min-width: 200px;
      min-height: 64px;
      padding: 12px 18px;
      display: grid;
      place-items: center;
      color: #062033;
      filter: drop-shadow(0 14px 26px rgba(0, 0, 0, 0.3));
    }

    .status-chip img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      pointer-events: none;
      user-select: none;
    }

    .status-chip span {
      position: relative;
      z-index: 1;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 0.68rem;
      font-weight: 700;
    }

    .board-grid {
      display: grid;
      grid-template-columns: minmax(290px, 0.82fr) minmax(0, 1.18fr);
      gap: 18px;
      align-items: stretch;
    }

    .panel {
      position: relative;
      padding: 18px;
      border-radius: var(--radius-xl);
      background: rgba(5, 12, 22, 0.52);
      border: 1px solid var(--line);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(16px);
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 14px;
    }

    .panel-head h2 {
      margin: 6px 0 0;
      font-family: var(--font-display);
      font-size: clamp(1.3rem, 2vw, 2rem);
      letter-spacing: 0.01em;
    }

    .panel-head p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
      max-width: 58ch;
    }

    .rack-panel {
      display: grid;
      gap: 16px;
      min-height: 760px;
      background:
        linear-gradient(180deg, rgba(7, 14, 25, 0.18), rgba(7, 14, 25, 0.42)),
        rgba(7, 14, 25, 0.32);
    }

    .rack-list {
      display: grid;
      gap: 12px;
      align-content: start;
    }

    .rack-row {
      display: grid;
      grid-template-columns: 104px minmax(0, 1fr);
      gap: 14px;
      align-items: center;
      min-height: 156px;
      padding: 10px 12px 12px;
      border-radius: 22px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.02));
    }

    .row-label {
      position: relative;
      width: 100%;
      min-height: 86px;
      display: grid;
      place-items: center;
      padding: 12px 18px;
      filter: drop-shadow(0 12px 22px rgba(0, 0, 0, 0.25));
    }

    .row-label-frame {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      pointer-events: none;
      user-select: none;
    }

    .row-label-text {
      position: relative;
      z-index: 1;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 0.7rem;
      font-weight: 700;
      color: #f5fbff;
    }

    .row-count {
      position: relative;
      z-index: 1;
      margin-top: 4px;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(6, 32, 51, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #f5fbff;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
    }

    .rack-track {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      height: 154px;
      padding-right: 6px;
    }

    .rack-slot {
      position: relative;
      display: grid;
      align-items: end;
      justify-items: center;
      height: 100%;
      filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.3));
    }

    .rack-slot img {
      display: block;
      height: auto;
      pointer-events: none;
      user-select: none;
      transition:
        transform 180ms ease,
        filter 180ms ease;
    }

    .rack-slot-small img {
      width: clamp(44px, 4vw, 70px);
      transform: translateY(18px) rotate(-6deg);
    }

    .rack-slot-medium img {
      width: clamp(58px, 5vw, 84px);
      transform: translateY(8px) rotate(-2deg);
    }

    .rack-slot-large img {
      width: clamp(72px, 6vw, 100px);
      transform: translateY(0) rotate(4deg);
    }

    .playfield-panel {
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 16px;
      background:
        linear-gradient(180deg, rgba(7, 14, 25, 0.18), rgba(7, 14, 25, 0.42)),
        rgba(7, 14, 25, 0.28);
    }

    .playfield-stack {
      display: grid;
      grid-template-rows: minmax(140px, 0.82fr) minmax(220px, 1.2fr) minmax(140px, 0.82fr);
      gap: 16px;
      min-height: 760px;
    }

    .zone {
      position: relative;
      display: grid;
      align-content: start;
      gap: 12px;
      padding: 16px;
      border-radius: var(--radius-lg);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .zone::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top left, rgba(98, 214, 255, 0.08), transparent 36%),
        radial-gradient(circle at bottom right, rgba(255, 211, 109, 0.08), transparent 34%);
      pointer-events: none;
    }

    .zone-title {
      position: relative;
      width: min(280px, 100%);
      min-height: 64px;
      display: grid;
      place-items: center;
      padding: 12px 18px;
      color: #f4fbff;
      filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.28));
    }

    .zone-title img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      pointer-events: none;
      user-select: none;
    }

    .zone-title span {
      position: relative;
      z-index: 1;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .zone-body {
      position: relative;
      display: grid;
      align-items: center;
      min-height: 0;
      color: var(--muted);
      line-height: 1.6;
    }

    .zone-body p {
      position: relative;
      z-index: 1;
      margin: 0;
      max-width: 42ch;
    }

    .vault-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      align-items: end;
      min-height: 118px;
    }

    .vault-slot {
      min-height: 104px;
      border-radius: 18px;
      border: 1px dashed rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.02);
    }

    .vault-slot.highlight {
      border-style: solid;
      border-color: rgba(98, 214, 255, 0.3);
      background: linear-gradient(180deg, rgba(98, 214, 255, 0.08), rgba(255, 255, 255, 0.03));
    }

    .footer-note {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 0 6px 4px;
      color: var(--muted-2);
      font-size: 0.88rem;
    }

    .footer-note strong {
      color: var(--ink);
      font-weight: 600;
    }

    .footer-pill {
      position: relative;
      min-width: 240px;
      min-height: 58px;
      display: grid;
      place-items: center;
      padding: 10px 16px;
      filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.24));
    }

    .footer-pill img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      pointer-events: none;
      user-select: none;
    }

    .footer-pill span {
      position: relative;
      z-index: 1;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.68rem;
      font-weight: 700;
      color: #062033;
    }

    @media (max-width: 1120px) {
      .board-grid {
        grid-template-columns: 1fr;
      }

      .rack-panel,
      .playfield-stack {
        min-height: auto;
      }
    }

    @media (max-width: 860px) {
      .top-strip {
        grid-template-columns: 1fr;
      }

      .nameplate {
        width: 100%;
      }

      .rack-row {
        grid-template-columns: 1fr;
      }

      .row-label {
        width: min(220px, 100%);
      }

      .rack-track {
        height: 150px;
      }

      .rack-slot-small img {
        width: clamp(42px, 14vw, 64px);
      }

      .rack-slot-medium img {
        width: clamp(54px, 17vw, 78px);
      }

      .rack-slot-large img {
        width: clamp(66px, 20vw, 92px);
      }

      .zone-title,
      .footer-pill {
        width: 100%;
      }

      .footer-note {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `;
  return style;
}

export function createPyramidPlayfieldPrototype(
  root: HTMLElement,
  options: PyramidPrototypeOptions = {}
): PyramidPrototypeControls {
  const title = options.title ?? 'Original playfield layout, reassembled for the pyramid rack.';
  const subtitle =
    options.subtitle ??
    'The bank keeps two copies of each color in small to large order so the rack stays readable, reachable, and faithful to the tabletop layout.';

  const style = createStyleTag();
  document.head.appendChild(style);

  const rackRows = COLOR_ORDER.map((color) => renderRackRow(color)).join('');
  const topVault = renderZone('Vault', 'Quiet storage for capped pieces and protected runs.', 'small');
  const counter = renderZone('Counter', 'The active center lane stays clear and easy to read.', 'medium');
  const bottomVault = renderZone('Vault', 'Secondary holding area for the remaining bank flow.', 'small');

  root.innerHTML = `
    <div class="pyramid-prototype">
      <div class="prototype-shell">
        <div class="shell-glow" aria-hidden="true"></div>
        <div class="shell-inner">
          <header class="top-strip">
            <div class="nameplate">
              <img src="${BUTTON_ASSETS.large}" alt="" aria-hidden="true" />
              <div class="nameplate-copy">
                Layout Experiment
                <strong>${title}</strong>
              </div>
            </div>

            <div class="status-chip">
              <img src="${BUTTON_ASSETS.small}" alt="" aria-hidden="true" />
              <span>Small - Medium - Large</span>
            </div>
          </header>

          <div class="board-grid">
            <section class="panel rack-panel" aria-label="Pyramid bank rack">
              <div class="panel-head">
                <div>
                  <p class="label">Bank</p>
                  <h2>Rows that read like the physical rack</h2>
                  <p>${subtitle}</p>
                </div>
              </div>

              <div class="rack-list">
                ${rackRows}
              </div>
            </section>

            <section class="panel playfield-panel" aria-label="Playfield zones">
              <div class="panel-head">
                <div>
                  <p class="label">Playfield</p>
                  <h2>Keep the center open, frame the action around it</h2>
                  <p>The bank is dense and tactile. The counter and vaults stay cleaner so the active turn remains readable at a glance.</p>
                </div>
              </div>

              <div class="playfield-stack">
                ${topVault}
                ${counter}
                ${bottomVault}
              </div>
            </section>
          </div>

          <footer class="footer-note">
            <p>
              <strong>Ordering rule:</strong> small pieces sit forward, medium in the middle, and large furthest back.
            </p>
            <div class="footer-pill">
              <img src="${BUTTON_ASSETS.medium}" alt="" aria-hidden="true" />
              <span>Front to back, x2 each color</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  `;

  document.body.classList.add('pyramid-prototype-page');

  return {
    root,
    dispose() {
      document.body.classList.remove('pyramid-prototype-page');
      style.remove();
      root.innerHTML = '';
    }
  };
}
