import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { useAnimationData } from "@/lib/useAnimationData";
import {
  buildHingeEnrichedRows,
  getAvailableHingeStepTypes,
  getHingePerformanceBreakdown,
  getTopHingeHotspots,
} from "@/lib/hingeAnalysis";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";

function getSeverityColor(value: number) {
  if (value >= 4) return "#7f1d1d";
  if (value >= 2) return "#dc2626";
  if (value >= 1) return "#f59e0b";
  return "#2563eb";
}

function getSeverityLabel(value: number) {
  if (value >= 4) return "Severe";
  if (value >= 2) return "High";
  if (value >= 1) return "Watch";
  return "Low";
}

function getSeverityBadgeClasses(value: number) {
  if (value >= 4) return "bg-red-100 text-red-900 border-red-300";
  if (value >= 2) return "bg-red-50 text-red-700 border-red-200";
  if (value >= 1) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-2">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="font-mono text-sm text-neutral-900">{value}</div>
      {hint ? <div className="text-[10px] text-neutral-500 mt-0.5">{hint}</div> : null}
    </div>
  );
}

export function HingeHotspotsPanel() {
  const { animationData } = useAnimationData();
  const hingeData = animationData.hingeData;
  const [stepType, setStepType] = useState<string>("Max");

  const rows = useMemo(
    () => buildHingeEnrichedRows(hingeData, animationData.beamData),
    [hingeData, animationData.beamData],
  );

  const stepTypes = useMemo(() => {
    const discovered = getAvailableHingeStepTypes(hingeData);
    const unique = Array.from(new Set(["All", ...discovered]));
    if (!unique.includes("Max")) return unique;
    return ["All", "Max", ...unique.filter((value) => value !== "All" && value !== "Max")];
  }, [hingeData]);

  const filteredRows = useMemo(
    () => rows.filter((row) => stepType === "All" || row.stepType === stepType),
    [rows, stepType],
  );

  const topRows = useMemo(() => getTopHingeHotspots(rows, { stepType }, 12), [rows, stepType]);
  const breakdown = useMemo(() => getHingePerformanceBreakdown(rows, { stepType }), [rows, stepType]);

  const summary = useMemo(() => {
    let total = 0;
    let ge1 = 0;
    let ge2 = 0;
    let ge4 = 0;
    let sumCritical = 0;
    let maxCritical = 0;
    let maxAbsR3 = 0;

    for (const row of filteredRows) {
      total += 1;
      sumCritical += row.criticalDcr;
      if (row.criticalDcr >= 1) ge1 += 1;
      if (row.criticalDcr >= 2) ge2 += 1;
      if (row.criticalDcr >= 4) ge4 += 1;
      if (row.criticalDcr > maxCritical) maxCritical = row.criticalDcr;
      maxAbsR3 = Math.max(maxAbsR3, Math.abs(row.r3));
    }

    const lt1 = Math.max(total - ge1, 0);
    const between1And2 = Math.max(ge1 - ge2, 0);
    const between2And4 = Math.max(ge2 - ge4, 0);
    const ge4Only = ge4;
    const meanCritical = total > 0 ? sumCritical / total : 0;
    const top = topRows[0] ?? null;

    return {
      total,
      ge1,
      ge2,
      ge4,
      lt1,
      between1And2,
      between2And4,
      ge4Only,
      meanCritical,
      maxCritical,
      maxAbsR3,
      top,
    };
  }, [filteredRows, topRows]);

  const exceedancePct = useMemo(() => {
    const denom = Math.max(summary.total, 1);
    return {
      ge1: (summary.ge1 / denom) * 100,
      ge2: (summary.ge2 / denom) * 100,
      ge4: (summary.ge4 / denom) * 100,
    };
  }, [summary.ge1, summary.ge2, summary.ge4, summary.total]);

  const severityBandSegments = useMemo(() => {
    const total = Math.max(summary.total, 1);
    return [
      { key: "lt1", label: "< 1.0", count: summary.lt1, color: "#2563eb", pct: (summary.lt1 / total) * 100 },
      {
        key: "1to2",
        label: "1.0-2.0",
        count: summary.between1And2,
        color: "#f59e0b",
        pct: (summary.between1And2 / total) * 100,
      },
      {
        key: "2to4",
        label: "2.0-4.0",
        count: summary.between2And4,
        color: "#ef4444",
        pct: (summary.between2And4 / total) * 100,
      },
      { key: "ge4", label: ">= 4.0", count: summary.ge4Only, color: "#7f1d1d", pct: (summary.ge4Only / total) * 100 },
    ];
  }, [summary]);

  const topChartOption = useMemo((): EChartsOption => {
    const xMax = Math.max(4, ...topRows.map((row) => row.criticalDcr), 0) * 1.1;

    return {
      animation: false,
      legend: {
        top: 8,
        right: 12,
        textStyle: { fontSize: 10, color: "#525252" },
        itemWidth: 10,
        itemHeight: 10,
      },
      grid: { left: 112, right: 14, top: 34, bottom: 34 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const first = params[0] as { dataIndex?: number; value?: number };
          const idx = first.dataIndex ?? 0;
          const row = topRows[idx];
          if (!row) return "";
          return [
            `<div style="font-weight:600;margin-bottom:4px">Beam-End Hinge Hotspot</div>`,
            `<div>Element: E${row.elementId} (${row.end}-end)</div>`,
            `<div>Step: ${row.stepType}</div>`,
            `<div>Node: ${row.nodeIndex >= 0 ? row.nodeIndex : "unknown"}</div>`,
            `<div>Severity: ${getSeverityLabel(row.criticalDcr)}</div>`,
            `<div>Critical D/C: ${(first.value ?? row.criticalDcr).toFixed(3)}</div>`,
            `<div>R3: ${row.r3.toFixed(5)} rad</div>`,
            `<div>M3: ${row.m3.toFixed(3)} (source moment units)</div>`,
          ].join("");
        },
      },
      xAxis: {
        type: "value",
        name: "Critical D/C Ratio",
        nameLocation: "middle",
        nameGap: 26,
        nameTextStyle: { color: "#737373", fontSize: 11 },
        min: 0,
        max: xMax,
        axisLabel: { color: "#525252", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f0f0f0" } },
      },
      yAxis: {
        type: "category",
        data: topRows.map((row) => `E${row.elementId} ${row.end}`),
        name: "Beam End",
        nameLocation: "middle",
        nameGap: 78,
        nameTextStyle: { color: "#737373", fontSize: 11 },
        inverse: true,
        axisLabel: { color: "#525252", fontSize: 10 },
        axisLine: { lineStyle: { color: "#d4d4d4" } },
      },
      series: [
        {
          type: "bar",
          name: "Critical D/C",
          data: topRows.map((row) => ({
            value: row.criticalDcr,
            itemStyle: { color: getSeverityColor(row.criticalDcr), borderRadius: [0, 4, 4, 0] },
          })),
          barMaxWidth: 14,
          markLine: {
            symbol: "none",
            label: { fontSize: 10, color: "#737373", formatter: "{b}" },
            lineStyle: { type: "dashed", width: 1 },
            data: [
              { xAxis: 1, name: "D/C 1", lineStyle: { color: "#f59e0b" } },
              { xAxis: 2, name: "D/C 2", lineStyle: { color: "#ef4444" } },
              { xAxis: 4, name: "D/C 4", lineStyle: { color: "#7f1d1d" } },
            ],
          },
        },
      ],
    };
  }, [topRows]);

  const breakdownChartOption = useMemo((): EChartsOption => {
    return {
      animation: false,
      grid: { left: 52, right: 16, top: 28, bottom: 42 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const idx = ((params[0] as { dataIndex?: number }).dataIndex ?? 0);
          const level = breakdown.levels[idx];
          const lines = [`<div style="font-weight:600;margin-bottom:4px">Performance Breakdown (PL${level})</div>`];
          for (const item of params as Array<{ seriesName?: string; value?: number }>) {
            lines.push(`<div>${item.seriesName}: ${item.value ?? 0}</div>`);
          }
          lines.push(`<div style="margin-top:4px;color:#737373">Step Filter: ${stepType}</div>`);
          return lines.join("");
        },
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: { fontSize: 10, color: "#525252" },
        itemWidth: 10,
        itemHeight: 10,
      },
      xAxis: {
        type: "category",
        data: breakdown.levels.map(String),
        name: "Performance Level",
        nameLocation: "middle",
        nameGap: 28,
        nameTextStyle: { color: "#737373", fontSize: 11 },
        axisLabel: { color: "#525252", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        name: "Hinge Count",
        nameTextStyle: { color: "#737373", fontSize: 11 },
        axisLabel: { color: "#525252", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f0f0f0" } },
      },
      series: [
        { name: ">=1", type: "bar", data: breakdown.exceeding1, itemStyle: { color: "#f59e0b" }, barMaxWidth: 22 },
        { name: ">=2", type: "bar", data: breakdown.exceeding2, itemStyle: { color: "#ef4444" }, barMaxWidth: 22 },
        { name: ">=4", type: "bar", data: breakdown.exceeding4, itemStyle: { color: "#7f1d1d" }, barMaxWidth: 22 },
      ],
    };
  }, [breakdown, stepType]);

  if (!hingeData) {
    return (
      <div className="h-full w-full bg-white p-4 flex items-center justify-center text-sm text-neutral-500">
        Hinge data not loaded for this simulation.
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white overflow-y-auto skinny-scrollbar">
      <div className="min-h-full flex flex-col">
        <div className="sticky top-0 z-10 px-3 py-2 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-neutral-800">Hinge Hotspots</div>
              <div className="text-[10px] text-neutral-500">
                Ranked beam-end hinge demand outliers (static hinge data, non-time-series)
              </div>
            </div>
            <label className="text-xs text-neutral-600 flex items-center gap-2 shrink-0">
              Step
              <select
                className="h-7 rounded border border-neutral-200 bg-white px-2 text-xs"
                value={stepType}
                onChange={(event) => setStepType(event.target.value)}>
                {stepTypes.map((step) => (
                  <option key={step} value={step}>
                    {step}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="p-3 space-y-3">
          <section className="rounded border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs font-medium text-neutral-800">How to Read This Panel</div>
            <div className="mt-1 text-xs text-neutral-600 leading-relaxed">
              This panel ranks beam-end hinges by <span className="font-medium">Critical D/C ratio</span> and shows how
              many hinges exceed key thresholds (`1`, `2`, `4`). Use the step filter to compare `Max` vs `Min`
              envelopes. `R3` is reported in radians (`rad`); `M3` is shown in source-export model moment units.
            </div>
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <SummaryCard label="Filtered Hinges" value={summary.total.toLocaleString()} hint={`Step: ${stepType}`} />
            <SummaryCard
              label="Top Critical D/C"
              value={summary.maxCritical.toFixed(3)}
              hint={summary.top ? `E${summary.top.elementId} ${summary.top.end}` : "No hotspots"}
            />
            <SummaryCard label="Mean Critical D/C" value={summary.meanCritical.toFixed(3)} hint="Across filtered hinges" />
            <SummaryCard
              label="Max |R3|"
              value={
                summary.total > 0
                  ? `${summary.maxAbsR3.toFixed(5)} rad`
                  : "0.00000 rad"
              }
              hint="Rotation demand envelope"
            />
            <SummaryCard label="D/C ≥ 1" value={`${summary.ge1.toLocaleString()} (${exceedancePct.ge1.toFixed(1)}%)`} />
            <SummaryCard label="D/C ≥ 2" value={`${summary.ge2.toLocaleString()} (${exceedancePct.ge2.toFixed(1)}%)`} />
            <SummaryCard label="D/C ≥ 4" value={`${summary.ge4.toLocaleString()} (${exceedancePct.ge4.toFixed(1)}%)`} />
            <SummaryCard
              label="Primary Severity"
              value={summary.top ? getSeverityLabel(summary.top.criticalDcr) : "None"}
              hint="Based on top ranked hotspot"
            />
          </section>

          <section className="rounded border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <div className="text-xs font-medium text-neutral-800">Severity Mix (Critical D/C Bands)</div>
                <div className="text-[10px] text-neutral-500">
                  Visual distribution of filtered hinges by risk band
                </div>
              </div>
              <div className="text-[10px] text-neutral-500">
                Total: <span className="font-mono">{summary.total.toLocaleString()}</span>
              </div>
            </div>

            <div
              className="h-4 w-full rounded border border-neutral-200 overflow-hidden flex bg-neutral-50"
              title="Stacked severity band bar for filtered hinge rows">
              {severityBandSegments.map((segment) => (
                <div
                  key={segment.key}
                  className="h-full"
                  style={{ width: `${segment.pct}%`, backgroundColor: segment.color }}
                  title={`${segment.label}: ${segment.count.toLocaleString()} (${segment.pct.toFixed(1)}%)`}
                />
              ))}
            </div>

            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
              {severityBandSegments.map((segment) => (
                <div key={segment.key} className="flex items-center gap-2 text-[10px] text-neutral-600">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: segment.color }} />
                  <span>{segment.label}</span>
                  <span className="font-mono ml-auto">
                    {segment.count.toLocaleString()} ({segment.pct.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="rounded border border-neutral-200 bg-white p-3">
              <div className="text-xs font-medium text-neutral-700 mb-1">Top Beam-End Hotspots (Critical D/C)</div>
              <div className="text-[10px] text-neutral-500 mb-2">
                Title: Ranked hotspot bar chart · X-axis: Critical D/C ratio · Y-axis: beam end (`E# I/J`) · Dashed
                lines mark D/C thresholds `1`, `2`, `4`
              </div>
              <div className="h-56 rounded border border-neutral-100">
                <ReactECharts option={topChartOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
              </div>
            </div>

            <div className="rounded border border-neutral-200 bg-white p-3">
              <div className="text-xs font-medium text-neutral-700 mb-1">Threshold Exceedance Counts by Performance Level</div>
              <div className="text-[10px] text-neutral-500 mb-2">
                Title: Performance-level exceedance chart · X-axis: performance level · Y-axis: hinge count · Source is
                currently PL1-only for this dataset
              </div>
              <div className="h-56 rounded border border-neutral-100">
                <ReactECharts
                  option={breakdownChartOption}
                  style={{ height: "100%", width: "100%" }}
                  opts={{ renderer: "svg" }}
                />
              </div>
            </div>
          </section>

          <section className="rounded border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <div className="text-xs font-medium text-neutral-800">Hotspot Spotlights</div>
                <div className="text-[10px] text-neutral-500">
                  Quick interpretation cards for the top-ranked beam-end hinges
                </div>
              </div>
              <div className="text-[10px] text-neutral-500">Showing top {Math.min(topRows.length, 3)} of {topRows.length}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              {topRows.slice(0, 3).map((row, index) => (
                <div key={`${row.beamIndex}-${row.end}-${row.stepType}-spotlight`} className="rounded border border-neutral-200 bg-neutral-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-xs text-neutral-800">
                      #{index + 1} · E{row.elementId} {row.end}
                    </div>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${getSeverityBadgeClasses(row.criticalDcr)}`}>
                      {getSeverityLabel(row.criticalDcr)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                    <div className="text-neutral-500">Critical D/C</div>
                    <div className="font-mono text-right text-neutral-800">{row.criticalDcr.toFixed(3)}</div>
                    <div className="text-neutral-500">Step</div>
                    <div className="text-right text-neutral-700">{row.stepType}</div>
                    <div className="text-neutral-500">Node</div>
                    <div className="font-mono text-right text-neutral-700">{row.nodeIndex >= 0 ? row.nodeIndex : "—"}</div>
                    <div className="text-neutral-500">R3</div>
                    <div className="font-mono text-right text-neutral-700">
                      <UnitTooltip value={row.r3} unit="rad" decimals={5} showConversions={false} />
                    </div>
                    <div className="text-neutral-500">M3</div>
                    <div
                      className="font-mono text-right text-neutral-700"
                      title="Model output moment units from source export (dataset-dependent)">
                      {row.m3.toFixed(3)}
                    </div>
                  </div>
                </div>
              ))}
              {topRows.length === 0 && (
                <div className="col-span-full rounded border border-neutral-200 bg-neutral-50 p-4 text-xs text-center text-neutral-500">
                  No hinge rows match the selected step filter.
                </div>
              )}
            </div>
          </section>

          <section className="rounded border border-neutral-200 bg-white p-3">
            <div className="text-xs font-medium text-neutral-800 mb-2">Detailed Ranked Hotspots</div>
            <div className="text-[10px] text-neutral-500 mb-2">
              Scroll this panel normally to review all sections. This table remains in-page and supports horizontal overflow if needed.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[760px]">
                <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
                  <tr className="text-left text-neutral-600">
                    <th className="px-2 py-1.5">Rank</th>
                    <th className="px-2 py-1.5">Element</th>
                    <th className="px-2 py-1.5">End</th>
                    <th className="px-2 py-1.5">Step</th>
                    <th className="px-2 py-1.5">Severity</th>
                    <th className="px-2 py-1.5 text-right">Node</th>
                    <th className="px-2 py-1.5 text-right">Crit D/C (ratio)</th>
                    <th className="px-2 py-1.5 text-right">R3 (rad)</th>
                    <th
                      className="px-2 py-1.5 text-right"
                      title="Model output moment units from source export (dataset-dependent)">
                      M3 (source units)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topRows.map((row, index) => (
                    <tr key={`${row.beamIndex}-${row.end}-${row.stepType}`} className="border-b border-neutral-100">
                      <td className="px-2 py-1 font-mono text-neutral-600">{index + 1}</td>
                      <td className="px-2 py-1 font-mono">{row.elementId}</td>
                      <td className="px-2 py-1 font-mono">{row.end}</td>
                      <td className="px-2 py-1">{row.stepType}</td>
                      <td className="px-2 py-1">
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] ${getSeverityBadgeClasses(row.criticalDcr)}`}>
                          {getSeverityLabel(row.criticalDcr)}
                        </span>
                      </td>
                      <td className="px-2 py-1 font-mono text-right">{row.nodeIndex >= 0 ? row.nodeIndex : "—"}</td>
                      <td className="px-2 py-1 font-mono text-right">{row.criticalDcr.toFixed(3)}</td>
                      <td className="px-2 py-1 font-mono text-right">
                        <UnitTooltip value={row.r3} unit="rad" decimals={5} showConversions={false} />
                      </td>
                      <td
                        className="px-2 py-1 font-mono text-right"
                        title="Model output moment units from source export (dataset-dependent)">
                        {row.m3.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                  {topRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-2 py-4 text-center text-neutral-500">
                        No hinge rows match the selected step filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
