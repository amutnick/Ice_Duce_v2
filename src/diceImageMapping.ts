/**
 * DICE IMAGE MAPPING TEMPLATE
 * ===========================
 * Replace the placeholder paths below with your own dice face images.
 * 
 * IMAGE REQUIREMENTS:
 * - Format: PNG, JPG, SVG, or WebP
 * - Dimensions: 200x200 pixels (recommended)
 * - Background: Transparent or white
 * - Style: 2D flat with thick dark blue (#0000FF) outlines matching your physical dice
 * 
 * FILE NAMING CONVENTION:
 * Use descriptive names: {symbol}-{facing}.{ext}
 * Example: club.png, heart.png, star.png, triangle-upright-2dots.png
 * 
 * IMAGE PLACEMENT:
 * Place your images in: public/images/dice/
 * Or any folder under public/
 * 
 * DICE FACE KEYS (9 faces total):
 * ===============================
 * 1. club         - Club symbol (green)
 * 2. heart        - Heart symbol (red)
 * 3. spade       - Spade symbol (purple)
 * 4. star        - Star symbol (yellow/gold)
 * 5. triangle-upright-2dots  - Upright triangle with 2 dots (dark blue outline)
 * 6. triangle-upright-3dots  - Upright triangle with 3 dots (dark blue outline)
 * 7. triangle-inverted-1dot - Inverted triangle with 1 dot (dark blue outline)
 * 8. composite   - Inverted + Upright triangles (dark blue outline)
 * 9. molecule    - Network node (central circle with radiating lines, dark blue outline)
 */

import Dice from './Dice';

// ============================================================================
// OPTION 1: Using local images in public folder
// ============================================================================
// Create a custom Dice component that uses images instead of SVG

export const diceImages: Record<string, string> = {
  // Card Suits
  club: '/images/dice/club.png',
  heart: '/images/dice/heart.png',
  spade: '/images/dice/spade.png',
  star: '/images/dice/star.png',
  
  // Triangles
  triangle2: '/images/dice/triangle-upright-2dots.png',
  triangle3: '/images/dice/triangle-upright-3dots.png',
  triangle1: '/images/dice/triangle-inverted-1dot.png',
  
  // Composite & Molecule
  composite: '/images/dice/composite.png',
  molecule: '/images/dice/molecule.png',
};

// ============================================================================
// OPTION 2: Using external URLs
// ============================================================================
// Use this if your images are hosted externally

export const diceImageUrls: Record<string, string> = {
  club: 'https://your-server.com/images/club.png',
  heart: 'https://your-server.com/images/heart.png',
  spade: 'https://your-server.com/images/spade.png',
  star: 'https://your-server.com/images/star.png',
  triangle2: 'https://your-server.com/images/triangle-upright-2dots.png',
  triangle3: 'https://your-server.com/images/triangle-upright-3dots.png',
  triangle1: 'https://your-server.com/images/triangle-inverted-1dot.png',
  composite: 'https://your-server.com/images/composite.png',
  molecule: 'https://your-server.com/images/molecule.png',
};

// ============================================================================
// OPTION 3: Using imported images (for images in src folder)
// ============================================================================
// Uncomment and modify as needed:
// import clubImage from '../assets/club.png';
// import heartImage from '../assets/heart.png';
// 
// export const importedDiceImages: Record<string, string> = {
//   club: clubImage,
//   heart: heartImage,
//   // ... add others
// };

// ============================================================================
// CUSTOM DICE COMPONENT WITH IMAGES
// ============================================================================
// Replace the default Dice in App.tsx with this version

/*
import React, { useState } from 'react';
import './Dice.css';
import { diceImages } from './diceImageMapping';

interface DiceFace {
  symbol: string;
  color: string;
  id: number;
}

const diceFaces: DiceFace[] = [
  { symbol: 'club', color: '#00FF00', id: 1 },
  { symbol: 'heart', color: '#FF0000', id: 2 },
  { symbol: 'spade', color: '#800080', id: 3 },
  { symbol: 'star', color: '#FFD700', id: 4 },
  { symbol: 'triangle2', color: '#0000FF', id: 5 },
  { symbol: 'triangle3', color: '#0000FF', id: 6 },
  { symbol: 'triangle1', color: '#0000FF', id: 7 },
  { symbol: 'composite', color: '#0000FF', id: 8 },
  { symbol: 'molecule', color: '#0000FF', id: 9 }
];

const ImageDice = () => {
  const [dice, setDice] = useState<DiceFace[]>([]);
  const [rolling, setRolling] = useState(false);

  const rollDice = () => {
    setRolling(true);
    setTimeout(() => {
      const idx1 = Math.floor(Math.random() * diceFaces.length);
      const idx2 = Math.floor(Math.random() * diceFaces.length);
      setDice([diceFaces[idx1]!, diceFaces[idx2]!]);
      setRolling(false);
    }, 1000);
  };

  return (
    <div className="dice-component">
      <div className="dice-row">
        {dice.map((face, index) => (
          <div key={index} className={`dice ${rolling ? 'rolling' : ''}`}>
            {face && (
              <img 
                src={diceImages[face.symbol]} 
                alt={face.symbol}
                className="dice-image"
              />
            )}
          </div>
        ))}
      </div>
      <button className="roll-button" onClick={rollDice} disabled={rolling}>
        {rolling ? 'Rolling...' : 'Roll Dice'}
      </button>
    </div>
  );
};

export default ImageDice;
*/

// ============================================================================
// CSS STYLING FOR IMAGES
// ============================================================================
// Add this to Dice.css:
/*
.dice-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 10px;
}
*/

// ============================================================================
// HOW TO USE
// ============================================================================
// 1. Create folder: public/images/dice/
// 2. Save your 9 dice face images there with matching names
// 3. Uncomment the ImageDice component above
// 4. In App.tsx, import ImageDice instead of Dice
// 5. Replace <Dice /> with <ImageDice />
// 6. Or use the diceImages object directly to map symbols to image paths

export const getDiceImagePath = (symbol: string): string => {
  return diceImages[symbol] || '';
};