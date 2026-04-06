import { COLOR_FACE_OPTIONS, SIZE_FACES, type ColorFace, type SizeFace } from './rules';

const COLOR_FACE_ASSETS: Record<ColorFace, string> = {
  azure: new URL('../../art/SVG/Die Symbols/Club.svg', import.meta.url).href,
  violet: new URL('../../art/SVG/Die Symbols/HEart.svg', import.meta.url).href,
  amber: new URL('../../art/SVG/Die Symbols/Diamond.svg', import.meta.url).href,
  emerald: new URL('../../art/SVG/Die Symbols/Star.svg', import.meta.url).href,
  coral: new URL('../../art/SVG/Die Symbols/Clover.svg', import.meta.url).href,
  atom: new URL('../../art/SVG/Die Symbols/Atom.svg', import.meta.url).href
};

const SIZE_FACE_ASSETS: Record<SizeFace, string> = {
  small: new URL('../../art/SVG/Die Shapes/Pyramid Dice Single Sm.svg', import.meta.url).href,
  medium: new URL('../../art/SVG/Die Shapes/Pyramid Dice Single Md.svg', import.meta.url).href,
  large: new URL('../../art/SVG/Die Shapes/Pyramid Dice Single Lg.svg', import.meta.url).href,
  'small-medium': new URL('../../art/SVG/Die Shapes/Pyramid Dice Sm and Md.svg', import.meta.url).href,
  'medium-large': new URL('../../art/SVG/Die Shapes/Pyramid Dice Sm amd Lg.svg', import.meta.url).href,
  'small-large': new URL('../../art/SVG/Die Shapes/Pyramid Dice Sm and Lg.svg', import.meta.url).href
};

// Use the new Dice BG as the rolling background at reduced scale
const BACKGROUND_ASSET = new URL('../../art/SVG/Backgrounds/Dice BG.svg', import.meta.url).href;

function formatFace(value: ColorFace | SizeFace): string {
  if (value === 'atom') {
    return 'Atom';
  }
  if (value.includes('-')) {
    return value
      .split('-')
      .map((part) => part[0]!.toUpperCase() + part.slice(1))
      .join(' / ');
  }
  return value[0]!.toUpperCase() + value.slice(1);
}

export interface DiceRollModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  colorFace: ColorFace;
  sizeFace: SizeFace;
}

export function DiceRollModal({ open, title, subtitle, colorFace, sizeFace }: DiceRollModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dice-roll-modal" role="dialog" aria-modal="true" aria-label="Rolling dice">
      <div className="dice-roll-backdrop" />
      <div className="dice-roll-panel">
        {/* Background image at reduced scale */}
        <div className="dice-roll-bg" aria-hidden="true" />
        
        <div className="dice-roll-content">
          <p className="label">Roll in progress</p>
          <h3>{title}</h3>
          <p className="dice-roll-copy">{subtitle}</p>

          <div className="dice-roll-stage" aria-hidden="true">
            <article className="roll-die roll-die-color rolling">
              <img src={COLOR_FACE_ASSETS[colorFace]} alt="" />
              <span>{formatFace(colorFace)}</span>
            </article>
            <article className="roll-die roll-die-size rolling">
              <img src={SIZE_FACE_ASSETS[sizeFace]} alt="" />
              <span>{formatFace(sizeFace)}</span>
            </article>
          </div>

          <div className="dice-roll-sparkline" aria-hidden="true">
            {COLOR_FACE_OPTIONS.map((face, index) => (
              <span key={face} style={{ animationDelay: `${index * 90}ms` }} />
            ))}
            {SIZE_FACES.map((face, index) => (
              <span key={face} style={{ animationDelay: `${index * 90 + 70}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
