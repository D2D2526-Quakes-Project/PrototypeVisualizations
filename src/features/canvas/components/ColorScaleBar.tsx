import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DATASET_LABELS, type OptionalDatasetKey } from "@/features/animation-data/data-loading/loadingTypes";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import {
  getMetricColorScale,
  METRIC_CONFIGS,
  METRIC_PALETTES,
  type MetricPaletteKey,
} from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { formatNumber } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { getScaleStopsAndLabels } from "./colorScaleUtils";

interface ColorScaleBarProps {
  noLabel?: boolean;
  insideLabel?: boolean;
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
      } ${boxed ? "bg-muted/50 text-foreground px-0.5 py-px" : "text-foreground"}`}>
      {value}
    </span>
  );
}

export function ColorScaleBar({ noLabel, insideLabel }: ColorScaleBarProps) {
  const {
    currentMetricColorScale,
    currentMetricPrecomputedMax: maxValue,
    currentMetricConfig: config,
    currentMetricThreshold,
    thresholdHighlighting,
    isCurrentMetricAvailable,
    currentMetricRequiredDataset,
  } = useMetrics();

  if (!isCurrentMetricAvailable && currentMetricRequiredDataset) {
    return <MetricNotAvailableWarning datasetKey={currentMetricRequiredDataset} />;
  }

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
    isCurrentMetricAvailable,
  } = useMetrics();

  const unit = config.unit;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div key="colorbar">
          <ColorScaleBar noLabel={noLabel} insideLabel={insideLabel} />
        </div>
      </TooltipTrigger>
      {isCurrentMetricAvailable && (
        <TooltipContent side="bottom" sideOffset={8} className="flex-col">
          <div className="font-semibold">{config.label}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-muted-foreground">Max:</span>
            <span>
              {config.hasPositive ? (config.hasNegative ? `+${maxValue.toFixed(2)}` : maxValue.toFixed(2)) : "0"}{" "}
              {unit.abbr}
            </span>
            <span className="text-muted-foreground">Min:</span>
            <span>
              {config.hasNegative ? `-${maxValue.toFixed(2)}` : "0"} {unit.abbr}
            </span>
            {thresholdHighlighting && currentMetricThreshold > 0 && (
              <>
                <span className="text-muted-foreground">Threshold:</span>
                <span>
                  {currentMetricThreshold.toFixed(2)} {unit.abbr}
                </span>
              </>
            )}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

function ColorScaleBarPopover({ children }: { children: React.ReactNode }) {
  const { currentMetric, metricPaletteOverrides, setMetricPalette, isCurrentMetricAvailable } = useMetrics();
  const activePalette = getMetricColorScale(currentMetric, metricPaletteOverrides);
  const metricConfig = METRIC_CONFIGS[currentMetric];

  const [open, setOpen] = useState(false);

  if (!isCurrentMetricAvailable) {
    return <>{children}</>;
  }

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
                  isActive ? "bg-muted border-primary" : "border-border hover:bg-accent"
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

function MetricNotAvailableWarning({ datasetKey }: { datasetKey: OptionalDatasetKey }) {
  const { datasetStates, requestDatasetLoad, retryDatasetLoad } = useAnimationData();
  const dataState = datasetStates[datasetKey];
  const dataAvailable = dataState.available;

  return (
    <div className="mt-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="border-border relative flex min-h-5 w-full flex-1 items-center justify-center rounded-md border bg-linear-90 from-white to-neutral-400 py-0.5 text-sm">
            Data not loaded
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8} className="flex flex-col">
          {dataAvailable ? (
            <>
              {DATASET_LABELS[datasetKey]} data needs to be loaded to display this metric.
              <div className="w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {dataState.stage === "ready" ? (
                      <>
                        <CheckIcon size={11} /> Loaded
                      </>
                    ) : dataState.stage === "error" ? (
                      "Failed"
                    ) : dataState.selected ? (
                      dataState.message
                    ) : (
                      "Available"
                    )}
                  </span>
                  <div className="inline-block items-center justify-between gap-2 text-[10px]">
                    {dataState.stage === "error" ? (
                      <Button variant="outline" size="xs" className="dark" onClick={() => retryDatasetLoad(datasetKey)}>
                        <span className="text-xs leading-tight">Retry</span>
                      </Button>
                    ) : dataState.stage === "idle" || !dataState.selected ? (
                      <Button
                        variant="outline"
                        size="xs"
                        className="dark"
                        onClick={() => requestDatasetLoad(datasetKey)}>
                        <span className="text-xs leading-tight">Load data</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
                <span className="flex items-center gap-2">{dataState.error}</span>
                {dataState.stage === "fetching" || dataState.stage === "parsing" || dataState.stage === "queued" ? (
                  <div className="bg-muted mt-1 mb-1 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-warning h-full rounded-full transition-all"
                      style={{ width: `${dataState.progress}%` }}
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>{DATASET_LABELS[datasetKey]} data is not available for this building</>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
