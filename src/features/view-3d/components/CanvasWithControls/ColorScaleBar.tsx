import { getMetricConfig, type Metric } from "@/lib/metrics";
import type { ComputedStats } from "@/lib/types";
import type { ThresholdState } from "@/state";

interface ColorScaleBarProps {
  currentMetric: Metric;
  thresholdHighlighting: boolean;
  thresholds: ThresholdState;
  animationData: {
    precomputed: ComputedStats;
  };
  noLabel?: boolean;
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

  let stops: string[];
  const labels: Array<{ value: number; positionPct: number }> = [];

  if (thresholdHighlighting) {
    if (positiveOnly) {
      const thresholdPos = thresholdRatio * 100;

      stops = [
        `${positiveStops[0]} 0%`,
        `${positiveStops[1]} ${thresholdPos}%`,
        `${positiveStops[2]} ${thresholdPos}%`,
        `${positiveStops[3]} 100%`,
      ];
      labels.push({ value: 0, positionPct: 0 });
      labels.push({ value: thresholdValue, positionPct: thresholdPos });
      labels.push({ value: maxValue, positionPct: 100 });
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
      labels.push({ value: -maxValue, positionPct: 0 });
      labels.push({ value: 0, positionPct: 50 });
      labels.push({ value: thresholdValue, positionPct: 75 });
      labels.push({ value: maxValue, positionPct: 100 });
    }
  } else {
    if (positiveOnly) {
      stops = [`${positiveStops[0]} 0%`, `${positiveStops[1]} 100%`];
      labels.push({ value: 0, positionPct: 0 });
      labels.push({ value: maxValue, positionPct: 100 });
    } else {
      stops = [
        `${negativeStops[1]} 0%`,
        `${negativeStops[0]} 50%`,
        `${positiveStops[0]} 50%`,
        `${positiveStops[1]} 100%`,
      ];
      labels.push({ value: -maxValue, positionPct: 0 });
      labels.push({ value: 0, positionPct: 50 });
      labels.push({ value: maxValue, positionPct: 100 });
    }
  }

  return { stops, labels };
}

export function ColorScaleBar({
  currentMetric,
  thresholdHighlighting,
  thresholds,
  animationData,
  noLabel,
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
    <>
      <div
        className="relative h-3 rounded-sm flex-1 w-full"
        style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}></div>
      {!noLabel && (
        <div className="relative h-3 mt-0.5">
          {labels.map((label, index) => (
            <span
              key={`${label.positionPct}-${index}`}
              className={`absolute text-[9px] text-neutral-400 ${
                label.positionPct === 0
                  ? "left-0 -translate-x-0"
                  : label.positionPct === 100
                    ? "left-full -translate-x-full"
                    : "-translate-x-1/2"
              }`}
              style={{ left: `${label.positionPct}%` }}>
              {label.value.toFixed(2)} {config.unit.abbr}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
