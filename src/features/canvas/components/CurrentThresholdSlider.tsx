import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { getThresholdConfig } from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { useThresholds } from "@/features/metrics/useThresholds";
import { useLiveStore } from "@/state";
import { motion } from "motion/react";
import { useState } from "react";

export function CurrentThresholdSlider() {
  const { animationData } = useAnimationData();
  const { currentMetricConfig } = useMetrics();
  const { thresholds, setThreshold } = useThresholds();
  const setMetricColorsDrawerOpen = useLiveStore((s) => s.setMetricColorsDrawerOpen);

  const config = getThresholdConfig(currentMetricConfig.thresholdKey);
  const max = Math.max(config.getPrecomputedMax(animationData), thresholds[currentMetricConfig.thresholdKey] || 0, 0);
  const value = thresholds[currentMetricConfig.thresholdKey];

  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="pointer-events-auto flex origin-right items-center gap-0.5"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}>
      <motion.div
        className="whitespace-nowrap"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: hovering ? "auto" : 0, opacity: hovering ? 1 : 0 }}
        exit={{ width: 0, opacity: 0 }}>
        <Button variant="outline" size="xs" className="shadow-lg" onClick={() => setMetricColorsDrawerOpen(true)}>
          View All
        </Button>
      </motion.div>
      <div className="border-border bg-background grid grid-cols-[1fr_auto] gap-1 rounded-lg border px-1.5 py-1 shadow-lg select-none">
        <div className="border-border flex w-full min-w-32 items-center border-r py-1 pr-2">
          <Slider
            value={[value, max]}
            onValueChange={(val) => setThreshold(currentMetricConfig.thresholdKey, val[0])}
            max={max}
            step={0.01}
          />
        </div>
        <span className="text-muted-foreground min-w-10 text-right text-xs">
          <UnitTooltip value={value} unit={config.unit.label} decimals={2} />
        </span>
      </div>
    </div>
  );
}
