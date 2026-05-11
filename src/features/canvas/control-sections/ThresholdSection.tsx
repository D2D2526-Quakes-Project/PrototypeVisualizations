import { useAnimationData } from "@/features/animation-data/useAnimationData";
import {
  getMetricsForThreshold,
  getThresholdConfig,
  METRIC_CONFIGS,
  THRESHOLD_KEY_ORDER,
} from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { useThresholds } from "@/features/metrics/useThresholds";
import { RotateCcw, Sliders } from "lucide-react";
import { useMemo } from "react";
import { ThresholdSlider } from "./ThresholdSlider";
import { Button } from "@/components/ui/button";

export function ThresholdSection() {
  const { animationData } = useAnimationData();
  const { currentMetricConfig } = useMetrics();
  const { thresholds, setThreshold, resetThresholds } = useThresholds();
  const thresholdRows = useMemo(
    () =>
      THRESHOLD_KEY_ORDER.filter((thresholdKey) => getThresholdConfig(thresholdKey).isAvailable(animationData)).map(
        (thresholdKey) => {
          const config = getThresholdConfig(thresholdKey);
          const metrics = getMetricsForThreshold(thresholdKey);
          return {
            key: thresholdKey,
            label: config.label,
            unit: config.unit,
            max: Math.max(config.getPrecomputedMax(animationData), thresholds[thresholdKey] || 0, 0),
            tooltip: `Used for: ${metrics.map((metric) => METRIC_CONFIGS[metric].label).join(", ")}`,
          };
        }
      ),
    [animationData, thresholds]
  );

  return (
    <div className="space-y-1">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Sliders size={12} className="text-neutral-500" />
          <span className="text-xs font-medium text-neutral-700">Thresholds</span>
        </div>
        <Button onClick={resetThresholds} variant="outline" title="Reset all thresholds to default values" size="xs">
          <RotateCcw size={10} />
          Reset
        </Button>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] gap-1">
        {thresholdRows.map((row) => (
          <ThresholdSlider
            key={row.key}
            label={row.label}
            value={thresholds[row.key]}
            unit={row.unit}
            onChange={(value) => setThreshold(row.key, value)}
            max={row.max}
            tooltip={row.tooltip}
            currentlyUsed={row.key == currentMetricConfig.thresholdKey}
          />
        ))}
      </div>
    </div>
  );
}
