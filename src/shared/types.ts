// ── Drone Signature Types ────────────────────────────────────
export interface DroneSignature {
  id: string;
  name: string;
  category: 'commercial' | 'fpv' | 'military' | 'micro' | 'fixed-wing';
  threat: 'low' | 'medium' | 'high' | 'critical';
  fundamental: [number, number]; // Hz range [min, max]
  harmonics: number;             // expected harmonic count
  harmonicTolerance: number;     // frequency match tolerance (ratio)
  spectralCentroidRange: [number, number]; // Hz
  temporalPattern: 'steady' | 'variable' | 'pulsed';
  description: string;
}

// ── Phase 2 Stub Types ──────────────────────────────────────
export interface HypersonicSignature {
  id: string;
  name: string;
  frequencyRange: [number, number]; // Hz (infrasound)
  machConeAngle: number | null;     // degrees, null if variable
  nWaveTemplate: 'sharp-n' | 'broad-n' | 'double-n';
  sensorRequirements: SensorType[];
}

export type SensorType = 'infrasound-array' | 'seismic' | 'rf-sdr' | 'microphone';

// ── Detection / Classification ──────────────────────────────
export interface DetectionResult {
  signature: DroneSignature;
  confidence: number;
  matchDetails: string[];
}

export interface AlertEvent {
  id: number;
  timestamp: string;
  name: string;
  category: string;
  threat: string;
  confidence: number;
  fundamental: number;
  centroid: number;
  details: string[];
  rejections: string[];
}

export interface SpectralPeak {
  bin: number;
  magnitude: number;
}

export interface HarmonicSeries {
  fundamental: number;
  harmonics: { harmonic: number; freq: number; magnitude: number }[];
  strength: number;
}

// ── WebSocket Messages ──────────────────────────────────────
export type WSMessageType =
  | 'alert'
  | 'status'
  | 'detection'
  | 'heartbeat';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: string;
  stationId?: string;
}

export interface StationStatus {
  stationId: string;
  isListening: boolean;
  sensorTypes: SensorType[];
  lastHeartbeat: string;
  location?: { lat: number; lng: number };
}
