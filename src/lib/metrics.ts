import type { BuildingAnimationData, ComputedStats } from "@/lib/types";
import { TAILWIND_PALETTES, type TailwindPaletteKey } from "./colors/tailwindColors";

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
  | "interstoryDrift"
  | "floorIndex"
  | "nodeZ"
  | "crossSectionX"
  | "crossSectionY";

export type ThresholdKey =
  | "displacement"
  | "velocity"
  | "acceleration"
  | "rotation"
  | "rotationVelocity"
  | "rotationAcceleration"
  | "interstoryDrift"
  | "inf";

export interface ColorScale {
  metric: Metric;
  colorStops: string[];
  label: string;
  unit: string;
}

export type MetricPaletteKey = TailwindPaletteKey | "spectrum";

export interface MetricPaletteDefinition {
  label: string;
  paletteKey: MetricPaletteKey;
  positiveColorStops: [string, string, ...string[]];
  negativeColorStops: [string, string, ...string[]];
  positiveThresholdColorStops: [string, string, ...string[]];
  negativeThresholdColorStops: [string, string, ...string[]];
  keyColor: string;
}

export type MetricPaletteOverrides = Partial<Record<Metric, MetricPaletteKey>>;

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
  const normalizeFixed = (fixedValue: string) => fixedValue.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");

  if (value === 0) return "0";
  const absValue = Math.abs(value);
  const normalizedDecimals = Math.max(0, decimals);
  const effectiveDecimals =
    absValue >= 100 ? 0 : absValue >= 10 ? Math.min(normalizedDecimals, 1) : Math.min(normalizedDecimals, 2);

  if (absValue >= 1000) {
    return normalizeFixed(value.toFixed(0));
  }
  if (absValue < 0.001 && absValue !== 0) {
    return `<0.001`;
    return value.toExponential(Math.min(effectiveDecimals, 1));
  }
  return normalizeFixed(value.toFixed(effectiveDecimals));
}

export function getUnitFullName(unit: string): string {
  return CONVERSION_UNITS[unit]?.fullName || unit;
}

export type MetricConfig = {
  metric: Metric;
  thresholdKey: ThresholdKey;
  label: string;
  unit: UnitConfig;
  defaultPalette: MetricPaletteKey;
  getPrecomputedMax: (stats: ComputedStats) => number;
  getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => number | undefined;
  isAvailable: (animationData: BuildingAnimationData) => boolean;
  positiveOnly: boolean;
};

