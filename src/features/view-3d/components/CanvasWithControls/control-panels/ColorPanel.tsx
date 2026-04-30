import { Switch } from "@/components/ui/switch";
import { Palette } from "lucide-react";
import { ColorScaleBar } from "../ColorScaleBar";

import { useColor } from "@/features/view-3d/contexts/visualization";
import { METRIC_CONFIGS, type Metric } from "@/lib/metrics";

export function ColorPanel() {
  const {
    currentMetric,
    setColorMetric,
    metricPaletteOverrides,
    availableMetrics,
    thresholdHighlighting,
    setThresholdHighlighting,
  } = useColor();

  return (
    <>
      <div className="mb-1 flex items-center gap-1">
        <Palette size={12} className="text-neutral-500" />
        <span className="text-xs font-medium text-neutral-700">Color By</span>
      </div>
      <select
        value={currentMetric}
        onChange={(e) => setColorMetric(e.target.value as Metric)}
        className="w-full cursor-pointer rounded border border-neutral-300 bg-neutral-100 px-2 py-1 text-xs transition-colors hover:bg-neutral-200">
        {availableMetrics.map((metric) => (
          <option key={metric} value={metric}>
            {METRIC_CONFIGS[metric].label}
          </option>
        ))}
      </select>

      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="text-[10px] text-neutral-500">Color Scale</div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500">Show Threshold</span>
            <Switch
              size="sm"
              checked={thresholdHighlighting}
              onCheckedChange={setThresholdHighlighting}
            />
          </div>
        </div>
        <ColorScaleBar
          currentMetric={currentMetric}
          metricPaletteOverrides={metricPaletteOverrides}
          thresholdHighlighting={thresholdHighlighting}
        />
      </div>
    </>
  );
}
