import { useState, useRef, useCallback, useEffect } from 'react';
import type { DetectionResult, AlertEvent } from '@shared/types';
import {
  FFT_SIZE,
  SAMPLE_RATE,
  DRONE_MIN_HZ,
  DRONE_MAX_HZ,
  hzToBin,
  findPeaks,
  computeSpectralCentroid,
  detectHarmonicSeries,
  computeRmsDb,
  subsampleForDisplay,
} from '../dsp/spectralEngine';
import { classifyDrone, rejectEnvironment, filterDetections } from '../dsp/classifier';

export interface AudioState {
  isListening: boolean;
  spectrum: number[] | null;
  displaySpectrum: number[];
  infraDisplaySpectrum: number[];
  rmsLevel: number;
  peakFreq: number;
  spectralCentroid: number;
  detections: DetectionResult[];
  alertHistory: AlertEvent[];
  frameCount: number;
}

export function useAudioCapture(sensitivity: number) {
  const [state, setState] = useState<AudioState>({
    isListening: false,
    spectrum: null,
    displaySpectrum: [],
    infraDisplaySpectrum: [],
    rmsLevel: -100,
    peakFreq: 0,
    spectralCentroid: 0,
    detections: [],
    alertHistory: [],
    frameCount: 0,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIdRef = useRef(0);
  const lastAlertTimeRef = useRef(0);
  const sensitivityRef = useRef(sensitivity);

  // Keep sensitivity ref in sync without restarting loop
  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  const processAudio = useCallback(() => {
    const analyser = analyserRef.current;
    const audioCtx = audioCtxRef.current;
    if (!analyser || !audioCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Float32Array(bufferLength);
    const timeData = new Float32Array(FFT_SIZE);
    const sampleRate = audioCtx.sampleRate;
    const minBin = hzToBin(DRONE_MIN_HZ, sampleRate, FFT_SIZE);
    const maxBin = hzToBin(DRONE_MAX_HZ, sampleRate, FFT_SIZE);

    const loop = () => {
      if (!analyserRef.current) return;

      analyser.getFloatFrequencyData(freqData);
      analyser.getFloatTimeDomainData(timeData);

      const spectrum = Array.from(freqData);
      const rmsLevel = computeRmsDb(timeData);
      const displaySpectrum = subsampleForDisplay(freqData, minBin, maxBin, 256);

      // Phase 2 stub — simulated infrasound noise floor
      const infraDisplaySpectrum = Array.from({ length: 64 }, () => -90 + Math.random() * 8);

      // Spectral analysis
      const peaks = findPeaks(freqData, -55, 8);
      const centroid = computeSpectralCentroid(freqData, minBin, maxBin, sampleRate, FFT_SIZE);
      const peakFreq = peaks.length > 0
        ? (peaks[0].bin * sampleRate) / FFT_SIZE
        : 0;

      // Classification
      const harmonicSeries = detectHarmonicSeries(peaks, 0.12, sampleRate, FFT_SIZE);
      const matches = classifyDrone(harmonicSeries, centroid, freqData);
      const rejections = rejectEnvironment(harmonicSeries, centroid, freqData);
      const filtered = filterDetections(matches, rejections, sensitivityRef.current);

      // Alert generation (throttled to 3s)
      const now = Date.now();
      let newAlert: AlertEvent | null = null;
      if (filtered.length > 0 && now - lastAlertTimeRef.current > 3000) {
        lastAlertTimeRef.current = now;
        const top = filtered[0];
        newAlert = {
          id: ++detectionIdRef.current,
          timestamp: new Date().toISOString(),
          name: top.signature.name,
          category: top.signature.category,
          threat: top.signature.threat,
          confidence: top.confidence,
          fundamental: harmonicSeries[0]?.fundamental || 0,
          centroid,
          details: top.matchDetails,
          rejections: rejections.map((r) => r.type),
        };
      }

      setState((prev) => ({
        isListening: true,
        spectrum,
        displaySpectrum,
        infraDisplaySpectrum,
        rmsLevel,
        peakFreq,
        spectralCentroid: centroid,
        detections: filtered.slice(0, 3),
        alertHistory: newAlert
          ? [newAlert, ...prev.alertHistory].slice(0, 50)
          : prev.alertHistory,
        frameCount: prev.frameCount + 1,
      }));

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: SAMPLE_RATE,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.3;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -10;
      source.connect(analyser);
      analyserRef.current = analyser;

      setState((prev) => ({ ...prev, isListening: true }));
      processAudio();
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  }, [processAudio]);

  const stop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setState((prev) => ({
      ...prev,
      isListening: false,
      detections: [],
      spectrum: null,
      displaySpectrum: [],
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return { ...state, start, stop };
}
