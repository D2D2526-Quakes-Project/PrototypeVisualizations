import { converter, type Mode, type Color } from "culori";

export type FindColorByMode<M extends Mode, C extends Color = Color> = C extends { mode: M } ? C : never;
type Interpolator<M extends Mode> = (t: number) => FindColorByMode<M>;

export const rgbConverter = converter("rgb");

export function interpolateColor(interpolator: Interpolator<"oklab">, t: number): [number, number, number] {
  const color = interpolator(t);
  if (!color) return [1, 0, 1];

  const rgb = rgbConverter(color);
  return [rgb.r, rgb.g, rgb.b];
}
