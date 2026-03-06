# SKYEAR — AI-Powered Acoustic Threat Detection

Real-time acoustic threat detection system with drone identification (Phase 1) and hypersonic/ballistic missile detection infrastructure (Phase 2 stubs).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SENSOR LAYER                          │
├──────────────┬──────────────┬──────────────┬────────────┤
│  Microphone  │  Infrasound  │  Seismic     │  RF SDR    │
│  48kHz       │  Array 100Hz │  Accel 200Hz │  Wideband  │
│  (Phase 1)   │  (Phase 2)   │  (Phase 2)   │  (Phase 2) │
└──────┬───────┴──────┬───────┴──────┬───────┴─────┬──────┘
       │              │              │             │
┌──────▼──────────────▼──────────────▼─────────────▼──────┐
│              PROCESSING PIPELINE                         │
├─────────────────────────────────────────────────────────┤
│  Phase 1: STFT 4096pt / Hanning / peak detection        │
│  Phase 2: CWT Morlet / Goertzel / Blackman-Harris STFT  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              CLASSIFICATION ENGINE                        │
├─────────────────────────────────────────────────────────┤
│  L1: Signature DB (7 drone profiles, 4 hypersonic)       │
│  L2: 4-factor scoring (F0 + harmonics + centroid + band) │
│  L3: Environment rejection (bird/car/wind/speech)        │
│  L4: Phase 2 — Bayesian sensor fusion (stub)             │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              SERVER + DASHBOARD                           │
├─────────────────────────────────────────────────────────┤
│  Express API + WebSocket (multi-station support)         │
│  React dashboard: spectrograms, detections, alerts       │
└─────────────────────────────────────────────────────────┘
```

## Phase 1 — Drone Detection (LIVE)

- **Frequency range:** 100Hz – 8kHz (audible spectrum)
- **FFT:** 4096-point at 48kHz → 11.7Hz bin resolution
- **Signatures:** 7 drone profiles with frequency ranges (not fixed values) per harmonic
- **Classification:** 4-factor scoring — fundamental match (0.35), harmonic series (0.30), spectral centroid (0.20), band energy (0.15)
- **Environment rejection:** Bird chirp, traffic, wind, speech patterns filtered
- **Alert throttle:** Max 1 alert per 3 seconds to prevent spam

## Phase 2 — Infrasound/Hypersonic Detection (STUB)

- **Frequency range:** 0.1Hz – 20Hz (infrasound)
- **Processing:** CWT Morlet wavelet (transients) + Goertzel (steady-state) + Blackman-Harris STFT (display)
- **Sensor fusion:** Bayesian weighted — infrasound (0.35) + seismic (0.35) + RF plasma (0.30)
- **Threat templates:** Mach 5, Mach 10 hypersonic vehicles, ballistic reentry, cruise missile
- **N-wave matched filtering:** Cross-correlation against shockwave templates

## Tech Stack

- **Server:** Node.js, Express, WebSocket (ws)
- **Client:** React 18, Vite, TypeScript
- **DSP:** Web Audio API (browser), 4096-pt FFT
- **Deploy:** Docker multi-stage, Railway

## Quick Start

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Dev mode (server + client with hot reload)
npm run dev

# Production build
npm run build
npm start
```

## Deploy to Railway

1. Push to GitHub
2. Connect repo in Railway dashboard
3. Railway auto-detects the Dockerfile
4. Set environment variable: `PORT=3000`
5. Deploy

Or via Railway CLI:

```bash
railway login
railway init
railway up
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | System status, uptime, connected stations |
| GET | `/api/alerts?limit=50&offset=0` | Alert history |
| POST | `/api/alerts` | Submit alert (auto-broadcast via WS) |
| GET | `/api/stations` | Connected monitoring stations |
| GET | `/api/signatures` | Drone + hypersonic signature database |
| WS | `/ws?stationId=xxx` | Real-time alert stream |

## WebSocket Protocol

```typescript
// Client → Server
{ type: 'alert', payload: AlertEvent }
{ type: 'heartbeat', payload: { isListening: boolean } }
{ type: 'detection', payload: DetectionResult[] }

// Server → Client (broadcast)
{ type: 'alert', payload: AlertEvent, stationId: string }
{ type: 'status', payload: { connectedStations, recentAlerts } }
```

## Project Structure

```
skyear/
├── src/
│   ├── server/
│   │   └── index.ts          # Express + WS server
│   └── shared/
│       ├── types.ts           # Shared TypeScript types
│       └── signatures.ts      # Drone + Phase 2 signature DB
├── client/
│   ├── src/
│   │   ├── App.tsx            # Main dashboard
│   │   ├── theme.ts           # Color system
│   │   ├── dsp/
│   │   │   ├── spectralEngine.ts  # FFT, peaks, harmonics
│   │   │   └── classifier.ts      # Drone classification
│   │   ├── hooks/
│   │   │   └── useAudioCapture.ts # Web Audio API hook
│   │   └── components/
│   │       ├── Spectrogram.tsx
│   │       ├── StatusBar.tsx
│   │       ├── ActiveDetections.tsx
│   │       ├── AlertHistory.tsx
│   │       ├── SignatureDb.tsx
│   │       └── Phase2Panel.tsx
│   ├── vite.config.ts
│   └── index.html
├── Dockerfile
├── tsconfig.json
└── package.json
```

## License

MIT
