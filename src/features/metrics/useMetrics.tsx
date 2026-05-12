import { useGlobalStore, useProfileStore } from "@/state";
import { interpolate, type FindColorByMode } from "culori";
import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { useAnimationData } from "../animation-data/useAnimationData";
import { getMetricColorScale, isHingeMetric, isStaticMetric, METRIC_CONFIGS, type Metric } from "./metrics";
import { interpolateColor } from "./colors";

const grayColor = new THREE.Color(0.5, 0.5, 0.5);
const ERROR_MAGENTA = interpolate(["magenta"], "oklab");

// interface ColorContextType {
//   currentMetric: Metric;
//   setColorMetric: (metric: Metric) => void;
//   metricPaletteOverrides: MetricPaletteOverrides;
//   setMetricPalette: (metric: Metric, palette: MetricPaletteKey | null) => void;
//   getNodeColor: (nodeId: number, frameIndex: number) => THREE.Color;
//   getColorFromValue: (value: number) => THREE.Color;
//   availableMetrics: Metric[];
//   thresholdHighlighting: boolean;
//   setThresholdHighlighting: (enabled: boolean) => void;
// }

export function useMetrics() {
  const { animationData } = useAnimationData();
  // const { thresholds } = useThresholds();
  const currentMetric = useProfileStore((s) => s._currentMetric);
  const setCurrentMetric = useProfileStore((s) => s._setCurrentMetric);
  const showHiddenMetrics = useGlobalStore((s) => s.showHiddenMetrics);

  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);
  const setMetricPalette = useGlobalStore((s) => s.setMetricPalette);

  const thresholdHighlighting = useProfileStore((s) => s._thresholdHighlighting);
  const setThresholdHighlighting = useProfileStore((s) => s._setThresholdHighlighting);
  const thresholds = useProfileStore((s) => s._thresholds);

  const isCurrentMetricStatic = useMemo(() => isStaticMetric(currentMetric), [currentMetric]);
  const isCurrentMetricHinge = useMemo(() => isHingeMetric(currentMetric), [currentMetric]);
  const currentMetricColorScale = useMemo(
    () => getMetricColorScale(currentMetric, metricPaletteOverrides),
    [currentMetric, metricPaletteOverrides]
  );
  const currentMetricConfig = useMemo(() => METRIC_CONFIGS[currentMetric], [currentMetric]);
  const currentMetricPrecomputedMax = useMemo(
    () => currentMetricConfig.getPrecomputedMax(animationData),
    [animationData, currentMetricConfig]
  );
  const currentMetricThreshold = useMemo(
    () => thresholds[currentMetricConfig.thresholdKey],
    [thresholds, currentMetricConfig]
  );

  const availableMetrics = useMemo((): Metric[] => {
    return (Object.keys(METRIC_CONFIGS) as Metric[]).filter((metric) => {
      const config = METRIC_CONFIGS[metric];
      if (!config.isAvailable(animationData)) return false;
      if (config.hiddenByDefault && !showHiddenMetrics) return false;
      return true;
    });
  }, [animationData, showHiddenMetrics]);

  // const metricConfig = useMemo(() => getMetricConfig(currentMetric), [currentMetric]);
  // const metricColorScale = useMemo(
  //   () => getMetricColorScale(currentMetric, metricPaletteOverrides),
  //   [currentMetric, metricPaletteOverrides]
  // );

  const {
    positiveInterpolator,
    positiveThresholdInterpolator,
    negativeInterpolator,
    negativeThresholdInterpolator,
    fullPositiveInterpolator,
    fullNegativeInterpolator,
  } = useMemo(() => {
    return {
      positiveInterpolator: currentMetricConfig.hasPositive
        ? interpolate(currentMetricColorScale.positiveColorStops, "oklab")
        : ERROR_MAGENTA,
      positiveThresholdInterpolator: currentMetricConfig.hasPositive
        ? interpolate(currentMetricColorScale.positiveThresholdColorStops, "oklab")
        : ERROR_MAGENTA,
      negativeInterpolator: currentMetricConfig.hasNegative
        ? interpolate(currentMetricColorScale.negativeColorStops, "oklab")
        : ERROR_MAGENTA,
      negativeThresholdInterpolator: currentMetricConfig.hasNegative
        ? interpolate(currentMetricColorScale.negativeThresholdColorStops, "oklab")
        : ERROR_MAGENTA,
      fullPositiveInterpolator: currentMetricConfig.hasPositive
        ? interpolate(
            [...currentMetricColorScale.positiveColorStops, ...currentMetricColorScale.positiveThresholdColorStops],
            "oklab"
          )
        : ERROR_MAGENTA,
      fullNegativeInterpolator: currentMetricConfig.hasNegative
        ? interpolate(
            [...currentMetricColorScale.negativeColorStops, ...currentMetricColorScale.negativeThresholdColorStops],
            "oklab"
          )
        : ERROR_MAGENTA,
    };
  }, [currentMetricConfig, currentMetricColorScale]);

  const getNodeColorForCurrentMetric = useCallback(
    (frameIndex: number, nodeId: number) => {
      if (currentMetricPrecomputedMax === 0)
        return {
          passesThreshold: false,
          color: grayColor,
        };

      const value = currentMetricConfig.getValue(animationData, frameIndex, nodeId);
      if (value === undefined || !Number.isFinite(value))
        return {
          passesThreshold: false,
          color: grayColor,
        };

      const negative = value < 0;
      const normalizedValue = Math.min(1, Math.max(0, Math.abs(value / currentMetricPrecomputedMax)));
      const normalizedThreshold = Math.min(1, Math.max(0, currentMetricThreshold / currentMetricPrecomputedMax));

      let t: number = normalizedValue;
      let interpolator: (t: number) => FindColorByMode<"oklab">;

      if (negative) interpolator = fullNegativeInterpolator;
      else interpolator = fullPositiveInterpolator;

      let passesThreshold = false;

      if (thresholdHighlighting) {
        if (normalizedValue < normalizedThreshold) {
          t = normalizedValue / normalizedThreshold;
          if (negative) interpolator = negativeInterpolator;
          else interpolator = positiveInterpolator;
        } else {
          t = (normalizedValue - normalizedThreshold) / (1 - normalizedThreshold);
          if (negative) interpolator = negativeThresholdInterpolator;
          else interpolator = positiveThresholdInterpolator;
          passesThreshold = true;
        }
      }

      const rgbColor: [number, number, number] = interpolateColor(interpolator, t);
      return {
        passesThreshold,
        color: new THREE.Color(rgbColor[0], rgbColor[1], rgbColor[2]),
      };
    },
    [
      animationData,
      positiveInterpolator,
      negativeInterpolator,
      thresholdHighlighting,
      negativeThresholdInterpolator,
      positiveThresholdInterpolator,
      fullPositiveInterpolator,
      fullNegativeInterpolator,
      currentMetricConfig,
      currentMetricPrecomputedMax,
      currentMetricThreshold,
    ]
  );

  // const getColorFromValue = useCallback(
  //   (value: number): THREE.Color => {
  //     if (maxValue === 0) return grayColor;

  //     if (!Number.isFinite(value)) return grayColor;

  //     const negative = value < 0;
  //     const normalizedValue = Math.min(1, Math.max(0, Math.abs(value / maxValue)));
  //     const normalizedThreshold = Math.min(1, Math.max(0, thresholdValue / maxValue));

  //     let t: number = normalizedValue;
  //     let interpolator: (t: number) => FindColorByMode<"oklab">;

  //     if (negative) interpolator = fullNegativeInterpolator;
  //     else interpolator = fullPositiveInterpolator;

  //     if (thresholdHighlighting) {
  //       if (normalizedValue < normalizedThreshold) {
  //         t = normalizedValue / normalizedThreshold;
  //         if (negative) interpolator = negativeInterpolator;
  //         else interpolator = positiveInterpolator;
  //       } else {
  //         t = (normalizedValue - normalizedThreshold) / (1 - normalizedThreshold);
  //         if (negative) interpolator = negativeThresholdInterpolator;
  //         else interpolator = positiveThresholdInterpolator;
  //       }
  //     }

  //     const rgbColor: [number, number, number] = interpolateColor(interpolator, t);

  //     return new THREE.Color(rgbColor[0], rgbColor[1], rgbColor[2]);
  //   },
  //   [
  //     maxValue,
  //     positiveInterpolator,
  //     negativeInterpolator,
  //     thresholdValue,
  //     thresholdHighlighting,
  //     negativeThresholdInterpolator,
  //     positiveThresholdInterpolator,
  //     fullPositiveInterpolator,
  //     fullNegativeInterpolator,
  //   ]
  // );

  return {
    currentMetric,
    setCurrentMetric,
    availableMetrics,
    isCurrentMetricStatic,
    isCurrentMetricHinge,
    currentMetricColorScale,
    metricPaletteOverrides,
    setMetricPalette,
    currentMetricConfig,
    currentMetricPrecomputedMax,
    currentMetricThreshold,
    thresholdHighlighting,
    setThresholdHighlighting,
    getNodeColorForCurrentMetric,
  };
}
