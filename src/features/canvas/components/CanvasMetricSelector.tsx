import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { METRIC_CONFIGS, type Metric } from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { PaletteIcon } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { ColorScaleBar } from "../components/ColorScaleBar";

export function CanvasMetricSelector() {
  const { currentMetric, setCurrentMetric, availableMetrics, thresholdHighlighting, setThresholdHighlighting } =
    useMetrics();

  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="border-border bg-background pointer-events-auto flex w-58 flex-col rounded-lg border p-1.25 pb-1 shadow-lg select-none"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}>
      <motion.div
        className="flex items-center gap-1 px-1"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: hovering ? "auto" : 0, opacity: hovering ? 1 : 0 }}
        exit={{ height: 0, opacity: 0 }}>
        <PaletteIcon size={12} className="text-muted-foreground" />
        <span className="text-foreground text-xs font-medium">Color By</span>
        <div className="mb-1 flex flex-1 items-center justify-end gap-2">
          <Label className="text-muted-foreground text-xs font-normal">
            Show Threshold
            <Switch size="sm" checked={thresholdHighlighting} onCheckedChange={setThresholdHighlighting} />
          </Label>
        </div>
      </motion.div>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: hovering ? "auto" : 0, opacity: hovering ? 1 : 0 }}
        exit={{ height: 0, opacity: 0 }}>
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
      </motion.div>

      <motion.span
        className="text-muted-foreground px-1 text-xs"
        initial={{ height: "auto", opacity: 1 }}
        animate={{ height: hovering ? 0 : "auto", opacity: hovering ? 0 : 1 }}
        exit={{ height: "auto", opacity: 1 }}>
        {METRIC_CONFIGS[currentMetric].label}
      </motion.span>

      <div className="">
        <ColorScaleBar insideLabel />
      </div>
    </div>
  );
}
