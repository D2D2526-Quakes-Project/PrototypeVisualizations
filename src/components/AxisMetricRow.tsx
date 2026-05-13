import { UnitTooltip } from "@/components/ui/unit-tooltip";
import type { Unit } from "@/features/metrics/metrics";
import { ChartNoAxesCombinedIcon } from "lucide-react";

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
      <div className="grid grid-cols-2 gap-1">
        <span className="text-neutral-600">Current {axis}:</span>
        <span className="flex items-end justify-between font-mono text-neutral-800">
          <UnitTooltip value={currentValue} unit={unit} />
          <button
            onClick={() => onToggleGraph(graphKey)}
            className="rounded p-0.5 transition-colors hover:bg-neutral-200"
            title={graphVisible ? "Hide graph" : "Show graph"}>
            <ChartNoAxesCombinedIcon className={`size-4 ${graphVisible ? "text-blue-500" : "text-neutral-300"}`} />
          </button>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <span className="text-neutral-600">Peak {axis}:</span>
        <span className="flex items-baseline justify-between font-mono text-neutral-800">
          <UnitTooltip value={peakValue} unit={unit} />
          <span className="text-[9px] text-neutral-500"> @ {peakTime.toFixed(2)} s</span>
        </span>
      </div>
    </>
  );
}
