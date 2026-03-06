import { DRONE_SIGNATURES } from '@shared/signatures';
import { THEME, threatColor } from '../theme';

export default function SignatureDb() {
  return (
    <div>
      <div
        style={{
          color: THEME.textMuted,
          fontSize: 9,
          letterSpacing: 2,
          marginBottom: 12,
        }}
      >
        KNOWN DRONE SIGNATURES — {DRONE_SIGNATURES.length} PROFILES
      </div>

      {DRONE_SIGNATURES.map((sig) => (
        <div
          key={sig.id}
          style={{
            background: THEME.bgPanel,
            border: `1px solid ${THEME.border}`,
            borderLeft: `3px solid ${threatColor(sig.threat)}`,
            padding: '10px 12px',
            marginBottom: 6,
            borderRadius: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <span style={{ fontWeight: 700, color: THEME.textPrimary }}>
              {sig.name}
            </span>
            <span
              style={{
                color: threatColor(sig.threat),
                fontSize: 9,
                letterSpacing: 2,
                fontWeight: 700,
              }}
            >
              {sig.threat.toUpperCase()} THREAT
            </span>
          </div>

          <div
            style={{
              color: THEME.textSecondary,
              fontSize: 11,
              marginBottom: 6,
            }}
          >
            {sig.description}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              fontSize: 10,
            }}
          >
            <div>
              <span style={{ color: THEME.textMuted }}>F0: </span>
              <span style={{ color: THEME.cyan }}>
                {sig.fundamental[0]}–{sig.fundamental[1]} Hz
              </span>
            </div>
            <div>
              <span style={{ color: THEME.textMuted }}>Harmonics: </span>
              <span style={{ color: THEME.cyan }}>{sig.harmonics}</span>
            </div>
            <div>
              <span style={{ color: THEME.textMuted }}>Centroid: </span>
              <span style={{ color: THEME.cyan }}>
                {sig.spectralCentroidRange[0]}–{sig.spectralCentroidRange[1]} Hz
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
