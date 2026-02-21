import type { BuildingAnimationData, ComputedStats } from "@/lib/types";
import {
  blue400,
  blue50,
  blue600,
  blue800,
  cyan400,
  cyan50,
  cyan600,
  cyan800,
  green400,
  green50,
  green600,
  green800,
  orange400,
  orange50,
  orange600,
  orange800,
  purple400,
  purple50,
  purple600,
  purple800,
  red400,
  red50,
  red600,
  red800,
  teal400,
  teal50,
  teal600,
  teal800,
  violet400,
  violet50,
  violet600,
  violet800,
} from "./colors/tailwindColors";

export type Metric =
  | "displacementX"
  | "displacementY"
  | "displacementZ"
  | "displacementMag"
  | "velocityX"
  | "velocityY"
  | "velocityZ"
  | "velocityMag"
  | "accelerationX"
  | "accelerationY"
  | "accelerationZ"
  | "accelerationMag"
  | "rotationX"
  | "rotationY"
  | "rotationZ"
  | "rotationMag"
  | "rotationVelocityX"
  | "rotationVelocityY"
  | "rotationVelocityZ"
  | "rotationVelocityMag"
  | "rotationAccelerationX"
  | "rotationAccelerationY"
  | "rotationAccelerationZ"
  | "rotationAccelerationMag"
  | "interstoryDrift";

export interface ColorScale {
  metric: Metric;
  colorStops: string[];
  label: string;
  unit: string;
}

export type MetricConfig = {
  metric: Metric;
  label: string;
  unit: string;
  getPrecomputedMax: (stats: ComputedStats) => number;
  getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => number | undefined;
  isAvailable: (animationData: BuildingAnimationData) => boolean;
  positiveColorStops: [string, string, string, string];
} & (
  | {
      positiveOnly: true;
    }
  | {
      positiveOnly: false;
      negativeColorStops: [string, string, string, string];
    }
);

type NumericKeys<T> = {
  [K in keyof T]: T[K] extends number | undefined ? K : never;
}[keyof T];

function get<T extends NumericKeys<ComputedStats> & keyof ComputedStats>(stat: T): (stats: ComputedStats) => number {
  return (stats) => stats[stat] ?? 0;
}

