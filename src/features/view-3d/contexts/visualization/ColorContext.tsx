import { useAnimationData } from "@/lib/useAnimationData";
import { interpolateColor } from "@/lib/colors";
import { useViewStore } from "@/state";
import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { useThresholds } from "./ThresholdContext";
import { getMetricConfig, METRIC_CONFIGS, type Metric } from "@/lib/metrics";
import { interpolate } from "culori";
import type { FindColorByMode } from "node_modules/@types/culori/src/common";

const grayColor = new THREE.Color(0.5, 0.5, 0.5);

interface ColorContextType {
  currentMetric: Metric;
  setColorMetric: (metric: Metric) => void;
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
  const thresholdHighlighting = useViewStore((s) => s.thresholdHighlighting);
  const setThresholdHighlighting = useViewStore((s) => s.setThresholdHighlighting);

  const metricConfig = useMemo(() => getMetricConfig(currentMetric), [currentMetric]);

  const { positiveInterpolator, positiveThresholdInterpolator, negativeInterpolator, negativeThresholdInterpolator } =
    useMemo(() => {
      return {
        positiveInterpolator: interpolate(
          [metricConfig.positiveColorStops[0], metricConfig.positiveColorStops[1]],
          "oklab",
        ),
        positiveThresholdInterpolator: interpolate(
          [metricConfig.positiveColorStops[2], metricConfig.positiveColorStops[3]],
          "oklab",
        ),
        negativeInterpolator: metricConfig.positiveOnly
          ? interpolate(["magenta"], "oklab")
          : interpolate([metricConfig.negativeColorStops[0], metricConfig.negativeColorStops[1]], "oklab"),
        negativeThresholdInterpolator: metricConfig.positiveOnly
          ? interpolate(["magenta"], "oklab")
          : interpolate([metricConfig.negativeColorStops[2], metricConfig.negativeColorStops[3]], "oklab"),
      };
    }, [metricConfig]);

  const maxValue = useMemo(() => {
    return metricConfig.getPrecomputedMax(animationData.precomputed);
  }, [animationData.precomputed, metricConfig]);

  const thresholdValue = useMemo(() => {
    return thresholds[metricConfig.metric];
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
    ],
  );

  const availableMetrics = useMemo((): Metric[] => {
    return (Object.keys(METRIC_CONFIGS) as Metric[]).filter((metric) =>
      METRIC_CONFIGS[metric].isAvailable(animationData),
    );
  }, [animationData]);

  return {
    currentMetric,
    setColorMetric,
    getNodeColor,
    availableMetrics,
    thresholdHighlighting,
    setThresholdHighlighting,
  };
}
