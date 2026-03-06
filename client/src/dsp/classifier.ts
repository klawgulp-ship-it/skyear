import type { DroneSignature, DetectionResult, HarmonicSeries } from '@shared/types';
import { DRONE_SIGNATURES, ENVIRONMENT_PROFILES } from '@shared/signatures';
import { hzToBin, bandEnergyRatio, SAMPLE_RATE, FFT_SIZE, DRONE_MIN_HZ, DRONE_MAX_HZ } from './spectralEngine';

interface EnvironmentRejection {
  type: string;
  confidence: number;
}

/**
 * Classify audio frame against known drone signatures.
 * 4-factor scoring:
 *   1. Fundamental frequency match (0.35)
 *   2. Harmonic series match (0.30)
 *   3. Spectral centroid match (0.20)
 *   4. Band energy ratio (0.15)
 */
export function classifyDrone(
  harmonicSeries: HarmonicSeries[],
  spectralCentroid: number,
  spectrum: Float32Array | number[],
): DetectionResult[] {
  const results: DetectionResult[] = [];
  const minBin = hzToBin(DRONE_MIN_HZ);
  const maxBin = hzToBin(DRONE_MAX_HZ);

  for (const sig of DRONE_SIGNATURES) {
    let confidence = 0;
    const matchDetails: string[] = [];

    // Factor 1: Fundamental frequency in signature range
    for (const series of harmonicSeries) {
      const f0 = series.fundamental;
      if (f0 >= sig.fundamental[0] && f0 <= sig.fundamental[1]) {
        confidence += 0.35;
        matchDetails.push(`F0=${f0.toFixed(0)}Hz [${sig.fundamental[0]}–${sig.fundamental[1]}]`);

        // Factor 2: Harmonic series completeness
        const ratio = Math.min(series.harmonics.length, sig.harmonics) / sig.harmonics;
        confidence += ratio * 0.30;
        matchDetails.push(`${series.harmonics.length}/${sig.harmonics} harmonics`);
        break;
      }
    }

    // Factor 3: Spectral centroid in expected range
    if (
      spectralCentroid >= sig.spectralCentroidRange[0] &&
      spectralCentroid <= sig.spectralCentroidRange[1]
    ) {
      confidence += 0.20;
      matchDetails.push(`Centroid ${spectralCentroid.toFixed(0)}Hz`);
    }

    // Factor 4: Band energy concentration
    const ratio = bandEnergyRatio(spectrum, minBin, maxBin);
    if (ratio > 0.6) {
      confidence += 0.15;
      matchDetails.push(`Band energy ${(ratio * 100).toFixed(0)}%`);
    }

    if (confidence > 0.25) {
      results.push({
        signature: sig,
        confidence: Math.min(confidence, 0.99),
        matchDetails,
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Reject known environment sounds to reduce false positives.
 */
export function rejectEnvironment(
  harmonicSeries: HarmonicSeries[],
  spectralCentroid: number,
  spectrum: Float32Array | number[],
): EnvironmentRejection[] {
  const rejections: EnvironmentRejection[] = [];

  // Bird: no harmonics, centroid in 1-6kHz range
  if (harmonicSeries.length === 0 && spectralCentroid > 1000 && spectralCentroid < 6000) {
    rejections.push({ type: 'bird', confidence: 0.4 });
  }

  // Car/traffic: low-freq broadband, few harmonics, low centroid
  const lowBin = hzToBin(60);
  const midBin = hzToBin(300);
  let lowEnergy = 0;
  for (let i = lowBin; i <= midBin && i < spectrum.length; i++) {
    lowEnergy += Math.pow(10, spectrum[i] / 20);
  }
  const totalBins = midBin - lowBin + 1;
  const avgLow = lowEnergy / (totalBins || 1);

  if (avgLow > 0.1 && harmonicSeries.length <= 1 && spectralCentroid < 400) {
    rejections.push({ type: 'car/traffic', confidence: 0.5 });
  }

  // Wind: broadband noise, no harmonic structure, low centroid
  if (harmonicSeries.length === 0 && spectralCentroid < 800 && spectralCentroid > 0) {
    const flatness = computeSpectralFlatness(spectrum);
    if (flatness > 0.3) {
      rejections.push({ type: 'wind', confidence: 0.45 });
    }
  }

  return rejections;
}

/**
 * Spectral flatness (Wiener entropy) — 1.0 = pure noise, 0.0 = pure tone.
 * Used for wind/noise rejection.
 */
function computeSpectralFlatness(spectrum: Float32Array | number[]): number {
  let logSum = 0;
  let linSum = 0;
  let count = 0;

  for (let i = 1; i < spectrum.length; i++) {
    const linear = Math.pow(10, spectrum[i] / 20);
    if (linear > 0) {
      logSum += Math.log(linear);
      linSum += linear;
      count++;
    }
  }

  if (count === 0 || linSum === 0) return 0;

  const geometricMean = Math.exp(logSum / count);
  const arithmeticMean = linSum / count;

  return geometricMean / arithmeticMean;
}

/**
 * Filter detections: only pass those exceeding sensitivity AND
 * beating environment rejection confidence by margin.
 */
export function filterDetections(
  detections: DetectionResult[],
  rejections: EnvironmentRejection[],
  sensitivity: number,
): DetectionResult[] {
  const envConf = rejections.length > 0
    ? Math.max(...rejections.map((r) => r.confidence))
    : 0;

  return detections
    .filter((d) => d.confidence >= sensitivity)
    .filter((d) => d.confidence > envConf + 0.1);
}
