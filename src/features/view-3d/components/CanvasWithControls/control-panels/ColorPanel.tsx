import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette } from "lucide-react";
import { ColorScaleBar } from "../ColorScaleBar";

import type { ComputedStats } from "@/lib/types";
import type { ThresholdState } from "@/state";
import {
  getMetricColorScale,
  METRIC_CONFIGS,
  METRIC_PALETTES,
  type Metric,
  type MetricPaletteKey,
  type MetricPaletteOverrides,
} from "@/lib/metrics";

interface ColorPanelProps {
  currentMetric: Metric;
  setColorMetric: (metric: Metric) => void;
  metricPaletteOverrides: MetricPaletteOverrides;
  setMetricPalette: (metric: Metric, palette: MetricPaletteKey | null) => void;
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
  metricPaletteOverrides,
  setMetricPalette,
  availableMetrics,
  thresholdHighlighting,
  setThresholdHighlighting,
  thresholds,
  animationData,
}: ColorPanelProps) {
  const activePalette = getMetricColorScale(currentMetric, metricPaletteOverrides);
  const metricConfig = METRIC_CONFIGS[currentMetric];

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
            <Switch size="sm" checked={thresholdHighlighting} onCheckedChange={setThresholdHighlighting} />
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full rounded border border-transparent text-left transition-colors hover:border-neutral-200"
              title={`Choose ${metricConfig.label.toLowerCase()} palette`}>
              <ColorScaleBar
                currentMetric={currentMetric}
                metricPaletteOverrides={metricPaletteOverrides}
                thresholdHighlighting={thresholdHighlighting}
                thresholds={thresholds}
                animationData={animationData}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <div className="grid grid-cols-1 gap-1.5">
              {(Object.entries(METRIC_PALETTES) as Array<[MetricPaletteKey, (typeof METRIC_PALETTES)[MetricPaletteKey]]>).map(
                ([paletteKey, palette]) => {
                const isActive = activePalette.paletteKey === paletteKey;
                return (
                  <button
                    key={paletteKey}
                    type="button"
                    onClick={() => setMetricPalette(currentMetric, paletteKey === metricConfig.defaultPalette ? null : paletteKey)}
                    className={`rounded border p-1 transition-colors ${
                      isActive ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                    title={`Use ${palette.label.toLowerCase()} palette`}>
                    <div
                      className="h-3 w-full rounded-sm"
                      style={{ background: `linear-gradient(to right, ${palette.positiveColorStops.join(", ")})` }}
                    />
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
