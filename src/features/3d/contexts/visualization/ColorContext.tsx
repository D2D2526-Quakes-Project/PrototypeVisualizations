import { useAnimationData } from "@/lib/animation-data/useAnimationData";
import { interpolateColor } from "@/lib/colors";

import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { useThresholds } from "./ThresholdContext";
import {
  getMetricColorScale,
  getMetricConfig,
  METRIC_CONFIGS,
  type Metric,
  type MetricPaletteKey,
  type MetricPaletteOverrides,
} from "@/lib/metrics";
import { interpolate } from "culori";
import type { FindColorByMode } from "node_modules/@types/culori/src/common";
import { useGlobalStore, useProfileStore } from "@/state";

const grayColor = new THREE.Color(0.5, 0.5, 0.5);

interface ColorContextType {
  currentMetric: Metric;
  setColorMetric: (metric: Metric) => void;
  metricPaletteOverrides: MetricPaletteOverrides;
  setMetricPalette: (metric: Metric, palette: MetricPaletteKey | null) => void;
  getNodeColor: (nodeId: number, frameIndex: number) => THREE.Color;
  getColorFromValue: (value: number) => THREE.Color;
  availableMetrics: Metric[];
  thresholdHighlighting: boolean;
  setThresholdHighlighting: (enabled: boolean) => void;
}

export function ColorProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const ERROR_MAGENTA = interpolate(["magenta"], "oklab");

