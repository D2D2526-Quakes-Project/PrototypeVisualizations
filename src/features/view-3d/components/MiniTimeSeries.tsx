import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { usePlayback } from "@/features/playback/PlaybackContext";
import type { EChartsOption } from "echarts";

interface MiniTimeSeriesProps {
  data: number[];
  times: number[];
  color: string;
  currentValue: number;
  unit: string;
  label?: string;
}

export function MiniTimeSeries({ data, times, color, currentValue, unit, label }: MiniTimeSeriesProps) {
  const { frameIndex } = usePlayback();
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [chartReadyVersion, setChartReadyVersion] = useState(0);

  const chartData = useMemo(() => {
    if (data.length <= 1) return { seriesData: [], min: 0, max: 0, timeRange: 1 };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const timeRange = times[times.length - 1] || 1;

    const seriesData = times.map((t, i) => [t, data[i]]);

    return { seriesData, min, max, timeRange };
  }, [data, times]);

  const option: EChartsOption = useMemo((): EChartsOption => {
    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: [6, 10],
        textStyle: {
          fontSize: 10,
          color: "#374151",
        },
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";
          const point = params[0];
          if (!point.value || !Array.isArray(point.value)) return "";
          const time = point.value[0] as number;
          const value = point.value[1] as number;
          return `<div style="font-weight:500;">${value.toFixed(2)} ${unit}</div><div style="color:#9ca3af;">@ ${time.toFixed(1).replace(/\\.0$/u, "")} s</div>`;
        },
      },
      grid: {
        left: 35,
        right: 8,
        top: label ? 20 : 8,
        bottom: 20,
      },
      xAxis: {
        type: "value",
        min: 0,
        max: chartData.timeRange,
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: {
          color: "#9ca3af",
          fontSize: 8,
          formatter: (v: number) => `${v.toFixed(1)} s`,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: chartData.min,
        max: chartData.max,
        axisLine: { show: false },
        axisLabel: {
          color: "#9ca3af",
          fontSize: 8,
          formatter: (v: number) => v.toFixed(1),
        },
        splitLine: {
          lineStyle: {
            color: "#f3f4f6",
            type: "dashed",
          },
        },
      },
      series: [
        {
          type: "line",
          data: chartData.seriesData,
          smooth: false,
          symbol: "none",
          lineStyle: {
            color: color,
            width: 1.5,
          },
          areaStyle: {
            color: color,
            opacity: 0.1,
          },
        },
      ],
      animation: false,
    };
  }, [chartData, color, unit, label]);

  useEffect(() => {
    const syncPlayhead = () => {
      const chart = chartRef.current?.getEchartsInstance();
      if (!chart || !playheadRef.current) return false;
      const currentTime = times[frameIndex] || 0;
      const grid = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [currentTime, chartData.min]);

      if (grid) {
        playheadRef.current.style.left = `${grid[0]}px`;
        return true;
      }
      return false;
    };

    try {
      if (syncPlayhead()) return;
    } catch {
      // Chart not fully initialized yet.
    }

    const rafId = requestAnimationFrame(() => {
      try {
        syncPlayhead();
      } catch {
        // Ignore: chart may still be initializing.
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [frameIndex, times, chartData.min, chartReadyVersion]);

  return (
    <div className="relative w-full">
      {label && <div className="mb-1 text-[10px] text-neutral-500">{label}</div>}
      <div ref={containerRef} className="relative">
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: "80px", width: "100%" }}
          opts={{ renderer: "canvas" }}
          onChartReady={() => setChartReadyVersion((v) => v + 1)}
        />
        <div
          ref={playheadRef}
          className="pointer-events-none absolute top-0 bottom-5 w-0.5 bg-red-500"
          style={{
            left: "0%",
          }}
        />
        <div className="absolute top-1 right-1 rounded border border-neutral-200 bg-white/90 px-1.5 py-0.5 font-mono text-[9px] text-neutral-600 shadow-sm">
          {currentValue.toFixed(2)} {unit}
        </div>
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-neutral-400">
        <span>0 s</span>
        <span>{chartData.timeRange.toFixed(1)} s</span>
      </div>
    </div>
  );
}
