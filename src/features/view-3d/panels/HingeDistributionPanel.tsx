import { useAnimationData } from "@/lib/useAnimationData";
import { getDefaultHingeDistributionPanelState } from "@/features/view-3d/lib/statePersistence";
import {
  buildHingeEnrichedRows,
  computeHingeHistogram,
  HINGE_METRIC_LABELS,
  HINGE_METRIC_UNITS,
  type HingeMetricKey,
} from "@/lib/hingeAnalysis";
import { useViewStore } from "@/state";
import type { IDockviewPanelProps } from "dockview";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo } from "react";

const HINGE_METRICS: HingeMetricKey[] = [
  "criticalDcr",
  "maxPosDeformDCRatio",
  "maxNegDeformDCRatio",
  "r3Abs",
  "m3Abs",
];

const DEFAULT_PERFORMANCE_LEVEL = 1;

function getClipCountFromPercentile(counts: number[], clipPercentile: number): number {
  if (counts.length === 0) return 0;
  if (clipPercentile >= 100) return Math.max(...counts);

  const sorted = counts.slice().sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * (clipPercentile / 100))));
  return Math.max(1, sorted[idx] ?? 1);
}

function buildHingeHistogramOption(
  histogram: ReturnType<typeof computeHingeHistogram>,
  metricKey: HingeMetricKey,
  clipPercentile: number,
  logScale: boolean
): EChartsOption {
  if (!histogram) {
    return {
      animation: false,
      legend: { data: [] },
      xAxis: { type: "category", data: [] },
      yAxis: { type: "value" },
      series: [],
    };
  }

  const metricLabel = HINGE_METRIC_LABELS[metricKey];
  const metricUnit = HINGE_METRIC_UNITS[metricKey];
  const metricLabelWithUnit = metricUnit ? `${metricLabel} (${metricUnit})` : metricLabel;

  const xLabels = histogram.bins.map((bin) => `${bin.x0.toFixed(4)}-${bin.x1.toFixed(4)}`);
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
          `<div>Range Bin: ${bin.x0.toFixed(4)} to ${bin.x1.toFixed(4)}${metricUnit ? ` ${metricUnit}` : ""}</div>`,
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

export function HingeDistributionPanel({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const hingeData = animationData.hingeData;

  const setPanelState = useViewStore((s) => s.setPanelState);
  const panelId = api?.id ?? "hinge-distribution";
  const savedPanelState = useViewStore((s) => s.panelStates[panelId]);
  const defaultState = getDefaultHingeDistributionPanelState();
  const savedState = savedPanelState?.type === "hingeDistribution" ? savedPanelState.state : defaultState;

  const binCount = useMemo(() => (typeof savedState.binCount === "number" ? Math.max(6, savedState.binCount) : 24), [savedState.binCount]);
  const logScale = useMemo(() => Boolean(savedState.logScale), [savedState.logScale]);
  const clipPercentile = useMemo(
    () => Math.min(100, Math.max(60, Number(savedState.clipPercentile) || 95)),
    [savedState.clipPercentile]
  );

  const rows = useMemo(
    () => buildHingeEnrichedRows(hingeData, animationData.beamData),
    [hingeData, animationData.beamData]
  );
  const effectiveStepType = "All";

  const histogramByMetric = useMemo(() => {
    const map = new Map<HingeMetricKey, ReturnType<typeof computeHingeHistogram>>();
    for (const metric of HINGE_METRICS) {
      map.set(
        metric,
        computeHingeHistogram(
          rows,
          metric,
          { stepType: effectiveStepType, performanceLevel: DEFAULT_PERFORMANCE_LEVEL },
          Math.max(6, Math.min(binCount, 120))
        )
      );
    }
    return map;
  }, [rows, effectiveStepType, binCount]);

  useEffect(() => {
    setPanelState(panelId, "hingeDistribution", {
      stepType: effectiveStepType,
      binCount,
      logScale,
      clipPercentile,
    });
  }, [binCount, clipPercentile, effectiveStepType, logScale, panelId, setPanelState]);

  const allBinControls = useMemo(() => {
    return [
      {
        label: `Number of bins: ${binCount}`,
        type: "range" as const,
        value: binCount,
        onChange: (value: number) => {
          setPanelState(panelId, "hingeDistribution", {
            stepType: effectiveStepType,
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
          setPanelState(panelId, "hingeDistribution", {
            stepType: effectiveStepType,
            binCount,
            logScale,
            clipPercentile: Math.min(100, Math.max(60, value)),
          });
        },
      },
    ];
  }, [binCount, clipPercentile, effectiveStepType, logScale, panelId, setPanelState]);

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
              setPanelState(panelId, "hingeDistribution", {
                stepType: effectiveStepType,
                binCount,
                logScale: event.target.checked,
                clipPercentile,
              })
            }
          />
          <span>Log scale (Y-axis)</span>
        </label>
      </div>

      <div className="border-b border-neutral-100 bg-neutral-50 px-3 py-2 text-[10px] text-neutral-500">
        Performance level is fixed at PL 1.
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">No hinge rows available.</div>
        ) : (
          <div className="space-y-3">
            {HINGE_METRICS.map((metricKey) => {
              const histogram = histogramByMetric.get(metricKey) ?? null;
              const option = buildHingeHistogramOption(histogram, metricKey, clipPercentile, logScale);
              const counts = histogram ? histogram.bins.map((bin) => bin.count) : [];
              const clipCount = counts.length > 0 ? getClipCountFromPercentile(counts, clipPercentile) : 0;
              const hasClippedData = counts.some((value) => value > clipCount);
              const metricLabel = HINGE_METRIC_LABELS[metricKey];
              const metricUnit = HINGE_METRIC_UNITS[metricKey];

              return (
                <div key={metricKey} className="rounded border border-neutral-200 bg-white p-2">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <div className="font-medium text-neutral-700">
                      {metricLabel}
                      {metricUnit ? ` (${metricUnit})` : ""}
                    </div>
                    <div className="text-[10px] text-neutral-500">Number of hinges</div>
                  </div>
                  <div className="h-56">
                    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                  </div>
                  {histogram && hasClippedData && (
                    <div className="mt-2 text-[10px] text-neutral-500">
                      High bins are clipped above {clipCount.toLocaleString()} for visual scaling only.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
