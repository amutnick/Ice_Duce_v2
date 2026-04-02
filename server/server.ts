import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { applyAction, createGame, type Action, type GameState, type PlayerCount } from '../src/game/rules.ts';

type RoomPhase = 'lobby' | 'playing';

interface SeatState {
  index: number;
  name: string;
  clientId: string | null;
  connected: boolean;
}

interface RoomState {
  code: string;
  phase: RoomPhase;
  playerCount: PlayerCount;
  hostClientId: string;
  seats: SeatState[];
  gameState: GameState | null;
  seed: number;
}

type ClientMessage =
  | { type: 'client:resume'; clientId: string }
  | { type: 'room:create'; clientId: string; playerName: string; playerCount: PlayerCount }
  | { type: 'room:join'; clientId: string; roomCode: string; playerName: string }
  | { type: 'room:start'; clientId: string }
  | { type: 'room:reset'; clientId: string }
  | { type: 'game:action'; clientId: string; action: Action };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const port = Number(process.env.PORT || 3000);
const rooms = new Map<string, RoomState>();
const connections = new Map<WebSocket, { clientId: string | null; roomCode: string | null }>();

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function seedFromCode(code: string): number {
  let seed = 0x811c9dc5;
  for (const char of code) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  return seed >>> 0;
}

function createRoomCode(): string {
  let code = '';
  do {
    code = randomUUID().slice(0, 6).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function defaultSeatName(index: number): string {
  return `Player ${index + 1}`;
}

function roomSnapshot(room: RoomState) {
  return {
    code: room.code,
    phase: room.phase,
    playerCount: room.playerCount,
    hostClientId: room.hostClientId,
    seats: room.seats.map((seat) => ({
      index: seat.index,
      name: seat.name,
      clientId: seat.clientId,
      connected: seat.connected
    })),
    canStart:
      room.phase === 'lobby' &&
      room.seats.every((seat) => Boolean(seat.clientId) && seat.connected)
  };
}

function findSeatIndex(room: RoomState, clientId: string): number {
  return room.seats.findIndex((seat) => seat.clientId === clientId);
}

function findRoomForClient(clientId: string): RoomState | null {
  for (const room of rooms.values()) {
    if (findSeatIndex(room, clientId) >= 0) {
      return room;
    }
  }
  return null;
}

function clearConnectionRoom(ws: WebSocket) {
  const connection = connections.get(ws);
  if (!connection?.roomCode) {
    return;
  }

  const room = rooms.get(connection.roomCode);
  if (!room) {
    return;
  }

  const seatIndex = room.seats.findIndex((seat) => seat.clientId === connection.clientId);
  if (seatIndex >= 0) {
    room.seats[seatIndex] = {
      ...room.seats[seatIndex],
      connected: false
    };
  }
  broadcastRoom(room);
}

function broadcastRoom(room: RoomState) {
  const snapshot = roomSnapshot(room);
  for (const [ws, connection] of connections.entries()) {
    if (connection.roomCode !== room.code) {
      continue;
    }
    const yourSeatIndex = connection.clientId ? findSeatIndex(room, connection.clientId) : null;
    sendJson(ws, {
      type: 'room:state',
      room: snapshot,
      gameState: room.gameState,
      yourSeatIndex,
      isHost: connection.clientId === room.hostClientId
    });
  }
}

function createRoom(playerCount: PlayerCount, playerName: string, clientId: string): RoomState {
  const code = createRoomCode();
  const seats: SeatState[] = Array.from({ length: playerCount }, (_, index) => ({
    index,
    name: index === 0 ? playerName.trim() || defaultSeatName(index) : defaultSeatName(index),
    clientId: index === 0 ? clientId : null,
    connected: index === 0
  }));

  const room: RoomState = {
    code,
    phase: 'lobby',
    playerCount,
    hostClientId: clientId,
    seats,
    gameState: null,
    seed: seedFromCode(code)
  };

  rooms.set(code, room);
  return room;
}

function attachClientToRoom(room: RoomState, clientId: string, name: string) {
  const existingSeat = room.seats.findIndex((seat) => seat.clientId === clientId);
  const openSeat = room.seats.findIndex((seat) => seat.clientId === null);
  const seatIndex = existingSeat >= 0 ? existingSeat : openSeat;

  if (seatIndex < 0) {
    throw new Error('That room is full.');
  }

  const seat = room.seats[seatIndex];
  room.seats[seatIndex] = {
    ...seat,
    name: name.trim() || defaultSeatName(seatIndex),
    clientId,
    connected: true
  };
}

function sendRoomState(room: RoomState, ws?: WebSocket) {
  if (ws) {
    const connection = connections.get(ws);
    const yourSeatIndex = connection?.clientId ? findSeatIndex(room, connection.clientId) : null;
    sendJson(ws, {
      type: 'room:state',
      room: roomSnapshot(room),
      gameState: room.gameState,
      yourSeatIndex,
      isHost: connection?.clientId === room.hostClientId
    });
    return;
  }

  broadcastRoom(room);
}

async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  if (!existsSync(distDir)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><body><h1>Ice Dice server is running</h1><p>Run <code>npm run build</code> first to serve the browser app on the LAN.</p></body></html>');
    return;
  }

  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  let pathname = requestUrl.pathname;
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const candidate = path.join(distDir, pathname);
  if (existsSync(candidate) && !path.extname(candidate)) {
    pathname = '/index.html';
  }

  const filePath = path.join(distDir, pathname);
  const fallback = path.join(distDir, 'index.html');
  const target = existsSync(filePath) ? filePath : fallback;
  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream'
  });
  createReadStream(target).pipe(res);
}

