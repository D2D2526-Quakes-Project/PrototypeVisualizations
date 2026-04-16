import { getMetricColorScale, getMetricConfig, type Metric, type MetricPaletteOverrides } from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";
import { useThresholds } from "../../contexts/visualization";

interface ColorScaleBarProps {
  currentMetric: Metric;
  thresholdHighlighting: boolean;
  metricPaletteOverrides?: MetricPaletteOverrides;
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
      className={`shrink-0 font-mono text-[9px] leading-none whitespace-nowrap text-neutral-400 ${
        underlined ? "border-b border-current pb-px text-neutral-500" : ""
      }`}>
      {value}
    </span>
  );
}

function getScaleStopsAndLabels(
  colorScale: ReturnType<typeof getMetricColorScale>,
  maxValue: number,
  positiveOnly: boolean,
  thresholdHighlighting: boolean,
  thresholdValue: number
) {
  const positiveStops = colorScale.positiveColorStops;
  const positiveTStops = colorScale.positiveThresholdColorStops;
  const negativeStops = colorScale.negativeColorStops;
  const negativeTStops = colorScale.negativeThresholdColorStops;
  const thresholdRatio = clamp01(maxValue > 0 ? thresholdValue / maxValue : 0);

  let stops: string[];

  if (thresholdHighlighting) {
    if (positiveOnly) {
      const thresholdPos = thresholdRatio * 100;

      stops = [
        ...positiveStops.map((color, i) => `${color} ${(i / (positiveStops.length - 1)) * thresholdPos}%`),
        ...positiveTStops.map(
          (color, i) => `${color} ${(i / (positiveTStops.length - 1)) * (100 - thresholdPos) + thresholdPos}%`
        ),
      ];
    } else {
      const posThresholdPos = thresholdRatio * 50 + 50;
      const negThresholdPos = (1 - thresholdRatio) * 50;

      stops = [
        ...negativeTStops
          .toReversed()
          .map((color, i) => `${color} ${(i / (negativeTStops.length - 1)) * negThresholdPos}%`),
        ...negativeStops
          .toReversed()
          .map(
            (color, i) => `${color} ${(i / (negativeStops.length - 1)) * (50 - negThresholdPos) + negThresholdPos}%`
          ),
        ...positiveStops.map(
          (color, i) => `${color} ${(i / (positiveStops.length - 1)) * (posThresholdPos - 50) + 50}%`
        ),
        ...positiveTStops.map(
          (color, i) => `${color} ${(i / (positiveTStops.length - 1)) * (100 - posThresholdPos) + posThresholdPos}%`
        ),
      ];
    }
  } else {
    if (positiveOnly) {
      stops = positiveStops.map((color, i) => `${color} ${(i / (positiveStops.length - 1)) * 100}%`);
    } else {
      stops = [
        ...negativeStops.map((color, i) => `${color} ${(i / (negativeStops.length - 1)) * -50 + 50}%`),
        ...positiveStops.map((color, i) => `${color} ${(i / (positiveStops.length - 1)) * 50 + 50}%`),
      ];
    }
  }

  return { stops, thresholdRatio };
}

export function ColorScaleBar({
  currentMetric,
  thresholdHighlighting,
  metricPaletteOverrides,
  noLabel,
}: ColorScaleBarProps) {
  const { animationData } = useAnimationData();
  const { thresholds } = useThresholds();
  const config = getMetricConfig(currentMetric);
  const colorScale = getMetricColorScale(currentMetric, metricPaletteOverrides);
  const maxValue = config.getPrecomputedMax(animationData.precomputed);
  const positiveOnly = config.positiveOnly;
  const thresholdValue = thresholds[config.thresholdKey] ?? 0;

  const { stops, thresholdRatio } = getScaleStopsAndLabels(
    colorScale,
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
