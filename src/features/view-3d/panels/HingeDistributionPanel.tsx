import { usePanelState } from "@/features/view-3d/hooks/usePanelState";
import { useAnimationData } from "@/lib/useAnimationData";
import type { IDockviewPanelProps } from "dockview";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo } from "react";

type HingeDistributionPanelState = {
  binCount: number;
  logScale: boolean;
  clipPercentile: number;
};

const DEFAULT_HINGE_DISTRIBUTION_PANEL_STATE: HingeDistributionPanelState = {
  binCount: 24,
  logScale: false,
  clipPercentile: 99,
};

function getClipCountFromPercentile(counts: number[], clipPercentile: number): number {
  if (counts.length === 0) return 0;
  if (clipPercentile >= 100) return Math.max(...counts);

  const sorted = counts.slice().sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * (clipPercentile / 100))));
  return Math.max(1, sorted[idx] ?? 1);
}

interface HingeHistogramResult {
  bins: {
    x0: number;
    x1: number;
    count: number;
  }[];
  count: number;
  min: number;
  max: number;
  mean: number;
}

function computeHingeHistogram(values: number[], binCount = 24): HingeHistogramResult | null {
  if (values.length === 0) {
    return null;
  }

  values.sort((a, b) => a - b);

  const count = values.length;

  const min = values[0];
  const max = values[count - 1];
  const mean = values.reduce((sum, value) => sum + value, 0) / count;

  const bins = Math.max(4, binCount);
  const width = (max - min) / bins;
  const counts = new Array<number>(bins).fill(0);

  for (const value of values) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((value - min) / width)));
    counts[idx] += 1;
  }

  return {
    bins: counts.map((binValue, idx) => ({
      x0: min + idx * width,
      x1: min + (idx + 1) * width,
      count: binValue,
    })),
    count,
    min,
    max,
    mean,
  };
}

function buildHingeHistogramOption(metric: MetricHistogram, clipPercentile: number, logScale: boolean): EChartsOption {
  if (!metric.histogram) {
    return {
      animation: false,
      legend: { data: [] },
      xAxis: { type: "category", data: [] },
      yAxis: { type: "value" },
      series: [],
    };
  }

  const metricLabel = metric.label;
  const metricUnit = metric.units;
  const histogram = metric.histogram;
  const metricLabelWithUnit = metricUnit ? `${metricLabel} (${metricUnit})` : metricLabel;

  const xLabels = histogram.bins.map((bin) => `${bin.x0.toFixed(2)}-${bin.x1.toFixed(2)}`);
  const counts = histogram.bins.map((bin) => bin.count);
  const clipCount = getClipCountFromPercentile(counts, clipPercentile);
  const hasClippedData = counts.some((value) => value > clipCount);
  const yData = counts.map((count) => Math.min(count, clipCount));

  return {
    animation: false,
    title: {
      text: `Hinge Distribution: ${metricLabelWithUnit}`,
      left: 8,
      top: 6,
      textStyle: { color: "#374151", fontSize: 11 },
    },
    grid: { left: 50, right: 16, top: 36, bottom: 40 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        if (!Array.isArray(params) || params.length === 0) return "";
        const first = params[0] as { dataIndex?: number; value?: number };
        const idx = first.dataIndex ?? 0;
        const bin = histogram.bins[idx];
        if (!bin) return "";

        const currentCount = counts[idx] ?? 0;
        const isClipped = currentCount > clipCount;
        return [
          `<div style="font-weight:600;margin-bottom:4px">${metricLabelWithUnit}</div>`,
          `<div>Range Bin: ${bin.x0.toFixed(2)} to ${bin.x1.toFixed(2)}${metricUnit ? ` ${metricUnit}` : ""}</div>`,
          `<div>Count: ${currentCount}</div>`,
          isClipped ? `<div style="margin-top:4px;color:#737373">This bin continues above ${clipCount}.</div>` : "",
        ].join("");
      },
    },
    xAxis: {
      type: "category",
      data: xLabels,
      name: `Range (${metricUnit || "metric"})`,
      nameLocation: "middle",
      nameGap: 58,
      nameTextStyle: { color: "#737373", fontSize: 11 },
      axisLabel: {
        rotate: 45,
        color: "#525252",
        fontSize: 10,
      },
      axisLine: { lineStyle: { color: "#d4d4d4" } },
    },
    yAxis: {
      type: logScale ? "log" : "value",
      name: "Hinge number",
      nameTextStyle: { color: "#737373", fontSize: 11 },
      axisLabel: { color: "#525252", fontSize: 10 },
      splitLine: { lineStyle: { color: "#f0f0f0" } },
      min: logScale ? 1 : 0,
      max: logScale ? undefined : clipCount,
      nameGap: hasClippedData ? 45 : 48,
    },
    series: [
      {
        type: "bar",
        name: "Hinge number",
        data: yData,
        itemStyle: { color: "#2563eb", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 20,
      },
    ],
    graphic:
      hasClippedData && !logScale
        ? [
            {
              type: "text",
              left: 16,
              top: "90%",
              style: {
                text: `Values above ${clipCount.toLocaleString()} are clipped (shown for scale only).`,
                fill: "#737373",
                fontSize: 10,
              },
            },
          ]
        : undefined,
  };
}

