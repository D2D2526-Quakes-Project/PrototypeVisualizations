import { HistogramChart } from "@/features/view-3d/panels/HistogramChart";
import type { Metric } from "@/lib/metrics";

const ACCELERATION_METRICS: Metric[] = ["accelerationMag", "accelerationX", "accelerationY", "accelerationZ"];

export function AccelerationDistributionPanel() {
  return (
    <HistogramChart
      title="Acceleration Distribution"
      initialMetric="accelerationMag"
      metricOptions={ACCELERATION_METRICS}
    />
  );
}
