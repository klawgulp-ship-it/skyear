import { THEME, threatColor, confidenceColor } from '../theme';
import type { DetectionResult } from '@shared/types';

interface Props {
  isListening: boolean;
  rmsLevel: number;
  peakFreq: number;
  spectralCentroid: number;
  topDetection: DetectionResult | null;
}

export default function StatusBar({
  isListening,
  rmsLevel,
  peakFreq,
  spectralCentroid,
  topDetection,
}: Props) {
  const metrics = [
    {
      label: 'STATUS',
      value: isListening ? 'ACTIVE' : 'STANDBY',
      color: isListening ? THEME.green : THEME.textMuted,
    },
    {
      label: 'RMS LEVEL',
      value: `${rmsLevel.toFixed(1)} dB`,
      color: rmsLevel > -30 ? THEME.amber : THEME.textSecondary,
    },
    {
      label: 'PEAK FREQ',
      value: `${peakFreq.toFixed(0)} Hz`,
      color: THEME.cyan,
    },
    {
      label: 'CENTROID',
      value: `${spectralCentroid.toFixed(0)} Hz`,
      color: THEME.cyan,
    },
    {
      label: 'THREAT',
      value: topDetection
        ? topDetection.signature.threat.toUpperCase()
        : 'CLEAR',
      color: topDetection
        ? threatColor(topDetection.signature.threat)
        : THEME.greenDim,
    },
    {
      label: 'CONFIDENCE',
      value: topDetection
        ? `${(topDetection.confidence * 100).toFixed(0)}%`
        : '—',
      color: topDetection
        ? confidenceColor(topDetection.confidence)
        : THEME.textMuted,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 8,
        marginBottom: 12,
      }}
    >
      {metrics.map((m, i) => (
        <div
          key={i}
          style={{
            background: THEME.bgCard,
            border: `1px solid ${THEME.border}`,
            padding: '8px 10px',
            borderRadius: 2,
          }}
        >
          <div
            style={{
              color: THEME.textMuted,
              fontSize: 9,
              letterSpacing: 2,
              marginBottom: 2,
            }}
          >
            {m.label}
          </div>
          <div style={{ color: m.color, fontSize: 14, fontWeight: 700 }}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}
