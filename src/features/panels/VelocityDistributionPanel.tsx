import { HistogramChart } from "@/features/panels/HistogramChart";
import type { Metric } from "@/lib/metrics";
import type { IDockviewPanelProps } from "dockview";

const VELOCITY_METRICS: Metric[] = ["velocityMag", "velocityX", "velocityY", "velocityZ"];

export function VelocityDistributionPanel({ api }: IDockviewPanelProps) {
  return (
    <HistogramChart
      api={api}
      title="Velocity Distribution"
      initialMetric="velocityMag"
      metricOptions={VELOCITY_METRICS}
    />
  );
}
