import type { HingeHistogramResult } from "@/features/metrics/hingeMetrics";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

interface StaticHingeHistogramProps {
  title: string;
  maxHistogram: HingeHistogramResult | null;
  minHistogram: HingeHistogramResult | null;
  height?: number;
}

function getCenter(bin: { x0: number; x1: number }) {
  return (bin.x0 + bin.x1) / 2;
}

export function StaticHingeHistogram({ title, maxHistogram, minHistogram, height = 180 }: StaticHingeHistogramProps) {
  const option = useMemo((): EChartsOption => {
    const xValues = Array.from(
      new Set(
        [...(maxHistogram?.bins ?? []), ...(minHistogram?.bins ?? [])]
          .map((bin) => Number(getCenter(bin).toFixed(6)))
          .sort((a, b) => a - b)
      )
    );

    const buildSeriesValues = (histogram: HingeHistogramResult | null) => {
      const countsByCenter = new Map<number, number>();
      histogram?.bins.forEach((bin) => {
        countsByCenter.set(Number(getCenter(bin).toFixed(6)), bin.count);
      });
      return xValues.map((center) => countsByCenter.get(center) ?? 0);
    };

    return {
      animation: false,
      title: {
        text: title,
        left: 8,
        top: 6,
        textStyle: { fontSize: 11, color: "#374151" },
      },
      legend: {
        top: 6,
        right: 12,
        textStyle: { fontSize: 10, color: "#525252" },
        data: ["Max Rotation", "Min Rotation"],
      },
      grid: { left: 50, right: 16, top: 34, bottom: 42 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const center = (params[0] as { axisValue?: string | number }).axisValue;
          const lines = [
            `<div style="font-weight:600;margin-bottom:4px">Static hinge rotation bin</div>`,
            `<div>Rotation: ${Number(center).toFixed(3)} rad</div>`,
          ];
          for (const item of params as Array<{ seriesName?: string; value?: number }>) {
            lines.push(`<div>${item.seriesName}: ${item.value ?? 0} hinge nodes</div>`);
          }
          return lines.join("");
        },
      },
      xAxis: {
        type: "category",
        data: xValues.map((value) => value.toFixed(3)),
        name: "Hinge Rotation (rad)",
        nameLocation: "middle",
        nameGap: 30,
        axisLabel: { color: "#525252", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        name: "Hinge Node Count",
        nameTextStyle: { color: "#737373", fontSize: 11 },
        axisLabel: { color: "#525252", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f0f0f0" } },
        min: 0,
      },
      series: [
        {
          name: "Max Rotation",
          type: "bar",
          data: buildSeriesValues(maxHistogram),
          itemStyle: { color: "#d97706" },
          barGap: "10%",
        },
        {
          name: "Min Rotation",
          type: "bar",
          data: buildSeriesValues(minHistogram),
          itemStyle: { color: "#0f766e" },
          barGap: "10%",
        },
      ],
    };
  }, [maxHistogram, minHistogram, title]);

  return <ReactECharts option={option} style={{ height, width: "100%" }} opts={{ renderer: "svg" }} />;
}
