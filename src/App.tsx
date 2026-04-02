import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  applyAction,
  COLORS,
  COLOR_FACE_OPTIONS,
  createGame,
  getAllowedColors,
  getAllowedSizes,
  getBankRemaining,
  getCounterTotal,
  getPlayerScore,
  getPlayerTrios,
  getUniqueCounterColors,
  getVaultTotal,
  pieceKey,
  SIZES,
  type Action,
  type Color,
  type GameState,
  type PieceCounts,
  type PlayerCount,
  type Size
} from './game/rules';
import { getBackgroundMusicStatus, pauseBackgroundMusic, setBackgroundMusicMuted, setBackgroundMusicVolume, startBackgroundMusic, stopBackgroundMusic, syncBackgroundMusic } from './game/backgroundMusic';
import { playSound } from './game/sound';
import { useLanMatch } from './game/useLanMatch';
import QRCode from 'qrcode';

const COLOR_STYLES: Record<Color, string> = {
  azure: '#56c7ff',
  violet: '#9b84ff',
  amber: '#ffbe5c',
  emerald: '#49d8ab',
  coral: '#ff7c73'
};

const COLOR_LABELS: Record<Color, string> = {
  azure: 'Azure',
  violet: 'Violet',
  amber: 'Amber',
  emerald: 'Emerald',
  coral: 'Coral'
};

const SIZE_LABELS: Record<Size, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large'
};

const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3'];

interface DraftSelection {
  color: Color;
  size: Size;
}

interface TurnBannerCopy {
  label: string;
  title: string;
  message: string;
  badge: string;
  tone: 'neutral' | 'your-turn' | 'waiting' | 'win';
}

interface RollFeedbackCopy {
  label: string;
  title: string;
  message: string;
  tone: 'neutral' | 'bust' | 'bonus' | 'safe' | 'win';
}

type LanMatch = ReturnType<typeof useLanMatch>;

function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

const TURN_FLAVORS = {
  yourTurn: [
    'The table is leaning your way. Try not to jinx it.',
    'Your move. The pyramids are watching.',
    'The dice are warm. Make them nervous.'
  ],
  waiting: [
    'Opponent is thinking dangerous thoughts.',
    'Your rival is still negotiating with the dice.',
    'The other side is making the table sweat.'
  ],
  bust: [
    'Bust. The dice have turned traitor.',
    'That run collapsed hard. Turn passed.',
    'The table rejected that gamble and moved on.'
  ],
  bonus: [
    'Rainbow bonus. The counter is showing off.',
    'A full-color streak! The turn stays alive.',
    'Five colors in play. The table has entered dramatic mode.'
  ],
  safe: [
    'Safe cash-out. Respect the discipline.',
    'A calm exit. Sometimes that is the power move.',
    'The counter got banked before the floor could wobble.'
  ],
  steal: [
    'Sneaky steal. The bank is getting nervous.',
    'That piece disappeared from someone else\'s stash.',
    'A little thievery never hurt a pyramid game.'
  ],
  setup: [
    'Set the names, then start the pressure.',
    'The table is ready when the roster is.',
    'Two seats, one nervous dice pool.'
  ],
  win: [
    'Three trios locked. That\'s a clean finish.',
    'The crown has been claimed.',
    'Match point turned into match over.'
  ]
} as const;

function pickFlavor(lines: readonly string[], seed: number): string {
  if (lines.length === 0) {
    return '';
  }
  return lines[Math.abs(seed) % lines.length] ?? lines[0] ?? '';
}

function getRecentEventText(game: GameState): string {
  return game.log.slice(-3).map((entry) => entry.message).join(' ').toLowerCase();
}

