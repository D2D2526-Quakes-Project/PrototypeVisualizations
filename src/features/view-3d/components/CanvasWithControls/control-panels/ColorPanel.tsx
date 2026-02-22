import { Switch } from "@/components/ui/switch";
import { Palette } from "lucide-react";
import { ColorScaleBar } from "../ColorScaleBar";

import type { ComputedStats } from "@/lib/types";
import type { ThresholdState } from "@/state";
import { METRIC_CONFIGS, type Metric } from "@/lib/metrics";

interface ColorPanelProps {
  currentMetric: Metric;
  setColorMetric: (metric: Metric) => void;
  availableMetrics: Metric[];
  thresholdHighlighting: boolean;
  setThresholdHighlighting: (enabled: boolean) => void;
  thresholds: ThresholdState;
  animationData: {
    precomputed: ComputedStats;
  };
}

export function ColorPanel({
  currentMetric,
  setColorMetric,
  availableMetrics,
  thresholdHighlighting,
  setThresholdHighlighting,
  thresholds,
  animationData,
}: ColorPanelProps) {
  return (
    <>
      <div className="flex items-center gap-1 mb-1">
        <Palette size={12} className="text-neutral-500" />
        <span className="text-xs font-medium text-neutral-700">Color By</span>
      </div>
      <select
        value={currentMetric}
        onChange={(e) => setColorMetric(e.target.value as Metric)}
        className="w-full text-xs px-2 py-1 bg-neutral-100 border border-neutral-300 rounded hover:bg-neutral-200 transition-colors cursor-pointer">
        {availableMetrics.map((metric) => (
          <option key={metric} value={metric}>
            {METRIC_CONFIGS[metric].label}
          </option>
        ))}
      </select>

      <div className="mt-2">
        <div className="flex items-center gap-2 justify-between mb-1">
          <div className="text-[10px] text-neutral-500">Color Scale</div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500">Show Threshold</span>
            <Switch size="sm" checked={thresholdHighlighting} onCheckedChange={setThresholdHighlighting} />
          </div>
        </div>
        <ColorScaleBar
          currentMetric={currentMetric}
          thresholdHighlighting={thresholdHighlighting}
          thresholds={thresholds}
          animationData={animationData}
        />
      </div>
    </>
  );
}
