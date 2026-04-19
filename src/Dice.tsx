import React, { useState } from 'react';
import './Dice.css';

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

interface DiceProps {
  onRoll?: (faces: DiceFace[]) => void;
}

const Dice: React.FC<DiceProps> = ({ onRoll }) => {
  const [dice, setDice] = useState<DiceFace[]>([]);
  const [rolling, setRolling] = useState(false);

  const rollDice = () => {
    setRolling(true);
    setTimeout(() => {
      const idx1 = Math.floor(Math.random() * diceFaces.length);
      const idx2 = Math.floor(Math.random() * diceFaces.length);
      const die1 = diceFaces[idx1];
      const die2 = diceFaces[idx2];
      // Assert non-null since array is never empty
      const newDice: DiceFace[] = [
        die1!,
        die2!
      ];
      setDice(newDice);
      setRolling(false);
      if (onRoll) onRoll(newDice);
    }, 1000);
  };

  const getSymbol = (face: DiceFace): React.ReactNode => {
    switch(face.symbol) {
      case 'club':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" className="dice-symbol">
            <path d="M30 10 C30 10, 20 20, 20 30 C20 40, 30 50, 30 50 C30 50, 40 40, 40 30 C40 20, 30 10, 30 10 Z M30 15 C25 15, 25 25, 25 30 C25 35, 30 45, 30 45 C30 45, 35 35, 35 30 C35 25, 35 15, 30 15 Z" fill={face.color} stroke="#0000FF" strokeWidth="3"/>
          </svg>
        );
      case 'heart':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" className="dice-symbol">
            <path d="M30 10 C30 10, 15 25, 15 40 C15 55, 30 55, 30 55 C30 55, 45 55, 45 40 C45 25, 30 10, 30 10 Z M30 20 C25 20, 25 30, 25 35 C25 40, 30 50, 30 50 C30 50, 35 40, 35 35 C35 30, 35 20, 30 20 Z" fill={face.color} stroke="#0000FF" strokeWidth="3"/>
          </svg>
        );
      case 'spade':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" className="dice-symbol">
            <path d="M30 10 C30 10, 20 20, 20 30 C20 40, 30 50, 30 50 C30 50, 40 40, 40 30 C40 20, 30 10, 30 10 Z M30 15 C25 15, 25 25, 25 30 C25 35, 30 45, 30 45 C30 45, 35 35, 35 30 C35 25, 35 15, 30 15 Z" fill={face.color} stroke="#0000FF" strokeWidth="3"/>
          </svg>
        );
      case 'star':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" className="dice-symbol">
            <path d="M30 10 L25 25 L10 25 L22 35 L18 50 L30 40 L42 50 L38 35 L50 25 L35 25 Z" fill={face.color} stroke="#0000FF" strokeWidth="3"/>
          </svg>
        );
      case 'triangle2':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" className="dice-symbol">
            <polygon points="30 10, 50 40, 10 40" fill={face.color} stroke="#0000FF" strokeWidth="3"/>
            <circle cx="30" cy="20" r="2" fill="#000"/>
            <circle cx="40" cy="30" r="2" fill="#000"/>
          </svg>
        );
      case 'triangle3':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" className="dice-symbol">
            <polygon points="30 10, 50 40, 10 40" fill={face.color} stroke="#0000FF" strokeWidth="3"/>
            <circle cx="30" cy="20" r="2" fill="#000"/>
            <circle cx="40" cy="30" r="2" fill="#000"/>
            <circle cx="20" cy="30" r="2" fill="#000"/>
          </svg>
        );
      case 'triangle1':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" className="dice-symbol">
            <polygon points="30 40, 50 10, 10 10" fill={face.color} stroke="#0000FF" strokeWidth="3"/>
            <circle cx="30" cy="30" r="2" fill="#000"/>
          </svg>
        );
      case 'composite':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" className="dice-symbol">
            <polygon points="30 10, 50 40, 10 40" fill={face.color} stroke="#0000FF" strokeWidth="3"/>
            <polygon points="30 40, 50 10, 10 10" fill={face.color} stroke="#0000FF" strokeWidth="3"/>
            <circle cx="30" cy="20" r="2" fill="#000"/>
            <circle cx="40" cy="30" r="2" fill="#000"/>
            <circle cx="30" cy="30" r="2" fill="#000"/>
          </svg>
        );
      case 'molecule':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" className="dice-symbol">
            <circle cx="30" cy="30" r="10" fill={face.color} stroke="#0000FF" strokeWidth="3"/>
            <line x1="30" y1="15" x2="30" y2="45" stroke="#0000FF" strokeWidth="3"/>
            <line x1="15" y1="30" x2="45" y2="30" stroke="#0000FF" strokeWidth="3"/>
            <line x1="20" y1="20" x2="40" y2="40" stroke="#0000FF" strokeWidth="3"/>
            <line x1="40" y1="20" x2="20" y2="40" stroke="#0000FF" strokeWidth="3"/>
            <circle cx="30" cy="15" r="2" fill="#000"/>
            <circle cx="30" cy="45" r="2" fill="#000"/>
            <circle cx="15" cy="30" r="2" fill="#000"/>
            <circle cx="45" cy="30" r="2" fill="#000"/>
            <circle cx="20" cy="20" r="2" fill="#000"/>
            <circle cx="40" cy="40" r="2" fill="#000"/>
            <circle cx="40" cy="20" r="2" fill="#000"/>
            <circle cx="20" cy="40" r="2" fill="#000"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dice-component">
      <div className="dice-row">
        <div className={`dice ${rolling ? 'rolling' : ''}`}>
          {dice[0] && getSymbol(dice[0])}
        </div>
        <div className={`dice ${rolling ? 'rolling' : ''}`}>
          {dice[1] && getSymbol(dice[1])}
        </div>
      </div>
      <button className="roll-button" onClick={rollDice} disabled={rolling}>
        {rolling ? 'Rolling...' : 'Roll Dice'}
      </button>
    </div>
  );
};

export default Dice;