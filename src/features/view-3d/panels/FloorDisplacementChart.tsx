/**
 * FloorDisplacementChart Component
 * =============================================================================
 *
 * PURPOSE:
 * Displays average displacement per floor/story in a horizontal bar chart.
 * Shows X and Y components for each story level.
 *
 * WHAT IT SHOWS:
 * - Y-axis: Story levels from bottom to top
 * - X-axis: Displacement magnitude (inches)
 * - Bars for X (red) and Y (rose) components
 *
 * DATA SOURCES:
 * - Story order: animationData.metadata.storyOrder
 * - Node-to-story mapping: animationData.metadata.stories
 * - Story heights: animationData.metadata.storyHeights
 * - Displacement data: animationData.displacementLin
 * - Max displacement: animationData.precomputed.maxDisplacement (for stable axis)
 *
 * UNITS:
 * - Displacement: inches
 * - Elevation: feet
 *
 * IMPORTANCE:
 * Helps engineers understand how displacement varies across building height,
 * identifying which floors experience the most movement. Critical for
 * assessing interstory drift and overall building response.
 * =============================================================================
 */

import { usePlayback } from "@/features/playback/PlaybackContext";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useAnimationData } from "@/lib/useAnimationData";
import { useFloorVisibility } from "@/features/view-3d/contexts/visualization";
import type { EChartsOption } from "echarts";
import { getMetricKeyColor } from "@/lib/metrics";
import { formatFixed3, formatStoryLabel } from "@/lib/utils";
import { useViewStore } from "@/state";

export function FloorDisplacementChart() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getVisibleStoryOrder } = useFloorVisibility();
  const metricPaletteOverrides = useViewStore((s) => s.metricPaletteOverrides);
  const displacementXColor = getMetricKeyColor("displacementX", metricPaletteOverrides);
  const displacementYColor = getMetricKeyColor("displacementY", metricPaletteOverrides);
  const xAxisMax = useMemo(() => {
    const maxDisp = animationData.precomputed.maxDisplacement;
    return Math.max(maxDisp, 0.1);
  }, [animationData.precomputed.maxDisplacement]);

  const chartData = useMemo(() => {
    const { stories } = animationData.metadata;
    const { storyElevations } = animationData.precomputed;
    const { displacementLin } = animationData;
    const frameData = displacementLin.atFrame(frameIndex);

    const visibleStories = getVisibleStoryOrder().slice(1);

    const storyData: Array<{
      story: string;
      elevationIn: number;
      avgX: number;
      avgY: number;
    }> = [];

    visibleStories.forEach((storyId) => {
      const nodes = stories[storyId] || [];
      const elevationIn = storyElevations[storyId] || 0;

      let sumX = 0,
        sumY = 0;
      nodes.forEach((nodeIdx) => {
        const pos = frameData.at(nodeIdx);
        sumX += pos[0];
        sumY += pos[1];
      });
      const count = nodes.length || 1;
      const avgX = sumX / count;
      const avgY = sumY / count;

      storyData.push({
        story: storyId,
        elevationIn,
        avgX,
        avgY,
      });
    });

    return storyData;
  }, [animationData, frameIndex, getVisibleStoryOrder]);

  const option: EChartsOption = useMemo((): EChartsOption => {
    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 10,
        textStyle: { color: "#374151", fontSize: 11 },
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";
          const data = chartData[params[0].dataIndex];
          return `
            <div style="font-weight: 600; margin-bottom: 6px;">${formatStoryLabel(data.story, data.elevationIn)}</div>
            <div>X: ${data.avgX.toFixed(4)} in</div>
            <div>Y: ${data.avgY.toFixed(4)} in</div>
          `;
        },
      },
      legend: {
        data: ["X", "Y"],
        right: 10,
        top: 0,
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: 60,
        right: 20,
        top: 54,
        bottom: 30,
      },
      title: {
        text: "Average Story Displacement by Elevation",
        left: 60,
        top: 6,
        textStyle: { fontSize: 12, fontWeight: "bold", color: "#374151" },
      },
      xAxis: {
        type: "value",
        name: "Displacement (in)",
        nameLocation: "middle",
        nameGap: 25,
        nameTextStyle: { fontSize: 11, color: "#4b5563" },
        min: -xAxisMax,
        max: xAxisMax,
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#6b7280", fontSize: 10, formatter: (v: number) => v.toFixed(2) },
        splitLine: { lineStyle: { color: "#e5e7eb", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        name: "Story",
        nameLocation: "middle",
        nameGap: 44,
        nameTextStyle: { fontSize: 11, color: "#4b5563" },
        data: chartData.map((d) => formatStoryLabel(d.story, d.elevationIn)),
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#374151", fontSize: 10, fontWeight: 500 },
        axisTick: { show: false },
      },
      series: [
        {
          name: "X",
          type: "bar",
          data: chartData.map((d) => d.avgX),
          itemStyle: { color: displacementXColor, opacity: 0.8 },
          barGap: "0%",
          barCategoryGap: "20%",
        },
        {
          name: "Y",
          type: "bar",
          data: chartData.map((d) => d.avgY),
          itemStyle: { color: displacementYColor, opacity: 0.8 },
          barGap: "0%",
          barCategoryGap: "20%",
        },
      ],
      animation: false,
    };
  }, [chartData, displacementXColor, displacementYColor, xAxisMax]);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-neutral-500">
        <span>Frame {frameIndex + 1}</span>
        <span className="text-neutral-300">•</span>
        <span>{formatFixed3(frameIndex * animationData.metadata.dt)} s</span>
        <span className="text-neutral-300">•</span>
        <span>Visible stories: {chartData.length}</span>
        <span className="text-neutral-300">•</span>
        <span>X-axis: in</span>
        <span className="text-neutral-300">•</span>
        <span>Story labels use interstory naming with floor elevation</span>
      </div>

      <div className="min-h-0 w-full flex-1">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
      </div>
    </div>
  );
}
