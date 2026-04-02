import { useEffect, useMemo, useRef, useState } from 'react';
import type { Action, GameState, PlayerCount } from './rules';

export type LanConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface LanSeat {
  index: number;
  name: string;
  clientId: string | null;
  connected: boolean;
}

export interface LanRoomSnapshot {
  code: string;
  phase: 'lobby' | 'playing';
  playerCount: PlayerCount;
  hostClientId: string;
  publicHttpUrl: string;
  seats: LanSeat[];
  canStart: boolean;
}

interface ServerRoomStateMessage {
  type: 'room:state';
  room: LanRoomSnapshot;
  gameState: GameState | null;
  yourSeatIndex: number | null;
  isHost: boolean;
}

interface ServerErrorMessage {
  type: 'room:error';
  message: string;
}

interface ServerStatusMessage {
  type: 'room:status';
  message: string;
}

type ServerMessage = ServerRoomStateMessage | ServerErrorMessage | ServerStatusMessage;

type ClientMessage =
  | { type: 'client:resume'; clientId: string }
  | { type: 'room:create'; clientId: string; playerName: string; playerCount: PlayerCount }
  | { type: 'room:join'; clientId: string; roomCode: string; playerName: string }
  | { type: 'room:rename-seat'; clientId: string; seatIndex: number; name: string }
  | { type: 'room:start'; clientId: string }
  | { type: 'room:reset'; clientId: string }
  | { type: 'game:action'; clientId: string; action: Action };

const CLIENT_ID_STORAGE_KEY = 'ice-dice-client-id';

function createClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `client_${Math.random().toString(36).slice(2, 10)}`;
}

function readClientId(): string {
  if (typeof window === 'undefined') {
    return createClientId();
  }

  const stored = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const next = createClientId();
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, next);
  return next;
}

export function useLanMatch(enabled = true) {
  const [status, setStatus] = useState<LanConnectionStatus>('connecting');
  const [room, setRoom] = useState<LanRoomSnapshot | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [yourSeatIndex, setYourSeatIndex] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [message, setMessage] = useState<string>('Connecting to local network server...');
  const clientIdRef = useRef<string>(readClientId());
  const socketRef = useRef<WebSocket | null>(null);
  const currentRoomRef = useRef<LanRoomSnapshot | null>(null);
  const queueRef = useRef<ClientMessage[]>([]);
  const retryTimerRef = useRef<number | null>(null);

  const serverUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    const params = new URLSearchParams(window.location.search);
    const override = params.get('server');
    if (override) {
      if (override.startsWith('ws://') || override.startsWith('wss://')) {
        return override;
      }
      const protocol = override.startsWith('https://') ? 'wss:' : 'ws:';
      return `${protocol}//${override.replace(/^https?:\/\//, '')}`;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const { hostname, port } = window.location;

    if (!port || port === '3000') {
      return `${protocol}//${window.location.host}`;
    }

    return `${protocol}//${hostname}:3000`;
  }, []);

  const serverHttpUrl = useMemo(() => {
    if (!serverUrl) {
      return '';
    }

    try {
      const url = new URL(serverUrl);
      url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
      return url.toString().replace(/\/$/, '');
    } catch {
      return '';
    }
  }, [serverUrl]);

  const publicHttpUrl = useMemo(() => {
    if (room?.publicHttpUrl) {
      return room.publicHttpUrl.replace(/\/$/, '');
    }

    return serverHttpUrl;
  }, [room?.publicHttpUrl, serverHttpUrl]);

  function send(payload: ClientMessage) {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return;
    }
    queueRef.current.push(payload);
  }

  function openSocket() {
    if (typeof window === 'undefined' || socketRef.current) {
      return;
    }

    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    setStatus('connecting');
    const socket = new WebSocket(serverUrl);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setStatus('connected');
      setMessage('Connected to the room server.');
      socket.send(JSON.stringify({ type: 'client:resume', clientId: clientIdRef.current }));
      const queued = queueRef.current.splice(0, queueRef.current.length);
      for (const payload of queued) {
        socket.send(JSON.stringify(payload));
      }
    });

    socket.addEventListener('message', (event) => {
      let payload: ServerMessage | null = null;
      try {
        payload = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        payload = null;
      }

      if (!payload) {
        return;
      }

      if (payload.type === 'room:state') {
        setRoom(payload.room);
        currentRoomRef.current = payload.room;
        setGame(payload.gameState);
        setYourSeatIndex(payload.yourSeatIndex);
        setIsHost(payload.isHost);
        setStatus('connected');
        setMessage(
          payload.room.phase === 'lobby'
            ? `Room ${payload.room.code} is open.`
            : `Room ${payload.room.code} is in progress.`
        );
        return;
      }

      if (payload.type === 'room:error') {
        setStatus('error');
        setMessage(payload.message);
        return;
      }

      setMessage(payload.message);
    });

    socket.addEventListener('close', () => {
      socketRef.current = null;
      setStatus(currentRoomRef.current ? 'disconnected' : 'connecting');
      setMessage(
        currentRoomRef.current
          ? 'Disconnected from the room server. Trying to reconnect...'
          : 'Connecting to local network server...'
      );

      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
      }

      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        openSocket();
      }, currentRoomRef.current ? 1200 : 1800);
    });

    socket.addEventListener('error', () => {
      setStatus('error');
      setMessage('Could not connect to the local network server.');
    });
  }

  useEffect(() => {
    if (!enabled) {
      socketRef.current?.close();
      socketRef.current = null;
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setStatus('disconnected');
      setMessage('LAN room is disabled in local play mode.');
      return;
    }

    openSocket();

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
    // serverUrl is stable for the current origin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, serverUrl]);

  function createRoom(playerName: string, playerCount: PlayerCount) {
    send({ type: 'room:create', clientId: clientIdRef.current, playerName, playerCount });
  }

  function joinRoom(roomCode: string, playerName: string) {
    send({ type: 'room:join', clientId: clientIdRef.current, roomCode: roomCode.trim().toUpperCase(), playerName });
  }

  function renameSeat(seatIndex: number, name: string) {
    send({ type: 'room:rename-seat', clientId: clientIdRef.current, seatIndex, name });
  }

  function startRoom() {
    send({ type: 'room:start', clientId: clientIdRef.current });
  }

  function resetRoom() {
    send({ type: 'room:reset', clientId: clientIdRef.current });
  }

  function sendGameAction(action: Action) {
    send({ type: 'game:action', clientId: clientIdRef.current, action });
  }

  function reconnect() {
    socketRef.current?.close();
    socketRef.current = null;
    openSocket();
  }

  return {
    status,
    room,
    game,
    yourSeatIndex,
    isHost,
    message,
    serverUrl,
    serverHttpUrl,
    publicHttpUrl,
    clientId: clientIdRef.current,
    createRoom,
    joinRoom,
    renameSeat,
    startRoom,
    resetRoom,
    sendGameAction,
    reconnect
  };
}
