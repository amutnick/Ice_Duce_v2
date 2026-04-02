import { randomInt } from './rng';

export const COLORS = ['azure', 'violet', 'amber', 'emerald', 'coral'] as const;
export const SIZES = ['small', 'medium', 'large'] as const;
export const SIZE_FACES = [
  'small',
  'medium',
  'large',
  'small-medium',
  'medium-large',
  'small-large'
] as const;
export const COLOR_FACE_OPTIONS = [...COLORS, 'atom'] as const;

export type Color = (typeof COLORS)[number];
export type Size = 'small' | 'medium' | 'large';
export type SizeFace = Size | 'small-medium' | 'medium-large' | 'small-large';
export type ColorFace = Color | 'atom';
export type PlayerCount = 2 | 3;
export type PieceKey = `${Color}:${Size}`;
export type Phase = 'turn' | 'choose' | 'game-over';
export type SourceType = 'bank' | 'steal' | 'own-vault' | 'none';

export interface PieceCounts {
  [key: string]: number;
}

export interface PlayerState {
  name: string;
  vault: PieceCounts;
}

export interface PendingRoll {
  colorFace: ColorFace;
  sizeFace: SizeFace;
}

export interface LastRoll {
  colorFace: ColorFace;
  sizeFace: SizeFace;
  selectedColor?: Color;
  selectedSize?: Size;
  source: SourceType;
  outcome: 'pending' | 'safe' | 'bust' | 'no-op' | 'bonus' | 'win';
}

export interface LogEntry {
  id: number;
  message: string;
}

export interface GameState {
  phase: Phase;
  playerCount: PlayerCount;
  players: PlayerState[];
  currentPlayerIndex: number;
  turnNumber: number;
  rngSeed: number;
  bank: PieceCounts;
  counter: PieceCounts;
  pendingRoll: PendingRoll | null;
  lastRoll: LastRoll | null;
  log: LogEntry[];
  winnerIndex: number | null;
  logCounter: number;
}

export type Action =
  | { type: 'roll' }
  | { type: 'choosePiece'; color: Color; size: Size }
  | { type: 'stopTurn' }
  | { type: 'restart'; playerCount?: PlayerCount; playerNames?: string[]; seed?: number };

const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3'] as const;
const DEFAULT_SEED = 0x1f2e3d4c;
const FALLBACK_LAST_ROLL: LastRoll = {
  colorFace: 'atom',
  sizeFace: 'small',
  source: 'none',
  outcome: 'pending'
};

function createEmptyCounts(): PieceCounts {
  const counts: PieceCounts = {};
  for (const color of COLORS) {
    for (const size of ['small', 'medium', 'large'] as const) {
      counts[pieceKey(color, size)] = 0;
    }
  }
  return counts;
}

function cloneCounts(counts: PieceCounts): PieceCounts {
  return { ...counts };
}

export function pieceKey(color: Color, size: Size): PieceKey {
  return `${color}:${size}`;
}

function parseKey(key: string): [Color, Size] {
  const [color, size] = key.split(':') as [Color, Size];
  return [color, size];
}

function addPiece(counts: PieceCounts, key: PieceKey, delta: number): PieceCounts {
  return { ...counts, [key]: (counts[key] ?? 0) + delta };
}

function totalPieces(counts: PieceCounts): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

function uniqueCounterColors(counts: PieceCounts): Color[] {
  const colors = new Set<Color>();
  for (const [key, value] of Object.entries(counts)) {
    if (value > 0) {
      colors.add(parseKey(key)[0]);
    }
  }
  return [...colors];
}

function colorIsInCounts(counts: PieceCounts, color: Color): boolean {
  return (counts[pieceKey(color, 'small')] ?? 0) > 0 ||
    (counts[pieceKey(color, 'medium')] ?? 0) > 0 ||
    (counts[pieceKey(color, 'large')] ?? 0) > 0;
}

function countTrios(vault: PieceCounts): number {
  return COLORS.reduce((sum, color) => {
    const small = vault[pieceKey(color, 'small')] ?? 0;
    const medium = vault[pieceKey(color, 'medium')] ?? 0;
    const large = vault[pieceKey(color, 'large')] ?? 0;
    return sum + Math.min(small, medium, large);
  }, 0);
}

