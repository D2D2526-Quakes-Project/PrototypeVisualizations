import { converter } from "culori";
import type { FindColorByMode, Mode } from "node_modules/@types/culori/src/common";

type Interpolator<M extends Mode> = (t: number) => FindColorByMode<M>;

export const rgbConverter = converter("rgb");

// export function interpolateColor(
//   interpolator: Interpolator<"oklab">,
//   thresholdInterpolator: Interpolator<"oklab">,
//   t: number,
//   thresholdT: number,
//   useThreshold: boolean,
// ): [number, number, number] {
//   let color;
//   if (!useThreshold) {
//     color = interpolator(t);
//   } else {
//     if (t < thresholdT) {
//       const localT = t / thresholdT;
//       color = interpolator(localT);
//     } else {
//       const localT = Math.min(1, (t - thresholdT) / (1 - thresholdT));
//       color = thresholdInterpolator(localT);
//     }
//   }

//   if (!color) return [1, 0, 1];

//   const rgb = rgbConverter(color);
//   return [rgb.r, rgb.g, rgb.b];
// }

export function interpolateColor(interpolator: Interpolator<"oklab">, t: number): [number, number, number] {
  const color = interpolator(t);
  if (!color) return [1, 0, 1];

  const rgb = rgbConverter(color);
  return [rgb.r, rgb.g, rgb.b];
}
