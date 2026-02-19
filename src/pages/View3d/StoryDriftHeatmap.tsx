/**
 * StoryDriftHeatmap Component
 * =============================================================================
 *
 * PURPOSE:
 * Visualizes the maximum interstory drift across all stories and time using
 * a heatmap. Shows when and where peak drifts occur throughout the simulation.
 *
 * WHAT IT SHOWS:
 * - X-axis: Time (seconds)
 * - Y-axis: Story levels (bottom to top)
 * - Color intensity: Maximum drift across all corners
 * - Red vertical line: Current time marker
 *
 * DATA SOURCES:
 * - Story drift: animationData.precomputed.storyDrift
 * - Peak values: animationData.precomputed.peakStoryDrift
 * - Frame timing: animationData.metadata.dt
 *
 * CALCULATION:
 * - For each (story, time) cell, shows max(NW, NE, SW, SE) drift
 * - Data is downsampled for performance (every Nth frame)
 *
 * UNITS:
 * - Drift: percentage
 * - Time: seconds
 *
 * IMPORTANCE:
 * Provides an overview of the entire building's drift response over time.
 * Engineers can quickly identify critical time periods and story levels
 * that experience the highest interstory drift ratios.
 * =============================================================================
 */

import { usePlayback } from "@/components/playback/PlaybackContext";
import ReactECharts from "echarts-for-react";
import { useMemo, useRef, useEffect } from "react";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useFloorVisibility } from "@/contexts/visualization";
import type { EChartsOption } from "echarts";

export function StoryDriftHeatmap() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getVisibleStoryOrder } = useFloorVisibility();
  const chartRef = useRef<ReactECharts>(null);

  const visibleStories = useMemo(() => getVisibleStoryOrder().slice(1), [getVisibleStoryOrder]);

  const heatmapData = useMemo(() => {
    const { storyDrift, peakStoryDrift } = animationData.precomputed;
    const storyOrder = animationData.metadata.storyOrder;

    const timeStep = Math.max(1, Math.floor(animationData.metadata.frameCount / 200));

    const data: Array<[number, number, number]> = [];

    visibleStories.forEach((storyId) => {
      const storyIdx = storyOrder.indexOf(storyId);
      for (let frame = 0; frame < animationData.metadata.frameCount; frame += timeStep) {
        const drifts = storyDrift.getStoryDrift(storyIdx, frame);
        const maxDrift = Math.max(...drifts);
        data.push([Math.floor(frame / timeStep), visibleStories.indexOf(storyId), maxDrift]);
      }
    });

    const maxValue = Math.max(
      ...visibleStories.map((storyId) => {
        const peaks = peakStoryDrift[storyId];
        return peaks ? Math.max(peaks.NW, peaks.NE, peaks.SW, peaks.SE) : 0;
      }),
    );

    return {
      data,
      stories: visibleStories,
      maxValue,
      timeStep,
      frameCount: Math.ceil(animationData.metadata.frameCount / timeStep),
    };
  }, [animationData, visibleStories]);

  const baseOption: EChartsOption = useMemo((): EChartsOption => {
    const { data, stories, maxValue, frameCount } = heatmapData;

    return {
      tooltip: {
        position: "top" as const,
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 10,
        formatter: (params) => {
          if (!params || Array.isArray(params)) return "";
          const [timeIdx, storyIdx, value] = params.data as number[];
          const actualFrame = timeIdx * heatmapData.timeStep;
          const time = actualFrame * animationData.metadata.dt;
          return `
            <div style="font-weight: 600;">Story ${stories[storyIdx]}</div>
            <div>Frame: ${actualFrame + 1}</div>
            <div>Time: ${time.toFixed(3)}s</div>
            <div>Max Drift: ${value.toFixed(4)}%</div>
          `;
        },
      },
      grid: {
        left: 50,
        right: 50,
        top: 20,
        bottom: 40,
      },
      xAxis: {
        type: "category" as const,
        data: Array.from({ length: frameCount }, (_, i) =>
          (i * heatmapData.timeStep * animationData.metadata.dt).toFixed(1),
        ),
        axisLabel: {
          color: "#6b7280",
          fontSize: 9,
          interval: Math.floor(frameCount / 8),
          formatter: (v: string) => `${v}s`,
        },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: "#d1d5db" } },
      },
      yAxis: {
        type: "category" as const,
        data: stories,
        axisLabel: { color: "#374151", fontSize: 10 },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: "#d1d5db" } },
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: "vertical" as const,
        right: 5,
        top: "center",
        inRange: {
          color: ["#f0fdf4", "#86efac", "#22c55e", "#15803d", "#166534"],
        },
        textStyle: { fontSize: 10 },
        formatter: (v) => `${((v as number) * 100).toFixed(2)}%`,
      },
      series: [
        {
          type: "heatmap",
          data: data,
          label: { show: false },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
      animation: false,
    };
  }, [heatmapData, animationData.metadata.dt]);

  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    const currentTimeIndex = Math.floor(frameIndex / heatmapData.timeStep);

    chart.setOption({
      series: [
        {
          markLine: {
            silent: true,
            symbol: "none",
            data: [{ xAxis: currentTimeIndex }],
            lineStyle: { color: "#ef4444", width: 2, type: "solid" },
            label: { show: false },
            animation: false,
          },
        },
      ],
    });
  }, [frameIndex, heatmapData.timeStep]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Story Drift Heatmap</span>
          <span className="text-neutral-400 ml-2">- Max corner drift over time</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full">
        <ReactECharts
          ref={chartRef}
          option={baseOption}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      </div>
    </div>
  );
}
