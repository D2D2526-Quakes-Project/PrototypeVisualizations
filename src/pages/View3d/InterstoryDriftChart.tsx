/**
 * InterstoryDriftChart Component
 * =============================================================================
 *
 * PURPOSE:
 * Displays interstory drift ratio for each floor, showing both current
 * and peak values. Essential for assessing structural damage potential.
 *
 * WHAT IT SHOWS:
 * - Y-axis: Story levels from bottom to top
 * - X-axis: Drift ratio (percentage)
 * - Solid bars: Current drift at selected frame
 * - Transparent bars: Peak drift (showing margin to peak)
 * - Four corners per story: NW (blue), NE (red), SW (green), SE (amber)
 *
 * DATA SOURCES:
 * - Story drift: animationData.precomputed.storyDrift
 * - Peak drift: animationData.precomputed.peakStoryDrift
 * - Story heights: animationData.metadata.storyHeights
 *
 * CALCULATION:
 * - Drift = |displacement_top - displacement_bottom| / story_height * 100
 * - Computed for each corner node pair between adjacent floors
 *
 * UNITS:
 * - Drift: percentage
 * - Elevation: feet
 *
 * IMPORTANCE:
 * Interstory drift ratio is the primary metric for assessing structural
 * damage. Higher values indicate potential yielding or damage to structural
 * elements. Engineers compare against code limits (typically 1-2%).
 * =============================================================================
 */

import { usePlayback } from "@/components/playback/PlaybackContext";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { renderToString } from "react-dom/server";
import { useAnimationData } from "../../hooks/nodeDataHook";
import type { EChartsOption } from "echarts";

const cornerColors = {
  NW: "#3b82f6",
  NE: "#ef4444",
  SW: "#10b981",
  SE: "#f59e0b",
};

const MIN_X_AXIS_MAX = 0.01;

