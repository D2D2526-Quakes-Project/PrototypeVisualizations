import { HistogramChart } from "@/features/view-3d/panels/HistogramChart";
import type { Metric } from "@/lib/metrics";

const VELOCITY_METRICS: Metric[] = ["velocityMag", "velocityX", "velocityY", "velocityZ"];

export function VelocityDistributionPanel() {
  return <HistogramChart title="Velocity Distribution" initialMetric="velocityMag" metricOptions={VELOCITY_METRICS} />;
}
