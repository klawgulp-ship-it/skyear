import { useState } from 'react';
import { THEME } from './theme';
import { FFT_SIZE } from './dsp/spectralEngine';
import { useAudioCapture } from './hooks/useAudioCapture';
import StatusBar from './components/StatusBar';
import Spectrogram from './components/Spectrogram';
import ActiveDetections from './components/ActiveDetections';
import AlertHistory from './components/AlertHistory';
import SignatureDb from './components/SignatureDb';
import Phase2Panel from './components/Phase2Panel';

type Tab = 'spectrogram' | 'signatures' | 'phase2';

export default function App() {
  const [sensitivity, setSensitivity] = useState(0.30);
  const [activeTab, setActiveTab] = useState<Tab>('spectrogram');

  const audio = useAudioCapture(sensitivity);
  const topDetection = audio.detections[0] ?? null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'spectrogram', label: 'LIVE SPECTROGRAM' },
    { key: 'signatures', label: 'SIGNATURE DB' },
    { key: 'phase2', label: 'PHASE 2 — INFRASOUND' },
  ];

  return (
    <div
      style={{
        background: THEME.bg,
        color: THEME.textPrimary,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
        minHeight: '100vh',
        padding: 12,
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${THEME.border}`,
          paddingBottom: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: audio.isListening ? THEME.green : THEME.textMuted,
              boxShadow: audio.isListening
                ? `0 0 8px ${THEME.green}`
                : 'none',
              animation: audio.isListening ? 'pulse 1.5s infinite' : 'none',
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 4 }}>
            SKYEAR
          </span>
          <span
            style={{
              color: THEME.textSecondary,
              fontSize: 10,
              letterSpacing: 2,
            }}
          >
            ACOUSTIC THREAT DETECTION v1.0
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: THEME.textMuted, fontSize: 10 }}>
            PHASE 1: DRONE DETECT | PHASE 2: INFRASOUND{' '}
            <span style={{ color: THEME.amberDim }}>[STUB]</span>
          </span>
          <button
            onClick={audio.isListening ? audio.stop : audio.start}
            style={{
              background: audio.isListening ? THEME.redDim : THEME.greenDark,
              color: audio.isListening ? THEME.red : THEME.green,
              border: `1px solid ${
                audio.isListening ? THEME.red : THEME.green
              }`,
              padding: '6px 16px',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: 'pointer',
              borderRadius: 2,
            }}
          >
            {audio.isListening ? '■ STOP' : '● ARM SYSTEM'}
          </button>
        </div>
      </div>

      {/* ── STATUS BAR ─────────────────────────────────────── */}
      <StatusBar
        isListening={audio.isListening}
        rmsLevel={audio.rmsLevel}
        peakFreq={audio.peakFreq}
        spectralCentroid={audio.spectralCentroid}
        topDetection={topDetection}
      />

      {/* ── MAIN GRID ──────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: 12,
        }}
      >
        {/* LEFT: Tabs + Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 2 }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background:
                    activeTab === tab.key ? THEME.bgCard : 'transparent',
                  color:
                    activeTab === tab.key ? THEME.green : THEME.textMuted,
                  border: `1px solid ${
                    activeTab === tab.key
                      ? THEME.borderActive
                      : THEME.border
                  }`,
                  borderBottom:
                    activeTab === tab.key
                      ? `1px solid ${THEME.bgCard}`
                      : `1px solid ${THEME.border}`,
                  padding: '6px 14px',
                  fontFamily: 'inherit',
                  fontSize: 10,
                  letterSpacing: 2,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  borderRadius: '2px 2px 0 0',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div
            style={{
              background: THEME.bgCard,
              border: `1px solid ${THEME.border}`,
              borderRadius: '0 2px 2px 2px',
              padding: 12,
              minHeight: 360,
            }}
          >
            {activeTab === 'spectrogram' && (
              <div>
                <Spectrogram
                  data={audio.displaySpectrum}
                  height={180}
                  mode="audible"
                  title={`AUDIBLE SPECTRUM — 100Hz–8kHz — FFT ${FFT_SIZE}pt`}
                  subtitle={`FRAME ${audio.frameCount}`}
                  labels={['100 Hz', '1 kHz', '4 kHz', '8 kHz']}
                />
                <Spectrogram
                  data={audio.infraDisplaySpectrum}
                  height={80}
                  mode="infrasound"
                  title="INFRASOUND — 0.1Hz–20Hz — SIMULATED"
                  subtitle="PHASE 2 STUB"
                  labels={['0.1 Hz', '5 Hz', '10 Hz', '20 Hz']}
                  dimmed
                />

                {/* Sensitivity slider */}
                <div
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      color: THEME.textMuted,
                      fontSize: 9,
                      letterSpacing: 2,
                    }}
                  >
                    DETECTION THRESHOLD
                  </span>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={sensitivity * 100}
                    onChange={(e) =>
                      setSensitivity(Number(e.target.value) / 100)
                    }
                    style={{ flex: 1, accentColor: THEME.green }}
                  />
                  <span
                    style={{
                      color: THEME.green,
                      fontWeight: 700,
                      minWidth: 36,
                    }}
                  >
                    {(sensitivity * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
            {activeTab === 'signatures' && <SignatureDb />}
            {activeTab === 'phase2' && <Phase2Panel />}
          </div>

          {/* Active detections */}
          <ActiveDetections
            detections={audio.detections}
            isListening={audio.isListening}
          />
        </div>

        {/* RIGHT: Alert History */}
        <AlertHistory alerts={audio.alertHistory} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
