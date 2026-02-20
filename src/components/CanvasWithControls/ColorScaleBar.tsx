import { blue900, blue600, blue400, white, red400, red600, red900, isMagnitudeMetric } from "./constants";
import type { ColorMetric } from "@/lib/colors";
import type { ThresholdState } from "@/stores";

interface ColorScaleBarProps {
  currentMetric: ColorMetric;
  thresholdHighlighting: boolean;
  thresholds: ThresholdState;
  animationData: {
    precomputed: {
      maxDisplacement: number;
      maxDisplacementX: number;
      maxDisplacementY: number;
      maxDisplacementZ: number;
      maxVelocity?: number | null;
      maxVelocityX?: number | null;
      maxVelocityY?: number | null;
      maxVelocityZ?: number | null;
      maxAcceleration?: number | null;
      maxAccelerationX?: number | null;
      maxAccelerationY?: number | null;
      maxAccelerationZ?: number | null;
      maxStoryDrift: number;
    };
  };
}

export function ColorScaleBar({ currentMetric, thresholdHighlighting, thresholds, animationData }: ColorScaleBarProps) {
  const isMagnitude = isMagnitudeMetric(currentMetric);

  let maxValue: number;
  let unit: string;

  if (currentMetric === 'displacement') {
    maxValue = animationData.precomputed.maxDisplacement;
    unit = 'in';
  } else if (currentMetric === 'velocity') {
    maxValue = animationData.precomputed.maxVelocity ?? 0;
    unit = 'in/s';
  } else if (currentMetric === 'acceleration') {
    maxValue = animationData.precomputed.maxAcceleration ?? 0;
    unit = 'in/s²';
  } else if (currentMetric === 'story-drift') {
    maxValue = animationData.precomputed.maxStoryDrift;
    unit = '%';
  } else {
    const maxX = animationData.precomputed.maxDisplacementX;
    const maxY = animationData.precomputed.maxDisplacementY;
    const maxZ = animationData.precomputed.maxDisplacementZ;
    maxValue = Math.max(Math.abs(maxX), Math.abs(maxY), Math.abs(maxZ));
    unit = 'in';
  }

  const displayMax = maxValue * 1.2;

  // Build color bar based on mode and threshold highlighting
  let stops: string[];
  let labels: React.ReactNode;

  if (thresholdHighlighting) {
    const metricToThresholdKey: Record<string, keyof ThresholdState> = {
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
    const thresholdKey = metricToThresholdKey[currentMetric] ?? "displacementMag";
    const thresholdValue = thresholds[thresholdKey] ?? 0;
    const thresholdRatio = maxValue > 0 ? thresholdValue / maxValue : 0;

    if (isMagnitude) {
      // Magnitude with threshold: white -> red only (no blue)
      stops = [
        `${white} 0%`,
        `${red400} ${thresholdRatio * 100}%`,
        `${red900} 100%`
      ];
      labels = (
        <>
          <span>0</span>
          <span>{thresholdValue.toFixed(2)} {unit}</span>
          <span>{displayMax.toFixed(2)}</span>
        </>
      );
    } else {
      // Directional with threshold: blue -> white -> red
      stops = [
        `${blue900} 0%`,
        `${blue600} ${(1 - thresholdRatio) * 50 - 0.1}%`,
        `${blue400} ${(1 - thresholdRatio) * 50}%`,
        `${white} 50%`,
        `${red400} ${thresholdRatio * 50 + 50}%`,
        `${red600} ${thresholdRatio * 50 + 50.1}%`,
        `${red900} 100%`
      ];
      labels = (
        <>
          <span>0</span>
          <span>{thresholdValue.toFixed(2)} {unit}</span>
          <span>{displayMax.toFixed(2)}</span>
        </>
      );
    }
  } else if (isMagnitude) {
    // Magnitude without threshold: white -> red
    stops = [
      `${white} 0%`,
      `${red400} 100%`
    ];
    labels = (
      <>
        <span>0</span>
        <span>{maxValue.toFixed(2)} {unit}</span>
      </>
    );
  } else {
    // Directional without threshold: blue -> white -> red
    stops = [
      `${blue900} 0%`,
      `${blue600} 24%`,
      `${white} 50%`,
      `${red400} 76%`,
      `${red900} 100%`
    ];
    labels = (
      <>
        <span>-{maxValue.toFixed(2)}</span>
        <span>0</span>
        <span>{maxValue.toFixed(2)} {unit}</span>
      </>
    );
  }

  return (
    <>
      <div
        className="relative h-3 rounded-sm"
        style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}></div>
      <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">
        {labels}
      </div>
    </>
  );
}
