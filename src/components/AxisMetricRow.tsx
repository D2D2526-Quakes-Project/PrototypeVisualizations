import { UnitTooltip } from "@/components/ui/unit-tooltip";
import type { Unit } from "@/features/metrics/metrics";
import { ChartNoAxesCombinedIcon } from "lucide-react";
import { Toggle } from "./ui/toggle";

interface AxisMetricRowProps {
  axis: "X" | "Y" | "Z";
  currentValue: number;
  peakValue: number;
  peakTime: number;
  unit: Unit;
  graphKey: string;
  graphVisible: boolean;
  onToggleGraph: (graphKey: string) => void;
}

export function AxisMetricRow({
  axis,
  currentValue,
  peakValue,
  peakTime,
  unit,
  graphKey,
  graphVisible,
  onToggleGraph,
}: AxisMetricRowProps) {
  return (
    <>
      <div className="grid grid-cols-2 items-end gap-1">
        <span className="text-muted-foreground">Current {axis}:</span>
        <span className="text-foreground flex items-end justify-between font-mono">
          <UnitTooltip value={currentValue} unit={unit} />
          <Toggle
            size="icon-xs"
            pressed={graphVisible}
            onPressedChange={() => onToggleGraph(graphKey)}
            title={graphVisible ? "Hide graph" : "Show graph"}>
            <ChartNoAxesCombinedIcon
              className={`size-4 ${graphVisible ? "text-foreground" : "text-muted-foreground"}`}
            />
          </Toggle>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <span className="text-muted-foreground">Peak {axis}:</span>
        <span className="text-foreground flex items-baseline justify-between font-mono">
          <UnitTooltip value={peakValue} unit={unit} />
          <span className="text-muted-foreground text-[9px]"> @ {peakTime.toFixed(2)} s</span>
        </span>
      </div>
    </>
  );
}