function createBank(playerCount: PlayerCount): PieceCounts {
  const bank = createEmptyCounts();
  for (const color of COLORS) {
    for (const size of ['small', 'medium', 'large'] as const) {
      bank[pieceKey(color, size)] = playerCount;
    }
  }
  return bank;
}

function createPlayers(playerCount: PlayerCount, names?: string[]): PlayerState[] {
  return Array.from({ length: playerCount }, (_, index) => ({
    name: names?.[index]?.trim() || `Player ${index + 1}`,
    vault: createEmptyCounts()
  }));
}

function createLogEntry(state: GameState, message: string): GameState {
  return {
    ...state,
    logCounter: state.logCounter + 1,
    log: [...state.log, { id: state.logCounter + 1, message }].slice(-48)
  };
}

function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex] as PlayerState;
}

function clonePlayers(players: PlayerState[]): PlayerState[] {
  return players.map((player) => ({
    name: player.name,
    vault: cloneCounts(player.vault)
  }));
}

function createBaseState(playerCount: PlayerCount, playerNames?: string[], seed = DEFAULT_SEED): GameState {
  return {
    phase: 'turn',
    playerCount,
    players: createPlayers(playerCount, playerNames),
    currentPlayerIndex: 0,
    turnNumber: 1,
    rngSeed: seed >>> 0,
    bank: createBank(playerCount),
    counter: createEmptyCounts(),
    pendingRoll: null,
    lastRoll: null,
    log: [],
    winnerIndex: null,
    logCounter: 0
  };
}

export function createGame(playerCount: PlayerCount = 2, playerNames?: string[], seed = DEFAULT_SEED): GameState {
  return createLogEntry(
    createBaseState(playerCount, playerNames, seed),
    `Game started with ${playerCount} players.`
  );
}

function nextPlayerIndex(state: GameState): number {
  return (state.currentPlayerIndex + 1) % state.playerCount;
}

function advanceTurn(state: GameState): GameState {
  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex(state),
    turnNumber: state.turnNumber + 1,
    pendingRoll: null,
    lastRoll: null,
    phase: 'turn'
  };
}

function moveCounterToVault(state: GameState, playerIndex: number): GameState {
  const players = clonePlayers(state.players);
  const vault = players[playerIndex]?.vault ?? createEmptyCounts();
  for (const [key, value] of Object.entries(state.counter)) {
    if (value > 0) {
      vault[key] = (vault[key] ?? 0) + value;
    }
  }
  const player = players[playerIndex];
  if (player) {
    players[playerIndex] = { ...player, vault };
  }
  return {
    ...state,
    players,
    counter: createEmptyCounts()
  };
}

function returnCounterToBank(state: GameState): GameState {
  const bank = cloneCounts(state.bank);
  for (const [key, value] of Object.entries(state.counter)) {
    if (value > 0) {
      bank[key] = (bank[key] ?? 0) + value;
    }
  }
  return {
    ...state,
    bank,
    counter: createEmptyCounts()
  };
}

function findOpponentsWithPiece(state: GameState, key: PieceKey): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < state.players.length; index += 1) {
    if (index !== state.currentPlayerIndex && (state.players[index]?.vault[key] ?? 0) > 0) {
      indexes.push(index);
    }
  }
  return indexes;
}

function awardToCounter(state: GameState, key: PieceKey): GameState {
  if ((state.bank[key] ?? 0) > 0) {
    return {
      ...state,
      bank: addPiece(state.bank, key, -1),
      counter: addPiece(state.counter, key, 1)
    };
  }

  const stealFrom = findOpponentsWithPiece(state, key)[0];
  if (typeof stealFrom === 'number') {
    const players = clonePlayers(state.players);
    const victim = players[stealFrom];
    if (victim) {
      players[stealFrom] = {
        ...victim,
        vault: addPiece(victim.vault, key, -1)
      };
    }
    return {
      ...state,
      players,
      counter: addPiece(state.counter, key, 1)
    };
  }

  const ownVault = state.players[state.currentPlayerIndex]?.vault[key] ?? 0;
  if (ownVault > 0) {
    return state;
  }

  return state;
}

