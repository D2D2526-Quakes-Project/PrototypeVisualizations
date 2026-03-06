import type { BuildingAnimationData, ComputedStats } from "@/lib/types";
import {
  blue400,
  blue50,
  blue600,
  blue900,
  cyan400,
  cyan50,
  cyan600,
  cyan900,
  green400,
  green50,
  green600,
  green900,
  orange400,
  orange50,
  orange600,
  orange900,
  purple400,
  purple50,
  purple600,
  purple900,
  red400,
  red50,
  red600,
  red900,
  teal400,
  teal50,
  teal600,
  teal900,
  violet400,
  violet50,
  violet600,
  violet900,
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

export type ThresholdKey =
  | "displacement"
  | "velocity"
  | "acceleration"
  | "rotation"
  | "rotationVelocity"
  | "rotationAcceleration"
  | "interstoryDrift";

export interface ColorScale {
  metric: Metric;
  colorStops: string[];
  label: string;
  unit: string;
}

export type Unit =
  | "inches"
  | "feet"
  | "meters"
  | "seconds"
  | "radians"
  | "percent"
  | "g"
  | "inches/second"
  | "inches/second²"
  | "feet/second"
  | "feet/second²"
  | "meters/second"
  | "meters/second²"
  | "radians/second"
  | "radians/second²";

export interface UnitConfig {
  label: Unit;
  singular: string;
  abbr: string;
}

export const UNITS: Record<Unit, UnitConfig> = {
  inches: {
    label: "inches",
    singular: "inch",
    abbr: "in",
  },
  "inches/second": {
    label: "inches/second",
    singular: "inch/second",
    abbr: "in/s",
  },
  "inches/second²": {
    label: "inches/second²",
    singular: "inch/second²",
    abbr: "in/s²",
  },
  feet: {
    label: "feet",
    singular: "foot",
    abbr: "ft",
  },
  "feet/second": {
    label: "feet/second",
    singular: "foot/second",
    abbr: "ft/s",
  },
  "feet/second²": {
    label: "feet/second²",
    singular: "foot/second²",
    abbr: "ft/s²",
  },
  meters: {
    label: "meters",
    singular: "meter",
    abbr: "m",
  },
  "meters/second": {
    label: "meters/second",
    singular: "meter/second",
    abbr: "m/s",
  },
  "meters/second²": {
    label: "meters/second²",
    singular: "meter/second²",
    abbr: "m/s²",
  },
  seconds: {
    label: "seconds",
    singular: "second",
    abbr: "s",
  },
  radians: {
    label: "radians",
    singular: "radian",
    abbr: "rad",
  },
  "radians/second": {
    label: "radians/second",
    singular: "radian/second",
    abbr: "rad/s",
  },
  "radians/second²": {
    label: "radians/second²",
    singular: "radian/second²",
    abbr: "rad/s²",
  },
  percent: {
    label: "percent",
    singular: "percent",
    abbr: "%",
  },
  g: {
    label: "g",
    singular: "gravity (g)",
    abbr: "g",
  },
};

const INCH_TO_METER = 0.0254;
const FEET_TO_METER = 0.3048;
const G_TO_M_S2 = 9.80665;
const RAD_TO_DEG = 57.29577951308232;

export type UnitCategory =
  | "length"
  | "velocity"
  | "acceleration"
  | "rotation"
  | "rotationVelocity"
  | "rotationAcceleration"
  | "percent"
  | "time";

export interface UnitConversionInfo {
  abbr: string;
  fullName: string;
  category: UnitCategory;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

export const CONVERSION_UNITS: Record<string, UnitConversionInfo> = {
  in: {
    abbr: "in",
    fullName: "inches",
    category: "length",
    toBase: (v) => v * INCH_TO_METER,
    fromBase: (v) => v / INCH_TO_METER,
  },
  ft: {
    abbr: "ft",
    fullName: "feet",
    category: "length",
    toBase: (v) => v * FEET_TO_METER,
    fromBase: (v) => v / FEET_TO_METER,
  },
  m: {
    abbr: "m",
    fullName: "meters",
    category: "length",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  "in/s": {
    abbr: "in/s",
    fullName: "inches/second",
    category: "velocity",
    toBase: (v) => v * INCH_TO_METER,
    fromBase: (v) => v / INCH_TO_METER,
  },
  "ft/s": {
    abbr: "ft/s",
    fullName: "feet/second",
    category: "velocity",
    toBase: (v) => v * FEET_TO_METER,
    fromBase: (v) => v / FEET_TO_METER,
  },
  "m/s": {
    abbr: "m/s",
    fullName: "meters/second",
    category: "velocity",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  "in/s²": {
    abbr: "in/s²",
    fullName: "inches/second²",
    category: "acceleration",
    toBase: (v) => v * INCH_TO_METER,
    fromBase: (v) => v / INCH_TO_METER,
  },
  "ft/s²": {
    abbr: "ft/s²",
    fullName: "feet/second²",
    category: "acceleration",
    toBase: (v) => v * FEET_TO_METER,
    fromBase: (v) => v / FEET_TO_METER,
  },
  "m/s²": {
    abbr: "m/s²",
    fullName: "meters/second²",
    category: "acceleration",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  g: {
    abbr: "g",
    fullName: "gravity (g)",
    category: "acceleration",
    toBase: (v) => v * G_TO_M_S2,
    fromBase: (v) => v / G_TO_M_S2,
  },
  rad: {
    abbr: "rad",
    fullName: "radians",
    category: "rotation",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  deg: {
    abbr: "°",
    fullName: "degrees",
    category: "rotation",
    toBase: (v) => v / RAD_TO_DEG,
    fromBase: (v) => v * RAD_TO_DEG,
  },
  "rad/s": {
    abbr: "rad/s",
    fullName: "radians/second",
    category: "rotationVelocity",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  "°/s": {
    abbr: "°/s",
    fullName: "degrees/second",
    category: "rotationVelocity",
    toBase: (v) => v / RAD_TO_DEG,
    fromBase: (v) => v * RAD_TO_DEG,
  },
  "rad/s²": {
    abbr: "rad/s²",
    fullName: "radians/second²",
    category: "rotationAcceleration",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  "°/s²": {
    abbr: "°/s²",
    fullName: "degrees/second²",
    category: "rotationAcceleration",
    toBase: (v) => v / RAD_TO_DEG,
    fromBase: (v) => v * RAD_TO_DEG,
  },
  "%": {
    abbr: "%",
    fullName: "percent",
    category: "percent",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  s: {
    abbr: "s",
    fullName: "seconds",
    category: "time",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
};

export interface ConversionResult {
  value: number;
  unit: string;
  fullName: string;
}

export function convertUnits(value: number, fromUnit: string, targetUnits: string[]): ConversionResult[] {
  const fromInfo = CONVERSION_UNITS[fromUnit];
  if (!fromInfo) {
    return targetUnits.map((u) => ({
      value,
      unit: u,
      fullName: u,
    }));
  }

  const baseValue = fromInfo.toBase(value);

  return targetUnits
    .map((unit) => {
      const info = CONVERSION_UNITS[unit];
      if (!info || info.category !== fromInfo.category) {
        return null;
      }
      return {
        value: info.fromBase(baseValue),
        unit: info.abbr,
        fullName: info.fullName,
      };
    })
    .filter((r): r is ConversionResult => r !== null);
}

export function getConversions(value: number, unit: string): ConversionResult[] {
  const info = CONVERSION_UNITS[unit];
  if (!info) return [];

  switch (info.category) {
    case "length":
      return convertUnits(value, unit, ["in", "ft", "m"]);
    case "velocity":
      return convertUnits(value, unit, ["in/s", "ft/s", "m/s"]);
    case "acceleration":
      return convertUnits(value, unit, ["in/s²", "ft/s²", "m/s²", "g"]);
    case "rotation":
      return convertUnits(value, unit, ["rad", "deg"]);
    case "rotationVelocity":
      return convertUnits(value, unit, ["rad/s", "°/s"]);
    case "rotationAcceleration":
      return convertUnits(value, unit, ["rad/s²", "°/s²"]);
    default:
      return [];
  }
}

export function formatValue(value: number, decimals: number = 3): string {
  if (value === 0) return "0";
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    return value.toFixed(decimals);
  }
  if (absValue < 0.001 && absValue !== 0) {
    return value.toExponential(decimals);
  }
  return value.toFixed(decimals);
}

export function getUnitFullName(unit: string): string {
  return CONVERSION_UNITS[unit]?.fullName || unit;
}

export type MetricConfig = {
  metric: Metric;
  thresholdKey: ThresholdKey;
  label: string;
  unit: UnitConfig;
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

export interface ThresholdConfig {
  key: ThresholdKey;
  label: string;
  unit: UnitConfig;
  getPrecomputedMax: (stats: ComputedStats) => number;
  isAvailable: (animationData: BuildingAnimationData) => boolean;
}

export const THRESHOLD_CONFIGS: Record<ThresholdKey, ThresholdConfig> = {
  displacement: {
    key: "displacement",
    label: "Displacement",
    unit: UNITS["inches"],
    getPrecomputedMax: get("maxDisplacement"),
    isAvailable: (animationData) => !!animationData.displacementLin,
  },
  velocity: {
    key: "velocity",
    label: "Velocity",
    unit: UNITS["inches/second"],
    getPrecomputedMax: get("maxVelocity"),
    isAvailable: (animationData) => !!animationData.velocityLin,
  },
  acceleration: {
    key: "acceleration",
    label: "Acceleration",
    unit: UNITS["inches/second²"],
    getPrecomputedMax: get("maxAcceleration"),
    isAvailable: (animationData) => !!animationData.accelerationLin,
  },
  rotation: {
    key: "rotation",
    label: "Rotation",
    unit: UNITS["radians"],
    getPrecomputedMax: get("maxRotation"),
    isAvailable: (animationData) => !!animationData.displacementRot,
  },
  rotationVelocity: {
    key: "rotationVelocity",
    label: "Rotation Velocity",
    unit: UNITS["radians/second"],
    getPrecomputedMax: get("maxRotationVelocity"),
    isAvailable: (animationData) => !!animationData.velocityRot,
  },
  rotationAcceleration: {
    key: "rotationAcceleration",
    label: "Rotation Acceleration",
    unit: UNITS["radians/second²"],
    getPrecomputedMax: get("maxRotationAcceleration"),
    isAvailable: (animationData) => !!animationData.accelerationRot,
  },
  interstoryDrift: {
    key: "interstoryDrift",
    label: "ISD",
    unit: UNITS["percent"],
    getPrecomputedMax: get("maxStoryDrift"),
    isAvailable: (animationData) => !!animationData.displacementLin,
  },
};

export const METRIC_CONFIGS: Record<Metric, MetricConfig> = {
  displacementMag: {
    metric: "displacementMag",
    thresholdKey: "displacement",
    label: "Displacement (Mag)",
    unit: UNITS["inches"],
    positiveOnly: true,
    getPrecomputedMax: get("maxDisplacement"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [green50, green400, green600, green900],
  },
  displacementX: {
    metric: "displacementX",
    thresholdKey: "displacement",
    label: "Displacement X",
    unit: UNITS["inches"],
    positiveOnly: false,
    getPrecomputedMax: get("maxDisplacementX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      return animationData.displacementLin.atFrame(frameIndex).at(nodeId)[0];
    },
    positiveColorStops: [green50, green400, green600, green900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  displacementY: {
    metric: "displacementY",
    thresholdKey: "displacement",
    label: "Displacement Y",
    unit: UNITS["inches"],
    positiveOnly: false,
    getPrecomputedMax: get("maxDisplacementY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      return animationData.displacementLin.atFrame(frameIndex).at(nodeId)[1];
    },
    positiveColorStops: [green50, green400, green600, green900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  displacementZ: {
    metric: "displacementZ",
    thresholdKey: "displacement",
    label: "Displacement Z",
    unit: UNITS["inches"],
    positiveOnly: false,
    getPrecomputedMax: get("maxDisplacementZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      return animationData.displacementLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [green50, green400, green600, green900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  velocityMag: {
    metric: "velocityMag",
    thresholdKey: "velocity",
    label: "Velocity (Mag)",
    unit: UNITS["inches/second"],
    positiveOnly: true,
    getPrecomputedMax: get("maxVelocity"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      const disp = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [cyan50, cyan400, cyan600, cyan900],
  },
  velocityX: {
    metric: "velocityX",
    thresholdKey: "velocity",
    label: "Velocity X",
    unit: UNITS["inches/second"],
    positiveOnly: false,
    getPrecomputedMax: get("maxVelocityX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      return animationData.velocityLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [cyan50, cyan400, cyan600, cyan900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  velocityY: {
    metric: "velocityY",
    thresholdKey: "velocity",
    label: "Velocity Y",
    unit: UNITS["inches/second"],
    positiveOnly: false,
    getPrecomputedMax: get("maxVelocityY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      return animationData.velocityLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [cyan50, cyan400, cyan600, cyan900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  velocityZ: {
    metric: "velocityZ",
    thresholdKey: "velocity",
    label: "Velocity Z",
    unit: UNITS["inches/second"],
    positiveOnly: false,
    getPrecomputedMax: get("maxVelocityZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      return animationData.velocityLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [cyan50, cyan400, cyan600, cyan900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  accelerationMag: {
    metric: "accelerationMag",
    thresholdKey: "acceleration",
    label: "Acceleration (Mag)",
    unit: UNITS["inches/second²"],
    positiveOnly: true,
    getPrecomputedMax: get("maxAcceleration"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      const disp = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [violet50, violet400, violet600, violet900],
  },
  accelerationX: {
    metric: "accelerationX",
    thresholdKey: "acceleration",
    label: "Acceleration X",
    unit: UNITS["inches/second²"],
    positiveOnly: false,
    getPrecomputedMax: get("maxAccelerationX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      return animationData.accelerationLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [violet50, violet400, violet600, violet900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  accelerationY: {
    metric: "accelerationY",
    thresholdKey: "acceleration",
    label: "Acceleration Y",
    unit: UNITS["inches/second²"],
    positiveOnly: false,
    getPrecomputedMax: get("maxAccelerationY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      return animationData.accelerationLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [violet50, violet400, violet600, violet900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  accelerationZ: {
    metric: "accelerationZ",
    thresholdKey: "acceleration",
    label: "Acceleration Z",
    unit: UNITS["inches/second²"],
    positiveOnly: false,
    getPrecomputedMax: get("maxAccelerationZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      return animationData.accelerationLin.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [violet50, violet400, violet600, violet900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  rotationMag: {
    metric: "rotationMag",
    thresholdKey: "rotation",
    label: "Rotation (Mag)",
    unit: UNITS["radians"],
    positiveOnly: true,
    getPrecomputedMax: get("maxRotation"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      const disp = animationData.displacementRot.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [orange50, orange400, orange600, orange900],
  },
  rotationX: {
    metric: "rotationX",
    thresholdKey: "rotation",
    label: "Rotation X",
    unit: UNITS["radians"],
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      return animationData.displacementRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [orange50, orange400, orange600, orange900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  rotationY: {
    metric: "rotationY",
    thresholdKey: "rotation",
    label: "Rotation Y",
    unit: UNITS["radians"],
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      return animationData.displacementRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [orange50, orange400, orange600, orange900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  rotationZ: {
    metric: "rotationZ",
    thresholdKey: "rotation",
    label: "Rotation Z",
    unit: UNITS["radians"],
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      return animationData.displacementRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [orange50, orange400, orange600, orange900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  rotationVelocityMag: {
    metric: "rotationVelocityMag",
    thresholdKey: "rotationVelocity",
    label: "Rotation Velocity (Mag)",
    unit: UNITS["radians/second"],
    positiveOnly: true,
    getPrecomputedMax: get("maxRotationVelocity"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      const disp = animationData.velocityRot.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [teal50, teal400, teal600, teal900],
  },
  rotationVelocityX: {
    metric: "rotationVelocityX",
    thresholdKey: "rotationVelocity",
    label: "Rotation Velocity X",
    unit: UNITS["radians/second"],
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationVelocityX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      return animationData.velocityRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [teal50, teal400, teal600, teal900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  rotationVelocityY: {
    metric: "rotationVelocityY",
    thresholdKey: "rotationVelocity",
    label: "Rotation Velocity Y",
    unit: UNITS["radians/second"],
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationVelocityY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      return animationData.velocityRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [teal50, teal400, teal600, teal900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  rotationVelocityZ: {
    metric: "rotationVelocityZ",
    thresholdKey: "rotationVelocity",
    label: "Rotation Velocity Z",
    unit: UNITS["radians/second"],
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationVelocityZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      return animationData.velocityRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [teal50, teal400, teal600, teal900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  rotationAccelerationMag: {
    metric: "rotationAccelerationMag",
    thresholdKey: "rotationAcceleration",
    label: "Rotation Acceleration (Mag)",
    unit: UNITS["radians/second²"],
    positiveOnly: true,
    getPrecomputedMax: get("maxRotationAcceleration"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      const disp = animationData.accelerationRot.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
    positiveColorStops: [purple50, purple400, purple600, purple900],
  },
  rotationAccelerationX: {
    metric: "rotationAccelerationX",
    thresholdKey: "rotationAcceleration",
    label: "Rotation Acceleration X",
    unit: UNITS["radians/second²"],
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationAccelerationX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      return animationData.accelerationRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [purple50, purple400, purple600, purple900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  rotationAccelerationY: {
    metric: "rotationAccelerationY",
    thresholdKey: "rotationAcceleration",
    label: "Rotation Acceleration Y",
    unit: UNITS["radians/second²"],
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationAccelerationY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      return animationData.accelerationRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [purple50, purple400, purple600, purple900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  rotationAccelerationZ: {
    metric: "rotationAccelerationZ",
    thresholdKey: "rotationAcceleration",
    label: "Rotation Acceleration Z",
    unit: UNITS["radians/second²"],
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationAccelerationZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      return animationData.accelerationRot.atFrame(frameIndex).at(nodeId)[2];
    },
    positiveColorStops: [purple50, purple400, purple600, purple900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
  interstoryDrift: {
    metric: "interstoryDrift",
    thresholdKey: "interstoryDrift",
    label: "Story Drift",
    unit: UNITS["percent"],
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
    positiveColorStops: [red50, red400, red600, red900],
    negativeColorStops: [blue50, blue400, blue600, blue900],
  },
};

export const THRESHOLD_KEY_ORDER: ThresholdKey[] = [
  "displacement",
  "rotation",
  "velocity",
  "rotationVelocity",
  "acceleration",
  "rotationAcceleration",
  "interstoryDrift",
];

export function getThresholdConfig(thresholdKey: ThresholdKey): ThresholdConfig {
  return THRESHOLD_CONFIGS[thresholdKey];
}

export function getThresholdKey(metric: Metric): ThresholdKey {
  return METRIC_CONFIGS[metric].thresholdKey;
}

export function getMetricsForThreshold(thresholdKey: ThresholdKey): Metric[] {
  return (Object.keys(METRIC_CONFIGS) as Metric[]).filter((metric) => METRIC_CONFIGS[metric].thresholdKey === thresholdKey);
}

export function getMetricConfig(metric: Metric): MetricConfig {
  return METRIC_CONFIGS[metric];
}
export function positiveOnlyMetric(metric: Metric): boolean {
  return METRIC_CONFIGS[metric].positiveOnly;
}
