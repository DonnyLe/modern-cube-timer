import type { BackgroundStyle, Palette } from './types';

export const backgroundStyles: { value: BackgroundStyle; label: string }[] = [
  { value: 'gradient', label: 'Flowing' },
  { value: 'solid', label: 'Solid' },
  { value: 'dots', label: 'Dots' },
  { value: 'grid', label: 'Grid' },
  { value: 'lines', label: 'Lines' },
  { value: 'triangles', label: 'Triangles' },
];

export const patterns: BackgroundStyle[] = ['dots', 'grid', 'lines', 'triangles'];
export const isPattern = (style: BackgroundStyle) => patterns.includes(style);

// CSS approximation of each background, used for settings previews and when WebGL is unavailable.
export function backgroundCss(
  style: BackgroundStyle,
  p: Palette,
  spacing: number,
  contrast: number,
) {
  const ink = `color-mix(in srgb, ${p.text} ${Math.round(contrast * 50)}%, transparent)`;
  const line = (angle: number) =>
    `repeating-linear-gradient(${angle}deg, ${ink} 0 1px, transparent 1px ${spacing}px)`;

  switch (style) {
    case 'solid':
      return p.background;
    case 'dots':
      return `radial-gradient(circle, ${ink} 1.6px, transparent 2.2px) 0 0 / ${spacing}px ${spacing}px, ${p.background}`;
    case 'grid':
      return `${line(0)}, ${line(90)}, ${p.background}`;
    case 'lines':
      return `${line(45)}, ${p.background}`;
    case 'triangles':
      return `${line(0)}, ${line(60)}, ${line(120)}, ${p.background}`;
    default:
      return `radial-gradient(ellipse at 20% 10%,${p.colorA},transparent 55%),radial-gradient(ellipse at 95% 70%,${p.colorB},transparent 55%),${p.background}`;
  }
}
