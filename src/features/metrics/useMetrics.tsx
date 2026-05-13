import { useGlobalStore, useProfileStore } from "@/state";
import { interpolate, type FindColorByMode } from "culori";
import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { useAnimationData } from "../animation-data/useAnimationData";
import { getMetricColorScale, isHingeMetric, isStaticMetric, METRIC_CONFIGS, type Metric } from "./metrics";
import { interpolateColor } from "./colors";

const grayColor = new THREE.Color(0.5, 0.5, 0.5);
// const magentaColor = new THREE.Color(1, 0, 1);
const darkGrayColor = new THREE.Color(0.4, 0.4, 0.4);
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

  const missingNodeSet = useMemo(
    () => new Set(animationData.metadata.displacementMissingNodeIndices),
    [animationData.metadata.displacementMissingNodeIndices]
  );

  const getMetricResources = useCallback(
    (metric: Metric) => {
      const config = METRIC_CONFIGS[metric];
      const colorScale = getMetricColorScale(metric, metricPaletteOverrides);
      const precomputedMax = config.getPrecomputedMax(animationData);
      const threshold = thresholds[config.thresholdKey];

      return {
        config,
        precomputedMax,
        threshold,
        interpolators: {
          positive: config.hasPositive ? interpolate(colorScale.positiveColorStops, "oklab") : ERROR_MAGENTA,
          positiveThreshold: config.hasPositive
            ? interpolate(colorScale.positiveThresholdColorStops, "oklab")
            : ERROR_MAGENTA,
          negative: config.hasNegative ? interpolate(colorScale.negativeColorStops, "oklab") : ERROR_MAGENTA,
          negativeThreshold: config.hasNegative
            ? interpolate(colorScale.negativeThresholdColorStops, "oklab")
            : ERROR_MAGENTA,
          fullPositive: config.hasPositive
            ? interpolate([...colorScale.positiveColorStops, ...colorScale.positiveThresholdColorStops], "oklab")
            : ERROR_MAGENTA,
          fullNegative: config.hasNegative
            ? interpolate([...colorScale.negativeColorStops, ...colorScale.negativeThresholdColorStops], "oklab")
            : ERROR_MAGENTA,
        },
      };
    },
    [animationData, metricPaletteOverrides, thresholds]
  );

  const calculateColorFromResources = useCallback(
    (value: number | undefined, resources: ReturnType<typeof getMetricResources>) => {
      if (value === undefined || !Number.isFinite(value) || resources.precomputedMax === 0) {
        return { passesThreshold: false, noValue: true, color: grayColor };
      }

      const { precomputedMax, threshold, interpolators } = resources;
      const negative = value < 0;
      const absValue = Math.abs(value);
      const normalizedValue = Math.min(1, Math.max(0, absValue / precomputedMax));
      const normalizedThreshold = Math.min(1, Math.max(0, threshold / precomputedMax));

      let t = normalizedValue;
      let interpolator: (t: number) => FindColorByMode<"oklab">;
      let passesThreshold = false;

      if (thresholdHighlighting) {
        if (normalizedValue < normalizedThreshold) {
          t = normalizedValue / normalizedThreshold;
          interpolator = negative ? interpolators.negative : interpolators.positive;
        } else {
          t = (normalizedValue - normalizedThreshold) / (1 - normalizedThreshold);
          interpolator = negative ? interpolators.negativeThreshold : interpolators.positiveThreshold;
          passesThreshold = true;
        }
      } else {
        interpolator = negative ? interpolators.fullNegative : interpolators.fullPositive;
      }

      const rgbColor = interpolateColor(interpolator, t);
      return {
        passesThreshold,
        noValue: false,
        color: new THREE.Color(rgbColor[0], rgbColor[1], rgbColor[2]),
      };
    },
    [thresholdHighlighting]
  );

  const getValueColorForMetric = useCallback(
    (metric: Metric, value: number | undefined) => {
      const resources = getMetricResources(metric);
      return calculateColorFromResources(value, resources);
    },
    [getMetricResources, calculateColorFromResources]
  );

  const getNodeColorForMetric = useCallback(
    (metric: Metric, nodeId: number, frameIndex: number) => {
      if (missingNodeSet.has(nodeId)) {
        return { passesThreshold: false, noValue: true, color: grayColor };
      }
      const resources = getMetricResources(metric);
      const value = resources.config.getValue(animationData, frameIndex, nodeId);
      return calculateColorFromResources(value, resources);
    },
    [animationData, missingNodeSet, getMetricResources, calculateColorFromResources]
  );

  const currentMetricResources = useMemo(() => getMetricResources(currentMetric), [currentMetric, getMetricResources]);

  const getValueColorForCurrentMetric = useCallback(
    (value: number | undefined) => {
      return calculateColorFromResources(value, currentMetricResources);
    },
    [calculateColorFromResources, currentMetricResources]
  );

  const getNodeColorForCurrentMetric = useCallback(
    (nodeId: number, frameIndex: number) => {
      if (!animationData.metadata.nodeToStory[nodeId]) {
        return { passesThreshold: false, noValue: true, color: darkGrayColor };
      }

      if (missingNodeSet.has(nodeId)) {
        return { passesThreshold: false, noValue: true, color: grayColor };
      }
      const value = currentMetricResources.config.getValue(animationData, frameIndex, nodeId);
      return calculateColorFromResources(value, currentMetricResources);
    },
    [animationData, missingNodeSet, currentMetricResources, calculateColorFromResources]
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
    setCurrentMetric,
    availableMetrics,
    isCurrentMetricStatic: isStaticMetric(currentMetric),
    isCurrentMetricHinge: isHingeMetric(currentMetric),
    currentMetricColorScale: getMetricColorScale(currentMetric, metricPaletteOverrides),
    metricPaletteOverrides,
    setMetricPalette,
    currentMetricConfig: currentMetricResources.config,
    currentMetricPrecomputedMax: currentMetricResources.precomputedMax,
    currentMetricThreshold: currentMetricResources.threshold,
    thresholdHighlighting,
    setThresholdHighlighting,
    getValueColorForCurrentMetric,
    getNodeColorForCurrentMetric,
    getValueColorForMetric,
    getNodeColorForMetric,
  };
}
