import { converter, interpolate, type Color } from 'culori';

export const rgbConverter = converter('rgb');

export function createInterpolator(colorStops: string[]) {
  return interpolate(colorStops, 'oklab');
}

export function interpolateColor(
  interpolator: (t: number) => Color | undefined,
  t: number
): [number, number, number] {
  const clampedT = Math.max(0, Math.min(1, t));
  const color = interpolator(clampedT);
  if (!color) return [1, 1, 1];
  
  // Convert to RGB using the converter
  const rgb = rgbConverter(color);
  if (!rgb || !('r' in rgb)) return [1, 1, 1];
  
  return [rgb.r, rgb.g, rgb.b];
}
