/**
 * Phase 2 — Infrasound Processing Engine (STUB)
 *
 * DSP primitives for sub-20Hz acoustic analysis:
 *   - CWT Morlet wavelet for N-wave transient detection
 *   - Goertzel algorithm for steady-state bin monitoring
 *   - Blackman-Harris STFT for spectrogram display
 *   - N-wave matched filtering via cross-correlation
 *
 * Requires dedicated infrasound array hardware (3-4 sensors, 50-200m spacing).
 * Sample rate: 100Hz (adequate for 0.1-20Hz band).
 */

export const INFRASOUND_SAMPLE_RATE = 100;
export const INFRASOUND_FFT_SIZE = 1024;
export const INFRASOUND_MIN_HZ = 0.1;
export const INFRASOUND_MAX_HZ = 20;

// ── Blackman-Harris Window ──────────────────────────────────

const BH_A0 = 0.35875;
const BH_A1 = 0.48829;
const BH_A2 = 0.14128;
const BH_A3 = 0.01168;

export function blackmanHarrisWindow(N: number): Float64Array {
  const w = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const x = (2 * Math.PI * n) / (N - 1);
    w[n] = BH_A0 - BH_A1 * Math.cos(x) + BH_A2 * Math.cos(2 * x) - BH_A3 * Math.cos(3 * x);
  }
  return w;
}

/**
 * Blackman-Harris windowed STFT for infrasound spectrogram display.
 * Returns magnitude spectrum in dB.
 */
export function blackmanHarrisSTFT(
  signal: Float64Array,
  fftSize = INFRASOUND_FFT_SIZE,
): Float64Array {
  const N = Math.min(signal.length, fftSize);
  const window = blackmanHarrisWindow(N);
  const windowed = new Float64Array(fftSize);

  for (let i = 0; i < N; i++) {
    windowed[i] = signal[i] * window[i];
  }

  // Real-valued DFT (stub uses direct DFT — production would use FFT)
  const numBins = Math.floor(fftSize / 2) + 1;
  const magnitudeDb = new Float64Array(numBins);

  for (let k = 0; k < numBins; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < fftSize; n++) {
      const angle = (2 * Math.PI * k * n) / fftSize;
      re += windowed[n] * Math.cos(angle);
      im -= windowed[n] * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im) / fftSize;
    magnitudeDb[k] = 20 * Math.log10(mag + 1e-12);
  }

  return magnitudeDb;
}

// ── Goertzel Algorithm ──────────────────────────────────────

/**
 * Goertzel algorithm — efficient single-bin DFT for monitoring specific
 * steady-state frequencies without computing a full FFT.
 *
 * Returns magnitude (linear) at the target frequency.
 */
