import { useAnimationData } from "@/features/animation-data/useAnimationData";
import {
  getMetricsForThreshold,
  getThresholdConfig,
  METRIC_CONFIGS,
  THRESHOLD_KEY_ORDER,
  type UnitConfig,
} from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { useThresholds } from "@/features/metrics/useThresholds";
import { RotateCcw, Sliders } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { formatNumber } from "@/lib/utils";

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
          <Sliders size={12} className="text-muted-foreground" />
          <span className="text-foreground text-xs font-medium">Thresholds</span>
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

interface ThresholdSliderProps {
  label: string;
  value: number;
  unit: UnitConfig;
  onChange: (value: number) => void;
  max?: number;
  tooltip?: string;
  currentlyUsed?: boolean;
}

export function ThresholdSlider({
  label,
  value,
  unit,
  onChange,
  max = 1,
  tooltip,
  currentlyUsed = false,
}: ThresholdSliderProps) {
  return (
    <div className={`col-span-3 grid grid-cols-subgrid items-center gap-2 ${currentlyUsed ? "" : "opacity-50"}`}>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground text-xs">{label}</span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          {tooltip}
          <br />
          Currently: {formatNumber(value, 2)} {unit.abbr}
        </TooltipContent>
      </Tooltip>

      <div className="border-border flex min-w-32 items-center border-x px-2 py-1">
        <Slider value={[value, max]} onValueChange={(val) => onChange(val[0])} max={max} step={0.01} />
      </div>
      <span className="text-muted-foreground text-right text-xs">
        <UnitTooltip value={value} unit={unit.label} decimals={2} />
      </span>
    </div>
  );
}