function buildTurnBanner(game: GameState | null, yourSeatIndex: number | null, mode: 'local' | 'lan'): TurnBannerCopy {
  if (!game) {
    return {
      label: 'Turn Status',
      title: 'Set up the table',
      message: pickFlavor(TURN_FLAVORS.setup, 0),
      badge: 'Waiting',
      tone: 'neutral'
    };
  }

  if (game.phase === 'game-over' && game.winnerIndex !== null) {
    const winnerName = game.players[game.winnerIndex]?.name ?? 'Unknown player';
    return {
      label: 'Game Over',
      title: `${winnerName} wins`,
      message: pickFlavor(TURN_FLAVORS.win, game.turnNumber + game.logCounter),
      badge: 'Final',
      tone: 'win'
    };
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  const isLanView = mode === 'lan' && yourSeatIndex !== null;
  const isMyTurn = isLanView && yourSeatIndex === game.currentPlayerIndex;
  const recentEvent = getRecentEventText(game);
  const seed = game.turnNumber + game.logCounter + (yourSeatIndex ?? 0);

  if (isLanView) {
    if (isMyTurn) {
      if (recentEvent.includes('bust')) {
        return {
          label: 'Your Turn',
          title: 'You are up next',
          message: pickFlavor(TURN_FLAVORS.bust, seed),
          badge: 'Your turn',
          tone: 'your-turn'
        };
      }

      if (recentEvent.includes('rainbow')) {
        return {
          label: 'Your Turn',
          title: 'Rainbow streak alive',
          message: pickFlavor(TURN_FLAVORS.bonus, seed),
          badge: 'Your turn',
          tone: 'your-turn'
        };
      }

      if (recentEvent.includes('cashed out')) {
        return {
          label: 'Your Turn',
          title: 'You have the dice',
          message: pickFlavor(TURN_FLAVORS.safe, seed),
          badge: 'Your turn',
          tone: 'your-turn'
        };
      }

      if (recentEvent.includes('stole')) {
        return {
          label: 'Your Turn',
          title: 'A little theft never hurts',
          message: pickFlavor(TURN_FLAVORS.steal, seed),
          badge: 'Your turn',
          tone: 'your-turn'
        };
      }

      if (recentEvent.includes('placed')) {
        return {
          label: 'Your Turn',
          title: 'Keep the pressure on',
          message: pickFlavor(TURN_FLAVORS.yourTurn, seed),
          badge: 'Your turn',
          tone: 'your-turn'
        };
      }

      return {
        label: 'Your Turn',
        title: 'You are up',
        message: pickFlavor(TURN_FLAVORS.yourTurn, seed),
        badge: 'Your turn',
        tone: 'your-turn'
      };
    }

    if (recentEvent.includes('bust')) {
      return {
        label: 'Waiting',
        title: `Waiting on ${currentPlayer?.name ?? 'the other player'}`,
        message: pickFlavor(TURN_FLAVORS.bust, seed),
        badge: 'Waiting',
        tone: 'waiting'
      };
    }

    if (recentEvent.includes('rainbow')) {
      return {
        label: 'Waiting',
        title: `Waiting on ${currentPlayer?.name ?? 'the other player'}`,
        message: pickFlavor(TURN_FLAVORS.bonus, seed),
        badge: 'Waiting',
        tone: 'waiting'
      };
    }

    if (recentEvent.includes('cashed out')) {
      return {
        label: 'Waiting',
        title: `Waiting on ${currentPlayer?.name ?? 'the other player'}`,
        message: pickFlavor(TURN_FLAVORS.safe, seed),
        badge: 'Waiting',
        tone: 'waiting'
      };
    }

    if (recentEvent.includes('stole')) {
      return {
        label: 'Waiting',
        title: `Waiting on ${currentPlayer?.name ?? 'the other player'}`,
        message: pickFlavor(TURN_FLAVORS.steal, seed),
        badge: 'Waiting',
        tone: 'waiting'
      };
    }

    if (recentEvent.includes('placed')) {
      return {
        label: 'Waiting',
        title: `Waiting on ${currentPlayer?.name ?? 'the other player'}`,
        message: pickFlavor(TURN_FLAVORS.waiting, seed),
        badge: 'Waiting',
        tone: 'waiting'
      };
    }

    return {
      label: 'Waiting',
      title: `Waiting on ${currentPlayer?.name ?? 'the other player'}`,
      message: pickFlavor(TURN_FLAVORS.waiting, seed),
      badge: 'Waiting',
      tone: 'waiting'
    };
  }

  return {
    label: 'Turn Status',
    title: `${currentPlayer?.name ?? 'Next player'} is up`,
    message: pickFlavor(TURN_FLAVORS.waiting, seed),
    badge: 'Current turn',
    tone: 'neutral'
  };
}

function buildRollFeedback(
  game: GameState | null,
  yourSeatIndex: number | null,
  mode: 'local' | 'lan'
): RollFeedbackCopy | null {
  if (!game?.lastRoll || game.lastRoll.outcome === 'pending') {
    return null;
  }

  const seed = game.turnNumber + game.logCounter + (yourSeatIndex ?? 0);
  const bustedSeatIndex = game.lastRoll.outcome === 'bust'
    ? (game.currentPlayerIndex + game.playerCount - 1) % game.playerCount
    : null;
  const bustedPlayerName = bustedSeatIndex !== null ? game.players[bustedSeatIndex]?.name ?? 'Unknown player' : null;
  const isMyBust = mode === 'lan' && yourSeatIndex !== null && bustedSeatIndex === yourSeatIndex;

  switch (game.lastRoll.outcome) {
    case 'bust':
      return {
        label: 'Roll Result',
        title: isMyBust ? 'YOU BUSTED' : `${bustedPlayerName ?? 'That player'} busted`,
        message: isMyBust
          ? pickFlavor(TURN_FLAVORS.bust, seed)
          : `${bustedPlayerName ?? 'The other player'} lost the turn and the table moved on.`,
        tone: 'bust'
      };
    case 'bonus':
      return {
        label: 'Roll Result',
        title: 'RAINBOW BONUS',
        message: pickFlavor(TURN_FLAVORS.bonus, seed),
        tone: 'bonus'
      };
    case 'safe':
      return {
        label: 'Roll Result',
        title: 'SAFE CASH-OUT',
        message: pickFlavor(TURN_FLAVORS.safe, seed),
        tone: 'safe'
      };
    case 'win':
      return {
        label: 'Roll Result',
        title: 'MATCH OVER',
        message: pickFlavor(TURN_FLAVORS.win, seed),
        tone: 'win'
      };
    default:
      return null;
  }
}

function getMusicLabel(status: ReturnType<typeof getBackgroundMusicStatus>): string {
  switch (status) {
    case 'playing':
      return 'Playing';
    case 'loading':
      return 'Loading';
    case 'paused':
      return 'Paused';
    case 'error':
      return 'Error';
    case 'unsupported':
      return 'Unsupported';
    default:
      return 'Stopped';
  }
}

function formatFace(value: string): string {
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

function expandCounts(counts: PieceCounts): Array<{ color: Color; size: Size; count: number }> {
  const rows: Array<{ color: Color; size: Size; count: number }> = [];
  for (const color of COLORS) {
    for (const size of SIZES) {
      const count = counts[pieceKey(color, size)] ?? 0;
      if (count > 0) {
        rows.push({ color, size, count });
      }
    }
  }
  return rows;
}

function App() {
  const [mode, setMode] = useState<'local' | 'lan'>('local');
  const [playerCount, setPlayerCount] = useState<PlayerCount>(2);
  const [names, setNames] = useState<string[]>([...DEFAULT_NAMES]);
  const [seed, setSeed] = useState<number>(() => randomSeed());
  const [roomCode, setRoomCode] = useState('');
  const [localGame, setLocalGame] = useState<GameState | null>(null);
  const [draft, setDraft] = useState<DraftSelection | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicMuted, setMusicMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.18);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [, setAudioPulse] = useState(0);
  const autoJoinRef = useRef<string | null>(null);
  const previousSeatIndexRef = useRef<number | null>(null);
  const lan = useLanMatch(mode === 'lan');
  const game = mode === 'lan' ? lan.game : localGame;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get('mode');
    const requestedRoom = params.get('room');

    if (requestedMode === 'lan') {
      setMode('lan');
    }

    if (requestedRoom) {
      setRoomCode(requestedRoom.toUpperCase());
      if (requestedMode === 'lan') {
        setMode('lan');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const refresh = () => setAudioPulse((value) => value + 1);
    const intervalId = window.setInterval(refresh, 400);

    return () => {
      window.clearInterval(intervalId);
      stopBackgroundMusic();
    };
  }, []);

  const inviteUrl = useMemo(() => {
    if (!lan.room || !lan.publicHttpUrl) {
      return '';
    }

    const url = new URL(lan.publicHttpUrl);
    url.searchParams.set('server', lan.publicHttpUrl);
    url.searchParams.set('mode', 'lan');
    url.searchParams.set('room', lan.room.code);
    return url.toString();
  }, [lan.room, lan.publicHttpUrl]);

  useEffect(() => {
    if (mode !== 'lan' || !roomCode || lan.room || lan.status !== 'connected') {
      return;
    }

    const normalizedCode = roomCode.trim().toUpperCase();
    if (autoJoinRef.current === normalizedCode) {
      return;
    }

    autoJoinRef.current = normalizedCode;
    lan.joinRoom(normalizedCode, names[0]?.trim() || 'Player 1');
  }, [lan, lan.room, lan.status, mode, names, roomCode]);

  useEffect(() => {
    const active = Boolean(game && game.phase !== 'game-over');
    syncBackgroundMusic(active);
    if (!active) {
      stopBackgroundMusic();
    }
  }, [game]);

  useEffect(() => {
    if (!game?.pendingRoll) {
      setDraft(null);
      return;
    }

    const allowedColors = getAllowedColors(game.pendingRoll.colorFace);
    const allowedSizes = getAllowedSizes(game.pendingRoll.sizeFace);
    setDraft({
      color: allowedColors[0] ?? 'azure',
      size: allowedSizes[0] ?? 'small'
    });
  }, [game?.pendingRoll?.colorFace, game?.pendingRoll?.sizeFace]);

  useEffect(() => {
    if (mode !== 'lan') {
      previousSeatIndexRef.current = null;
      return;
    }

    const currentSeatIndex = lan.yourSeatIndex;
    const previousSeatIndex = previousSeatIndexRef.current;
    previousSeatIndexRef.current = currentSeatIndex;

    if (currentSeatIndex === null || currentSeatIndex === previousSeatIndex) {
      return;
    }

    const seatLabel = `Seat ${currentSeatIndex + 1}`;
    setToastMessage(`Joined the room as ${seatLabel}.`);
    window.setTimeout(() => setToastMessage(null), 2500);
  }, [lan.yourSeatIndex, mode]);

  function startGame(nextPlayerCount = playerCount, nextNames = names, nextSeed = seed) {
    const trimmedNames = nextNames.slice(0, nextPlayerCount).map((name, index) => name.trim() || DEFAULT_NAMES[index] || `Player ${index + 1}`);
    setPlayerCount(nextPlayerCount);
    setNames([
      trimmedNames[0] ?? 'Player 1',
      trimmedNames[1] ?? 'Player 2',
      trimmedNames[2] ?? 'Player 3'
    ]);
    setSeed(nextSeed);
    setLocalGame(createGame(nextPlayerCount, trimmedNames, nextSeed));
  }

  function handleAction(action: Action) {
    if (!game) {
      return;
    }

    if (mode === 'lan') {
      lan.sendGameAction(action);
      if (soundEnabled) {
        if (action.type === 'roll') {
          playSound('roll', true);
        } else if (action.type === 'stopTurn') {
          playSound('place', true);
        } else if (action.type === 'choosePiece') {
          playSound('place', true);
        }
      }
      return;
    }

    const next = applyAction(game, action);
    setLocalGame(next);

    if (!soundEnabled) {
      return;
    }

    if (action.type === 'roll') {
      playSound('roll', true);
      return;
    }

    if (action.type === 'stopTurn') {
      playSound('place', true);
      return;
    }

    if (action.type === 'choosePiece') {
      const lastMessage = next.log.at(-1)?.message ?? '';
      if (/not allowed/i.test(lastMessage)) {
        return;
      }
      if (next.phase === 'game-over' || next.winnerIndex !== null) {
        playSound('win', true);
        return;
      }
      if (next.lastRoll?.outcome === 'bust') {
        playSound('bust', true);
        return;
      }
      if (next.lastRoll?.outcome === 'bonus') {
        playSound('bonus', true);
        return;
      }
      playSound('place', true);
    }
  }

  function restartMatch() {
    if (mode === 'lan') {
      lan.resetRoom();
      return;
    }
    if (!game) {
      return;
    }
    setLocalGame(createGame(game.playerCount, game.players.map((player) => player.name), randomSeed()));
  }

  function returnToSetup() {
    if (mode === 'lan') {
      lan.resetRoom();
      return;
    }
    setLocalGame(null);
  }

  function startMusic() {
    setAudioPulse((value) => value + 1);
    startBackgroundMusic(musicVolume, musicMuted)
      .then(() => setAudioPulse((value) => value + 1))
      .catch(() => setAudioPulse((value) => value + 1));
  }

  function stopMusic() {
    pauseBackgroundMusic();
    stopBackgroundMusic();
    setAudioPulse((value) => value + 1);
  }

  function handleMusicVolumeChange(value: number) {
    setMusicVolume(value);
    setBackgroundMusicVolume(value);
    setAudioPulse((pulse) => pulse + 1);
  }

  function handleMusicMuteChange(nextMuted: boolean) {
    setMusicMuted(nextMuted);
    setBackgroundMusicMuted(nextMuted);
    setAudioPulse((pulse) => pulse + 1);
  }

  const currentPlayer = game ? game.players[game.currentPlayerIndex] : null;
  const currentLog = game?.log.at(-1)?.message ?? 'Set up the table and start the match.';
  const canStop = Boolean(game && game.phase === 'turn' && getCounterTotal(game) > 0);
  const uniqueCounterColors = game ? getUniqueCounterColors(game) : [];
  const turnBanner = buildTurnBanner(game, mode === 'lan' ? lan.yourSeatIndex : null, mode);
  const rollFeedback = buildRollFeedback(game, mode === 'lan' ? lan.yourSeatIndex : null, mode);
  const musicStatus = getBackgroundMusicStatus();
  const musicLabel = getMusicLabel(musicStatus);

  const bankRows = game ? expandCounts(game.bank) : [];
  const counterRows = game ? expandCounts(game.counter) : [];

  const draftColorOptions = game?.pendingRoll ? getAllowedColors(game.pendingRoll.colorFace) : [];
  const draftSizeOptions = game?.pendingRoll ? getAllowedSizes(game.pendingRoll.sizeFace) : [];

  if (mode === 'lan' && !game) {
    return (
      <LanLobby
        mode={mode}
        onModeChange={setMode}
        names={names}
        setNames={setNames}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        playerCount={playerCount}
        setPlayerCount={setPlayerCount}
        lan={lan}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        inviteUrl={inviteUrl}
      />
    );
  }

  if (!game) {
    return (
      <div className="app-shell setup-shell">
        <main className="setup-card">
          <div className="setup-glow" aria-hidden="true" />
          <p className="eyebrow">Digital tabletop adaptation</p>
          <h1>Ice Dice</h1>
          <p className="lede">
            A press-your-luck game of pyramid rolls, rainbow runs, and risky steals.
          </p>

          <div className="segment-row mode-row" role="radiogroup" aria-label="Game mode">
            <button
              type="button"
              className={mode === 'local' ? 'segmented active' : 'segmented'}
              onClick={() => setMode('local')}
            >
              Local Table
            </button>
            <button
              type="button"
              className={mode === 'lan' ? 'segmented active' : 'segmented'}
              onClick={() => setMode('lan')}
            >
              LAN Room
            </button>
          </div>

          <div className="setup-grid">
            <section className="panel">
              <h2>Match Setup</h2>
              <div className="segment-row" role="radiogroup" aria-label="Player count">
                {[2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={count === playerCount ? 'segmented active' : 'segmented'}
                    onClick={() => setPlayerCount(count as PlayerCount)}
                  >
                    {count} Players
                  </button>
                ))}
              </div>

              <label className="field">
                <span>Match seed</span>
                <div className="seed-row">
                  <input
                    type="text"
                    value={seed.toString(16).toUpperCase()}
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 16);
                      if (!Number.isNaN(value)) {
                        setSeed(value >>> 0);
                      }
                    }}
                    aria-label="Match seed in hexadecimal"
                  />
                  <button type="button" className="ghost-button" onClick={() => setSeed(randomSeed())}>
                    Randomize
                  </button>
                </div>
              </label>

              <div className="name-list">
                {Array.from({ length: playerCount }, (_, index) => (
                  <label className="field" key={index}>
                    <span>Player {index + 1} name</span>
                    <input
                      type="text"
                      value={names[index] ?? ''}
                      onChange={(event) => {
                        const next = [...names];
                        next[index] = event.target.value;
                        setNames(next);
                      }}
                      placeholder={`Player ${index + 1}`}
                    />
                  </label>
                ))}
              </div>

              <button type="button" className="primary-button" onClick={() => startGame()}>
                Start Match
              </button>
            </section>

            <section className="panel rules-panel">
              <h2>What You&apos;re Building</h2>
              <ul className="bullet-list">
                <li>Roll color and size dice to pull pyramids from the Bank.</li>
                <li>Keep rolling until you cash out, bust, or trigger a rainbow bonus.</li>
                <li>Fill your Vault with trios: small, medium, and large of the same color.</li>
                <li>Win by collecting three trios total.</li>
              </ul>
              <p className="support-copy">
                This version is tuned for local hot-seat play first, with a pure rules engine underneath.
              </p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Ice Dice</p>
          <h1>Tabletop pressure, now in the browser</h1>
          <p className="subtle">
            Bank: {getBankRemaining(game)} pieces · Counter: {getCounterTotal(game)} pieces · Turn {game.turnNumber}
            {mode === 'lan' && lan.room ? ` · Room ${lan.room.code} · Seat ${lan.yourSeatIndex !== null ? lan.yourSeatIndex + 1 : 'spectator'}` : ''}
          </p>
          <div className="audio-controls" aria-label="Background music controls">
            <div className="audio-controls-copy">
              <p className="label">Background Music</p>
              <p className="audio-controls-status">{musicLabel}</p>
            </div>
            <div className="audio-controls-actions">
              <button type="button" className="primary-button audio-start" onClick={startMusic}>
                Play Music
              </button>
              <button type="button" className="secondary-button audio-stop" onClick={stopMusic}>
                Stop Music
              </button>
              <label className="audio-mute">
                <input
                  type="checkbox"
                  checked={musicMuted}
                  onChange={(event) => handleMusicMuteChange(event.target.checked)}
                />
                <span>Mute</span>
              </label>
              <label className="audio-volume">
                <span>Volume</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(musicVolume * 100)}
                  onChange={(event) => handleMusicVolumeChange(Number(event.target.value) / 100)}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className={soundEnabled ? 'ghost-button active' : 'ghost-button'}
            onClick={() => setSoundEnabled((value) => !value)}
          >
            Effects {soundEnabled ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={restartMatch}
          >
            Restart
          </button>
          <button type="button" className="ghost-button" onClick={returnToSetup}>
            {mode === 'lan' ? 'Reset Room' : 'Edit Setup'}
          </button>
        </div>
      </header>

      {game.phase === 'game-over' && game.winnerIndex !== null ? (
        <section className="winner-banner" role="status" aria-live="polite">
          <div className="winner-card">
            <p className="eyebrow">Game Over</p>
            <h2>{game.players[game.winnerIndex]?.name} wins!</h2>
            <p className="lede">Three trios locked. That&apos;s a clean finish.</p>
            <div className="winner-actions">
              <button
                type="button"
                className="primary-button"
                onClick={restartMatch}
              >
                New Match
              </button>
              <button type="button" className="secondary-button" onClick={returnToSetup}>
                {mode === 'lan' ? 'Reset Room' : 'Edit Setup'}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <main className="board-layout">
        <section className="table-surface">
          <div className="table-orb table-orb-a" aria-hidden="true" />
          <div className="table-orb table-orb-b" aria-hidden="true" />

          <div className={`status-banner tone-${turnBanner.tone}`}>
            <div className="turn-copy">
              <p className="label">{turnBanner.label}</p>
              <h2>{turnBanner.title}</h2>
              <p className="turn-message">{turnBanner.message}</p>
            </div>
            <div className="status-pills">
              <span className="pill status-pill emphasis">{turnBanner.badge}</span>
              <span className="pill">
                {currentPlayer ? `${currentPlayer.name} · ${getPlayerTrios(currentPlayer)} trio${getPlayerTrios(currentPlayer) === 1 ? '' : 's'}` : 'No active player'}
              </span>
              <span className="pill">{game.phase === 'choose' ? 'Picking a piece' : 'Ready to roll'}</span>
            </div>
          </div>

          <div className="core-grid">
            <section className="panel zone-panel">
              <div className="panel-head">
                <div>
                  <p className="label">Dice</p>
                  <h3>Roll to reveal your piece</h3>
                </div>
                <div className="dice-summary">
                  <span className="dice-face">{game.lastRoll ? formatFace(game.lastRoll.colorFace) : 'Color'}</span>
                  <span className="dice-face">{game.lastRoll ? formatFace(game.lastRoll.sizeFace) : 'Size'}</span>
                </div>
              </div>

              <div className="dice-row" aria-live="polite">
                <DiceCard
                  label="Color Die"
                  value={game.lastRoll ? formatFace(game.lastRoll.colorFace) : 'Ready'}
                  accent="color"
                />
                <DiceCard
                  label="Pyramid Die"
                  value={game.lastRoll ? formatFace(game.lastRoll.sizeFace) : 'Ready'}
                  accent="size"
                />
              </div>

              <div className="action-row">
                <button
                  type="button"
                  className="primary-button"
                  disabled={game.phase !== 'turn'}
                  onClick={() => handleAction({ type: 'roll' })}
                >
                  Roll Dice
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!canStop}
                  onClick={() => handleAction({ type: 'stopTurn' })}
                >
                  Stop and Cash Out
                </button>
              </div>

              {rollFeedback ? (
                <div className={`roll-result tone-${rollFeedback.tone}`} role="status" aria-live="polite">
                  <p className="label">{rollFeedback.label}</p>
                  <h4>{rollFeedback.title}</h4>
                  <p>{rollFeedback.message}</p>
                </div>
              ) : null}

              {game.phase === 'choose' && game.pendingRoll && draft ? (
                <div className="choice-panel">
                  <div className="choice-header">
                    <div>
                      <p className="label">Resolve the roll</p>
                      <h4>
                        {formatFace(game.pendingRoll.colorFace)} / {formatFace(game.pendingRoll.sizeFace)}
                      </h4>
                    </div>
                    <span className="hint-chip">
                      {game.pendingRoll.colorFace === 'atom' ? 'Color choice' : 'Fixed color'} ·{' '}
                      {getAllowedSizes(game.pendingRoll.sizeFace).length > 1 ? 'Size choice' : 'Fixed size'}
                    </span>
                  </div>

                  <div className="choice-columns">
                    <div className="choice-group">
                      <h5>Color</h5>
                      <div className="choice-grid">
                        {draftColorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={draft.color === color ? `choice-button selected ${color}` : `choice-button ${color}`}
                            onClick={() =>
                              setDraft((current) => ({
                                color,
                                size: current?.size ?? draft?.size ?? 'small'
                              }))
                            }
                          >
                            <span className="choice-swatch" style={{ background: COLOR_STYLES[color] }} />
                            <span>{COLOR_LABELS[color]}</span>
                          </button>
                        ))}
                      </div>
                      {game.pendingRoll.colorFace === 'atom' && (
                        <p className="support-copy danger">
                          Choosing a color already on the Counter will bust your run.
                        </p>
                      )}
                    </div>

                    <div className="choice-group">
                      <h5>Size</h5>
                      <div className="choice-grid size-grid">
                        {draftSizeOptions.map((size) => (
                          <button
                            key={size}
                            type="button"
                            className={draft.size === size ? 'choice-button selected size' : 'choice-button size'}
                            onClick={() =>
                              setDraft((current) => ({
                                color: current?.color ?? draft?.color ?? 'azure',
                                size
                              }))
                            }
                          >
                            <span className={`mini-pyramid ${size}`} />
                            <span>{SIZE_LABELS[size]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleAction({ type: 'choosePiece', color: draft.color, size: draft.size })}
                  >
                    Commit Piece
                  </button>
                </div>
              ) : null}
            </section>

            <section className="panel zone-panel">
              <div className="panel-head">
                <div>
                  <p className="label">Counter</p>
                  <h3>{uniqueCounterColors.length > 0 ? `${uniqueCounterColors.length} colors in play` : 'Empty at the moment'}</h3>
                </div>
                <span className="pill">{getCounterTotal(game)} pieces</span>
              </div>

              <div className="piece-grid counter-grid">
                {counterRows.length > 0 ? (
                  counterRows.map((piece) => (
                    <PieceTile
                      key={`${piece.color}-${piece.size}`}
                      color={piece.color}
                      size={piece.size}
                      count={piece.count}
                      highlight
                    />
                  ))
                ) : (
                  <EmptyState text="The Counter is clear. The next safe roll starts the pressure." />
                )}
              </div>
            </section>
          </div>
        </section>

        <aside className="sidebar">
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="label">Vaults</p>
                <h3>Who is close to winning?</h3>
              </div>
            </div>

            <div className="vault-list">
              {game.players.map((player, index) => {
                const isCurrent = index === game.currentPlayerIndex;
                const trios = getPlayerTrios(player);
                return (
                  <article key={player.name + index} className={isCurrent ? 'vault-card current' : 'vault-card'}>
                    <div className="vault-head">
                      <div>
                        <p className="label">{isCurrent ? 'Taking the turn' : `Player ${index + 1}`}</p>
                        <h4>{player.name}</h4>
                      </div>
                      <div className="vault-score">
                        <span className="pill">{getPlayerScore(player)}</span>
                        <span className="support-copy">{getVaultTotal(player)} pieces</span>
                      </div>
                    </div>

                    <div className="vault-progress">
                      <div className="progress-track" aria-hidden="true">
                        <span className="progress-fill" style={{ width: `${Math.min(100, (trios / 3) * 100)}%` }} />
                      </div>
                      <span className="support-copy">
                        {trios} of 3 trios
                      </span>
                    </div>

                    <div className="piece-grid vault-grid">
                      {expandCounts(player.vault).length > 0 ? (
                        expandCounts(player.vault).map((piece) => (
                          <PieceTile
                            key={`${player.name}-${piece.color}-${piece.size}`}
                            color={piece.color}
                            size={piece.size}
                            count={piece.count}
                          />
                        ))
                      ) : (
                        <EmptyState text="No pyramids here yet." compact />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="label">Turn Log</p>
                <h3>What just happened</h3>
              </div>
            </div>

            <div className="log-box" aria-live="polite">
              <p className="log-highlight">{currentLog}</p>
              <ul className="log-list">
                {game.log.slice().reverse().map((entry) => (
                  <li key={entry.id}>{entry.message}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel rules-panel">
            <div className="panel-head">
              <div>
                <p className="label">Rules</p>
                <h3>Remember the pressure points</h3>
              </div>
            </div>
            <ul className="bullet-list compact">
              <li>Duplicate colors on the Counter bust the run.</li>
              <li>Atom lets you pick any color, but dangerous colors still bust.</li>
              <li>Missing pieces are stolen from an opponent before you touch your own vault.</li>
              <li>Five colors in one turn cash out immediately and keep your turn.</li>
              <li>Three trios wins the match.</li>
            </ul>
          </section>
        </aside>
      </main>

      {toastMessage ? (
        <div className="toast-banner" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}

function DiceCard({ label, value, accent }: { label: string; value: string; accent: 'color' | 'size' }) {
  return (
    <article className={`dice-card ${accent}`}>
      <p className="label">{label}</p>
      <div className="dice-visual">
        <span>{value}</span>
      </div>
    </article>
  );
}

function PieceTile({
  color,
  size,
  count,
  highlight = false
}: {
  color: Color;
  size: Size;
  count: number;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? `piece-tile highlight ${size}` : `piece-tile ${size}`} data-color={color}>
      <div className="pyramid-shape" style={{ background: COLOR_STYLES[color] }} />
      <div className="piece-meta">
        <span className="piece-name">
          {COLOR_LABELS[color]} {SIZE_LABELS[size]}
        </span>
        <span className="piece-count">x{count}</span>
      </div>
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={compact ? 'empty-state compact' : 'empty-state'}>{text}</div>;
}

function LanLobby({
  mode,
  onModeChange,
  names,
  setNames,
  roomCode,
  setRoomCode,
  playerCount,
  setPlayerCount,
  lan,
  soundEnabled,
  setSoundEnabled,
  inviteUrl
}: {
  mode: 'local' | 'lan';
  onModeChange: (mode: 'local' | 'lan') => void;
  names: string[];
  setNames: Dispatch<SetStateAction<string[]>>;
  roomCode: string;
  setRoomCode: Dispatch<SetStateAction<string>>;
  playerCount: PlayerCount;
  setPlayerCount: Dispatch<SetStateAction<PlayerCount>>;
  lan: LanMatch;
  soundEnabled: boolean;
  setSoundEnabled: Dispatch<SetStateAction<boolean>>;
  inviteUrl: string;
}) {
  const hostName = names[0]?.trim() || 'Player 1';
  const room = lan.room;
  const canStart = Boolean(room?.canStart && lan.isHost);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [seatDrafts, setSeatDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!room) {
      setSeatDrafts({});
      return;
    }

    setSeatDrafts((current) => {
      const next: Record<number, string> = {};
      for (const seat of room.seats) {
        next[seat.index] = current[seat.index] ?? seat.name;
      }
      return next;
    });
  }, [room?.code, room?.phase, room?.seats.map((seat) => seat.name).join('|')]);

  useEffect(() => {
    let active = true;
    if (!inviteUrl) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(inviteUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#ecf3ff',
        light: '#0b1627'
      }
    })
      .then((dataUrl: string) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setQrDataUrl('');
        }
      });

    return () => {
      active = false;
    };
  }, [inviteUrl]);

  async function copyInviteLink() {
    if (!inviteUrl || typeof navigator === 'undefined') {
      return;
    }
    await navigator.clipboard.writeText(inviteUrl);
  }

  async function copyRoomCode() {
    if (!room || typeof navigator === 'undefined') {
      return;
    }

    await navigator.clipboard.writeText(room.code);
    setCopiedRoomCode(true);
    window.setTimeout(() => setCopiedRoomCode(false), 1500);
  }

  function saveSeatName(seatIndex: number) {
    if (!room || room.phase !== 'lobby') {
      return;
    }

    lan.renameSeat(seatIndex, seatDrafts[seatIndex] ?? '');
  }

  return (
    <div className="app-shell setup-shell">
      <main className="setup-card lobby-shell">
        <div className="setup-glow" aria-hidden="true" />
        <p className="eyebrow">Digital tabletop adaptation</p>
        <h1>Ice Dice</h1>
        <p className="lede">
          Host a room on the local network, share the room code, and let another computer join the same match.
        </p>

        <div className="segment-row mode-row" role="radiogroup" aria-label="Game mode">
          <button
            type="button"
            className={mode === 'local' ? 'segmented active' : 'segmented'}
            onClick={() => onModeChange('local')}
          >
            Local Table
          </button>
          <button
            type="button"
            className={mode === 'lan' ? 'segmented active' : 'segmented'}
            onClick={() => onModeChange('lan')}
          >
            LAN Room
          </button>
        </div>

        <div className="lobby-grid">
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="label">Connection</p>
                <h2>Host or join a room</h2>
              </div>
              <span className="pill">{lan.status}</span>
            </div>

            <p className="support-copy">{lan.message}</p>

            <div className="connection-tip">
              Open this page from the host machine on the LAN, then let the other player(s) use the same address.
            </div>

            <div className="connection-tip connection-target">
              <span className="label">Target server</span>
              <code>{lan.serverUrl || 'ws://<room-server>:3000'}</code>
            </div>
            <p className="support-copy subtle-small">
              The invite link and QR code now point at the LAN room server, not the Vite dev server.
            </p>

            <label className="field">
              <span>Your name</span>
              <input
                type="text"
                value={hostName}
                onChange={(event) => {
                  const next = [...names];
                  next[0] = event.target.value;
                  setNames(next);
                }}
                placeholder="Player 1"
              />
            </label>

            <div className="segment-row" role="radiogroup" aria-label="Player count">
              {[2, 3].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={count === playerCount ? 'segmented active' : 'segmented'}
                  onClick={() => setPlayerCount(count as PlayerCount)}
                >
                  {count} Players
                </button>
              ))}
            </div>

            <div className="setup-stack">
              <button type="button" className="primary-button" onClick={() => lan.createRoom(hostName, playerCount)}>
                Host Room
              </button>

              <label className="field">
                <span>Room code</span>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  placeholder="AB12CD"
                />
              </label>

              <button type="button" className="secondary-button" onClick={() => lan.joinRoom(roomCode, hostName)}>
                Join Room
              </button>

              <div className="action-row">
                <button type="button" className="ghost-button" onClick={lan.reconnect}>
                  Reconnect
                </button>
                <button type="button" className={soundEnabled ? 'ghost-button active' : 'ghost-button'} onClick={() => setSoundEnabled((value) => !value)}>
                  Effects {soundEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="label">Room</p>
                <h2>{room ? `Code ${room.code}` : 'Waiting for a room'}</h2>
              </div>
              {room ? <span className="pill">{room.phase === 'lobby' ? 'Lobby' : 'Playing'}</span> : null}
            </div>

            {room ? (
              <>
                <p className="support-copy">
                  Share the code with the other browser. They only need the same page URL and the room code.
                </p>

                <div className="room-meta">
                  <span className="pill">Host: {room.seats[0]?.name ?? 'Unknown'}</span>
                  <span className="pill">{room.playerCount} seats</span>
                  {lan.yourSeatIndex !== null ? (
                    <span className="pill">
                      Joined as Seat {lan.yourSeatIndex + 1}
                    </span>
                  ) : null}
                </div>

                <div className="invite-panel">
                  <div className="invite-link-box">
                    <p className="label">Invite Link</p>
                    <input type="text" readOnly value={inviteUrl} />
                    <div className="action-row">
                      <button type="button" className="primary-button" onClick={copyInviteLink}>
                        Copy Link
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => window.open(inviteUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Open Link
                      </button>
                    </div>
                  </div>

                  <div className="invite-link-box code-box">
                    <p className="label">Room Code</p>
                    <div className="code-row">
                      <span className="room-code">{room.code}</span>
                      <button type="button" className="secondary-button" onClick={copyRoomCode}>
                        {copiedRoomCode ? 'Copied' : 'Copy Code'}
                      </button>
                    </div>
                    <p className="support-copy">Type this code on another device, or use the invite link above.</p>
                    <p className="support-copy subtle-small">
                      Invite URL: {inviteUrl || 'Waiting for the host network address...'}
                    </p>
                  </div>

                  <div className="invite-qr">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR code for the room invite link" />
                    ) : (
                      <div className="empty-state compact">QR code will appear once the room exists.</div>
                    )}
                  </div>
                </div>

                <div className="seat-list">
                  {room.seats.map((seat) => (
                    <article key={seat.index} className={seat.connected ? 'seat-card connected' : 'seat-card'}>
                      <div className="seat-head">
                        <div>
                          <p className="label">
                            Seat {seat.index + 1}
                            {seat.clientId === lan.clientId ? ' · You' : ''}
                          </p>
                          <h4>{seat.name}</h4>
                        </div>
                        <span className={seat.connected ? 'seat-dot connected' : 'seat-dot'} />
                      </div>
                      <p className="support-copy">
                        {seat.clientId ? (seat.connected ? 'Connected' : 'Saved for reconnect') : 'Open seat'}
                      </p>
                      {seat.clientId === lan.clientId && room.phase === 'lobby' ? (
                        <div className="seat-editor">
                          <label className="field seat-field">
                            <span>{seat.index === 0 ? 'Host name' : 'Your name'}</span>
                            <input
                              type="text"
                              value={seatDrafts[seat.index] ?? seat.name}
                              onChange={(event) =>
                                setSeatDrafts((current) => ({
                                  ...current,
                                  [seat.index]: event.target.value
                                }))
                              }
                              placeholder={seat.index === 0 ? 'Player 1' : `Player ${seat.index + 1}`}
                            />
                          </label>
                          <button type="button" className="ghost-button" onClick={() => saveSeatName(seat.index)}>
                            Save Name
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>

                <div className="action-row">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!canStart}
                    onClick={lan.startRoom}
                  >
                    Start Match
                  </button>
                  <button type="button" className="secondary-button" onClick={lan.resetRoom}>
                    Reset Lobby
                  </button>
                </div>

                {!lan.isHost ? (
                  <p className="support-copy">
                    Waiting for the host to start the match.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <div className="empty-state">
                  Create a room first. After you click <strong>Host Room</strong>, this panel will show the invite link, QR code, and room code for player two.
                </div>

                <div className="invite-panel preview">
                  <div className="invite-link-box">
                    <p className="label">Invite Link</p>
                    <div className="preview-line" />
                    <div className="action-row">
                      <button type="button" className="primary-button" disabled>
                        Copy Link
                      </button>
                      <button type="button" className="secondary-button" disabled>
                        Open Link
                      </button>
                    </div>
                  </div>

                  <div className="invite-link-box code-box">
                    <p className="label">Room Code</p>
                    <div className="code-row">
                      <span className="room-code placeholder">------</span>
                      <button type="button" className="secondary-button" disabled>
                        Copy Code
                      </button>
                    </div>
                    <p className="support-copy">This will appear right after the room is created.</p>
                  </div>

                  <div className="invite-qr">
                    <div className="empty-state compact">QR code will appear here after hosting.</div>
                  </div>
                </div>
              </>
            )}

            <p className="support-copy subtle-small">
              Your browser client is {lan.clientId.slice(0, 8)}.
            </p>
          </section>
        </div>

        <section className="panel rules-panel">
          <h2>LAN play flow</h2>
          <ul className="bullet-list">
            <li>One computer hosts the room and chooses 2 or 3 seats.</li>
            <li>The other computer opens the invite link or scans the QR code.</li>
            <li>The host starts the match once all seats are filled and connected.</li>
            <li>Only the active player can roll, choose, or stop on their turn.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