function checkWin(state: GameState, playerIndex: number): boolean {
  return countTrios(state.players[playerIndex]?.vault ?? createEmptyCounts()) >= 3;
}

function finalizeCashOut(
  state: GameState,
  keepTurn: boolean,
  message: string,
  outcome: 'safe' | 'bonus'
): GameState {
  let next = moveCounterToVault(state, state.currentPlayerIndex);
  const winner = checkWin(next, next.currentPlayerIndex) ? next.currentPlayerIndex : null;
  next = createLogEntry(next, message);
  const previousRoll: LastRoll = next.lastRoll ?? FALLBACK_LAST_ROLL;

  if (winner !== null) {
    return {
      ...next,
      phase: 'game-over',
      winnerIndex: winner,
      pendingRoll: null,
      lastRoll: { ...previousRoll, outcome: 'win' }
    };
  }

  if (keepTurn) {
    return {
      ...next,
      phase: 'turn',
      pendingRoll: null,
      lastRoll: { ...previousRoll, outcome }
    };
  }

  return {
    ...advanceTurn(next),
    lastRoll: { ...previousRoll, outcome }
  };
}

function triggerBust(state: GameState, message: string): GameState {
  const next = createLogEntry(returnCounterToBank(state), message);
  const previousRoll: LastRoll = next.lastRoll ?? FALLBACK_LAST_ROLL;
  return {
    ...next,
    pendingRoll: null,
    phase: 'turn',
    lastRoll: { ...previousRoll, outcome: 'bust' }
  };
}

function maybeCashOutForRainbow(state: GameState): GameState {
  if (uniqueCounterColors(state.counter).length < COLORS.length) {
    return state;
  }
  return finalizeCashOut(
    state,
    true,
    `${currentPlayer(state).name} secured a rainbow and keeps the turn.`,
    'bonus'
  );
}

function applySelection(state: GameState, color: Color, size: Size): GameState {
  if (!state.pendingRoll) {
    return state;
  }

  const { colorFace, sizeFace } = state.pendingRoll;
  const allowedColor = colorFace === 'atom' || colorFace === color;
  const allowedSize =
    sizeFace === size ||
    (sizeFace === 'small-medium' && (size === 'small' || size === 'medium')) ||
    (sizeFace === 'medium-large' && (size === 'medium' || size === 'large')) ||
    (sizeFace === 'small-large' && (size === 'small' || size === 'large'));

  if (!allowedColor || !allowedSize) {
    return createLogEntry(state, 'That selection is not allowed for the current roll.');
  }

  const selectedKey = pieceKey(color, size);
  const beforeCounterColors = uniqueCounterColors(state.counter);
  const isBust = colorFace === 'atom'
    ? beforeCounterColors.includes(color)
    : beforeCounterColors.includes(color);

  if (isBust) {
    const next: GameState = {
      ...state,
      lastRoll: {
        colorFace,
        sizeFace,
        selectedColor: color,
        selectedSize: size,
        source: 'none',
        outcome: 'bust'
      }
    };
    return triggerBust(
      next,
      `${currentPlayer(next).name} busted by rolling ${color} while ${beforeCounterColors.join(', ')} were already on the counter.`
    );
  }

  const resolved = awardToCounter(state, selectedKey);
  if (resolved === state) {
    const next: GameState = {
      ...state,
      pendingRoll: null,
      phase: 'turn',
      lastRoll: {
        colorFace,
        sizeFace,
        selectedColor: color,
        selectedSize: size,
        source: 'own-vault',
        outcome: 'no-op'
      }
    };
    return createLogEntry(
      next,
      `${currentPlayer(next).name} already has ${color} ${size} in their vault, so the roll had no effect.`
    );
  }

  const source: SourceType = (state.bank[selectedKey] ?? 0) > 0 ? 'bank' : 'steal';
  let next: GameState = {
    ...resolved,
    pendingRoll: null,
    phase: 'turn',
    lastRoll: {
      colorFace,
      sizeFace,
      selectedColor: color,
      selectedSize: size,
      source,
      outcome: 'safe'
    }
  };
  const sourceMessage =
    source === 'bank'
      ? `${currentPlayer(state).name} placed ${color} ${size} from the Bank onto the Counter.`
      : `${currentPlayer(state).name} stole ${color} ${size} from an opponent.`;
  next = createLogEntry(next, sourceMessage);
  return maybeCashOutForRainbow(next);
}