export const METRIC_CONFIGS: Record<Metric, MetricConfig> = {
  displacementMag: {
    metric: "displacementMag",
    label: "Displacement (Mag)",
    unit: "in",
    positiveOnly: true,
    getPrecomputedMax: get("maxDisplacement"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [green50, green400, green600, green800],
  },
  displacementX: {
    metric: "displacementX",
    label: "Displacement X",
    unit: "in",
    positiveOnly: false,
    getPrecomputedMax: get("maxDisplacementX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      return animationData.displacementLin.atFrame(frameIndex).at(nodeId)[0];
    },
    positiveColorStops: [green50, green400, green600, green800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  displacementY: {
    metric: "displacementY",
    label: "Displacement Y",
    unit: "in",
    positiveOnly: false,
    getPrecomputedMax: get("maxDisplacementY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      return animationData.displacementLin.atFrame(frameIndex).at(nodeId)[1];
    },
    positiveColorStops: [green50, green400, green600, green800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  displacementZ: {
    metric: "displacementZ",
    label: "Displacement Z",
    unit: "in",
    positiveOnly: false,
    getPrecomputedMax: get("maxDisplacementZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      return animationData.displacementLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [green50, green400, green600, green800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  velocityMag: {
    metric: "velocityMag",
    label: "Velocity (Mag)",
    unit: "in/s",
    positiveOnly: true,
    getPrecomputedMax: get("maxVelocity"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      const disp = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [cyan50, cyan400, cyan600, cyan800],
  },
  velocityX: {
    metric: "velocityX",
    label: "Velocity X",
    unit: "in/s",
    positiveOnly: false,
    getPrecomputedMax: get("maxVelocityX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      return animationData.velocityLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [cyan50, cyan400, cyan600, cyan800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  velocityY: {
    metric: "velocityY",
    label: "Velocity Y",
    unit: "in/s",
    positiveOnly: false,
    getPrecomputedMax: get("maxVelocityY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      return animationData.velocityLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [cyan50, cyan400, cyan600, cyan800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  velocityZ: {
    metric: "velocityZ",
    label: "Velocity Z",
    unit: "in/s",
    positiveOnly: false,
    getPrecomputedMax: get("maxVelocityZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      return animationData.velocityLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [cyan50, cyan400, cyan600, cyan800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  accelerationMag: {
    metric: "accelerationMag",
    label: "Acceleration (Mag)",
    unit: "in/s²",
    positiveOnly: true,
    getPrecomputedMax: get("maxAcceleration"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      const disp = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [violet50, violet400, violet600, violet800],
  },
  accelerationX: {
    metric: "accelerationX",
    label: "Acceleration X",
    unit: "in/s²",
    positiveOnly: false,
    getPrecomputedMax: get("maxAccelerationX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      return animationData.accelerationLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [violet50, violet400, violet600, violet800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  accelerationY: {
    metric: "accelerationY",
    label: "Acceleration Y",
    unit: "in/s²",
    positiveOnly: false,
    getPrecomputedMax: get("maxAccelerationY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      return animationData.accelerationLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [violet50, violet400, violet600, violet800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  accelerationZ: {
    metric: "accelerationZ",
    label: "Acceleration Z",
    unit: "in/s²",
    positiveOnly: false,
    getPrecomputedMax: get("maxAccelerationZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      return animationData.accelerationLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [violet50, violet400, violet600, violet800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  rotationMag: {
    metric: "rotationMag",
    label: "Rotation (Mag)",
    unit: "rad",
    positiveOnly: true,
    getPrecomputedMax: get("maxRotation"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      const disp = animationData.displacementRot.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [orange50, orange400, orange600, orange800],
  },
  rotationX: {
    metric: "rotationX",
    label: "Rotation X",
    unit: "rad",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      return animationData.displacementRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [orange50, orange400, orange600, orange800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  rotationY: {
    metric: "rotationY",
    label: "Rotation Y",
    unit: "rad",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      return animationData.displacementRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [orange50, orange400, orange600, orange800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  rotationZ: {
    metric: "rotationZ",
    label: "Rotation Z",
    unit: "rad",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      return animationData.displacementRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [orange50, orange400, orange600, orange800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  rotationVelocityMag: {
    metric: "rotationVelocityMag",
    label: "Rotation Velocity (Mag)",
    unit: "rad/s",
    positiveOnly: true,
    getPrecomputedMax: get("maxRotationVelocity"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      const disp = animationData.velocityRot.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [teal50, teal400, teal600, teal800],
  },
  rotationVelocityX: {
    metric: "rotationVelocityX",
    label: "Rotation Velocity X",
    unit: "rad/s",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationVelocityX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      return animationData.velocityRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [teal50, teal400, teal600, teal800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  rotationVelocityY: {
    metric: "rotationVelocityY",
    label: "Rotation Velocity Y",
    unit: "rad/s",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationVelocityY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      return animationData.velocityRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [teal50, teal400, teal600, teal800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  rotationVelocityZ: {
    metric: "rotationVelocityZ",
    label: "Rotation Velocity Z",
    unit: "rad/s",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationVelocityZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      return animationData.velocityRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [teal50, teal400, teal600, teal800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  rotationAccelerationMag: {
    metric: "rotationAccelerationMag",
    label: "Rotation Acceleration (Mag)",
    unit: "rad/s²",
    positiveOnly: true,
    getPrecomputedMax: get("maxRotationAcceleration"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      const disp = animationData.accelerationRot.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [purple50, purple400, purple600, purple800],
  },
  rotationAccelerationX: {
    metric: "rotationAccelerationX",
    label: "Rotation Acceleration X",
    unit: "rad/s²",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationAccelerationX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      return animationData.accelerationRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [purple50, purple400, purple600, purple800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  rotationAccelerationY: {
    metric: "rotationAccelerationY",
    label: "Rotation Acceleration Y",
    unit: "rad/s²",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationAccelerationY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      return animationData.accelerationRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [purple50, purple400, purple600, purple800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  rotationAccelerationZ: {
    metric: "rotationAccelerationZ",
    label: "Rotation Acceleration Z",
    unit: "rad/s²",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationAccelerationZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      return animationData.accelerationRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [purple50, purple400, purple600, purple800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
  interstoryDrift: {
    metric: "interstoryDrift",
    label: "Story Drift",
    unit: "%",
    positiveOnly: false,
    getPrecomputedMax: get("maxStoryDrift"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      const storyOrder = animationData.metadata.storyOrder;
      let foundStoryIndex = -1;
      for (let i = 0; i < storyOrder.length; i++) {
        const storyNodes = animationData.metadata.stories[storyOrder[i]];
        if (storyNodes.includes(nodeId)) {
          foundStoryIndex = i;
          break;
        }
      }
      if (foundStoryIndex <= 0) return undefined;

      const cornerOrder = ["NW", "NE", "SW", "SE"] as const;
      let cornerInfo = undefined;

      for (let storyIndex = 0; storyIndex < storyOrder.length; storyIndex++) {
        const storyId = storyOrder[storyIndex];
        const corners = animationData.precomputed.cornerNodes[storyId];
        if (!corners) continue;

        for (let cornerIndex = 0; cornerIndex < cornerOrder.length; cornerIndex++) {
          const corner = cornerOrder[cornerIndex];
          if (corners[corner] === nodeId) {
            cornerInfo = { storyIndex, cornerIndex };
          }
        }
      }

      if (!cornerInfo) return undefined;

      const { storyIndex, cornerIndex } = cornerInfo;
      const drifts = animationData.precomputed.storyDrift.getStoryDrift(storyIndex, frameIndex);
      return drifts[cornerIndex];
    },
    positiveColorStops: [red50, red400, red600, red800],
    negativeColorStops: [blue800, blue600, blue400, blue50],
  },
};
export function getMetricConfig(metric: Metric): MetricConfig {
  return METRIC_CONFIGS[metric];
}
export function positiveOnlyMetric(metric: Metric): boolean {
  return METRIC_CONFIGS[metric].positiveOnly;
}
