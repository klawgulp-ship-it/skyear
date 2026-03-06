import { DroneSignature, HypersonicSignature } from './types';

// ── DRONE SIGNATURES ────────────────────────────────────────
// Frequency RANGES per harmonic — accounts for throttle, load, wind
// Spectral centroid ranges tuned per platform class
export const DRONE_SIGNATURES: DroneSignature[] = [
  {
    id: 'dji-mavic',
    name: 'DJI Mavic Series',
    category: 'commercial',
    threat: 'low',
    fundamental: [185, 220],
    harmonics: 4,
    harmonicTolerance: 0.12,
    spectralCentroidRange: [800, 1400],
    temporalPattern: 'steady',
    description: 'Consumer quadcopter, brushless motors',
  },
  {
    id: 'dji-phantom',
    name: 'DJI Phantom Series',
    category: 'commercial',
    threat: 'low',
    fundamental: [140, 170],
    harmonics: 4,
    harmonicTolerance: 0.12,
    spectralCentroidRange: [600, 1100],
    temporalPattern: 'steady',
    description: 'Larger consumer quadcopter',
  },
  {
    id: 'fpv-racing',
    name: 'FPV Racing Drone',
    category: 'fpv',
    threat: 'medium',
    fundamental: [280, 520],
    harmonics: 3,
    harmonicTolerance: 0.18,
    spectralCentroidRange: [1200, 3500],
    temporalPattern: 'variable',
    description: 'High-RPM racing motors, rapid throttle changes',
  },
  {
    id: 'military-recon',
    name: 'Military Recon UAV',
    category: 'military',
    threat: 'high',
    fundamental: [70, 110],
    harmonics: 5,
    harmonicTolerance: 0.08,
    spectralCentroidRange: [400, 900],
    temporalPattern: 'steady',
    description: 'Low-frequency, larger propulsion system',
  },
  {
    id: 'hex-octo',
    name: 'Hexacopter/Octocopter',
    category: 'commercial',
    threat: 'medium',
    fundamental: [120, 180],
    harmonics: 4,
    harmonicTolerance: 0.10,
    spectralCentroidRange: [500, 1000],
    temporalPattern: 'steady',
    description: 'Multi-rotor heavy-lift platform',
  },
  {
    id: 'small-micro',
    name: 'Micro/Nano Drone',
    category: 'micro',
    threat: 'medium',
    fundamental: [400, 700],
    harmonics: 3,
    harmonicTolerance: 0.15,
    spectralCentroidRange: [1800, 4500],
    temporalPattern: 'variable',
    description: 'Tiny brushed/brushless motors, high pitch',
  },
  {
    id: 'fixed-wing-small',
    name: 'Fixed-Wing Surveillance',
    category: 'fixed-wing',
    threat: 'high',
    fundamental: [50, 90],
    harmonics: 3,
    harmonicTolerance: 0.10,
    spectralCentroidRange: [300, 700],
    temporalPattern: 'steady',
    description: 'Small fixed-wing with single propulsion motor',
  },
];

// ── PHASE 2: HYPERSONIC THREAT TEMPLATES ────────────────────
export const PHASE2_SIGNATURES: HypersonicSignature[] = [
  {
    id: 'hypersonic-mach5',
    name: 'Hypersonic Vehicle (Mach 5)',
    frequencyRange: [0.5, 5],
    machConeAngle: 11.5, // arcsin(1/5) in degrees
    nWaveTemplate: 'sharp-n',
    sensorRequirements: ['infrasound-array', 'seismic', 'rf-sdr'],
  },
  {
    id: 'hypersonic-mach10',
    name: 'Hypersonic Vehicle (Mach 10)',
    frequencyRange: [0.3, 3],
    machConeAngle: 5.7, // arcsin(1/10) in degrees
    nWaveTemplate: 'sharp-n',
    sensorRequirements: ['infrasound-array', 'seismic', 'rf-sdr'],
  },
  {
    id: 'ballistic-reentry',
    name: 'Ballistic Reentry Vehicle',
    frequencyRange: [1, 10],
    machConeAngle: null,
    nWaveTemplate: 'broad-n',
    sensorRequirements: ['infrasound-array', 'seismic'],
  },
  {
    id: 'cruise-missile',
    name: 'Subsonic Cruise Missile',
    frequencyRange: [5, 20],
    machConeAngle: null,
    nWaveTemplate: 'broad-n',
    sensorRequirements: ['infrasound-array', 'microphone'],
  },
];

// ── ENVIRONMENT REJECTION PROFILES ──────────────────────────
export const ENVIRONMENT_PROFILES = {
  bird:     { freqRange: [1000, 6000] as [number, number], harmonicRatio: 0,   pattern: 'chirp-burst' },
  car:      { freqRange: [60, 300]    as [number, number], harmonicRatio: 0.3, pattern: 'broadband-steady' },
  aircraft: { freqRange: [80, 500]    as [number, number], harmonicRatio: 0.2, pattern: 'slow-doppler' },
  wind:     { freqRange: [20, 2000]   as [number, number], harmonicRatio: 0,   pattern: 'broadband-noise' },
  speech:   { freqRange: [85, 4000]   as [number, number], harmonicRatio: 0.6, pattern: 'formant' },
} as const;