export function useColor(): ColorContextType {
  const { animationData } = useAnimationData();
  const { thresholds } = useThresholds();
  const currentMetric = useProfileStore((s) => s.currentMetric);
  const setColorMetric = useProfileStore((s) => s.setColorMetric);
  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);
  const setMetricPalette = useGlobalStore((s) => s.setMetricPalette);
  const thresholdHighlighting = useProfileStore((s) => s.thresholdHighlighting);
  const setThresholdHighlighting = useProfileStore((s) => s.setThresholdHighlighting);
  const showHiddenMetrics = useGlobalStore((s) => s.showHiddenMetrics);

  const metricConfig = useMemo(() => getMetricConfig(currentMetric), [currentMetric]);
  const metricColorScale = useMemo(
    () => getMetricColorScale(currentMetric, metricPaletteOverrides),
    [currentMetric, metricPaletteOverrides]
  );

  const {
    positiveInterpolator,
    positiveThresholdInterpolator,
    negativeInterpolator,
    negativeThresholdInterpolator,
    fullPositiveInterpolator,
    fullNegativeInterpolator,
  } = useMemo(() => {
    return {
      positiveInterpolator: metricConfig.hasPositive
        ? interpolate(metricColorScale.positiveColorStops, "oklab")
        : ERROR_MAGENTA,
      positiveThresholdInterpolator: metricConfig.hasPositive
        ? interpolate(metricColorScale.positiveThresholdColorStops, "oklab")
        : ERROR_MAGENTA,
      negativeInterpolator: metricConfig.hasNegative
        ? interpolate(metricColorScale.negativeColorStops, "oklab")
        : ERROR_MAGENTA,
      negativeThresholdInterpolator: metricConfig.hasNegative
        ? interpolate(metricColorScale.negativeThresholdColorStops, "oklab")
        : ERROR_MAGENTA,
      fullPositiveInterpolator: metricConfig.hasPositive
        ? interpolate(
            [...metricColorScale.positiveColorStops, ...metricColorScale.positiveThresholdColorStops],
            "oklab"
          )
        : ERROR_MAGENTA,
      fullNegativeInterpolator: metricConfig.hasNegative
        ? interpolate(
            [...metricColorScale.negativeColorStops, ...metricColorScale.negativeThresholdColorStops],
            "oklab"
          )
        : ERROR_MAGENTA,
    };
  }, [metricConfig, metricColorScale]);

  const maxValue = useMemo(() => {
    return metricConfig.getPrecomputedMax(animationData);
  }, [animationData, metricConfig]);

  const thresholdValue = useMemo(() => {
    return thresholds[metricConfig.thresholdKey] ?? 0;
  }, [thresholds, metricConfig]);

  const getNodeColor = useCallback(
    (nodeId: number, frameIndex: number): THREE.Color => {
      if (maxValue === 0) return grayColor;

      const value = metricConfig.getValue(animationData, frameIndex, nodeId);
      if (value === undefined || !Number.isFinite(value)) return grayColor;

      const negative = value < 0;
      const normalizedValue = Math.min(1, Math.max(0, Math.abs(value / maxValue)));
      const normalizedThreshold = Math.min(1, Math.max(0, thresholdValue / maxValue));

      // if (normalizedValue === 0) {
      //   rgbColor = [1, 1, 1];
      // } else {
      let t: number = normalizedValue;
      let interpolator: (t: number) => FindColorByMode<"oklab">;

      if (negative) interpolator = fullNegativeInterpolator;
      else interpolator = fullPositiveInterpolator;

      if (thresholdHighlighting) {
        if (normalizedValue < normalizedThreshold) {
          t = normalizedValue / normalizedThreshold;
          if (negative) interpolator = negativeInterpolator;
          else interpolator = positiveInterpolator;
        } else {
          t = (normalizedValue - normalizedThreshold) / (1 - normalizedThreshold);
          if (negative) interpolator = negativeThresholdInterpolator;
          else interpolator = positiveThresholdInterpolator;
        }
      }

      const rgbColor: [number, number, number] = interpolateColor(interpolator, t);
      // }

      return new THREE.Color(rgbColor[0], rgbColor[1], rgbColor[2]);
    },
    [
      animationData,
      maxValue,
      positiveInterpolator,
      negativeInterpolator,
      thresholdValue,
      metricConfig,
      thresholdHighlighting,
      negativeThresholdInterpolator,
      positiveThresholdInterpolator,
      fullPositiveInterpolator,
      fullNegativeInterpolator,
    ]
  );

  const getColorFromValue = useCallback(
    (value: number): THREE.Color => {
      if (maxValue === 0) return grayColor;

      if (!Number.isFinite(value)) return grayColor;

      const negative = value < 0;
      const normalizedValue = Math.min(1, Math.max(0, Math.abs(value / maxValue)));
      const normalizedThreshold = Math.min(1, Math.max(0, thresholdValue / maxValue));

      let t: number = normalizedValue;
      let interpolator: (t: number) => FindColorByMode<"oklab">;

      if (negative) interpolator = fullNegativeInterpolator;
      else interpolator = fullPositiveInterpolator;

      if (thresholdHighlighting) {
        if (normalizedValue < normalizedThreshold) {
          t = normalizedValue / normalizedThreshold;
          if (negative) interpolator = negativeInterpolator;
          else interpolator = positiveInterpolator;
        } else {
          t = (normalizedValue - normalizedThreshold) / (1 - normalizedThreshold);
          if (negative) interpolator = negativeThresholdInterpolator;
          else interpolator = positiveThresholdInterpolator;
        }
      }

      const rgbColor: [number, number, number] = interpolateColor(interpolator, t);

      return new THREE.Color(rgbColor[0], rgbColor[1], rgbColor[2]);
    },
    [
      maxValue,
      positiveInterpolator,
      negativeInterpolator,
      thresholdValue,
      thresholdHighlighting,
      negativeThresholdInterpolator,
      positiveThresholdInterpolator,
      fullPositiveInterpolator,
      fullNegativeInterpolator,
    ]
  );

  const availableMetrics = useMemo((): Metric[] => {
    return (Object.keys(METRIC_CONFIGS) as Metric[]).filter((metric) => {
      const config = METRIC_CONFIGS[metric];
      if (!config.isAvailable(animationData)) return false;
      if (config.hiddenByDefault && !showHiddenMetrics) return false;
      return true;
    });
  }, [animationData, showHiddenMetrics]);

  return {
    currentMetric,
    setColorMetric,
    metricPaletteOverrides,
    setMetricPalette,
    getNodeColor,
    getColorFromValue,
    availableMetrics,
    thresholdHighlighting,
    setThresholdHighlighting,
  };
}
