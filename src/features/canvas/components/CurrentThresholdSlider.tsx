import { Slider } from "@/components/ui/slider";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { getThresholdConfig } from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { useThresholds } from "@/features/metrics/useThresholds";

export function CurrentThresholdSlider() {
  const { animationData } = useAnimationData();
  const { currentMetricConfig } = useMetrics();
  const { thresholds, setThreshold } = useThresholds();

  const config = getThresholdConfig(currentMetricConfig.thresholdKey);
  const max = Math.max(config.getPrecomputedMax(animationData), thresholds[currentMetricConfig.thresholdKey] || 0, 0);
  const value = thresholds[currentMetricConfig.thresholdKey];

  return (
    <div className="pointer-events-auto flex origin-right items-center gap-0.5 rounded-lg border border-neutral-200 bg-white/90 px-1.5 py-1 shadow-lg backdrop-blur-sm select-none">
      <div className="grid grid-cols-[1fr_auto] gap-1">
        <div className="border-border flex w-full min-w-32 items-center border-r py-1 pr-2">
          <Slider
            value={[value, max]}
            onValueChange={(val) => setThreshold(currentMetricConfig.thresholdKey, val[0])}
            max={max}
            step={0.01}
          />
        </div>
        <span className="min-w-10 text-right text-xs text-neutral-500">
          <UnitTooltip value={value} unit={config.unit.label} decimals={2} />
        </span>
      </div>
    </div>
  );
}
