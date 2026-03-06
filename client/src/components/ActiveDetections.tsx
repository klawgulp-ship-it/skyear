import { THEME, threatColor, confidenceColor } from '../theme';
import type { DetectionResult } from '@shared/types';

interface Props {
  detections: DetectionResult[];
  isListening: boolean;
}

export default function ActiveDetections({ detections, isListening }: Props) {
  const top = detections[0] ?? null;

  return (
    <div
      style={{
        background: THEME.bgCard,
        border: `1px solid ${
          top ? threatColor(top.signature.threat) + '60' : THEME.border
        }`,
        borderRadius: 2,
        padding: 12,
      }}
    >
      <div
        style={{
          color: THEME.textMuted,
          fontSize: 9,
          letterSpacing: 2,
          marginBottom: 8,
        }}
      >
        ACTIVE CLASSIFICATIONS — {detections.length} MATCH
        {detections.length !== 1 ? 'ES' : ''}
      </div>

      {detections.length === 0 ? (
        <div style={{ color: THEME.textMuted, fontSize: 11, padding: '12px 0' }}>
          {isListening
            ? 'Monitoring — no drone signatures detected in current frame'
            : 'System standby — arm to begin acoustic monitoring'}
        </div>
      ) : (
        detections.map((d, i) => (
          <div
            key={i}
            style={{
              background: THEME.bgPanel,
              border: `1px solid ${threatColor(d.signature.threat)}40`,
              borderLeft: `3px solid ${threatColor(d.signature.threat)}`,
              padding: '10px 12px',
              marginBottom: 4,
              borderRadius: 2,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontWeight: 700,
                  color: threatColor(d.signature.threat),
                }}
              >
                {d.signature.name}
              </span>
              <span
                style={{
                  color: confidenceColor(d.confidence),
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {(d.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: THEME.textSecondary,
                marginTop: 4,
              }}
            >
              {d.matchDetails.join(' | ')}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
