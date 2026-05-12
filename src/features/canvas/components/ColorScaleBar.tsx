import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getMetricColorScale,
  METRIC_CONFIGS,
  METRIC_PALETTES,
  type MetricPaletteKey,
} from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { formatNumber } from "@/lib/utils";
import { useState } from "react";

interface ColorScaleBarProps {
  noLabel?: boolean;
  insideLabel?: boolean;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function LabelBox({
  value,
  underlined = false,
  boxed = false,
}: {
  value: string;
  underlined?: boolean;
  boxed?: boolean;
}) {
  return (
    <span
      className={`shrink-0 font-mono text-[9px] leading-none whitespace-nowrap ${
        underlined ? "border-b border-current pb-0" : ""
      } ${boxed ? "bg-neutral-50/50 px-0.5 py-px text-black" : underlined ? "text-neutral-500" : "text-neutral-400"}`}>
      {value}
    </span>
  );
}

function getScaleStopsAndLabels(
  colorScale: ReturnType<typeof getMetricColorScale>,
  maxValue: number,
  hasPositive: boolean,
  hasNegative: boolean,
  thresholdHighlighting: boolean,
  thresholdValue: number
) {
  const positiveStops = colorScale.positiveColorStops;
  const positiveTStops = colorScale.positiveThresholdColorStops;
  const negativeStops = colorScale.negativeColorStops;
  const negativeTStops = colorScale.negativeThresholdColorStops;
  const thresholdRatio = clamp01(maxValue > 0 ? thresholdValue / maxValue : 0);

  // Number is 0-1 for a range and stirng is color
  const relativeStops: [number, string][] = [];
  if (hasNegative) {
    const negThresholdPos = (1 - thresholdRatio) * 50;
    let negativeStopsReversed = negativeStops.toReversed();
    if (thresholdHighlighting) {
      relativeStops.push(
        ...negativeTStops
          .toReversed()
          .map((color, i) => [(i / (negativeTStops.length - 1)) * negThresholdPos, color] as [number, string])
      );
    } else {
      negativeStopsReversed = [...negativeTStops.toReversed(), ...negativeStopsReversed];
    }

    relativeStops.push(
      ...negativeStopsReversed.map(
        (color, i) =>
          [(i / (negativeStopsReversed.length - 1)) * (50 - negThresholdPos) + negThresholdPos, color] as [
            number,
            string,
          ]
      )
    );
  }

  if (hasPositive) {
    const posThresholdPos = thresholdRatio * 50 + 50;
    let positiveStopsComplete = positiveStops;
    if (!thresholdHighlighting) {
      positiveStopsComplete = [...positiveStops, ...positiveTStops];
    }

    relativeStops.push(
      ...positiveStopsComplete.map(
        (color, i) =>
          [(i / (positiveStopsComplete.length - 1)) * (posThresholdPos - 50) + 50, color] as [number, string]
      )
    );

    if (thresholdHighlighting) {
      relativeStops.push(
        ...positiveTStops.map(
          (color, i) =>
            [(i / (positiveTStops.length - 1)) * (100 - posThresholdPos) + posThresholdPos, color] as [number, string]
        )
      );
    }
  }

  let min = 100,
    max = 0;
  relativeStops.forEach(([pos]) => {
    min = Math.min(min, pos);
    max = Math.max(max, pos);
  });
  const stops = relativeStops.map(([pos, color]) => `${color} ${((pos - min) / (max - min)) * 100}%`);
  return { stops, thresholdRatio };
}

export function ColorScaleBar({ noLabel, insideLabel }: ColorScaleBarProps) {
  const {
    currentMetricColorScale,
    currentMetricPrecomputedMax: maxValue,
    currentMetricConfig: config,
    currentMetricThreshold,
    thresholdHighlighting,
  } = useMetrics();

  const { stops, thresholdRatio } = getScaleStopsAndLabels(
    currentMetricColorScale,
    maxValue,
    config.hasPositive,
    config.hasNegative,
    thresholdHighlighting,
    currentMetricThreshold
  );
  const minLabel = formatNumber(config.hasNegative ? -maxValue : 0) + " " + config.unit.abbr;
  const centerLabel = formatNumber(0) + " " + config.unit.abbr;
  const maxLabel = formatNumber(config.hasPositive ? maxValue : 0) + " " + config.unit.abbr;
  const thresholdLabel = formatNumber(currentMetricThreshold) + " " + config.unit.abbr;

  const onlyNegative = config.hasNegative && !config.hasPositive;

  return (
    <ColorScaleBarPopover>
      <div
        className="border-border relative min-h-5 w-full flex-1 rounded-md border pt-1.5"
        style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}>
        {insideLabel && (
          <div className="flex items-start gap-1 overflow-hidden">
            <LabelBox boxed value={minLabel} />
            <div className="flex min-w-0 flex-1 items-start">
              {config.hasPositive && config.hasNegative && (
                <div className="flex min-w-0 flex-1 items-start">
                  <div className="flex-1" />
                  <LabelBox boxed value={centerLabel} />
                </div>
              )}
              <div className="flex min-w-0 flex-1 items-start">
                {thresholdHighlighting ? (
                  <>
                    <div style={{ flexGrow: onlyNegative ? 1 - thresholdRatio : thresholdRatio }} />
                    <LabelBox boxed value={thresholdLabel} underlined />
                    <div style={{ flexGrow: onlyNegative ? thresholdRatio : 1 - thresholdRatio }} />
                  </>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </div>
            <LabelBox boxed value={maxLabel} />
          </div>
        )}
      </div>
      {!(noLabel || insideLabel) && (
        <div className="mt-1 flex items-start gap-1 overflow-hidden">
          <LabelBox value={minLabel} />
          <div className="flex min-w-0 flex-1 items-start">
            {config.hasPositive && config.hasNegative && (
              <div className="flex min-w-0 flex-1 items-start">
                <div className="flex-1" />
                <LabelBox value={centerLabel} />
              </div>
            )}
            <div className="flex min-w-0 flex-1 items-start">
              {thresholdHighlighting ? (
                <>
                  <div style={{ flexGrow: onlyNegative ? 1 - thresholdRatio : thresholdRatio }} />
                  <LabelBox value={thresholdLabel} underlined />
                  <div style={{ flexGrow: onlyNegative ? thresholdRatio : 1 - thresholdRatio }} />
                </>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </div>
          <LabelBox value={maxLabel} />
        </div>
      )}
    </ColorScaleBarPopover>
  );
}

export function ColorScaleBarTooltip({ noLabel, insideLabel }: ColorScaleBarProps) {
  const {
    currentMetricPrecomputedMax: maxValue,
    currentMetricConfig: config,
    currentMetricThreshold,
    thresholdHighlighting,
  } = useMetrics();

  const unit = config.unit;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div key="colorbar">
          <ColorScaleBar noLabel={noLabel} insideLabel={insideLabel} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8} className="flex-col">
        <div className="font-semibold">{config.label}</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span className="text-neutral-400">Max:</span>
          <span>
            {config.hasPositive ? (config.hasNegative ? `+${maxValue.toFixed(2)}` : maxValue.toFixed(2)) : "0"}{" "}
            {unit.abbr}
          </span>
          <span className="text-neutral-400">Min:</span>
          <span>
            {config.hasNegative ? `-${maxValue.toFixed(2)}` : "0"} {unit.abbr}
          </span>
          {thresholdHighlighting && currentMetricThreshold > 0 && (
            <>
              <span className="text-neutral-400">Threshold:</span>
              <span>
                {currentMetricThreshold.toFixed(2)} {unit.abbr}
              </span>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function ColorScaleBarPopover({ children }: { children: React.ReactNode }) {
  const { currentMetric, metricPaletteOverrides, setMetricPalette } = useMetrics();
  const activePalette = getMetricColorScale(currentMetric, metricPaletteOverrides);
  const metricConfig = METRIC_CONFIGS[currentMetric];

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full rounded-md border text-left ${open ? "border-ring ring-ring/50 ring-3" : "hover:border-input border-transparent"}`}
          title={`Choose ${metricConfig.label.toLowerCase()} palette`}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {(
            Object.entries(METRIC_PALETTES) as Array<[MetricPaletteKey, (typeof METRIC_PALETTES)[MetricPaletteKey]]>
          ).map(([paletteKey, palette]) => {
            const isActive = activePalette.paletteKey === paletteKey;
            return (
              <button
                key={paletteKey}
                type="button"
                onClick={() =>
                  setMetricPalette(currentMetric, paletteKey === metricConfig.defaultPalette ? null : paletteKey)
                }
                className={`flex rounded border p-1 transition-colors ${
                  isActive ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:bg-neutral-50"
                }`}
                title={`Use ${palette.label.toLowerCase()} palette`}>
                <div
                  className="h-3 w-full rounded-sm"
                  style={{
                    background: `linear-gradient(to right, ${[...palette.positiveColorStops, palette.positiveThresholdColorStops].join(", ")})`,
                  }}
                />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
