import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import dotenv from 'dotenv';
import { AlertEvent, WSMessage, StationStatus } from '../shared/types';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── In-memory stores (swap for DB in production) ────────────
const alertHistory: AlertEvent[] = [];
const MAX_ALERTS = 500;
const connectedStations = new Map<string, StationStatus>();

// ── REST API ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'operational',
    version: '1.0.0',
    phase: 1,
    uptime: process.uptime(),
    stations: connectedStations.size,
    alerts: alertHistory.length,
  });
});

app.get('/api/alerts', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, MAX_ALERTS);
  const offset = parseInt(req.query.offset as string) || 0;
  res.json({
    total: alertHistory.length,
    alerts: alertHistory.slice(offset, offset + limit),
  });
});

app.post('/api/alerts', (req, res) => {
  const alert: AlertEvent = {
    ...req.body,
    id: alertHistory.length + 1,
    timestamp: new Date().toISOString(),
  };
  alertHistory.unshift(alert);
  if (alertHistory.length > MAX_ALERTS) alertHistory.pop();

  // Broadcast to all connected WebSocket clients
  broadcast({
    type: 'alert',
    payload: alert,
    timestamp: alert.timestamp,
    stationId: req.body.stationId,
  });

  res.status(201).json(alert);
});

app.get('/api/stations', (_req, res) => {
  res.json({
    stations: Array.from(connectedStations.values()),
  });
});

app.get('/api/signatures', (_req, res) => {
  // Dynamic import to avoid circular deps at build time
  const { DRONE_SIGNATURES, PHASE2_SIGNATURES } = require('../shared/signatures');
  res.json({
    drone: DRONE_SIGNATURES,
    hypersonic: PHASE2_SIGNATURES,
  });
});

// ── Serve React build ───────────────────────────────────────
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// ── HTTP + WebSocket Server ─────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(message: WSMessage) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws, req) => {
  const stationId = req.url?.split('stationId=')[1] || `station-${Date.now()}`;
  console.log(`[WS] Station connected: ${stationId}`);

  connectedStations.set(stationId, {
    stationId,
    isListening: true,
    sensorTypes: ['microphone'],
    lastHeartbeat: new Date().toISOString(),
  });

  // Send current state on connect
  ws.send(JSON.stringify({
    type: 'status',
    payload: {
      connectedStations: connectedStations.size,
      recentAlerts: alertHistory.slice(0, 10),
    },
    timestamp: new Date().toISOString(),
  }));

  ws.on('message', (raw) => {
    try {
      const msg: WSMessage = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'alert': {
          const alert = msg.payload as AlertEvent;
          alert.id = alertHistory.length + 1;
          alert.timestamp = new Date().toISOString();
          alertHistory.unshift(alert);
          if (alertHistory.length > MAX_ALERTS) alertHistory.pop();
          broadcast({ ...msg, timestamp: alert.timestamp });
          break;
        }
        case 'heartbeat': {
          const station = connectedStations.get(stationId);
          if (station) {
            station.lastHeartbeat = new Date().toISOString();
            station.isListening = (msg.payload as any)?.isListening ?? true;
          }
          break;
        }
        case 'detection': {
          // Relay detection events to all clients (multi-station awareness)
          broadcast(msg);
          break;
        }
      }
    } catch (err) {
      console.error('[WS] Invalid message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Station disconnected: ${stationId}`);
    connectedStations.delete(stationId);
  });
});

// ── Heartbeat cleanup — remove stale stations every 30s ─────
setInterval(() => {
  const staleThreshold = Date.now() - 60_000;
  for (const [id, station] of connectedStations) {
    if (new Date(station.lastHeartbeat).getTime() < staleThreshold) {
      connectedStations.delete(id);
      console.log(`[WS] Stale station removed: ${id}`);
    }
  }
}, 30_000);

// ── Start ───────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║           SKYEAR v1.0 — ONLINE              ║
║   Acoustic Threat Detection System          ║
║   Phase 1: Drone Detection (100Hz–8kHz)     ║
║   Phase 2: Infrasound Stub (0.1–20Hz)       ║
╠══════════════════════════════════════════════╣
║   HTTP:  http://localhost:${PORT}               ║
║   WS:    ws://localhost:${PORT}/ws              ║
╚══════════════════════════════════════════════╝
  `);
});

export { app, server };