export function goertzel(
  signal: Float64Array,
  targetHz: number,
  sampleRate = INFRASOUND_SAMPLE_RATE,
): number {
  const N = signal.length;
  const k = Math.round((N * targetHz) / sampleRate);
  const w = (2 * Math.PI * k) / N;
  const coeff = 2 * Math.cos(w);

  let s0 = 0;
  let s1 = 0;
  let s2 = 0;

  for (let i = 0; i < N; i++) {
    s0 = signal[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }

  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return Math.sqrt(Math.abs(power)) / N;
}

/**
 * Monitor multiple infrasound bins simultaneously using Goertzel.
 * Returns map of frequency → magnitude.
 */
export function goertzelBankMonitor(
  signal: Float64Array,
  frequencies: number[],
  sampleRate = INFRASOUND_SAMPLE_RATE,
): Map<number, number> {
  const results = new Map<number, number>();
  for (const freq of frequencies) {
    results.set(freq, goertzel(signal, freq, sampleRate));
  }
  return results;
}

// ── CWT Morlet Wavelet ──────────────────────────────────────

/**
 * Continuous Wavelet Transform using Morlet wavelet.
 * Optimized for detecting N-wave transients in infrasound data.
 *
 * The Morlet wavelet ψ(t) = exp(-t²/2) * exp(jω₀t)
 * with ω₀ = 5 (default) for good time-frequency resolution in infrasound band.
 *
 * Returns 2D scalogram: scales × time samples (magnitude).
 */
export function cwtMorlet(
  signal: Float64Array,
  scales: number[],
  omega0 = 5,
  sampleRate = INFRASOUND_SAMPLE_RATE,
): Float64Array[] {
  const N = signal.length;
  const scalogram: Float64Array[] = [];

  for (const scale of scales) {
    const row = new Float64Array(N);

    for (let t = 0; t < N; t++) {
      let re = 0;
      let im = 0;

      // Convolution with scaled Morlet wavelet
      const halfWidth = Math.min(Math.ceil(3 * scale * sampleRate), Math.floor(N / 2));

      for (let tau = -halfWidth; tau <= halfWidth; tau++) {
        const idx = t + tau;
        if (idx < 0 || idx >= N) continue;

        const tNorm = tau / (scale * sampleRate);
        const envelope = Math.exp(-0.5 * tNorm * tNorm);
        const phase = omega0 * tNorm;

        re += signal[idx] * envelope * Math.cos(phase);
        im += signal[idx] * envelope * Math.sin(phase);
      }

      const normFactor = 1 / Math.sqrt(scale * sampleRate);
      row[t] = Math.sqrt(re * re + im * im) * normFactor;
    }

    scalogram.push(row);
  }

  return scalogram;
}

/**
 * Generate CWT scales corresponding to the infrasound frequency range.
 * Maps frequencies to Morlet wavelet scales: scale = ω₀ / (2π * f).
 */
export function infrasoundScales(
  minHz = INFRASOUND_MIN_HZ,
  maxHz = INFRASOUND_MAX_HZ,
  numScales = 32,
  omega0 = 5,
): number[] {
  const scales: number[] = [];
  const logMin = Math.log(minHz);
  const logMax = Math.log(maxHz);

  for (let i = 0; i < numScales; i++) {
    // Log-spaced from high scale (low freq) to low scale (high freq)
    const freq = Math.exp(logMin + (logMax - logMin) * (i / (numScales - 1)));
    scales.push(omega0 / (2 * Math.PI * freq));
  }

  return scales.reverse(); // Low freq (high scale) first
}

// ── N-Wave Matched Filtering ────────────────────────────────

export type NWaveTemplate = 'sharp-n' | 'broad-n' | 'double-n';

/**
 * Generate synthetic N-wave pressure template for cross-correlation.
 *
 * N-waves are characteristic pressure signatures of supersonic/hypersonic objects:
 *   sharp-n:  Fast rise, short positive phase, sharp negative, fast recovery (Mach 5+)
 *   broad-n:  Slower transitions, broader lobes (reentry vehicles)
 *   double-n: Two successive N-waves (staging or fragmentation events)
 */
export function generateNWaveTemplate(
  type: NWaveTemplate,
  durationSec: number,
  sampleRate = INFRASOUND_SAMPLE_RATE,
): Float64Array {
  const N = Math.round(durationSec * sampleRate);
  const template = new Float64Array(N);

  switch (type) {
    case 'sharp-n': {
      // Classic sharp N-wave: steep rise → positive plateau → steep drop → negative plateau → recovery
      const riseEnd = Math.floor(N * 0.05);
      const posEnd = Math.floor(N * 0.35);
      const dropEnd = Math.floor(N * 0.45);
      const negEnd = Math.floor(N * 0.75);

      for (let i = 0; i < riseEnd; i++) template[i] = i / riseEnd;
      for (let i = riseEnd; i < posEnd; i++) template[i] = 1.0 - 0.2 * ((i - riseEnd) / (posEnd - riseEnd));
      for (let i = posEnd; i < dropEnd; i++) template[i] = 0.8 - 1.8 * ((i - posEnd) / (dropEnd - posEnd));
      for (let i = dropEnd; i < negEnd; i++) template[i] = -1.0 + 0.2 * ((i - dropEnd) / (negEnd - dropEnd));
      for (let i = negEnd; i < N; i++) template[i] = -0.8 * (1 - (i - negEnd) / (N - negEnd));
      break;
    }
    case 'broad-n': {
      // Broader N-wave with smoother transitions
      const mid = N / 2;
      for (let i = 0; i < N; i++) {
        const t = (i - mid) / (N / 4);
        template[i] = t * Math.exp(-0.5 * t * t);
      }
      // Normalize
      let maxVal = 0;
      for (let i = 0; i < N; i++) maxVal = Math.max(maxVal, Math.abs(template[i]));
      if (maxVal > 0) for (let i = 0; i < N; i++) template[i] /= maxVal;
      break;
    }
    case 'double-n': {
      // Two successive N-waves (half duration each, with gap)
      const half = Math.floor(N * 0.4);
      const gap = Math.floor(N * 0.2);
      const first = generateNWaveTemplate('sharp-n', half / sampleRate, sampleRate);
      const second = generateNWaveTemplate('broad-n', half / sampleRate, sampleRate);

      for (let i = 0; i < first.length && i < N; i++) template[i] = first[i];
      for (let i = 0; i < second.length && (i + half + gap) < N; i++) {
        template[i + half + gap] = second[i] * 0.7; // Second wave typically weaker
      }
      break;
    }
  }

  return template;
}

/**
 * Normalized cross-correlation between signal and N-wave template.
 * Returns array of correlation coefficients [-1, 1] at each lag.
 * Peak above threshold indicates potential N-wave detection.
 */
export function nWaveMatchedFilter(
  signal: Float64Array,
  template: Float64Array,
  detectionThreshold = 0.6,
): { correlations: Float64Array; detections: { lag: number; correlation: number }[] } {
  const sigLen = signal.length;
  const tmpLen = template.length;
  const outLen = sigLen - tmpLen + 1;

  if (outLen <= 0) {
    return { correlations: new Float64Array(0), detections: [] };
  }

  const correlations = new Float64Array(outLen);

  // Template stats (computed once)
  let tmpMean = 0;
  for (let i = 0; i < tmpLen; i++) tmpMean += template[i];
  tmpMean /= tmpLen;

  let tmpVar = 0;
  for (let i = 0; i < tmpLen; i++) tmpVar += (template[i] - tmpMean) ** 2;
  const tmpStd = Math.sqrt(tmpVar);

  if (tmpStd < 1e-12) {
    return { correlations, detections: [] };
  }

  // Sliding normalized cross-correlation
  for (let lag = 0; lag < outLen; lag++) {
    let sigMean = 0;
    for (let i = 0; i < tmpLen; i++) sigMean += signal[lag + i];
    sigMean /= tmpLen;

    let sigVar = 0;
    let crossCorr = 0;
    for (let i = 0; i < tmpLen; i++) {
      const sigDev = signal[lag + i] - sigMean;
      const tmpDev = template[i] - tmpMean;
      crossCorr += sigDev * tmpDev;
      sigVar += sigDev * sigDev;
    }

    const sigStd = Math.sqrt(sigVar);
    correlations[lag] = sigStd > 1e-12 ? crossCorr / (sigStd * tmpStd) : 0;
  }

  // Find detections above threshold
  const detections: { lag: number; correlation: number }[] = [];
  for (let i = 1; i < outLen - 1; i++) {
    if (
      correlations[i] >= detectionThreshold &&
      correlations[i] > correlations[i - 1] &&
      correlations[i] > correlations[i + 1]
    ) {
      detections.push({ lag: i, correlation: correlations[i] });
    }
  }

  return { correlations, detections };
}
