/**
 * Phase 2 — Bayesian Sensor Fusion (STUB)
 *
 * Combines evidence from multiple sensor modalities:
 *   - Infrasound array (weight: 0.35)
 *   - Seismic accelerometers (weight: 0.35)
 *   - RF SDR plasma detection (weight: 0.30)
 *
 * Includes false-positive rejection for natural phenomena:
 *   storms, earthquakes, ocean microbaroms, volcanic infrasound.
 */

import type { SensorType } from '@shared/types';

// ── Sensor Weights ──────────────────────────────────────────

export const SENSOR_WEIGHTS: Record<string, number> = {
  'infrasound-array': 0.35,
  'seismic': 0.35,
  'rf-sdr': 0.30,
};

// ── Sensor Reading Types ────────────────────────────────────

export interface SensorReading {
  sensorType: SensorType;
  timestamp: string;
  confidence: number;       // 0-1 detection confidence from individual sensor
  features: SensorFeatures;
}

export interface InfrasoundFeatures {
  kind: 'infrasound';
  nWaveCorrelation: number;      // cross-correlation peak with N-wave template
  dominantFrequency: number;     // Hz
  overpressure: number;          // Pa
  arrivalAzimuth: number | null; // degrees, from beamforming (null if single sensor)
}

export interface SeismicFeatures {
  kind: 'seismic';
  peakAcceleration: number;      // m/s²
  dominantFrequency: number;     // Hz
  arrivalDelay: number;          // seconds after infrasound detection
  rayleighWaveDetected: boolean;
}

export interface RfFeatures {
  kind: 'rf';
  plasmaDetected: boolean;       // ionization trail from hypersonic heating
  dopplerShift: number | null;   // Hz, null if not measurable
  signalStrength: number;        // dBm
}

export type SensorFeatures = InfrasoundFeatures | SeismicFeatures | RfFeatures;

// ── False Positive Profiles ─────────────────────────────────

interface FalsePositiveProfile {
  name: string;
  infrasoundRange: [number, number];  // typical Hz range
  seismicCorrelation: boolean;        // does it produce seismic signal?
  rfSignature: boolean;               // does it produce RF?
  rejectionWeight: number;            // how strongly to suppress (0-1)
}

const FALSE_POSITIVE_PROFILES: FalsePositiveProfile[] = [
  {
    name: 'thunderstorm',
    infrasoundRange: [0.5, 5],
    seismicCorrelation: false,
    rfSignature: true, // lightning RF
    rejectionWeight: 0.7,
  },
  {
    name: 'earthquake',
    infrasoundRange: [0.1, 5],
    seismicCorrelation: true,
    rfSignature: false,
    rejectionWeight: 0.8,
  },
  {
    name: 'ocean-microbarom',
    infrasoundRange: [0.1, 0.5],
    seismicCorrelation: true,
    rfSignature: false,
    rejectionWeight: 0.9,
  },
  {
    name: 'volcanic',
    infrasoundRange: [0.5, 10],
    seismicCorrelation: true,
    rfSignature: false,
    rejectionWeight: 0.6,
  },
];

// ── Fusion Result ───────────────────────────────────────────

export interface FusionResult {
  fusedConfidence: number;
  sensorContributions: { sensor: SensorType; weight: number; confidence: number }[];
  falsePositiveRejections: { profile: string; rejectionScore: number }[];
  finalConfidence: number;
}

// ── Bayesian Sensor Fusion ──────────────────────────────────

/**
 * Fuse multiple sensor readings using weighted Bayesian combination.
 *
 * Each sensor provides an independent detection confidence.
 * Fusion uses log-odds combination with configurable priors:
 *
 *   log_odds_fused = Σ wᵢ * log(pᵢ / (1 - pᵢ))
 *
 * Then converts back to probability and applies false-positive rejection.
 */
export function fuseSensorReadings(
  readings: SensorReading[],
  priorThreatProbability = 0.001,
): FusionResult {
  const contributions: FusionResult['sensorContributions'] = [];

  // Start with prior in log-odds space
  let logOdds = Math.log(priorThreatProbability / (1 - priorThreatProbability));

  for (const reading of readings) {
    const weight = SENSOR_WEIGHTS[reading.sensorType] ?? 0.2;
    const clampedConf = Math.max(0.001, Math.min(0.999, reading.confidence));
    const sensorLogOdds = Math.log(clampedConf / (1 - clampedConf));

    logOdds += weight * sensorLogOdds;

    contributions.push({
      sensor: reading.sensorType,
      weight,
      confidence: reading.confidence,
    });
  }

  // Convert back to probability
  const fusedConfidence = 1 / (1 + Math.exp(-logOdds));

  // Apply false-positive rejection
  const rejections = evaluateFalsePositives(readings);

  const maxRejection = rejections.length > 0
    ? Math.max(...rejections.map((r) => r.rejectionScore))
    : 0;

  const finalConfidence = fusedConfidence * (1 - maxRejection);

  return {
    fusedConfidence,
    sensorContributions: contributions,
    falsePositiveRejections: rejections,
    finalConfidence: Math.max(0, Math.min(1, finalConfidence)),
  };
}

/**
 * Evaluate sensor readings against known false-positive profiles.
 * Returns rejection scores for each matching profile.
 */
function evaluateFalsePositives(
  readings: SensorReading[],
): { profile: string; rejectionScore: number }[] {
  const rejections: { profile: string; rejectionScore: number }[] = [];

  const infrasound = readings.find((r) => r.sensorType === 'infrasound-array');
  const seismic = readings.find((r) => r.sensorType === 'seismic');
  const rf = readings.find((r) => r.sensorType === 'rf-sdr');

  for (const profile of FALSE_POSITIVE_PROFILES) {
    let matchScore = 0;
    let factors = 0;

    // Check infrasound frequency match
    if (infrasound && infrasound.features.kind === 'infrasound') {
      const freq = infrasound.features.dominantFrequency;
      if (freq >= profile.infrasoundRange[0] && freq <= profile.infrasoundRange[1]) {
        matchScore += 0.4;
      }
      factors++;
    }

    // Check seismic correlation expectation
    if (seismic) {
      const hasSeismic = seismic.confidence > 0.3;
      if (hasSeismic === profile.seismicCorrelation) {
        matchScore += 0.3;
      }
      factors++;
    }

    // Check RF expectation
    if (rf && rf.features.kind === 'rf') {
      const hasRf = rf.features.plasmaDetected;
      // For threats: expect plasma RF. For storms: expect lightning RF.
      // Absence of expected RF for a profile increases rejection.
      if (hasRf === profile.rfSignature) {
        matchScore += 0.3;
      }
      factors++;
    }

    if (factors > 0) {
      const normalizedScore = matchScore * profile.rejectionWeight;
      if (normalizedScore > 0.2) {
        rejections.push({ profile: profile.name, rejectionScore: normalizedScore });
      }
    }
  }

  return rejections;
}

/**
 * Check if minimum sensor requirements are met for a given threat type.
 * Returns missing sensor types, if any.
 */
export function checkSensorRequirements(
  availableSensors: SensorType[],
  requiredSensors: SensorType[],
): { met: boolean; missing: SensorType[] } {
  const missing = requiredSensors.filter((s) => !availableSensors.includes(s));
  return { met: missing.length === 0, missing };
}
