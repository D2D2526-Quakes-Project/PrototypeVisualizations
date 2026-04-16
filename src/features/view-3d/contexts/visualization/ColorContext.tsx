import { useAnimationData } from "@/lib/useAnimationData";
import { interpolateColor } from "@/lib/colors";
import { useViewStore } from "@/state";
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

const grayColor = new THREE.Color(0.5, 0.5, 0.5);

interface ColorContextType {
  currentMetric: Metric;
  setColorMetric: (metric: Metric) => void;
  metricPaletteOverrides: MetricPaletteOverrides;
  setMetricPalette: (metric: Metric, palette: MetricPaletteKey | null) => void;
  getNodeColor: (nodeId: number, frameIndex: number) => THREE.Color;
  availableMetrics: Metric[];
  thresholdHighlighting: boolean;
  setThresholdHighlighting: (enabled: boolean) => void;
}

export function ColorProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useColor(): ColorContextType {
  const { animationData } = useAnimationData();
  const { thresholds } = useThresholds();
  const currentMetric = useViewStore((s) => s.currentMetric);
  const setColorMetric = useViewStore((s) => s.setColorMetric);
  const metricPaletteOverrides = useViewStore((s) => s.metricPaletteOverrides);
  const setMetricPalette = useViewStore((s) => s.setMetricPalette);
  const thresholdHighlighting = useViewStore((s) => s.thresholdHighlighting);
  const setThresholdHighlighting = useViewStore((s) => s.setThresholdHighlighting);

  const metricConfig = useMemo(() => getMetricConfig(currentMetric), [currentMetric]);
  const metricColorScale = useMemo(
    () => getMetricColorScale(currentMetric, metricPaletteOverrides),
    [currentMetric, metricPaletteOverrides]
  );

  const { positiveInterpolator, positiveThresholdInterpolator, negativeInterpolator, negativeThresholdInterpolator } =
    useMemo(() => {
      return {
        positiveInterpolator: interpolate(metricColorScale.positiveColorStops, "oklab"),
        positiveThresholdInterpolator: interpolate(metricColorScale.positiveThresholdColorStops, "oklab"),
        negativeInterpolator: metricConfig.positiveOnly
          ? interpolate(["magenta"], "oklab")
          : interpolate(metricColorScale.negativeColorStops, "oklab"),
        negativeThresholdInterpolator: metricConfig.positiveOnly
          ? interpolate(["magenta"], "oklab")
          : interpolate(metricColorScale.negativeThresholdColorStops, "oklab"),
      };
    }, [metricConfig, metricColorScale]);

  const maxValue = useMemo(() => {
    return metricConfig.getPrecomputedMax(animationData.precomputed);
  }, [animationData.precomputed, metricConfig]);

  const thresholdValue = useMemo(() => {
    return thresholds[metricConfig.thresholdKey];
  }, [thresholds, metricConfig]);

  const getNodeColor = useCallback(
    (nodeId: number, frameIndex: number): THREE.Color => {
      if (maxValue === 0) return grayColor;

      const value = metricConfig.getValue(animationData, frameIndex, nodeId);
      if (value === undefined) return grayColor;

      const negative = value < 0;
      const normalizedValue = Math.min(1, Math.max(0, Math.abs(value / maxValue)));
      const normalizedThreshold = Math.min(1, Math.max(0, thresholdValue / maxValue));

      let rgbColor: [number, number, number];

      if (normalizedValue === 0) {
        rgbColor = [1, 1, 1];
      } else {
        let t: number = normalizedValue;
        let interpolator: (t: number) => FindColorByMode<"oklab">;

        if (negative) interpolator = negativeInterpolator;
        else interpolator = positiveInterpolator;

        if (thresholdHighlighting) {
          if (normalizedValue < normalizedThreshold) {
            t = normalizedValue / normalizedThreshold;
          } else {
            t = (normalizedValue - normalizedThreshold) / (1 - normalizedThreshold);
            if (negative) interpolator = negativeThresholdInterpolator;
            else interpolator = positiveThresholdInterpolator;
          }
        }

        rgbColor = interpolateColor(interpolator, t);
      }

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
    ]
  );

  const availableMetrics = useMemo((): Metric[] => {
    return (Object.keys(METRIC_CONFIGS) as Metric[]).filter((metric) =>
      METRIC_CONFIGS[metric].isAvailable(animationData)
    );
  }, [animationData]);

  return {
    currentMetric,
    setColorMetric,
    metricPaletteOverrides,
    setMetricPalette,
    getNodeColor,
    availableMetrics,
    thresholdHighlighting,
    setThresholdHighlighting,
  };
}