const httpServer = createServer((req, res) => {
  serveStatic(req, res).catch((error: unknown) => {
    console.error('Static server error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Internal Server Error');
  });
});

const wsServer = new WebSocketServer({ server: httpServer });

wsServer.on('connection', (ws) => {
  connections.set(ws, { clientId: null, roomCode: null });

  ws.on('message', (raw) => {
    let payload: ClientMessage | null = null;
    try {
      payload = JSON.parse(String(raw)) as ClientMessage;
    } catch {
      sendJson(ws, { type: 'room:error', message: 'Malformed message from client.' });
      return;
    }

    try {
      if (payload.type === 'client:resume') {
        const room = findRoomForClient(payload.clientId);
        if (!room) {
          connections.set(ws, { clientId: payload.clientId, roomCode: null });
          sendJson(ws, { type: 'room:status', message: 'No active room found for this client.' });
          return;
        }

        const seatIndex = findSeatIndex(room, payload.clientId);
        connections.set(ws, { clientId: payload.clientId, roomCode: room.code });
        if (seatIndex >= 0) {
          room.seats[seatIndex] = {
            ...room.seats[seatIndex],
            connected: true
          };
        }
        sendRoomState(room, ws);
        broadcastRoom(room);
        return;
      }

      if (payload.type === 'room:create') {
        clearConnectionRoom(ws);
        const room = createRoom(payload.playerCount, payload.playerName, payload.clientId);
        connections.set(ws, { clientId: payload.clientId, roomCode: room.code });
        broadcastRoom(room);
        return;
      }

      const connection = connections.get(ws);
      if (!connection) {
        sendJson(ws, { type: 'room:error', message: 'Connection was not registered.' });
        return;
      }

      connection.clientId = payload.clientId;

      if (payload.type === 'room:join') {
        clearConnectionRoom(ws);
        const room = rooms.get(payload.roomCode.trim().toUpperCase());
        if (!room) {
          sendJson(ws, { type: 'room:error', message: 'That room code was not found.' });
          return;
        }
        if (room.phase !== 'lobby') {
          sendJson(ws, { type: 'room:error', message: 'That room is already in progress.' });
          return;
        }

        attachClientToRoom(room, payload.clientId, payload.playerName);
        connection.roomCode = room.code;
        sendRoomState(room);
        return;
      }

      if (!connection.roomCode) {
        sendJson(ws, { type: 'room:error', message: 'Join or create a room first.' });
        return;
      }

      const room = rooms.get(connection.roomCode);
      if (!room) {
        sendJson(ws, { type: 'room:error', message: 'The room no longer exists.' });
        return;
      }

      if (payload.type === 'room:start') {
        if (room.hostClientId !== payload.clientId) {
          sendJson(ws, { type: 'room:error', message: 'Only the host can start the match.' });
          return;
        }
        if (!room.seats.every((seat) => seat.clientId && seat.connected)) {
          sendJson(ws, { type: 'room:error', message: 'Every seat needs a connected player before starting.' });
          return;
        }
        room.phase = 'playing';
        room.gameState = createGame(room.playerCount, room.seats.map((seat) => seat.name), room.seed);
        sendRoomState(room);
        return;
      }

      if (payload.type === 'room:reset') {
        if (room.hostClientId !== payload.clientId) {
          sendJson(ws, { type: 'room:error', message: 'Only the host can reset the room.' });
          return;
        }
        room.phase = 'lobby';
        room.gameState = null;
        sendRoomState(room);
        return;
      }

      if (payload.type === 'game:action') {
        if (room.phase !== 'playing' || !room.gameState) {
          sendJson(ws, { type: 'room:error', message: 'The match has not started yet.' });
          return;
        }

        const seatIndex = findSeatIndex(room, payload.clientId);
        if (seatIndex < 0) {
          sendJson(ws, { type: 'room:error', message: 'You are not seated in this room.' });
          return;
        }

        if (room.gameState.currentPlayerIndex !== seatIndex) {
          sendJson(ws, { type: 'room:error', message: 'It is not your turn.' });
          return;
        }

        room.gameState = applyAction(room.gameState, payload.action);
        sendRoomState(room);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected server error.';
      sendJson(ws, { type: 'room:error', message });
    }
  });

  ws.on('close', () => {
    clearConnectionRoom(ws);
    connections.delete(ws);
  });
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Ice Dice LAN server listening on http://0.0.0.0:${port}`);
});
