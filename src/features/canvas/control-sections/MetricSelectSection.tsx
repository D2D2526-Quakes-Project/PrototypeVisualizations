import { Switch } from "@/components/ui/switch";

import { ColorScaleBar } from "../components/ColorScaleBar";
import { useMetrics } from "@/features/metrics/useMetrics";
import { METRIC_CONFIGS, type Metric } from "@/features/metrics/metrics";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PaletteIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

export function MetricSelectSection() {
  const { currentMetric, setCurrentMetric, availableMetrics, thresholdHighlighting, setThresholdHighlighting } =
    useMetrics();

  return (
    <>
      <div className="mb-1 flex items-center gap-1">
        <PaletteIcon size={12} className="text-neutral-500" />
        <span className="text-xs font-medium text-neutral-700">Color By</span>
        <div className="flex flex-1 items-center justify-end gap-2">
          <Label className="text-xs font-normal text-neutral-500">
            Show Threshold
            <Switch size="sm" checked={thresholdHighlighting} onCheckedChange={setThresholdHighlighting} />
          </Label>
        </div>
      </div>

      <NativeSelect
        value={currentMetric}
        onChange={(e) => setCurrentMetric(e.target.value as Metric)}
        className="w-full">
        {availableMetrics.map((metric) => (
          <NativeSelectOption key={metric} value={metric}>
            {METRIC_CONFIGS[metric].label}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <div className="mt-1">
        <ColorScaleBar />
      </div>
    </>
  );
}