function rollDice(state: GameState): GameState {
  const [colorIndex, seedAfterColor] = randomInt(state.rngSeed, COLOR_FACE_OPTIONS.length);
  const [sizeIndex, seedAfterSize] = randomInt(seedAfterColor, SIZE_FACES.length);
  const colorFace = COLOR_FACE_OPTIONS[colorIndex] as ColorFace;
  const sizeFace = SIZE_FACES[sizeIndex] as SizeFace;
  const nextBase: GameState = {
    ...state,
    rngSeed: seedAfterSize,
    lastRoll: {
      colorFace,
      sizeFace,
      outcome: 'pending' as const,
      source: 'none' as const
    }
  };
  const rolled = createLogEntry(
    {
      ...nextBase,
      pendingRoll: { colorFace, sizeFace },
      phase: 'choose'
    } as GameState,
    `${currentPlayer(state).name} rolled ${colorFace === 'atom' ? 'Atom' : colorFace} / ${sizeFace}.`
  );

  const immediateColor =
    colorFace === 'atom'
      ? null
      : colorFace;
  const immediateSize = sizeFace === 'small' || sizeFace === 'medium' || sizeFace === 'large' ? sizeFace : null;

  if (immediateColor && immediateSize) {
    return applySelection(rolled, immediateColor, immediateSize);
  }

  return rolled;
}

function stopTurn(state: GameState): GameState {
  if (state.phase !== 'turn' || totalPieces(state.counter) === 0) {
    return createLogEntry(state, 'You need at least one piece on the Counter before cashing out.');
  }
  const next = finalizeCashOut(
    state,
    false,
    `${currentPlayer(state).name} cashed out their Counter pieces into their Vault.`,
    'safe'
  );
  return createLogEntry(next, `Now it is ${currentPlayer(next).name}'s turn.`);
}

export function getPlayerTrios(player: PlayerState): number {
  return countTrios(player.vault);
}

export function getPlayerScore(player: PlayerState): string {
  const trios = getPlayerTrios(player);
  return `${trios}/3 trios`;
}

export function getUniqueCounterColors(state: GameState): Color[] {
  return uniqueCounterColors(state.counter);
}

export function getAllowedSizes(sizeFace: SizeFace): Size[] {
  if (sizeFace === 'small' || sizeFace === 'medium' || sizeFace === 'large') {
    return [sizeFace];
  }
  if (sizeFace === 'small-medium') {
    return ['small', 'medium'];
  }
  if (sizeFace === 'medium-large') {
    return ['medium', 'large'];
  }
  return ['small', 'large'];
}

export function getAllowedColors(colorFace: ColorFace): Color[] {
  return colorFace === 'atom' ? [...COLORS] : [colorFace];
}

export function getBankRemaining(state: GameState): number {
  return totalPieces(state.bank);
}

export function getCounterTotal(state: GameState): number {
  return totalPieces(state.counter);
}

export function getVaultTotal(player: PlayerState): number {
  return totalPieces(player.vault);
}

export function applyAction(state: GameState, action: Action): GameState {
  if (action.type === 'restart') {
    return createGame(action.playerCount ?? state.playerCount, action.playerNames, action.seed ?? state.rngSeed);
  }

  if (state.phase === 'game-over') {
    return state;
  }

  switch (action.type) {
    case 'roll':
      return state.phase === 'turn' ? rollDice(state) : state;
    case 'choosePiece':
      return state.phase === 'choose' ? applySelection(state, action.color, action.size) : state;
    case 'stopTurn':
      return stopTurn(state);
    default:
      return state;
  }
}
