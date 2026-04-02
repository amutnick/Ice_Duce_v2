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

type LanMatch = ReturnType<typeof useLanMatch>;

function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined' || !lan.room) {
      return '';
    }
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'lan');
    url.searchParams.set('room', lan.room.code);
    return url.toString();
  }, [lan.room]);

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

  const currentPlayer = game ? game.players[game.currentPlayerIndex] : null;
  const currentLog = game?.log.at(-1)?.message ?? 'Set up the table and start the match.';
  const canStop = Boolean(game && game.phase === 'turn' && getCounterTotal(game) > 0);
  const uniqueCounterColors = game ? getUniqueCounterColors(game) : [];

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
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className={soundEnabled ? 'ghost-button active' : 'ghost-button'}
            onClick={() => setSoundEnabled((value) => !value)}
          >
            Sound {soundEnabled ? 'On' : 'Off'}
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

      <main className="board-layout">
        <section className="table-surface">
          <div className="table-orb table-orb-a" aria-hidden="true" />
          <div className="table-orb table-orb-b" aria-hidden="true" />

          <div className="status-banner">
            <div>
              <p className="label">Active Player</p>
              <h2>{currentPlayer?.name}</h2>
            </div>
            <div className="status-pills">
              <span className="pill">
                {currentPlayer ? `${getPlayerTrios(currentPlayer)} trio${getPlayerTrios(currentPlayer) === 1 ? '' : 's'}` : '0 trios'}
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

      {game.phase === 'game-over' && game.winnerIndex !== null ? (
        <div className="winner-overlay" role="dialog" aria-modal="true">
          <div className="winner-card">
            <p className="eyebrow">Game Over</p>
            <h2>{game.players[game.winnerIndex]?.name} wins!</h2>
            <p className="lede">Three monochrome trios are locked in. Time to start another table.</p>
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
        </div>
      ) : null}

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
                  Sound {soundEnabled ? 'On' : 'Off'}
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
                          <p className="label">Seat {seat.index + 1}</p>
                          <h4>{seat.name}</h4>
                        </div>
                        <span className={seat.connected ? 'seat-dot connected' : 'seat-dot'} />
                      </div>
                      <p className="support-copy">
                        {seat.clientId ? (seat.connected ? 'Connected' : 'Saved for reconnect') : 'Open seat'}
                      </p>
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
