import { useRef, useEffect } from 'react';
import { THEME } from '../theme';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  mode?: 'audible' | 'infrasound';
  labels?: string[];
  title?: string;
  subtitle?: string;
  dimmed?: boolean;
}

export default function Spectrogram({
  data,
  width = 600,
  height = 180,
  mode = 'audible',
  labels = [],
  title,
  subtitle,
  dimmed = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[][]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    historyRef.current.push([...data]);
    if (historyRef.current.length > W) historyRef.current.shift();

    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, W, H);

    const len = data.length;
    const sliceH = H / len;

    for (let x = 0; x < historyRef.current.length; x++) {
      const col = historyRef.current[x];
      for (let y = 0; y < len; y++) {
        const db = col[y];
        const norm = Math.max(0, Math.min(1, (db + 100) / 80));
        if (norm < 0.05) continue;

        let r: number, g: number, b: number;
        if (mode === 'audible') {
          r = Math.floor(norm * norm * 255);
          g = Math.floor(norm * 200 + (1 - norm) * 40);
          b = Math.floor((1 - norm) * 60);
        } else {
          r = Math.floor(norm * 80);
          g = Math.floor(norm * 150);
          b = Math.floor(norm * 255);
        }

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, H - (y + 1) * sliceH, 1, Math.ceil(sliceH));
      }
    }
  }, [data, mode]);

  return (
    <div style={{ marginBottom: 8 }}>
      {(title || subtitle) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: THEME.textMuted, fontSize: 9, letterSpacing: 2 }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ color: THEME.amberDim, fontSize: 9 }}>{subtitle}</span>
          )}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height,
          border: `1px solid ${THEME.border}`,
          borderRadius: 1,
          imageRendering: 'pixelated' as const,
          opacity: dimmed ? 0.5 : 1,
        }}
      />
      {labels.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 9,
            color: THEME.textMuted,
            marginTop: 2,
          }}
        >
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
