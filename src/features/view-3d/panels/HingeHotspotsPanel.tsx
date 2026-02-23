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

export function HingeHotspotsPanel() {
  const { animationData } = useAnimationData();
  const hingeData = animationData.hingeData;
  const [stepType, setStepType] = useState<string>("Max");

  const rows = useMemo(() => buildHingeEnrichedRows(hingeData, animationData.beamData), [hingeData, animationData.beamData]);
  const stepTypes = useMemo(() => {
    const discovered = getAvailableHingeStepTypes(hingeData);
    const unique = Array.from(new Set(["All", ...discovered]));
    if (!unique.includes("Max")) return unique;
    return ["All", "Max", ...unique.filter((value) => value !== "All" && value !== "Max")];
  }, [hingeData]);

  const topRows = useMemo(() => getTopHingeHotspots(rows, { stepType }, 12), [rows, stepType]);
  const breakdown = useMemo(() => getHingePerformanceBreakdown(rows, { stepType }), [rows, stepType]);

  const topChartOption = useMemo((): EChartsOption => {
    return {
      animation: false,
      grid: { left: 94, right: 14, top: 16, bottom: 20 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      xAxis: {
        type: "value",
        name: "Critical D/C",
        axisLabel: { color: "#525252", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f0f0f0" } },
      },
      yAxis: {
        type: "category",
        data: topRows.map((row) => `E${row.elementId} ${row.end}`),
        inverse: true,
        axisLabel: { color: "#525252", fontSize: 10 },
        axisLine: { lineStyle: { color: "#d4d4d4" } },
      },
      series: [
        {
          type: "bar",
          data: topRows.map((row) => row.criticalDcr),
          itemStyle: { color: "#dc2626", borderRadius: [0, 4, 4, 0] },
          barMaxWidth: 14,
        },
      ],
    };
  }, [topRows]);

  const breakdownChartOption = useMemo((): EChartsOption => {
    return {
      animation: false,
      grid: { left: 42, right: 16, top: 22, bottom: 28 },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
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
        axisLabel: { color: "#525252", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#525252", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f0f0f0" } },
      },
      series: [
        { name: ">=1", type: "bar", data: breakdown.exceeding1, itemStyle: { color: "#f59e0b" }, barMaxWidth: 22 },
        { name: ">=2", type: "bar", data: breakdown.exceeding2, itemStyle: { color: "#ef4444" }, barMaxWidth: 22 },
        { name: ">=4", type: "bar", data: breakdown.exceeding4, itemStyle: { color: "#7f1d1d" }, barMaxWidth: 22 },
      ],
    };
  }, [breakdown]);

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
        <div className="text-sm font-medium text-neutral-800">Hinge Hotspots</div>
        <label className="text-xs text-neutral-600 flex items-center gap-2">
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

      <div className="px-3 py-2 border-b border-neutral-100">
        <div className="text-xs font-medium text-neutral-700 mb-1">Top Beam-End Hotspots (Critical D/C)</div>
        <div className="h-48 rounded border border-neutral-100">
          <ReactECharts option={topChartOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
        </div>
      </div>

      <div className="px-3 py-2 border-b border-neutral-100">
        <div className="text-xs font-medium text-neutral-700 mb-1">Counts (PL1 only)</div>
        <div className="h-36 rounded border border-neutral-100">
          <ReactECharts
            option={breakdownChartOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "svg" }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
            <tr className="text-left text-neutral-600">
              <th className="px-2 py-1.5">Element</th>
              <th className="px-2 py-1.5">End</th>
              <th className="px-2 py-1.5">Step</th>
              <th className="px-2 py-1.5 text-right">Node</th>
              <th className="px-2 py-1.5 text-right">Crit D/C</th>
              <th className="px-2 py-1.5 text-right">R3</th>
            </tr>
          </thead>
          <tbody>
            {topRows.map((row) => (
              <tr key={`${row.beamIndex}-${row.end}-${row.stepType}`} className="border-b">
                <td className="px-2 py-1 font-mono">{row.elementId}</td>
                <td className="px-2 py-1 font-mono">{row.end}</td>
                <td className="px-2 py-1">{row.stepType}</td>
                <td className="px-2 py-1 font-mono text-right">{row.nodeIndex >= 0 ? row.nodeIndex : "—"}</td>
                <td className="px-2 py-1 font-mono text-right">{row.criticalDcr.toFixed(3)}</td>
                <td className="px-2 py-1 font-mono text-right">{row.r3.toFixed(5)}</td>
              </tr>
            ))}
            {topRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-neutral-500">
                  No hinge rows match the selected step filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