export const METRIC_PALETTES: Record<MetricPaletteKey, MetricPaletteDefinition> = {
  red: {
    label: "Red",
    paletteKey: "red",
    positiveColorStops: [TAILWIND_PALETTES.red[50], TAILWIND_PALETTES.red[400]],
    positiveThresholdColorStops: [TAILWIND_PALETTES.red[600], TAILWIND_PALETTES.red[900]],
    negativeColorStops: [TAILWIND_PALETTES.red[50], TAILWIND_PALETTES.red[400]],
    negativeThresholdColorStops: [TAILWIND_PALETTES.red[600], TAILWIND_PALETTES.red[900]],
    keyColor: TAILWIND_PALETTES.red[500],
  },
  rose: {
    label: "Rose",
    paletteKey: "rose",
    positiveColorStops: [TAILWIND_PALETTES.rose[50], TAILWIND_PALETTES.rose[400]],
    positiveThresholdColorStops: [TAILWIND_PALETTES.rose[600], TAILWIND_PALETTES.rose[900]],
    negativeColorStops: [TAILWIND_PALETTES.rose[50], TAILWIND_PALETTES.rose[400]],
    negativeThresholdColorStops: [TAILWIND_PALETTES.rose[600], TAILWIND_PALETTES.rose[900]],
    keyColor: TAILWIND_PALETTES.rose[500],
  },
  orange: {
    label: "Orange",
    paletteKey: "orange",
    positiveColorStops: [TAILWIND_PALETTES.orange[50], TAILWIND_PALETTES.orange[400]],
    positiveThresholdColorStops: [TAILWIND_PALETTES.orange[600], TAILWIND_PALETTES.orange[900]],
    negativeColorStops: [TAILWIND_PALETTES.orange[50], TAILWIND_PALETTES.orange[400]],
    negativeThresholdColorStops: [TAILWIND_PALETTES.orange[600], TAILWIND_PALETTES.orange[900]],
    keyColor: TAILWIND_PALETTES.orange[500],
  },
  amber: {
    label: "Amber",
    paletteKey: "amber",
    positiveColorStops: [TAILWIND_PALETTES.amber[50], TAILWIND_PALETTES.amber[400]],
    positiveThresholdColorStops: [TAILWIND_PALETTES.amber[600], TAILWIND_PALETTES.amber[900]],
    negativeColorStops: [TAILWIND_PALETTES.amber[50], TAILWIND_PALETTES.amber[400]],
    negativeThresholdColorStops: [TAILWIND_PALETTES.amber[600], TAILWIND_PALETTES.amber[900]],
    keyColor: TAILWIND_PALETTES.amber[500],
  },
  green: {
    label: "Green",
    paletteKey: "green",
    positiveColorStops: [TAILWIND_PALETTES.green[50], TAILWIND_PALETTES.green[400]],
    positiveThresholdColorStops: [TAILWIND_PALETTES.green[600], TAILWIND_PALETTES.green[900]],
    negativeColorStops: [TAILWIND_PALETTES.green[50], TAILWIND_PALETTES.green[400]],
    negativeThresholdColorStops: [TAILWIND_PALETTES.green[600], TAILWIND_PALETTES.green[900]],
    keyColor: TAILWIND_PALETTES.green[500],
  },
  blue: {
    label: "Blue",
    paletteKey: "blue",
    positiveColorStops: [TAILWIND_PALETTES.blue[50], TAILWIND_PALETTES.blue[400]],
    positiveThresholdColorStops: [TAILWIND_PALETTES.blue[600], TAILWIND_PALETTES.blue[900]],
    negativeColorStops: [TAILWIND_PALETTES.blue[50], TAILWIND_PALETTES.blue[400]],
    negativeThresholdColorStops: [TAILWIND_PALETTES.blue[600], TAILWIND_PALETTES.blue[900]],
    keyColor: TAILWIND_PALETTES.blue[500],
  },
  cyan: {
    label: "Cyan",
    paletteKey: "cyan",
    positiveColorStops: [TAILWIND_PALETTES.cyan[50], TAILWIND_PALETTES.cyan[400]],
    positiveThresholdColorStops: [TAILWIND_PALETTES.cyan[600], TAILWIND_PALETTES.cyan[900]],
    negativeColorStops: [TAILWIND_PALETTES.cyan[50], TAILWIND_PALETTES.cyan[400]],
    negativeThresholdColorStops: [TAILWIND_PALETTES.cyan[600], TAILWIND_PALETTES.cyan[900]],
    keyColor: TAILWIND_PALETTES.cyan[500],
  },
  teal: {
    label: "Teal",
    paletteKey: "teal",
    positiveColorStops: [TAILWIND_PALETTES.teal[50], TAILWIND_PALETTES.teal[400]],
    positiveThresholdColorStops: [TAILWIND_PALETTES.teal[600], TAILWIND_PALETTES.teal[900]],
    negativeColorStops: [TAILWIND_PALETTES.teal[50], TAILWIND_PALETTES.teal[400]],
    negativeThresholdColorStops: [TAILWIND_PALETTES.teal[600], TAILWIND_PALETTES.teal[900]],
    keyColor: TAILWIND_PALETTES.teal[500],
  },
  violet: {
    label: "Violet",
    paletteKey: "violet",
    positiveColorStops: [TAILWIND_PALETTES.violet[50], TAILWIND_PALETTES.violet[400]],
    positiveThresholdColorStops: [TAILWIND_PALETTES.violet[600], TAILWIND_PALETTES.violet[900]],
    negativeColorStops: [TAILWIND_PALETTES.violet[50], TAILWIND_PALETTES.violet[400]],
    negativeThresholdColorStops: [TAILWIND_PALETTES.violet[600], TAILWIND_PALETTES.violet[900]],
    keyColor: TAILWIND_PALETTES.violet[500],
  },
  purple: {
    label: "Purple",
    paletteKey: "purple",
    positiveColorStops: [TAILWIND_PALETTES.purple[50], TAILWIND_PALETTES.purple[400]],
    positiveThresholdColorStops: [TAILWIND_PALETTES.purple[600], TAILWIND_PALETTES.purple[900]],
    negativeColorStops: [TAILWIND_PALETTES.purple[50], TAILWIND_PALETTES.purple[400]],
    negativeThresholdColorStops: [TAILWIND_PALETTES.purple[600], TAILWIND_PALETTES.purple[900]],
    keyColor: TAILWIND_PALETTES.purple[500],
  },
  spectrum: {
    label: "Spectrum",
    paletteKey: "spectrum",
    positiveColorStops: [
      "#fdfdfd",
      "#1d1d1d",
      "#ebce2b",
      "#702c8c",
      "#db6917",
      "#96cde6",
      "#ba1c30",
      "#c0bd7f",
      "#7f7e80",
      "#5fa641",
      "#d485b2",
      "#4277b6",
      "#df8461",
      "#463397",
      "#e1a11a",
      "#91218c",
      "#e8e948",
      "#7e1510",
      "#92ae31",
      "#6f340d",
      "#d32b1e",
      "#2b3514",
    ],
    positiveThresholdColorStops: ["#fff", "#fff"],
    negativeColorStops: [
      "#fdfdfd",
      "#1d1d1d",
      "#ebce2b",
      "#702c8c",
      "#db6917",
      "#96cde6",
      "#ba1c30",
      "#c0bd7f",
      "#7f7e80",
      "#5fa641",
      "#d485b2",
      "#4277b6",
      "#df8461",
      "#463397",
      "#e1a11a",
      "#91218c",
      "#e8e948",
      "#7e1510",
      "#92ae31",
      "#6f340d",
      "#d32b1e",
      "#2b3514",
    ],
    negativeThresholdColorStops: ["#fff", "#fff"],
    keyColor: "#3f3ffa",
  },
};

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
  inf: {
    key: "inf",
    label: "inf",
    unit: UNITS["inches"],
    getPrecomputedMax: () => Infinity,
    isAvailable: () => true,
  },
};

