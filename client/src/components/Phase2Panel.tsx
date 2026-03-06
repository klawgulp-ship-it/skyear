import { PHASE2_SIGNATURES } from '@shared/signatures';
import { THEME } from '../theme';

export default function Phase2Panel() {
  return (
    <div>
      <div
        style={{
          background: `${THEME.amberDim}15`,
          border: `1px solid ${THEME.amberDim}`,
          borderRadius: 2,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            color: THEME.amber,
            fontWeight: 700,
            marginBottom: 4,
            fontSize: 11,
          }}
        >
          PHASE 2 — INFRASOUND / HYPERSONIC DETECTION
        </div>
        <div style={{ color: THEME.textSecondary, fontSize: 11 }}>
          Interface stubs loaded. Requires dedicated infrasound array hardware
          (3–4 sensors, 50–200m spacing), seismic accelerometers, and wideband
          RF SDR (1–10GHz). Processing pipeline: CWT Morlet wavelet for N-wave
          transients, Goertzel for steady-state bins, Blackman-Harris STFT for
          display, Bayesian sensor fusion.
        </div>
      </div>

      <div
        style={{
          color: THEME.textMuted,
          fontSize: 9,
          letterSpacing: 2,
          marginBottom: 12,
        }}
      >
        HYPERSONIC THREAT TEMPLATES — {PHASE2_SIGNATURES.length} PROFILES
      </div>

      {PHASE2_SIGNATURES.map((sig) => (
        <div
          key={sig.id}
          style={{
            background: THEME.bgPanel,
            border: `1px solid ${THEME.border}`,
            borderLeft: `3px solid ${THEME.red}`,
            padding: '10px 12px',
            marginBottom: 6,
            borderRadius: 2,
            opacity: 0.6,
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
              style={{ color: THEME.red, fontSize: 9, letterSpacing: 2 }}
            >
              CRITICAL
            </span>
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
              <span style={{ color: THEME.textMuted }}>Band: </span>
              <span style={{ color: THEME.cyan }}>
                {sig.frequencyRange[0]}–{sig.frequencyRange[1]} Hz
              </span>
            </div>
            <div>
              <span style={{ color: THEME.textMuted }}>Mach Cone: </span>
              <span style={{ color: THEME.cyan }}>
                {sig.machConeAngle ? `${sig.machConeAngle}°` : 'Variable'}
              </span>
            </div>
            <div>
              <span style={{ color: THEME.textMuted }}>Sensors: </span>
              <span style={{ color: THEME.cyan }}>
                {sig.sensorRequirements.length}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 6, fontSize: 10, color: THEME.textMuted }}>
            Required:{' '}
            {sig.sensorRequirements.map((s, i) => (
              <span key={s}>
                <span style={{ color: THEME.amberDim }}>{s}</span>
                {i < sig.sensorRequirements.length - 1 ? ' + ' : ''}
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* Pipeline architecture */}
      <div
        style={{
          marginTop: 16,
          color: THEME.textMuted,
          fontSize: 9,
          letterSpacing: 2,
          paddingTop: 12,
          borderTop: `1px solid ${THEME.border}`,
        }}
      >
        PIPELINE ARCHITECTURE
      </div>
      <pre
        style={{
          background: THEME.bgPanel,
          border: `1px solid ${THEME.border}`,
          padding: 12,
          marginTop: 8,
          borderRadius: 2,
          fontSize: 10,
          fontFamily: 'inherit',
          color: THEME.textSecondary,
          lineHeight: 1.6,
          overflow: 'auto',
        }}
      >
{`Sensor Array (100Hz SR)
  ├─ CWT Morlet → N-wave transient detection
  ├─ Goertzel → steady-state bin monitoring
  └─ Blackman-Harris STFT → spectrogram display
        │
Feature Extraction
  ├─ N-wave template cross-correlation
  ├─ Mach cone angle: arcsin(1/M)
  └─ Arrival-time difference (array beamforming)
        │
Bayesian Sensor Fusion
  ├─ Infrasound confidence (weight: 0.35)
  ├─ Seismic correlation (weight: 0.35)
  ├─ RF plasma detection (weight: 0.30)
  └─ False positive rejection (storms/quakes/microbaroms)
        │
Classification → Alert`}
      </pre>
    </div>
  );
}
