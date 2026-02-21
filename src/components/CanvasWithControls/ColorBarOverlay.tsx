import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getMetricConfig, type Metric } from "@/lib/metrics";
import type { ComputedStats } from "@/lib/types";
import type { ThresholdState } from "@/stores";
import { ColorScaleBarVertical } from "./ColorScaleBar";

interface ColorBarOverlayProps {
  currentMetric: Metric;
  thresholdHighlighting: boolean;
  thresholds: ThresholdState;
  animationData: {
    precomputed: ComputedStats;
  };
}

export function ColorBarOverlay({
  currentMetric,
  thresholdHighlighting,
  thresholds,
  animationData,
}: ColorBarOverlayProps) {
  const config = getMetricConfig(currentMetric);
  const maxValue = config.getPrecomputedMax(animationData.precomputed);
  const unit = config.unit;
  const positiveOnly = config.positiveOnly;

  const thresholdValue = thresholds[currentMetric] ?? 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="absolute left-3 flex flex-col gap-1.5 top-1/2 -translate-y-1/2 z-40 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-200 p-2 h-48">
          <ColorScaleBarVertical
            currentMetric={currentMetric}
            thresholdHighlighting={thresholdHighlighting}
            thresholds={thresholds}
            animationData={animationData}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <div className="font-semibold mb-1">{config.label}</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span className="text-neutral-400">Max:</span>
          <span>
            {positiveOnly ? maxValue.toFixed(2) : `+${maxValue.toFixed(2)}`} {unit.abbr}
          </span>
          <span className="text-neutral-400">Min:</span>
          <span>
            {positiveOnly ? "0" : `-${maxValue.toFixed(2)}`} {unit.abbr}
          </span>
          {thresholdHighlighting && thresholdValue > 0 && (
            <>
              <span className="text-neutral-400">Threshold:</span>
              <span>
                {thresholdValue.toFixed(2)} {unit.abbr}
              </span>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
