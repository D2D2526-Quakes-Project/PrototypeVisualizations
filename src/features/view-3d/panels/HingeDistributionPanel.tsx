import { useAnimationData } from "@/lib/useAnimationData";
import {
  buildHingeEnrichedRows,
  computeHingeHistogram,
  getAvailableHingePerformanceLevels,
  getAvailableHingeStepTypes,
  getHingeMetricValue,
  HINGE_METRIC_LABELS,
  HINGE_METRIC_UNITS,
  type HingeMetricKey,
} from "@/lib/hingeAnalysis";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";

const HINGE_METRICS: HingeMetricKey[] = [
  "criticalDcr",
  "maxPosDeformDCRatio",
  "maxNegDeformDCRatio",
  "r3Abs",
  "m3Abs",
];

export function HingeDistributionPanel() {
  const { animationData } = useAnimationData();
  const hingeData = animationData.hingeData;

  const [metric, setMetric] = useState<HingeMetricKey>("criticalDcr");
  const [stepType, setStepType] = useState<string>("All");
  const [performanceLevel, setPerformanceLevel] = useState<number | "All">("All");

  const rows = useMemo(() => buildHingeEnrichedRows(hingeData, animationData.beamData), [hingeData, animationData.beamData]);
  const stepTypes = useMemo(() => ["All", ...getAvailableHingeStepTypes(hingeData)], [hingeData]);
  const performanceLevels = useMemo(
    () => ["All" as const, ...getAvailableHingePerformanceLevels(hingeData)],
    [hingeData],
  );

  const histogram = useMemo(
    () => computeHingeHistogram(rows, metric, { stepType, performanceLevel }, 26),
    [rows, metric, stepType, performanceLevel],
  );

  const filteredSummary = useMemo(() => {
    let count = 0;
    let ge1 = 0;
    let ge2 = 0;
    let ge4 = 0;

    for (const row of rows) {
      if (stepType !== "All" && row.stepType !== stepType) continue;
      if (performanceLevel !== "All" && row.performanceLevel !== performanceLevel) continue;

      count += 1;
      const critical = getHingeMetricValue(row, "criticalDcr");
      if (critical >= 1) ge1 += 1;
      if (critical >= 2) ge2 += 1;
      if (critical >= 4) ge4 += 1;
    }

    return { count, ge1, ge2, ge4 };
  }, [rows, stepType, performanceLevel]);

  const option = useMemo((): EChartsOption => {
    const metricLabel = HINGE_METRIC_LABELS[metric];
    const metricUnit = HINGE_METRIC_UNITS[metric];
    const metricLabelWithUnit = metricUnit ? `${metricLabel} (${metricUnit})` : metricLabel;

    if (!histogram) {
      return {
        legend: { data: ["Hinge Rows"] },
        xAxis: { type: "category", data: [] },
        yAxis: { type: "value" },
        series: [],
      };
    }

    const xLabels = histogram.bins.map((bin) => `${bin.x0.toFixed(2)}-${bin.x1.toFixed(2)}`);
    const counts = histogram.bins.map((bin) => bin.count);

    return {
      animation: false,
      legend: {
        top: 8,
        right: 12,
        textStyle: { fontSize: 10, color: "#525252" },
        itemWidth: 10,
        itemHeight: 10,
      },
      grid: { left: 64, right: 16, top: 36, bottom: 86 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const first = params[0] as { dataIndex?: number; value?: number };
          const idx = first.dataIndex ?? 0;
          const bin = histogram.bins[idx];
          if (!bin) return "";
          return [
            `<div style="font-weight:600;margin-bottom:4px">Hinge Distribution</div>`,
            `<div>${metricLabelWithUnit}</div>`,
            `<div>Range Bin: ${bin.x0.toFixed(4)} to ${bin.x1.toFixed(4)}${metricUnit ? ` ${metricUnit}` : ""}</div>`,
            `<div>Count: ${first.value ?? bin.count}</div>`,
            `<div style="margin-top:4px;color:#737373">Step: ${stepType} · Performance Level: ${String(performanceLevel)}</div>`,
          ].join("");
        },
      },
      xAxis: {
        type: "category",
        data: xLabels,
        name: `Range Bin (${metricUnit || "metric"})`,
        nameLocation: "middle",
        nameGap: 64,
        nameTextStyle: { color: "#737373", fontSize: 11 },
        axisLabel: {
          rotate: 45,
          color: "#525252",
          fontSize: 10,
        },
        axisLine: { lineStyle: { color: "#d4d4d4" } },
      },
      yAxis: {
        type: "value",
        name: "Hinge Rows",
        nameTextStyle: { color: "#737373", fontSize: 11 },
        axisLabel: { color: "#525252", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f0f0f0" } },
      },
      series: [
        {
          type: "bar",
          name: "Hinge Rows",
          data: counts,
          itemStyle: { color: "#2563eb", borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 20,
        },
      ],
    };
  }, [histogram, metric, performanceLevel, stepType]);

  if (!hingeData) {
    return (
      <div className="h-full w-full bg-white p-4 flex items-center justify-center text-sm text-neutral-500">
        Hinge data not loaded for this simulation.
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-neutral-800">Hinge Distribution</div>
        <div className="text-[10px] text-neutral-500">Static (non-time-series)</div>
      </div>

      <div className="px-3 py-2 border-b border-neutral-100 grid grid-cols-1 md:grid-cols-3 gap-2">
        <label className="text-xs text-neutral-600 flex flex-col gap-1">
          Metric
          <select
            className="h-8 rounded border border-neutral-200 bg-white px-2 text-xs"
            value={metric}
            onChange={(event) => setMetric(event.target.value as HingeMetricKey)}>
            {HINGE_METRICS.map((metricKey) => (
              <option key={metricKey} value={metricKey}>
                {HINGE_METRIC_LABELS[metricKey]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-neutral-600 flex flex-col gap-1">
          Step Type
          <select
            className="h-8 rounded border border-neutral-200 bg-white px-2 text-xs"
            value={stepType}
            onChange={(event) => setStepType(event.target.value)}>
            {stepTypes.map((step) => (
              <option key={step} value={step}>
                {step}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-neutral-600 flex flex-col gap-1">
          Performance Level
          <select
            className="h-8 rounded border border-neutral-200 bg-white px-2 text-xs"
            value={String(performanceLevel)}
            onChange={(event) => {
              const next = event.target.value;
              setPerformanceLevel(next === "All" ? "All" : Number(next));
            }}>
            {performanceLevels.map((level) => (
              <option key={String(level)} value={String(level)}>
                {String(level)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="px-3 py-2 grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-neutral-100">
        <SummaryCard label="Filtered Rows" value={filteredSummary.count.toLocaleString()} />
        <SummaryCard label="D/C >= 1" value={filteredSummary.ge1.toLocaleString()} />
        <SummaryCard label="D/C >= 2" value={filteredSummary.ge2.toLocaleString()} />
        <SummaryCard label="D/C >= 4" value={filteredSummary.ge4.toLocaleString()} />
        {histogram && <SummaryCard label="Mean" value={histogram.mean.toFixed(3)} />}
        {histogram && <SummaryCard label="P95" value={histogram.p95.toFixed(3)} />}
        {histogram && <SummaryCard label="P99" value={histogram.p99.toFixed(3)} />}
        {histogram && <SummaryCard label="Max" value={histogram.max.toFixed(3)} />}
      </div>

      <div className="px-3 pt-2 pb-1 border-b border-neutral-100 bg-neutral-50/70">
        <div className="text-xs font-medium text-neutral-700">
          Histogram: {HINGE_METRIC_LABELS[metric]}
          {HINGE_METRIC_UNITS[metric] ? ` (${HINGE_METRIC_UNITS[metric]})` : ""}
        </div>
        <div className="text-[10px] text-neutral-500">
          X-axis: metric range bins · Y-axis: hinge row count · Tooltip shows exact bin bounds and active filters
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {histogram ? (
          <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-neutral-500">
            No hinge rows match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="font-mono text-xs text-neutral-800">{value}</div>
    </div>
  );
}
