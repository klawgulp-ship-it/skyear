/**
 * Phase 2 — Hypersonic / Ballistic Threat Classifier (STUB)
 *
 * Classifies infrasound events against known hypersonic threat templates.
 * Uses N-wave shape matching, Mach cone angle estimation, and
 * multi-sensor fusion confidence to produce threat assessments.
 */

import type { HypersonicSignature, SensorType } from '@shared/types';
import { PHASE2_SIGNATURES } from '@shared/signatures';
import type { NWaveTemplate } from './infrasoundEngine';
import { generateNWaveTemplate, nWaveMatchedFilter, goertzel } from './infrasoundEngine';
import { fuseSensorReadings, checkSensorRequirements } from './sensorFusion';
import type { SensorReading, FusionResult } from './sensorFusion';

// ── Classification Types ────────────────────────────────────

export interface Phase2Detection {
  signature: HypersonicSignature;
  nWaveCorrelation: number;
  frequencyMatch: number;
  fusionResult: FusionResult | null;
  sensorsMet: boolean;
  missingSensors: SensorType[];
  overallConfidence: number;
  threatLevel: 'low' | 'elevated' | 'high' | 'critical';
}

// ── Classification Engine ───────────────────────────────────

/**
 * Classify an infrasound signal against all Phase 2 threat templates.
 *
 * Scoring factors:
 *   1. N-wave template correlation (0.40)
 *   2. Frequency band match via Goertzel (0.30)
 *   3. Sensor fusion confidence (0.30) — requires multi-sensor input
 */
export function classifyInfrasound(
  signal: Float64Array,
  sampleRate: number,
  sensorReadings: SensorReading[] = [],
): Phase2Detection[] {
  const detections: Phase2Detection[] = [];
  const availableSensors: SensorType[] = sensorReadings.map((r) => r.sensorType);

  for (const sig of PHASE2_SIGNATURES) {
    let confidence = 0;

    // Factor 1: N-wave template matching (weight: 0.40)
    const template = generateNWaveTemplate(sig.nWaveTemplate as NWaveTemplate, 2.0, sampleRate);
    const { detections: nWaveHits } = nWaveMatchedFilter(signal, template, 0.5);
    const bestCorrelation = nWaveHits.length > 0
      ? Math.max(...nWaveHits.map((d) => d.correlation))
      : 0;
    confidence += bestCorrelation * 0.40;

    // Factor 2: Frequency band energy via Goertzel (weight: 0.30)
    const centerFreq = (sig.frequencyRange[0] + sig.frequencyRange[1]) / 2;
    const bandEnergy = goertzel(signal, centerFreq, sampleRate);
    const freqMatch = Math.min(bandEnergy * 10, 1.0); // Normalize
    confidence += freqMatch * 0.30;

    // Factor 3: Sensor fusion (weight: 0.30)
    let fusionResult: FusionResult | null = null;
    if (sensorReadings.length > 0) {
      fusionResult = fuseSensorReadings(sensorReadings);
      confidence += fusionResult.finalConfidence * 0.30;
    }

    // Check sensor requirements
    const { met: sensorsMet, missing: missingSensors } = checkSensorRequirements(
      availableSensors,
      sig.sensorRequirements,
    );

    // Penalize if required sensors are missing
    if (!sensorsMet) {
      confidence *= 0.5;
    }

    if (confidence > 0.15) {
      detections.push({
        signature: sig,
        nWaveCorrelation: bestCorrelation,
        frequencyMatch: freqMatch,
        fusionResult,
        sensorsMet,
        missingSensors,
        overallConfidence: Math.min(confidence, 0.99),
        threatLevel: classifyThreatLevel(confidence, sensorsMet),
      });
    }
  }

  return detections.sort((a, b) => b.overallConfidence - a.overallConfidence);
}

function classifyThreatLevel(
  confidence: number,
  sensorsMet: boolean,
): Phase2Detection['threatLevel'] {
  if (!sensorsMet) return 'low';
  if (confidence >= 0.8) return 'critical';
  if (confidence >= 0.6) return 'high';
  if (confidence >= 0.35) return 'elevated';
  return 'low';
}

/**
 * Estimate Mach number from detected Mach cone angle.
 * Mach cone half-angle: θ = arcsin(1/M), so M = 1/sin(θ).
 */
export function estimateMachNumber(coneAngleDegrees: number): number {
  const radians = (coneAngleDegrees * Math.PI) / 180;
  const sinVal = Math.sin(radians);
  if (sinVal <= 0) return Infinity;
  return 1 / sinVal;
}

/**
 * Calculate expected arrival time delay between infrasound and seismic
 * signals based on distance and propagation speeds.
 *
 * Infrasound: ~343 m/s (speed of sound)
 * Seismic P-wave: ~5000-8000 m/s (varies by ground composition)
 */
export function expectedArrivalDelay(
  distanceKm: number,
  seismicVelocity = 6000, // m/s, average crustal P-wave
): number {
  const distanceM = distanceKm * 1000;
  const infrasoundTime = distanceM / 343;
  const seismicTime = distanceM / seismicVelocity;
  return infrasoundTime - seismicTime; // Seismic arrives first
}
