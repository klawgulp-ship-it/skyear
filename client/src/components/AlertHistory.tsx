import { THEME, threatColor, confidenceColor } from '../theme';
import type { AlertEvent } from '@shared/types';

interface Props {
  alerts: AlertEvent[];
}

export default function AlertHistory({ alerts }: Props) {
  return (
    <div
      style={{
        background: THEME.bgCard,
        border: `1px solid ${THEME.border}`,
        borderRadius: 2,
        padding: 12,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          color: THEME.textMuted,
          fontSize: 9,
          letterSpacing: 2,
          marginBottom: 10,
        }}
      >
        ALERT HISTORY — {alerts.length} EVENTS
      </div>

      {alerts.length === 0 ? (
        <div
          style={{
            color: THEME.textMuted,
            fontSize: 11,
            padding: '20px 0',
            textAlign: 'center',
          }}
        >
          No detection events recorded
        </div>
      ) : (
        alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              background: THEME.bgPanel,
              border: `1px solid ${THEME.border}`,
              borderLeft: `3px solid ${threatColor(alert.threat)}`,
              padding: '8px 10px',
              marginBottom: 6,
              borderRadius: 2,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: threatColor(alert.threat),
                  fontSize: 11,
                }}
              >
                {alert.name}
              </span>
              <span
                style={{
                  color: confidenceColor(alert.confidence),
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {(alert.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div
              style={{
                fontSize: 9,
                color: THEME.textMuted,
                marginBottom: 4,
              }}
            >
              {new Date(alert.timestamp).toLocaleTimeString()} •{' '}
              <span style={{ color: threatColor(alert.threat) }}>
                {alert.threat.toUpperCase()}
              </span>{' '}
              • {alert.category}
            </div>

            <div style={{ fontSize: 10, color: THEME.textSecondary }}>
              F0: {alert.fundamental.toFixed(0)}Hz • Centroid:{' '}
              {alert.centroid.toFixed(0)}Hz
            </div>

            {alert.rejections.length > 0 && (
              <div
                style={{ fontSize: 9, color: THEME.amberDim, marginTop: 2 }}
              >
                ENV REJECTED: {alert.rejections.join(', ')}
              </div>
            )}

            <div
              style={{ fontSize: 9, color: THEME.textMuted, marginTop: 4 }}
            >
              {alert.details.join(' • ')}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
