import { getMetricConfig, type Metric } from "@/lib/metrics";
import type { ComputedStats } from "@/lib/types";
import type { ThresholdState } from "@/stores";

interface ColorScaleBarProps {
  currentMetric: Metric;
  thresholdHighlighting: boolean;
  thresholds: ThresholdState;
  animationData: {
    precomputed: ComputedStats;
  };
}

export function ColorScaleBar({ currentMetric, thresholdHighlighting, thresholds, animationData }: ColorScaleBarProps) {
  const config = getMetricConfig(currentMetric);
  const maxValue = config.getPrecomputedMax(animationData.precomputed);
  const unit = config.unit;
  const positiveOnly = config.positiveOnly;

  const displayMax = maxValue * 1.2;

  let stops: string[];
  let labels: React.ReactNode;

  if (thresholdHighlighting) {
    const thresholdValue = thresholds[currentMetric] ?? 0;
    const thresholdRatio = maxValue > 0 ? thresholdValue / maxValue : 0;

    const positiveStops = config.positiveColorStops;

    if (positiveOnly) {
      const thresholdPos = thresholdRatio * 100;
      stops = [
        `${positiveStops[0]} 0%`,
        `${positiveStops[1]} ${thresholdPos}%`,
        `${positiveStops[2]} ${thresholdPos}%`,
        `${positiveStops[3]} 100%`,
      ];
    } else {
      const negativeStops = config.negativeColorStops;
      const posThresholdPos = thresholdRatio * 50 + 50;
      const negThresholdPos = (1 - thresholdRatio) * 50;

      stops = [
        `${negativeStops[0]} 0%`,
        `${negativeStops[1]} ${negThresholdPos}%`,
        `${negativeStops[2]} ${negThresholdPos}%`,
        `${negativeStops[3]} 50%`,
        `${positiveStops[0]} 50%`,
        `${positiveStops[1]} ${posThresholdPos}%`,
        `${positiveStops[2]} ${posThresholdPos}%`,
        `${positiveStops[3]} 100%`,
      ];
    }

    labels = (
      <>
        <span>0</span>
        <span>
          {thresholdValue.toFixed(2)} {unit}
        </span>
        <span>{displayMax.toFixed(2)}</span>
      </>
    );
  } else {
    const positiveStops = config.positiveColorStops;

    if (positiveOnly) {
      stops = [`${positiveStops[0]} 0%`, `${positiveStops[1]} 100%`];
    } else {
      const negativeStops = config.negativeColorStops;

      stops = [
        `${negativeStops[2]} 0%`,
        `${negativeStops[3]} 50%`,
        `${positiveStops[0]} 50%`,
        `${positiveStops[1]} 100%`,
      ];
    }

    labels = (
      <>
        <span>0</span>
        <span>
          {maxValue.toFixed(2)} {unit}
        </span>
      </>
    );
  }

  return (
    <>
      <div
        className="relative h-3 rounded-sm"
        style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}></div>
      <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">{labels}</div>
    </>
  );
}