export const METRIC_CONFIGS: Record<Metric, MetricConfig> = {
  displacementMag: {
    metric: "displacementMag",
    thresholdKey: "displacement",
    label: "Displacement (Mag)",
    unit: UNITS["inches"],
    defaultPalette: "red",
    positiveOnly: true,
    getPrecomputedMax: get("maxDisplacement"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
  },
  displacementX: {
    metric: "displacementX",
    thresholdKey: "displacement",
    label: "Displacement X",
    unit: UNITS["inches"],
    defaultPalette: "red",
    positiveOnly: false,
    getPrecomputedMax: get("maxDisplacementX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      return animationData.displacementLin.atFrame(frameIndex).at(nodeId)[0];
    },
  },
  displacementY: {
    metric: "displacementY",
    thresholdKey: "displacement",
    label: "Displacement Y",
    unit: UNITS["inches"],
    defaultPalette: "rose",
    positiveOnly: false,
    getPrecomputedMax: get("maxDisplacementY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      return animationData.displacementLin.atFrame(frameIndex).at(nodeId)[1];
    },
  },
  displacementZ: {
    metric: "displacementZ",
    thresholdKey: "displacement",
    label: "Displacement Z",
    unit: UNITS["inches"],
    defaultPalette: "red",
    positiveOnly: false,
    getPrecomputedMax: get("maxDisplacementZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      return animationData.displacementLin.atFrame(frameIndex).at(nodeId)[2];
    },
  },
  velocityMag: {
    metric: "velocityMag",
    thresholdKey: "velocity",
    label: "Velocity (Mag)",
    unit: UNITS["inches/second"],
    defaultPalette: "cyan",
    positiveOnly: true,
    getPrecomputedMax: get("maxVelocity"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      const disp = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
  },
  velocityX: {
    metric: "velocityX",
    thresholdKey: "velocity",
    label: "Velocity X",
    unit: UNITS["inches/second"],
    defaultPalette: "cyan",
    positiveOnly: false,
    getPrecomputedMax: get("maxVelocityX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      return animationData.velocityLin.atFrame(frameIndex).at(nodeId)[0];
    },
  },
  velocityY: {
    metric: "velocityY",
    thresholdKey: "velocity",
    label: "Velocity Y",
    unit: UNITS["inches/second"],
    defaultPalette: "cyan",
    positiveOnly: false,
    getPrecomputedMax: get("maxVelocityY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      return animationData.velocityLin.atFrame(frameIndex).at(nodeId)[1];
    },
  },
  velocityZ: {
    metric: "velocityZ",
    thresholdKey: "velocity",
    label: "Velocity Z",
    unit: UNITS["inches/second"],
    defaultPalette: "cyan",
    positiveOnly: false,
    getPrecomputedMax: get("maxVelocityZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityLin) return undefined;
      return animationData.velocityLin.atFrame(frameIndex).at(nodeId)[2];
    },
  },
  accelerationMag: {
    metric: "accelerationMag",
    thresholdKey: "acceleration",
    label: "Acceleration (Mag)",
    unit: UNITS["inches/second²"],
    defaultPalette: "violet",
    positiveOnly: true,
    getPrecomputedMax: get("maxAcceleration"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      const disp = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
  },
  accelerationX: {
    metric: "accelerationX",
    thresholdKey: "acceleration",
    label: "Acceleration X",
    unit: UNITS["inches/second²"],
    defaultPalette: "violet",
    positiveOnly: false,
    getPrecomputedMax: get("maxAccelerationX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      return animationData.accelerationLin.atFrame(frameIndex).at(nodeId)[0];
    },
  },
  accelerationY: {
    metric: "accelerationY",
    thresholdKey: "acceleration",
    label: "Acceleration Y",
    unit: UNITS["inches/second²"],
    defaultPalette: "violet",
    positiveOnly: false,
    getPrecomputedMax: get("maxAccelerationY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      return animationData.accelerationLin.atFrame(frameIndex).at(nodeId)[1];
    },
  },
  accelerationZ: {
    metric: "accelerationZ",
    thresholdKey: "acceleration",
    label: "Acceleration Z",
    unit: UNITS["inches/second²"],
    defaultPalette: "violet",
    positiveOnly: false,
    getPrecomputedMax: get("maxAccelerationZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationLin,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationLin) return undefined;
      return animationData.accelerationLin.atFrame(frameIndex).at(nodeId)[2];
    },
  },
  rotationMag: {
    metric: "rotationMag",
    thresholdKey: "rotation",
    label: "Rotation (Mag)",
    unit: UNITS["radians"],
    defaultPalette: "orange",
    positiveOnly: true,
    getPrecomputedMax: get("maxRotation"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      const disp = animationData.displacementRot.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
  },
  rotationX: {
    metric: "rotationX",
    thresholdKey: "rotation",
    label: "Rotation X",
    unit: UNITS["radians"],
    defaultPalette: "orange",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      return animationData.displacementRot.atFrame(frameIndex).at(nodeId)[0];
    },
  },
  rotationY: {
    metric: "rotationY",
    thresholdKey: "rotation",
    label: "Rotation Y",
    unit: UNITS["radians"],
    defaultPalette: "orange",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      return animationData.displacementRot.atFrame(frameIndex).at(nodeId)[1];
    },
  },
  rotationZ: {
    metric: "rotationZ",
    thresholdKey: "rotation",
    label: "Rotation Z",
    unit: UNITS["radians"],
    defaultPalette: "orange",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.displacementRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.displacementRot) return undefined;
      return animationData.displacementRot.atFrame(frameIndex).at(nodeId)[2];
    },
  },
  rotationVelocityMag: {
    metric: "rotationVelocityMag",
    thresholdKey: "rotationVelocity",
    label: "Rotation Velocity (Mag)",
    unit: UNITS["radians/second"],
    defaultPalette: "teal",
    positiveOnly: true,
    getPrecomputedMax: get("maxRotationVelocity"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      const disp = animationData.velocityRot.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
  },
  rotationVelocityX: {
    metric: "rotationVelocityX",
    thresholdKey: "rotationVelocity",
    label: "Rotation Velocity X",
    unit: UNITS["radians/second"],
    defaultPalette: "teal",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationVelocityX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      return animationData.velocityRot.atFrame(frameIndex).at(nodeId)[0];
    },
  },
  rotationVelocityY: {
    metric: "rotationVelocityY",
    thresholdKey: "rotationVelocity",
    label: "Rotation Velocity Y",
    unit: UNITS["radians/second"],
    defaultPalette: "teal",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationVelocityY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      return animationData.velocityRot.atFrame(frameIndex).at(nodeId)[1];
    },
  },
  rotationVelocityZ: {
    metric: "rotationVelocityZ",
    thresholdKey: "rotationVelocity",
    label: "Rotation Velocity Z",
    unit: UNITS["radians/second"],
    defaultPalette: "teal",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationVelocityZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.velocityRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.velocityRot) return undefined;
      return animationData.velocityRot.atFrame(frameIndex).at(nodeId)[2];
    },
  },
  rotationAccelerationMag: {
    metric: "rotationAccelerationMag",
    thresholdKey: "rotationAcceleration",
    label: "Rotation Acceleration (Mag)",
    unit: UNITS["radians/second²"],
    defaultPalette: "purple",
    positiveOnly: true,
    getPrecomputedMax: get("maxRotationAcceleration"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      const disp = animationData.accelerationRot.atFrame(frameIndex).at(nodeId);
      return Math.hypot(disp[0], disp[1], disp[2]);
    },
  },
  rotationAccelerationX: {
    metric: "rotationAccelerationX",
    thresholdKey: "rotationAcceleration",
    label: "Rotation Acceleration X",
    unit: UNITS["radians/second²"],
    defaultPalette: "purple",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationAccelerationX"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      return animationData.accelerationRot.atFrame(frameIndex).at(nodeId)[0];
    },
  },
  rotationAccelerationY: {
    metric: "rotationAccelerationY",
    thresholdKey: "rotationAcceleration",
    label: "Rotation Acceleration Y",
    unit: UNITS["radians/second²"],
    defaultPalette: "purple",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationAccelerationY"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      return animationData.accelerationRot.atFrame(frameIndex).at(nodeId)[1];
    },
  },
  rotationAccelerationZ: {
    metric: "rotationAccelerationZ",
    thresholdKey: "rotationAcceleration",
    label: "Rotation Acceleration Z",
    unit: UNITS["radians/second²"],
    defaultPalette: "purple",
    positiveOnly: false,
    getPrecomputedMax: get("maxRotationAccelerationZ"),
    isAvailable: (animationData: BuildingAnimationData) => !!animationData.accelerationRot,
    getValue: (animationData: BuildingAnimationData, frameIndex: number, nodeId: number) => {
      if (!animationData.accelerationRot) return undefined;
      return animationData.accelerationRot.atFrame(frameIndex).at(nodeId)[2];
    },
  },
  interstoryDrift: {
    metric: "interstoryDrift",
    thresholdKey: "interstoryDrift",
    label: "Story Drift",
    unit: UNITS["percent"],
    defaultPalette: "red",
    positiveOnly: true,
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
        const corners = animationData.metadata.cornerNodes[storyId];
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
  },
  // Debug metrics
  floorIndex: {
    metric: "floorIndex",
    thresholdKey: "inf",
    label: "Floor Index",
    unit: UNITS["percent"],
    defaultPalette: "spectrum",
    positiveOnly: true,
    getPrecomputedMax: (stats) => {
      // Return number of stories as max
      return Object.keys(stats.storyHeights).length;
    },
    isAvailable: (animationData) => !!animationData.metadata.stories,
    getValue: (animationData, _frameIndex, nodeId) => {
      const { storyOrder, stories } = animationData.metadata;
      for (let i = 0; i < storyOrder.length; i++) {
        const storyNodes = stories[storyOrder[i]];
        if (storyNodes && storyNodes.includes(nodeId)) {
          return i + 1; // 1-based floor index
        }
      }
      return undefined;
    },
  },
  nodeZ: {
    metric: "nodeZ",
    thresholdKey: "inf",
    label: "Node Z Position",
    unit: UNITS["inches"],
    defaultPalette: "spectrum",
    positiveOnly: true,
    getPrecomputedMax: (stats) => {
      // Convert max Z from inches to feet
      return stats.boundingBox.max[2];
    },
    isAvailable: (animationData) => !!animationData.initialPositions,
    getValue: (animationData, _frameIndex, nodeId) => {
      const pos = animationData.initialPositions.at(nodeId);
      // Z is in inches, convert to feet
      return pos[2];
    },
  },
  crossSectionX: {
    metric: "crossSectionX",
    thresholdKey: "inf",
    label: "Cross-Section X Index",
    unit: UNITS["percent"],
    defaultPalette: "spectrum",
    positiveOnly: true,
    getPrecomputedMax: (stats) => {
      // Return number of X cross-sections as max
      return stats.numCrossSectionsX;
    },
    isAvailable: (animationData) => {
      // Available if there are cross-section definitions
      return Object.keys(animationData.metadata.crossSectionsX).length > 0;
    },
    getValue: (animationData, _frameIndex, nodeId) => {
      const { crossSectionsX } = animationData.metadata;
      if (!crossSectionsX) return undefined;

      // Find which cross-section X slice this node belongs to
      let i = 0;
      for (const nodes of Object.values(crossSectionsX)) {
        i++;
        if (nodes.includes(nodeId)) return i;
      }
      return undefined;
    },
  },
  crossSectionY: {
    metric: "crossSectionY",
    thresholdKey: "inf",
    label: "Cross-Section Y Index",
    unit: UNITS["percent"],
    defaultPalette: "spectrum",
    positiveOnly: true,
    getPrecomputedMax: (stats) => {
      // Return number of Y cross-sections as max
      return stats.numCrossSectionsY;
    },
    isAvailable: (animationData) => {
      // Available if there are cross-section definitions
      return Object.keys(animationData.metadata.crossSectionsY).length > 0;
    },
    getValue: (animationData, _frameIndex, nodeId) => {
      const { crossSectionsY } = animationData.metadata;
      if (!crossSectionsY) return undefined;

      let i = 0;
      for (const nodes of Object.values(crossSectionsY)) {
        i++;
        if (nodes.includes(nodeId)) return i;
      }
      return undefined;
    },
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
  return (Object.keys(METRIC_CONFIGS) as Metric[]).filter(
    (metric) => METRIC_CONFIGS[metric].thresholdKey === thresholdKey
  );
}

export function getMetricConfig(metric: Metric): MetricConfig {
  return METRIC_CONFIGS[metric];
}

export function getMetricColorScale(metric: Metric, overrides?: MetricPaletteOverrides) {
  const config = METRIC_CONFIGS[metric];
  const paletteKey = overrides?.[metric] ?? config.defaultPalette;
  const palette = METRIC_PALETTES[paletteKey];
  return {
    ...palette,
    paletteKey,
    isDefault: paletteKey === config.defaultPalette,
  };
}

export function getMetricKeyColor(metric: Metric, overrides?: MetricPaletteOverrides) {
  return getMetricColorScale(metric, overrides).keyColor;
}

export function positiveOnlyMetric(metric: Metric): boolean {
  return METRIC_CONFIGS[metric].positiveOnly;
}
