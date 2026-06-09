import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { METRIC_CONFIGS, type Metric } from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { PaletteIcon } from "lucide-react";
import { ColorScaleBar } from "../components/ColorScaleBar";

export function MetricSelectSection() {
  const {
    currentMetric,
    setCurrentMetric,
    availableMetrics,
    thresholdHighlighting,
    setThresholdHighlighting,
    isCurrentMetricAvailable,
  } = useMetrics();

  return (
    <>
      <div className="mb-1 flex items-center gap-1">
        <PaletteIcon size={12} className="text-muted-foreground" />
        <span className="text-foreground text-xs font-medium">Color By</span>
        <div className="flex flex-1 items-center justify-end gap-2">
          <Label className="text-muted-foreground text-xs font-normal">
            Show Threshold
            <Switch
              size="sm"
              checked={thresholdHighlighting}
              onCheckedChange={setThresholdHighlighting}
              disabled={!isCurrentMetricAvailable}
            />
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
        {!isCurrentMetricAvailable && (
          <NativeSelectOption value={currentMetric} disabled>
            {METRIC_CONFIGS[currentMetric].label} — not loaded
          </NativeSelectOption>
        )}
      </NativeSelect>

      <div className="mt-1">
        <ColorScaleBar />
      </div>
    </>
  );
}
