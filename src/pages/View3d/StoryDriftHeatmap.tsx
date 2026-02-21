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
import { useMemo, useRef, useEffect, useState } from "react";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useFloorVisibility } from "@/contexts/visualization";
import type { EChartsOption } from "echarts";

type Corner = "NW" | "NE" | "SW" | "SE" | "Max";

const CORNER_OPTIONS: Corner[] = ["NW", "NE", "SW", "SE", "Max"];

const cornerColors = {
  NW: "#3b82f6",
  NE: "#ef4444",
  SW: "#10b981",
  SE: "#f59e0b",
  Max: "#22c55e",
};

const RESOLUTION_OPTIONS = [50, 100, 200, 400, 800, 1600] as const;
type Resolution = (typeof RESOLUTION_OPTIONS)[number];

function getCornerColorScale(corner: Corner): string[] {
  const baseColor = cornerColors[corner];
  return [baseColor + "10", baseColor + "80", baseColor, baseColor + "99", baseColor];
}

export function StoryDriftHeatmap() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getVisibleStoryOrder } = useFloorVisibility();
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [selectedCorner, setSelectedCorner] = useState<Corner>("Max");
  const [resolution, setResolution] = useState<Resolution>(200);

  const visibleStories = useMemo(() => getVisibleStoryOrder().slice(1), [getVisibleStoryOrder]);

  const heatmapData = useMemo(() => {
    const { storyDrift, peakStoryDrift } = animationData.precomputed;
    const storyOrder = animationData.metadata.storyOrder;

    const timeStep = Math.max(1, Math.floor(animationData.metadata.frameCount / resolution));

    const cornerIndex: Record<Corner, number> = { NW: 0, NE: 1, SW: 2, SE: 3, Max: -1 };

    const data: Array<[number, number, number]> = [];

    visibleStories.forEach((storyId) => {
      const storyIdx = storyOrder.indexOf(storyId);
      for (let frame = 0; frame < animationData.metadata.frameCount; frame += timeStep) {
        const drifts = storyDrift.getStoryDrift(storyIdx, frame);
        const drift = selectedCorner === "Max" ? Math.max(...drifts) : drifts[cornerIndex[selectedCorner]];
        data.push([Math.floor(frame / timeStep), visibleStories.indexOf(storyId), drift]);
      }
    });

    let maxValue: number;
    if (selectedCorner === "Max") {
      maxValue = Math.max(
        ...visibleStories.map((storyId) => {
          const peaks = peakStoryDrift[storyId];
          return peaks ? Math.max(peaks.NW, peaks.NE, peaks.SW, peaks.SE) : 0;
        }),
      );
    } else {
      const cornerPeakKey = selectedCorner as keyof (typeof peakStoryDrift)[string];
      maxValue = Math.max(
        ...visibleStories.map((storyId) => {
          const peaks = peakStoryDrift[storyId];
          return peaks ? peaks[cornerPeakKey] : 0;
        }),
      );
    }

    return {
      data,
      stories: visibleStories,
      maxValue,
      timeStep,
      frameCount: Math.ceil(animationData.metadata.frameCount / timeStep),
    };
  }, [animationData, visibleStories, selectedCorner, resolution]);

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
            <div>${selectedCorner === "Max" ? "Max" : selectedCorner} Drift: ${value.toFixed(4)}%</div>
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
          color: getCornerColorScale(selectedCorner),
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
  }, [heatmapData, animationData.metadata.dt, selectedCorner]);

  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart || !playheadRef.current) return;

    try {
      const currentTimeIndex = Math.floor(frameIndex / heatmapData.timeStep);
      const grid = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [currentTimeIndex, 0]);

      if (grid) {
        playheadRef.current.style.left = `${grid[0]}px`;
      }
    } catch {
      // Chart not fully initialized yet
    }
  }, [frameIndex, heatmapData.timeStep]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0 flex items-center justify-between">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Story Drift Heatmap</span>
          <span className="text-neutral-400 ml-2">
            - {selectedCorner === "Max" ? "Max corner" : selectedCorner + " corner"} drift over time
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-neutral-500">Corner:</span>
          <select
            value={selectedCorner}
            onChange={(e) => setSelectedCorner(e.target.value as Corner)}
            className="text-xs px-2 py-0.5 bg-neutral-100 border border-neutral-300 rounded hover:bg-neutral-200 cursor-pointer">
            {CORNER_OPTIONS.map((corner) => (
              <option key={corner} value={corner}>
                {corner}
              </option>
            ))}
          </select>
          <span className="text-xs text-neutral-500 ml-2">Res:</span>
          <select
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value) as Resolution)}
            className="text-xs px-2 py-0.5 bg-neutral-100 border border-neutral-300 rounded hover:bg-neutral-200 cursor-pointer">
            {RESOLUTION_OPTIONS.map((res) => (
              <option key={res} value={res}>
                {res}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 w-full relative">
        <ReactECharts
          ref={chartRef}
          option={baseOption}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
        <div
          ref={playheadRef}
          className="absolute top-0 bottom-8 w-0.5 bg-red-500 pointer-events-none"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      </div>
    </div>
  );
}
