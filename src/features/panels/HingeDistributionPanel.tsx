import { usePanelState } from "@/features/dockview/usePanelState";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import type { IDockviewPanelProps } from "dockview";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo } from "react";
import { computeHingeHistogram } from "../metrics/hingeMetrics";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
      left: 0,
      top: -5,
      textStyle: { color: "#374151", fontSize: 11 },
    },
    grid: { left: 0, right: 0, top: 20, bottom: 0 },
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
      nameGap: 45,
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
      splitLine: { lineStyle: { color: "#f0f0f0" } },
      min: logScale ? 1 : 0,
      max: logScale ? undefined : clipCount,
    },
    series: [
      {
        type: "bar",
        name: "Hinge number",
        data: yData,
        itemStyle: { color: "#000000", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 20,
      },
    ],
    graphic:
      hasClippedData && !logScale
        ? [
            {
              type: "text",
              top: 0,
              right: 0,
              style: {
                text: `Values above ${clipCount.toLocaleString()} are clipped.`,
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
    panelId: api.id,
    panelType: "Hinge Distribution",
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

  if (!hingeData) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white p-4 text-sm text-neutral-500">
        Hinge data not loaded for this simulation.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="grid grid-cols-3 gap-2 border-b border-neutral-100 px-3 py-2">
        <Label className="flex flex-col gap-1 text-xs text-neutral-600">
          Number of bins: {binCount}
          <Slider
            className="h-7"
            min={6}
            max={120}
            step={1}
            value={[binCount]}
            onValueChange={(value) => setSavedState({ binCount: Number(value[0]), logScale, clipPercentile })}
          />
        </Label>
        <Label className="flex flex-col gap-1 text-xs text-neutral-600">
          Clip bins above: {clipPercentile} %
          <Slider
            className="h-7"
            min={60}
            max={100}
            step={1}
            value={[clipPercentile]}
            onValueChange={(value) => setSavedState({ binCount, logScale, clipPercentile: Number(value[0]) })}
          />
        </Label>

        <label className="flex items-center gap-2 pt-4 text-xs text-neutral-600">
          <Checkbox
            checked={logScale}
            onCheckedChange={(value) =>
              setSavedState({
                binCount,
                logScale: !!value,
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
              const { key } = metric;
              const option = buildHingeHistogramOption(metric, clipPercentile, logScale);

              return (
                <div key={key} className="rounded border border-neutral-200 bg-white p-2">
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
