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

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function formatScaleValue(value: number, unitAbbr: string) {
  return `${value.toFixed(2)} ${unitAbbr}`;
}

function LabelBox({ value, underlined = false }: { value: string; underlined?: boolean }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap font-mono text-[9px] leading-none text-neutral-400 ${
        underlined ? "border-b border-current pb-px text-neutral-500" : ""
      }`}>
      {value}
    </span>
  );
}

function getScaleStopsAndLabels(
  config: ReturnType<typeof getMetricConfig>,
  maxValue: number,
  positiveOnly: boolean,
  thresholdHighlighting: boolean,
  thresholdValue: number
) {
  const positiveStops = config.positiveColorStops;
  const negativeStops = (config as { negativeColorStops: [string, string, string, string] }).negativeColorStops;
  const thresholdRatio = clamp01(maxValue > 0 ? thresholdValue / maxValue : 0);

  let stops: string[];

  if (thresholdHighlighting) {
    if (positiveOnly) {
      const thresholdPos = thresholdRatio * 100;

      stops = [
        `${positiveStops[0]} 0%`,
        `${positiveStops[1]} ${thresholdPos}%`,
        `${positiveStops[2]} ${thresholdPos}%`,
        `${positiveStops[3]} 100%`,
      ];
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
  }

  return { stops, thresholdRatio };
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
  const thresholdValue = thresholds[config.thresholdKey] ?? 0;

  const { stops, thresholdRatio } = getScaleStopsAndLabels(
    config,
    maxValue,
    positiveOnly,
    thresholdHighlighting,
    thresholdValue
  );
  const minLabel = formatScaleValue(positiveOnly ? 0 : -maxValue, config.unit.abbr);
  const centerLabel = formatScaleValue(0, config.unit.abbr);
  const maxLabel = formatScaleValue(maxValue, config.unit.abbr);
  const thresholdLabel = formatScaleValue(thresholdValue, config.unit.abbr);

  return (
    <>
      <div
        className="relative h-3 w-full flex-1 rounded-sm"
        style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}></div>
      {!noLabel && (
        <div className="mt-1 flex items-start gap-1 overflow-hidden">
          {positiveOnly ? (
            <>
              <LabelBox value={minLabel} />
              <div className="flex min-w-0 flex-1 items-start">
                {thresholdHighlighting ? (
                  <>
                    <div style={{ flexGrow: thresholdRatio }} />
                    <LabelBox value={thresholdLabel} underlined />
                    <div style={{ flexGrow: 1 - thresholdRatio }} />
                  </>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <LabelBox value={maxLabel} />
            </>
          ) : (
            <>
              <LabelBox value={minLabel} />
              <div className="flex min-w-0 flex-1 items-start">
                <div className="flex min-w-0 flex-1 items-start">
                  <div className="flex-1" />
                  <LabelBox value={centerLabel} />
                </div>
                <div className="flex min-w-0 flex-1 items-start">
                  {thresholdHighlighting ? (
                    <>
                      <div style={{ flexGrow: thresholdRatio }} />
                      <LabelBox value={thresholdLabel} underlined />
                      <div style={{ flexGrow: 1 - thresholdRatio }} />
                    </>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              </div>
              <LabelBox value={maxLabel} />
            </>
          )}
        </div>
      )}
    </>
  );
}
