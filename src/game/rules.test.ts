import { describe, expect, it } from 'vitest';
import { applyAction, createGame, type GameState, pieceKey } from './rules';

function buildState(overrides: Partial<GameState>): GameState {
  const base = createGame(2, ['Alice', 'Bea'], 1234);
  return {
    ...base,
    ...overrides,
    players: overrides.players ?? base.players,
    bank: overrides.bank ?? base.bank,
    counter: overrides.counter ?? base.counter,
    pendingRoll: overrides.pendingRoll ?? base.pendingRoll,
    lastRoll: overrides.lastRoll ?? base.lastRoll
  };
}

describe('Ice Dice rules engine', () => {
  it('creates a playable game with a populated bank', () => {
    const state = createGame(3);
    expect(state.playerCount).toBe(3);
    expect(state.bank[pieceKey('azure', 'small')]).toBe(3);
    expect(state.phase).toBe('turn');
  });

  it('allows a safe selection from the bank', () => {
    const state = buildState({
      pendingRoll: { colorFace: 'azure', sizeFace: 'small' },
      phase: 'choose'
    });

    const next = applyAction(state, { type: 'choosePiece', color: 'azure', size: 'small' });
    expect(next.counter[pieceKey('azure', 'small')]).toBe(1);
    expect(next.bank[pieceKey('azure', 'small')]).toBe(1);
    expect(next.phase).toBe('turn');
  });

  it('busts when choosing a color already on the counter', () => {
    const state = buildState({
      pendingRoll: { colorFace: 'atom', sizeFace: 'medium' },
      phase: 'choose',
      counter: { [pieceKey('emerald', 'small')]: 1 }
    });

    const next = applyAction(state, { type: 'choosePiece', color: 'emerald', size: 'medium' });
    expect(next.counter[pieceKey('emerald', 'small')]).toBe(0);
    expect(next.bank[pieceKey('emerald', 'small')]).toBe(3);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.turnNumber).toBe(2);
    expect(next.pendingRoll).toBeNull();
    expect(next.log.at(-1)?.message).toMatch(/busted/i);
  });

  it('supports stealing from an opponent when the bank is empty', () => {
    const state = buildState({
      pendingRoll: { colorFace: 'coral', sizeFace: 'large' },
      phase: 'choose',
      bank: {
        ...createGame(2).bank,
        [pieceKey('coral', 'large')]: 0
      },
      players: [
        { name: 'Alice', vault: createGame(2).players[0]!.vault },
        { name: 'Bea', vault: { [pieceKey('coral', 'large')]: 1 } }
      ]
    });

    const next = applyAction(state, { type: 'choosePiece', color: 'coral', size: 'large' });
    expect(next.counter[pieceKey('coral', 'large')]).toBe(1);
    expect(next.players[1]!.vault[pieceKey('coral', 'large')]).toBe(0);
  });

  it('cashes out after collecting all five colors', () => {
    const state = buildState({
      pendingRoll: { colorFace: 'coral', sizeFace: 'small' },
      phase: 'choose',
      counter: {
        [pieceKey('azure', 'small')]: 1,
        [pieceKey('violet', 'medium')]: 1,
        [pieceKey('amber', 'large')]: 1,
        [pieceKey('emerald', 'small')]: 1
      }
    });

    const next = applyAction(state, { type: 'choosePiece', color: 'coral', size: 'small' });
    expect(next.counter[pieceKey('coral', 'small')]).toBe(0);
    expect(next.players[0]!.vault[pieceKey('coral', 'small')]).toBe(1);
    expect(next.players[0]!.vault[pieceKey('azure', 'small')]).toBe(1);
    expect(next.currentPlayerIndex).toBe(0);
    expect(next.log.at(-1)?.message).toMatch(/rainbow/i);
  });

  it('detects a win when a player earns three trios', () => {
    const winningVault = {
      [pieceKey('azure', 'small')]: 1,
      [pieceKey('azure', 'medium')]: 1,
      [pieceKey('azure', 'large')]: 1,
      [pieceKey('violet', 'small')]: 1,
      [pieceKey('violet', 'medium')]: 1,
      [pieceKey('violet', 'large')]: 1,
      [pieceKey('coral', 'medium')]: 1,
      [pieceKey('coral', 'large')]: 1
    };

    const state = buildState({
      pendingRoll: { colorFace: 'coral', sizeFace: 'small' },
      phase: 'choose',
      counter: {
        [pieceKey('azure', 'small')]: 1,
        [pieceKey('violet', 'medium')]: 1,
        [pieceKey('amber', 'large')]: 1,
        [pieceKey('emerald', 'small')]: 1
      }
    });
    state.players[0] = { ...state.players[0]!, vault: winningVault };

    const next = applyAction(state, { type: 'choosePiece', color: 'coral', size: 'small' });
    expect(next.players[0]!.vault[pieceKey('coral', 'small')]).toBe(1);
    expect(next.winnerIndex).toBe(0);
    expect(next.phase).toBe('game-over');
  });
});
