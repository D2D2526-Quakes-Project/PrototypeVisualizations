import { formatHex } from "culori";

export const blue900 = formatHex("oklch(37.9% 0.146 265.522)")!;
export const blue600 = formatHex("oklch(54.6% 0.245 262.881)")!;
export const blue400 = formatHex("oklch(70.7% 0.165 254.624)")!;
export const white = formatHex("#fff")!;
export const red400 = formatHex("oklch(70.4% 0.191 22.216)")!;
export const red600 = formatHex("oklch(57.7% 0.245 27.325)")!;
export const red900 = formatHex("oklch(39.6% 0.141 25.723)")!;

export const metricToThresholdKey: Record<string, string> = {
  displacement: "displacementMag",
  "displacement-x": "displacementX",
  "displacement-y": "displacementY",
  "displacement-z": "displacementZ",
  velocity: "velocityMag",
  "velocity-x": "velocityX",
  "velocity-y": "velocityY",
  "velocity-z": "velocityZ",
  acceleration: "accelerationMag",
  "acceleration-x": "accelerationX",
  "acceleration-y": "accelerationY",
  "acceleration-z": "accelerationZ",
  "story-drift": "interstoryDrift",
};

export const magnitudeMetrics = ['displacement', 'velocity', 'acceleration', 'story-drift'];

export function isMagnitudeMetric(metric: string): boolean {
  return magnitudeMetrics.includes(metric);
}