function TooltipContent({
  storyId,
  elevationFt,
  corners,
  currentDrifts,
  peakDrift,
}: {
  storyId: string;
  elevationFt: number;
  corners: Array<keyof typeof cornerColors>;
  currentDrifts: Record<string, Record<string, number>>;
  peakDrift: Record<string, Record<string, number>>;
}) {
  return (
    <div style={{ minWidth: "200px" }}>
      <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>
        Story {storyId} ({elevationFt.toFixed(0)}ft)
      </div>
      {corners.map((corner) => {
        const current = currentDrifts[storyId]?.[corner] || 0;
        const peak = peakDrift[storyId]?.[corner] || 0;

        return (
          <div
            key={corner}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              marginTop: "4px",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                  background: cornerColors[corner],
                }}
              />
              <span style={{ color: "#6b7280", fontSize: "11px" }}>{corner}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontWeight: 500 }}>{current.toFixed(4)}%</span>
              <span style={{ color: "#9ca3af", fontSize: "10px", marginLeft: "6px" }}>/ {peak.toFixed(4)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const corners: Array<keyof typeof cornerColors> = ["NW", "NE", "SW", "SE"];

export function InterstoryDriftChart() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { precomputed } = animationData;

  // Static configuration that doesn't change with frameIndex
  const staticConfig = useMemo(() => {
    const { storyOrder, storyHeights } = animationData.metadata;
    const { peakStoryDrift } = precomputed;
    const storyOrderWithoutGround = storyOrder.slice(1);

    const yAxisData = storyOrderWithoutGround.map((storyId) => {
      const heightIn = storyHeights[storyId] || 0;
      const heightFt = heightIn / 12;
      return `${storyId} (${heightFt.toFixed(0)}ft)`;
    });

    // Pre-compute max peak ratio
    let maxPeakRatio = 0.0001;
    storyOrder.forEach((storyId) => {
      const peakCornerDrifts = [
        peakStoryDrift[storyId]?.NW || 0,
        peakStoryDrift[storyId]?.NE || 0,
        peakStoryDrift[storyId]?.SW || 0,
        peakStoryDrift[storyId]?.SE || 0,
      ];
      maxPeakRatio = Math.max(maxPeakRatio, ...peakCornerDrifts);
    });

    return {
      storyOrderWithoutGround,
      yAxisData,
      maxPeakRatio,
      peakStoryDrift,
      storyHeights,
    };
  }, [animationData.metadata, precomputed]);

  const { storyOrderWithoutGround, yAxisData, maxPeakRatio, peakStoryDrift, storyHeights } = staticConfig;

  // Current drifts that change with frameIndex
  // const [currentDrifts, setCurrentDrifts] = useState<Record<string, Record<string, number>>>({});

  const chartData = useMemo(() => {
    const { storyDrift } = precomputed;
    const currentDrifts: Record<string, Record<string, number>> = {};
    let maxCurrentRatio = 0.0001;

    storyOrderWithoutGround.forEach((storyId, idx) => {
      const storyIndex = idx + 1;
      const cornerDrifts = storyDrift.getStoryDrift(storyIndex, frameIndex);
      currentDrifts[storyId] = {
        NW: cornerDrifts[0],
        NE: cornerDrifts[1],
        SW: cornerDrifts[2],
        SE: cornerDrifts[3],
      };
      maxCurrentRatio = Math.max(maxCurrentRatio, ...cornerDrifts);
    });

    // setCurrentDrifts(currentDrifts);
    return { currentDrifts, maxCurrentRatio };
  }, [precomputed, frameIndex, storyOrderWithoutGround]);

  const { currentDrifts, maxCurrentRatio } = chartData;

  // Static parts of the option that don't depend on frameIndex
  const baseOption: EChartsOption = useMemo((): EChartsOption => {
    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: {
          type: "shadow" as const,
          shadowStyle: {
            color: "rgba(0,0,0,0.05)",
          },
        },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 12,
        textStyle: {
          color: "#374151",
          fontSize: 12,
        },
        transitionDuration: 0,
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";

          const storyIdx = params[0].dataIndex;
          const storyId = storyOrderWithoutGround[storyIdx];
          const heightIn = storyHeights[storyId] || 0;
          const heightFt = heightIn / 12;

          return renderToString(
            <TooltipContent
              storyId={storyId}
              elevationFt={heightFt}
              corners={corners}
              currentDrifts={currentDrifts}
              peakDrift={peakStoryDrift}
            />,
          );
        },
      },
      legend: {
        data: corners.map((corner) => ({
          name: corner,
          itemStyle: { color: cornerColors[corner] },
        })),
        right: 0,
        top: 0,
        orient: "vertical" as const,
        itemGap: 8,
        textStyle: {
          fontSize: 11,
          color: "#374151",
        },
        itemWidth: 14,
        itemHeight: 14,
      },
      grid: {
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        containLabel: false,
      },
      yAxis: {
        type: "category" as const,
        data: yAxisData,
        axisLine: {
          lineStyle: {
            color: "#d1d5db",
          },
        },
        axisLabel: {
          color: "#374151",
          fontSize: 11,
          fontWeight: 500,
        },
        axisTick: {
          show: false,
        },
      },
      animation: false,
    };
  }, [storyOrderWithoutGround, yAxisData, storyHeights, peakStoryDrift, currentDrifts]);

  // Dynamic parts that change with frameIndex
  const seriesData = useMemo(() => {
    // Create peak series first (render behind)
    const peakSeries = corners.map((corner) => ({
      name: `${corner}`,
      type: "bar" as const,
      stack: corner,
      data: storyOrderWithoutGround.map((storyId) => peakStoryDrift[storyId][corner] - currentDrifts[storyId][corner]),
      itemStyle: {
        color: cornerColors[corner],
        opacity: 0.3,
        borderRadius: [0, 2, 2, 0] as [number, number, number, number],
      },
      barGap: "0%",
      barCategoryGap: "20%",
      silent: true,
      z: 1,
      legendHoverLink: false,
    }));

    // Current value series (render on top)
    const currentSeries = corners.map((corner) => ({
      name: corner,
      type: "bar" as const,
      stack: corner,
      data: storyOrderWithoutGround.map((storyId) => currentDrifts[storyId][corner] || 0),
      itemStyle: {
        color: cornerColors[corner],
        borderRadius: [0, 2, 2, 0] as [number, number, number, number],
      },
      barGap: "0%",
      barCategoryGap: "20%",
      z: 2,
    }));

    return [...currentSeries, ...peakSeries];
  }, [currentDrifts, storyOrderWithoutGround, peakStoryDrift]);

  const xAxisMax = Math.max(Math.max(maxCurrentRatio, maxPeakRatio) * 1.15, MIN_X_AXIS_MAX);

  const option = useMemo(() => {
    return {
      ...baseOption,
      xAxis: {
        type: "value" as const,
        name: "Drift (%)",
        nameLocation: "middle" as const,
        nameGap: 25,
        nameTextStyle: {
          fontSize: 11,
          color: "#4b5563",
          fontWeight: 500,
        },
        max: xAxisMax,
        axisLine: {
          lineStyle: {
            color: "#d1d5db",
          },
        },
        axisLabel: {
          formatter: (value: number) => value.toFixed(3),
          color: "#6b7280",
          fontSize: 10,
        },
        splitLine: {
          lineStyle: {
            color: "#e5e7eb",
            type: "dashed" as const,
          },
        },
      },
      series: seriesData,
    };
  }, [baseOption, seriesData, xAxisMax]);

  return (
    <div className="h-full w-full">
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
    </div>
  );
}
