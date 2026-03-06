export const THEME = {
  bg:           '#0a0e14',
  bgPanel:      '#0d1117',
  bgCard:       '#111820',
  border:       '#1b2430',
  borderActive: '#2d4a22',
  textPrimary:  '#c8d6e5',
  textSecondary:'#5c7080',
  textMuted:    '#3d4f5f',
  green:        '#00ff41',
  greenDim:     '#00aa2a',
  greenDark:    '#003d10',
  amber:        '#ffbe00',
  amberDim:     '#a07800',
  red:          '#ff2d2d',
  redDim:       '#aa1e1e',
  cyan:         '#00d4ff',
  cyanDim:      '#007799',
} as const;

export function threatColor(level: string): string {
  if (level === 'high' || level === 'critical') return THEME.red;
  if (level === 'medium') return THEME.amber;
  return THEME.green;
}

export function confidenceColor(c: number): string {
  if (c >= 0.75) return THEME.red;
  if (c >= 0.5) return THEME.amber;
  return THEME.green;
}