type MetricHistogram = {
  key: string;
  label: string;
  units: string;
  values: number[];
  histogram: HingeHistogramResult | null;
};

export function HingeDistributionPanel({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const hingeData = animationData.hingeData;

  const { state: savedState, setState: setSavedState } = usePanelState<HingeDistributionPanelState>({
    panelId: api?.id,
    fallbackPanelId: "hinge-distribution",
    panelType: "hingeDistribution",
    defaultState: DEFAULT_HINGE_DISTRIBUTION_PANEL_STATE,
  });

  const binCount = useMemo(
    () => (typeof savedState.binCount === "number" ? Math.max(6, savedState.binCount) : 24),
    [savedState.binCount]
  );
  const logScale = useMemo(() => Boolean(savedState.logScale), [savedState.logScale]);
  const clipPercentile = useMemo(
    () => Math.min(100, Math.max(60, Number(savedState.clipPercentile) || 95)),
    [savedState.clipPercentile]
  );

  const histogramMetrics: MetricHistogram[] | null = useMemo(() => {
    if (!hingeData) return null;

    const m3Abs = [];
    const r3Abs = [];

    for (let i = 0; i < hingeData.count; i++) {
      const row = hingeData.getRow(i);
      m3Abs.push(Math.abs(row.iM3Max));
      m3Abs.push(Math.abs(row.jM3Max));
      m3Abs.push(Math.abs(row.iM3Min));
      m3Abs.push(Math.abs(row.jM3Min));
      r3Abs.push(Math.abs(row.iR3Max));
      r3Abs.push(Math.abs(row.jR3Max));
      r3Abs.push(Math.abs(row.iR3Min));
      r3Abs.push(Math.abs(row.jR3Min));
    }

    return [
      {
        key: "r3Abs",
        label: "|R3| Rotation",
        units: "rad",
        values: r3Abs,
        histogram: null,
      },
      {
        key: "m3Abs",
        label: "|M3| Moment",
        units: "kip-in",
        values: m3Abs,
        histogram: null,
      },
    ];
  }, [hingeData]);

  const histograms: MetricHistogram[] | null = useMemo(() => {
    if (!histogramMetrics) return null;
    return histogramMetrics.map((metric) => {
      const { values } = metric;
      return {
        ...metric,
        histogram: computeHingeHistogram(values, binCount),
      };
    });
  }, [binCount, histogramMetrics]);

  useEffect(() => {
    setSavedState({
      binCount,
      logScale,
      clipPercentile,
    });
  }, [binCount, clipPercentile, logScale, setSavedState]);

  const allBinControls = useMemo(() => {
    return [
      {
        label: `Number of bins: ${binCount}`,
        type: "range" as const,
        value: binCount,
        onChange: (value: number) => {
          setSavedState({
            binCount: Math.max(6, Math.min(120, value)),
            logScale,
            clipPercentile,
          });
        },
      },
      {
        label: `Clip high bins at percentile: ${clipPercentile} %`,
        type: "range" as const,
        value: clipPercentile,
        onChange: (value: number) => {
          setSavedState({
            binCount,
            logScale,
            clipPercentile: Math.min(100, Math.max(60, value)),
          });
        },
      },
    ];
  }, [binCount, clipPercentile, logScale, setSavedState]);

  if (!hingeData) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white p-4 text-sm text-neutral-500">
        Hinge data not loaded for this simulation.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
        <div className="text-sm font-medium text-neutral-800">Hinge Distribution</div>
        <div className="text-[10px] text-neutral-500">Static (non-time-series)</div>
      </div>

      <div className="grid gap-2 border-b border-neutral-100 px-3 py-2 md:grid-cols-3">
        {allBinControls.map((control) => (
          <label key={control.label} className="flex flex-col gap-1 text-xs text-neutral-600">
            {control.label}
            <input
              className="h-7"
              type="range"
              min={control.label.startsWith("Number") ? 6 : 60}
              max={control.label.startsWith("Number") ? 120 : 100}
              step={1}
              value={control.value}
              onChange={(event) => control.onChange(Number(event.target.value))}
            />
          </label>
        ))}

        <label className="flex items-center gap-2 pt-4 text-xs text-neutral-600">
          <input
            type="checkbox"
            checked={logScale}
            onChange={(event) =>
              setSavedState({
                binCount,
                logScale: event.target.checked,
                clipPercentile,
              })
            }
          />
          <span>Log scale (Y-axis)</span>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {histograms == null ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            No hinge data available.
          </div>
        ) : (
          <div className="space-y-3">
            {histograms.map((metric) => {
              const { key, label, units } = metric;
              const option = buildHingeHistogramOption(metric, clipPercentile, logScale);

              return (
                <div key={key} className="rounded border border-neutral-200 bg-white p-2">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <div className="font-medium text-neutral-700">
                      {label}
                      {units}
                    </div>
                    <div className="text-[10px] text-neutral-500">Number of hinges</div>
                  </div>
                  <div className="h-56">
                    <ReactECharts
                      option={option}
                      style={{ height: "100%", width: "100%" }}
                      opts={{ renderer: "svg" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
