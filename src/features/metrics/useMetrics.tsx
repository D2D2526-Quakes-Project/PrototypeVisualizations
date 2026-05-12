import { useGlobalStore, useProfileStore } from "@/state";
import { interpolate, type FindColorByMode } from "culori";
import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { useAnimationData } from "../animation-data/useAnimationData";
import { getMetricColorScale, isHingeMetric, isStaticMetric, METRIC_CONFIGS, type Metric } from "./metrics";
import { interpolateColor } from "./colors";

const grayColor = new THREE.Color(0.5, 0.5, 0.5);
const ERROR_MAGENTA = interpolate(["magenta"], "oklab");

export function useMetrics() {
  const { animationData } = useAnimationData();
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
  const missingNodeSet = useMemo(
    () => new Set(animationData.metadata.displacementMissingNodeIndices),
    [animationData.metadata.displacementMissingNodeIndices]
  );

  const availableMetrics = useMemo((): Metric[] => {
    return (Object.keys(METRIC_CONFIGS) as Metric[]).filter((metric) => {
      const config = METRIC_CONFIGS[metric];
      if (!config.isAvailable(animationData)) return false;
      if (config.hiddenByDefault && !showHiddenMetrics) return false;
      return true;
    });
  }, [animationData, showHiddenMetrics]);

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

  const getValueColorForCurrentMetric = useCallback(
    (value: number | undefined) => {
      if (value === undefined || !Number.isFinite(value))
        return {
          passesThreshold: false,
          noValue: true,
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
        noValue: false,
        color: new THREE.Color(rgbColor[0], rgbColor[1], rgbColor[2]),
      };
    },
    [
      positiveInterpolator,
      negativeInterpolator,
      thresholdHighlighting,
      negativeThresholdInterpolator,
      positiveThresholdInterpolator,
      fullPositiveInterpolator,
      fullNegativeInterpolator,
      currentMetricPrecomputedMax,
      currentMetricThreshold,
    ]
  );

  const getNodeColorForCurrentMetric = useCallback(
    (frameIndex: number, nodeId: number) => {
      if (currentMetricPrecomputedMax === 0)
        return {
          passesThreshold: false,
          noValue: true,
          color: grayColor,
        };

      if (missingNodeSet.has(nodeId)) {
        return {
          passesThreshold: false,
          noValue: true,
          color: grayColor,
        };
      }
      const value = currentMetricConfig.getValue(animationData, frameIndex, nodeId);

      return getValueColorForCurrentMetric(value);
    },
    [animationData, currentMetricConfig, currentMetricPrecomputedMax, getValueColorForCurrentMetric, missingNodeSet]
  );

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
    getValueColorForCurrentMetric,
    getNodeColorForCurrentMetric,
  };
}
