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

function getScaleStopsAndLabels(
  config: ReturnType<typeof getMetricConfig>,
  maxValue: number,
  positiveOnly: boolean,
  thresholdHighlighting: boolean,
  thresholdValue: number,
) {
  const positiveStops = config.positiveColorStops;
  const negativeStops = (config as { negativeColorStops: [string, string, string, string] }).negativeColorStops;
  const thresholdRatio = maxValue > 0 ? thresholdValue / maxValue : 0;
  const unit = config.unit;

  let stops: string[];
  let labels: {
    min: number;
    max: number;
    threshold?: number;
  } = {
    min: 0,
    max: 0,
    threshold: undefined,
  };

  if (positiveOnly) labels.min = 0;

  if (thresholdHighlighting) {
    labels.threshold = thresholdValue;
    if (positiveOnly) {
      const thresholdPos = thresholdRatio * 100;

      stops = [
        `${positiveStops[0]} 0%`,
        `${positiveStops[1]} ${thresholdPos}%`,
        `${positiveStops[2]} ${thresholdPos}%`,
        `${positiveStops[3]} 100%`,
      ];

      labels.max = maxValue;
    } else {
      const posThresholdPos = thresholdRatio * 50 + 50;
      const negThresholdPos = (1 - thresholdRatio) * 50;

      stops = [
        `${negativeStops[3]} 0%`,
        `${negativeStops[2]} ${negThresholdPos}%`,
        `${negativeStops[1]} ${negThresholdPos}%`,
        `${negativeStops[0]} 50%`,
        `${positiveStops[0]} 50%`,
        `${positiveStops[1]} ${posThresholdPos}%`,
        `${positiveStops[2]} ${posThresholdPos}%`,
        `${positiveStops[3]} 100%`,
      ];

      labels.max = maxValue;
    }
  } else {
    if (positiveOnly) {
      stops = [`${positiveStops[0]} 0%`, `${positiveStops[1]} 100%`];
    } else {
      stops = [
        `${negativeStops[1]} 0%`,
        `${negativeStops[0]} 50%`,
        `${positiveStops[0]} 50%`,
        `${positiveStops[1]} 100%`,
      ];
    }
    labels.max = maxValue;
  }

  return { stops, labels };
}

export function ColorScaleBar({ currentMetric, thresholdHighlighting, thresholds, animationData }: ColorScaleBarProps) {
  const config = getMetricConfig(currentMetric);
  const maxValue = config.getPrecomputedMax(animationData.precomputed);
  const positiveOnly = config.positiveOnly;
  const thresholdValue = thresholds[currentMetric] ?? 0;

  const { stops, labels } = getScaleStopsAndLabels(
    config,
    maxValue,
    positiveOnly,
    thresholdHighlighting,
    thresholdValue,
  );

  return (
    <>
      <div
        className="relative h-3 rounded-sm"
        style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}></div>
      <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">
        <span>
          {labels.min.toFixed(2)} {config.unit.abbr}
        </span>
        {labels.threshold && (
          <span>
            {labels.threshold.toFixed(2)} {config.unit.abbr}
          </span>
        )}
        <span>
          {labels.max.toFixed(2)} {config.unit.abbr}
        </span>
      </div>
    </>
  );
}

export function ColorScaleBarVertical({
  currentMetric,
  thresholdHighlighting,
  thresholds,
  animationData,
}: ColorScaleBarProps) {
  const config = getMetricConfig(currentMetric);
  const maxValue = config.getPrecomputedMax(animationData.precomputed);
  const positiveOnly = config.positiveOnly;
  const thresholdValue = thresholds[currentMetric] ?? 0;

  const { stops, labels } = getScaleStopsAndLabels(
    config,
    maxValue,
    positiveOnly,
    thresholdHighlighting,
    thresholdValue,
  );

  return (
    <div className="flex flex-col flex-1 text-[9px] text-neutral-400">
      <span>
        {labels.min.toFixed(2)} {config.unit.abbr}
      </span>
      <div className="flex items-center flex-1 gap-1">
        <div
          className="relative h-full w-3 rounded-sm"
          style={{ background: `linear-gradient(to top, ${stops.join(", ")})` }}
        />
        {labels.threshold && (
          <span>
            {labels.threshold.toFixed(2)} {config.unit.abbr}
          </span>
        )}
      </div>
      <span>
        {labels.max.toFixed(2)} {config.unit.abbr}
      </span>
    </div>
  );
}
