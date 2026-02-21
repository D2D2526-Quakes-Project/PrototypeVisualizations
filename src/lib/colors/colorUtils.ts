import { converter, interpolate } from "culori";
import type { FindColorByMode, Mode } from "node_modules/@types/culori/src/common";

type Interpolator<M extends Mode> = (t: number) => FindColorByMode<M>;

export const rgbConverter = converter("rgb");

export function createInterpolator(colorStops: string[]) {
  return interpolate(colorStops, "oklab");
}

export function interpolateColor(
  interpolator: Interpolator<"oklab">,
  thresholdInterpolator: Interpolator<"oklab">,
  t: number,
  thresholdT: number,
): [number, number, number] {
  let color;
  if (t < thresholdT) {
    const localT = t / thresholdT;
    color = interpolator(localT);
  } else {
    const localT = Math.min(1, (t - thresholdT) / (1 - thresholdT));
    color = thresholdInterpolator(localT);
  }

  if (!color) return [1, 0, 1];

  const rgb = rgbConverter(color);
  return [rgb.r, rgb.g, rgb.b];
}
