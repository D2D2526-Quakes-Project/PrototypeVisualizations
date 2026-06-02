import { usePanelState } from "@/features/dockview/usePanelState";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import type { IDockviewPanelProps } from "dockview-react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo } from "react";
import { computeHingeHistogram } from "../metrics/hingeMetrics";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/ThemeProvider";
import { useThresholds } from "../metrics/useThresholds";
import { useMetrics } from "../metrics/useMetrics";

type BrbDistributionPanelState = {
  binCount: number;
  logScale: boolean;
  clipPercentile: number;
};

const DEFAULT_BRB_DISTRIBUTION_PANEL_STATE: BrbDistributionPanelState = {
  binCount: 10,
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

interface BrbHistogramResult {
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

function buildBrbHistogramOption(
  metric: MetricHistogram,
  clipPercentile: number,
  logScale: boolean,
  thresholdValue: number,
  thresholdHighlighting: boolean
): EChartsOption {
  if (!metric.histogram) {
    return {
      animation: false,
      legend: { data: [] },
      xAxis: { type: "value" },
      yAxis: { type: "value" },
      series: [],
    };
  }

  const metricLabel = metric.label;
  const metricUnit = metric.units;
  const histogram = metric.histogram;
  const metricLabelWithUnit = metricUnit ? `${metricLabel} (${metricUnit})` : metricLabel;

  const xData = histogram.bins.map((bin) => (bin.x0 + bin.x1) / 2);
  const counts = histogram.bins.map((bin) => bin.count);
  const clipCount = getClipCountFromPercentile(counts, clipPercentile);
  const hasClippedData = counts.some((value) => value > clipCount);
  const showThreshold = thresholdHighlighting && thresholdValue > 0 && metric.key === "ratioAbs";

  return {
    animation: false,
    title: {
      text: metricLabelWithUnit,
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
      type: "value",
      name: `Range (${metricUnit || "metric"})`,
      nameLocation: "middle",
      nameGap: 45,
      nameTextStyle: { color: "#737373", fontSize: 11 },
      axisLabel: {
        color: "#525252",
        fontSize: 10,
        formatter: (value: number) => {
          const bin = histogram.bins.find((b) => Math.abs((b.x0 + b.x1) / 2 - value) < 0.001);
          return bin ? `${bin.x0.toFixed(2)}-${bin.x1.toFixed(2)}` : value.toFixed(2);
        },
      },
      axisLine: { lineStyle: { color: "#d4d4d4" } },
      min: histogram.bins.length > 0 ? histogram.bins[0].x0 : undefined,
      max: histogram.bins.length > 0 ? histogram.bins[histogram.bins.length - 1].x1 : undefined,
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
        name: "BRB count",
        data: counts.map((c, i) => [xData[i], Math.min(c, clipCount)]),
        itemStyle: { color: "#000000", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 20,
        ...(showThreshold
          ? {
              markLine: {
                symbol: "none",
                data: [{ xAxis: thresholdValue, name: "Threshold" }],
                lineStyle: { color: "#9ca3af", width: 2, type: "dashed" as const },
                label: { show: false },
                silent: true,
              },
            }
          : {}),
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
  histogram: BrbHistogramResult | null;
};

export function BrbDistributionPanel({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const brbData = animationData.brbData;
  const { thresholds } = useThresholds();
  const { thresholdHighlighting } = useMetrics();
  const { echartsTheme } = useTheme();

  const { state: savedState, setState: setSavedState } = usePanelState<BrbDistributionPanelState>({
    panelId: api.id,
    panelType: "BRB Distribution",
    defaultState: DEFAULT_BRB_DISTRIBUTION_PANEL_STATE,
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
    if (!brbData) return null;

    const ratioAbs: number[] = [];
    const deformAbs: number[] = [];
    const forceAbs: number[] = [];

    for (let i = 0; i < brbData.count; i++) {
      const row = brbData.getRow(i);
      if (Number.isFinite(row.ratioAbs)) {
        ratioAbs.push(row.ratioAbs);
      }
      const maxDeform = Math.max(
        Number.isFinite(row.axialDeformationMax) ? Math.abs(row.axialDeformationMax) : 0,
        Number.isFinite(row.axialDeformationMin) ? Math.abs(row.axialDeformationMin) : 0
      );
      if (maxDeform > 0) {
        deformAbs.push(maxDeform);
      }
      const maxForce = Math.max(
        Number.isFinite(row.axialForceMax) ? Math.abs(row.axialForceMax) : 0,
        Number.isFinite(row.axialForceMin) ? Math.abs(row.axialForceMin) : 0
      );
      if (maxForce > 0) {
        forceAbs.push(maxForce);
      }
    }

    return [
      {
        key: "ratioAbs",
        label: "|Ratio| Envelope",
        units: "%",
        values: ratioAbs,
        histogram: null,
      },
      {
        key: "axialDeformationAbs",
        label: "Axial Deformation",
        units: "in",
        values: deformAbs,
        histogram: null,
      },
      {
        key: "axialForceAbs",
        label: "Axial Force",
        units: "kips",
        values: forceAbs,
        histogram: null,
      },
    ];
  }, [brbData]);

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

  if (!brbData) {
    return (
      <div className="bg-background text-muted-foreground flex h-full w-full items-center justify-center p-4 text-sm">
        BRB data not loaded for this simulation.
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full w-full flex-col">
      <div className="border-border grid grid-cols-3 gap-2 border-b px-3 py-2">
        <Label className="flex flex-col gap-1 text-xs font-normal whitespace-nowrap">
          Number of bins: {binCount}
          <Slider
            className="h-7"
            min={6}
            max={30}
            step={1}
            value={[binCount]}
            onValueChange={(value) => setSavedState({ binCount: Number(value[0]), logScale, clipPercentile })}
          />
        </Label>
        <Label className="flex flex-col gap-1 text-xs font-normal whitespace-nowrap">
          Clip bins above: {clipPercentile} %
          <Slider
            className="h-7"
            min={60}
            max={100}
            step={0.1}
            value={[clipPercentile]}
            onValueChange={(value) => setSavedState({ binCount, logScale, clipPercentile: Number(value[0]) })}
          />
        </Label>

        <Label className="flex items-center gap-2 pt-4 text-xs font-normal whitespace-nowrap">
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
        </Label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {histograms == null ? (
          <div className="text-foreground flex h-full items-center justify-center text-sm">No BRB data available.</div>
        ) : (
          <div className="space-y-3">
            {histograms.map((metric) => {
              const { key } = metric;
              const thresholdValue = thresholds.brbRatio ?? 0;
              const option = buildBrbHistogramOption(
                metric,
                clipPercentile,
                logScale,
                thresholdValue,
                thresholdHighlighting
              );

              return (
                <div key={key} className="border-border bg-background rounded border p-2">
                  <div className="h-56">
                    <ReactECharts
                      theme={echartsTheme}
                      option={option}
                      style={{ height: "100%", width: "100%" }}
                      opts={{ renderer: "canvas" }}
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
