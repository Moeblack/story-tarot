import type { Theme } from '../shared/types';

const CSS_VARS = {
  background: '--c-bg',
  surface: '--c-surface',
  text: '--c-text',
  muted: '--c-muted',
  accent: '--c-accent',
  border: '--c-border',
} as const;

export type ThemeColors = Theme['colors'];

export const FALLBACK_COLORS: ThemeColors = {
  background: '#12101a',
  surface: '#1d1a29',
  text: '#f2eef8',
  muted: '#a79ec0',
  accent: '#c9a227',
  border: '#332d47',
};

function parseHexChannel(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return [
      parseInt(raw[0] + raw[0], 16),
      parseInt(raw[1] + raw[1], 16),
      parseInt(raw[2] + raw[2], 16),
    ];
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ];
  }
  const rgb = raw.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

/** Relative luminance of a CSS colour, used to pick a light/dark shell. */
export function isDarkColor(color: string): boolean {
  const channels = parseHexChannel(color);
  if (!channels) return true;
  const [r, g, b] = channels.map((channel) => {
    const value = Math.min(255, Math.max(0, channel)) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.42;
}

/** Push a theme into CSS custom properties; the whole stylesheet reads these. */
export function applyTheme(theme: Theme | undefined | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const colors = theme?.colors ?? FALLBACK_COLORS;
  for (const key of Object.keys(CSS_VARS) as Array<keyof ThemeColors>) {
    const value = colors[key];
    if (typeof value === 'string' && value.trim()) {
      root.style.setProperty(CSS_VARS[key], value.trim());
    }
  }
  root.dataset.theme = theme?.id ?? 'default';
  root.dataset.scheme = isDarkColor(colors.background) ? 'dark' : 'light';
}

/** Colours with every field guaranteed present, for canvas rendering. */
export function resolvedColors(colors: Partial<ThemeColors> | undefined | null): ThemeColors {
  return {
    background: colors?.background || FALLBACK_COLORS.background,
    surface: colors?.surface || FALLBACK_COLORS.surface,
    text: colors?.text || FALLBACK_COLORS.text,
    muted: colors?.muted || FALLBACK_COLORS.muted,
    accent: colors?.accent || FALLBACK_COLORS.accent,
    border: colors?.border || FALLBACK_COLORS.border,
  };
}
