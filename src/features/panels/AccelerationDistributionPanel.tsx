import { HistogramChart } from "@/features/panels/HistogramChart";
import type { Metric } from "@/lib/metrics";
import type { IDockviewPanelProps } from "dockview";

const ACCELERATION_METRICS: Metric[] = ["accelerationMag", "accelerationX", "accelerationY", "accelerationZ"];

export function AccelerationDistributionPanel({ api }: IDockviewPanelProps) {
  return (
    <HistogramChart
      api={api}
      title="Acceleration Distribution"
      initialMetric="accelerationMag"
      metricOptions={ACCELERATION_METRICS}
    />
  );
}
