import type { SpectralPeak, HarmonicSeries } from '@shared/types';

export const FFT_SIZE = 4096;
export const SAMPLE_RATE = 48000;
export const DRONE_MIN_HZ = 100;
export const DRONE_MAX_HZ = 8000;

export function hzToBin(hz: number, sampleRate = SAMPLE_RATE, fftSize = FFT_SIZE): number {
  return Math.round((hz * fftSize) / sampleRate);
}

export function binToHz(bin: number, sampleRate = SAMPLE_RATE, fftSize = FFT_SIZE): number {
  return (bin * sampleRate) / fftSize;
}

/**
 * Find spectral peaks with prominence filtering.
 * Returns peaks sorted by magnitude (strongest first).
 */
export function findPeaks(
  spectrum: Float32Array | number[],
  minDb = -55,
  prominenceDb = 8,
): SpectralPeak[] {
  const peaks: SpectralPeak[] = [];

  for (let i = 2; i < spectrum.length - 2; i++) {
    const val = spectrum[i];
    if (
      val > minDb &&
      val > spectrum[i - 1] &&
      val > spectrum[i + 1] &&
      val > spectrum[i - 2] &&
      val > spectrum[i + 2]
    ) {
      const localMin = Math.max(
        Math.min(spectrum[i - 2], spectrum[i - 1]),
        Math.min(spectrum[i + 1], spectrum[i + 2]),
      );
      if (val - localMin >= prominenceDb) {
        peaks.push({ bin: i, magnitude: val });
      }
    }
  }

  return peaks.sort((a, b) => b.magnitude - a.magnitude);
}

/**
 * Compute spectral centroid within a frequency band.
 * Weighted average frequency by linear energy.
 */
export function computeSpectralCentroid(
  spectrum: Float32Array | number[],
  minBin: number,
  maxBin: number,
  sampleRate = SAMPLE_RATE,
  fftSize = FFT_SIZE,
): number {
  let weightedSum = 0;
  let totalEnergy = 0;

  for (let i = minBin; i <= maxBin && i < spectrum.length; i++) {
    const linear = Math.pow(10, spectrum[i] / 20);
    const freq = binToHz(i, sampleRate, fftSize);
    weightedSum += freq * linear;
    totalEnergy += linear;
  }

  return totalEnergy > 0 ? weightedSum / totalEnergy : 0;
}

/**
 * Detect harmonic series from spectral peaks.
 * Tests each peak as a potential fundamental, checks for integer multiples.
 */
export function detectHarmonicSeries(
  peaks: SpectralPeak[],
  tolerance = 0.12,
  sampleRate = SAMPLE_RATE,
  fftSize = FFT_SIZE,
): HarmonicSeries[] {
  const series: HarmonicSeries[] = [];
  if (peaks.length < 2) return series;

  for (let i = 0; i < Math.min(peaks.length, 8); i++) {
    const f0 = binToHz(peaks[i].bin, sampleRate, fftSize);
    if (f0 < 50 || f0 > 1000) continue;

    const harmonics = [{ harmonic: 1, freq: f0, magnitude: peaks[i].magnitude }];

    for (let h = 2; h <= 6; h++) {
      const expected = f0 * h;
      const match = peaks.find((p) => {
        const freq = binToHz(p.bin, sampleRate, fftSize);
        return Math.abs(freq - expected) / expected < tolerance;
      });
      if (match) {
        harmonics.push({
          harmonic: h,
          freq: binToHz(match.bin, sampleRate, fftSize),
          magnitude: match.magnitude,
        });
      }
    }

    if (harmonics.length >= 2) {
      series.push({ fundamental: f0, harmonics, strength: harmonics.length });
    }
  }

  return series.sort((a, b) => b.strength - a.strength);
}

/**
 * Compute RMS level in dB from time-domain samples.
 */
export function computeRmsDb(timeData: Float32Array): number {
  let sumSq = 0;
  for (let i = 0; i < timeData.length; i++) {
    sumSq += timeData[i] * timeData[i];
  }
  return 20 * Math.log10(Math.sqrt(sumSq / timeData.length) + 1e-10);
}

/**
 * Compute band energy ratio — what fraction of total energy is in a given band.
 */
export function bandEnergyRatio(
  spectrum: Float32Array | number[],
  minBin: number,
  maxBin: number,
): number {
  let bandEnergy = 0;
  let totalEnergy = 0;

  for (let i = 0; i < spectrum.length; i++) {
    const linear = Math.pow(10, spectrum[i] / 20);
    totalEnergy += linear;
    if (i >= minBin && i <= maxBin) bandEnergy += linear;
  }

  return totalEnergy > 0 ? bandEnergy / totalEnergy : 0;
}

/**
 * Subsample spectrum for spectrogram display.
 */
export function subsampleForDisplay(
  spectrum: Float32Array | number[],
  minBin: number,
  maxBin: number,
  displayBins = 256,
): number[] {
  const bandSpectrum = Array.from(spectrum).slice(minBin, maxBin + 1);
  const step = Math.max(1, Math.floor(bandSpectrum.length / displayBins));
  const result: number[] = [];

  for (let i = 0; i < displayBins; i++) {
    const idx = Math.min(i * step, bandSpectrum.length - 1);
    result.push(bandSpectrum[idx]);
  }

  return result;
}
