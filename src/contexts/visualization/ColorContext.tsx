import { useAnimationData } from "@/hooks/nodeDataHook";
import { createInterpolator, interpolateColor } from "@/lib/colors";
import { useViewStore } from "@/stores";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useThresholds } from "./ThresholdContext";
import { getMetricConfig, METRIC_CONFIGS, type Metric } from "@/lib/metrics";

const grayColor = new THREE.Color(0.5, 0.5, 0.5);

interface ColorContextType {
  currentMetric: Metric;
  setColorMetric: (metric: Metric) => void;
  getNodeColor: (nodeId: number, frameIndex: number) => THREE.Color;
  availableMetrics: Metric[];
  thresholdHighlighting: boolean;
  setThresholdHighlighting: (enabled: boolean) => void;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export function useColor() {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error("useColor must be used within ColorProvider");
  }
  return context;
}

export function ColorProvider({ children }: { children: ReactNode }) {
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
        positiveInterpolator: createInterpolator(metricConfig.positiveColorStops),
        positiveThresholdInterpolator: createInterpolator(metricConfig.positiveColorStops),
        negativeInterpolator: metricConfig.positiveOnly ? null : createInterpolator(metricConfig.negativeColorStops),
        negativeThresholdInterpolator: metricConfig.positiveOnly
          ? null
          : createInterpolator(metricConfig.negativeColorStops),
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

      let value = metricConfig.getValue(animationData, frameIndex, nodeId);
      if (value === undefined) return grayColor;

      const normalizedValue = value / maxValue;
      const normalizedThreshold = thresholdValue / maxValue;

      let rgbColor;
      if (normalizedValue < 0 && negativeInterpolator && negativeThresholdInterpolator) {
        rgbColor = interpolateColor(
          negativeInterpolator,
          negativeThresholdInterpolator,
          normalizedValue,
          normalizedThreshold,
        );
      } else {
        rgbColor = interpolateColor(
          positiveInterpolator,
          positiveThresholdInterpolator,
          normalizedValue,
          normalizedThreshold,
        );
      }
      return new THREE.Color(rgbColor[0], rgbColor[1], rgbColor[2]);
    },
    [
      animationData,
      currentMetric,
      maxValue,
      positiveInterpolator,
      negativeInterpolator,
      thresholdHighlighting,
      thresholdValue,
    ],
  );

  const availableMetrics = useMemo((): Metric[] => {
    return (Object.keys(METRIC_CONFIGS) as Metric[]).filter((metric) =>
      METRIC_CONFIGS[metric].isAvailable(animationData),
    );
  }, [animationData]);

  const value: ColorContextType = {
    currentMetric,
    setColorMetric,
    getNodeColor,
    availableMetrics,
    thresholdHighlighting,
    setThresholdHighlighting,
  };

  return <ColorContext.Provider value={value}>{children}</ColorContext.Provider>;
}
