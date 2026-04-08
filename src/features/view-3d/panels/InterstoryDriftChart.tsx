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
 * - Story elevations: animationData.precomputed.storyElevations
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

import { usePlayback } from "@/features/playback/PlaybackContext";
import { useFloorVisibility } from "@/features/view-3d/contexts/visualization";
import { useAnimationData } from "@/lib/useAnimationData";
import { getDefaultInterstoryDriftChartPanelState } from "@/features/view-3d/lib/statePersistence";
import { useViewStore } from "@/state";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import type { EChartsOption } from "echarts";
import type { DockviewPanelApi } from "dockview";
import { formatStoryLabel } from "@/lib/utils";

interface InterstoryDriftChartProps {
  api?: DockviewPanelApi;
}

const cornerColors = {
  NW: "#3b82f6",
  NE: "#ef4444",
  SW: "#10b981",
  SE: "#f59e0b",
};

const MIN_X_AXIS_MAX = 0.01;

function TooltipContent({
  storyId,
  elevationIn,
  corners,
  currentDrifts,
  peakDrift,
}: {
  storyId: string;
  elevationIn: number;
  corners: Array<keyof typeof cornerColors>;
  currentDrifts: Record<string, Record<string, number>>;
  peakDrift: Record<string, Record<string, number>>;
}) {
  return (
    <div style={{ minWidth: "200px" }}>
      <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>
        {formatStoryLabel(storyId, elevationIn)}
      </div>
      <div className="text-xs text-neutral-500" style={{ marginBottom: "6px" }}>
        Interstory drift values use absolute values.
      </div>
      {corners.map((corner) => {
        const current = Math.abs(currentDrifts[storyId]?.[corner] || 0);
        const peak = Math.abs(peakDrift[storyId]?.[corner] || 0);

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
              <span style={{ fontWeight: 500 }}>{current.toFixed(2)} %</span>
              <span style={{ color: "#9ca3af", fontSize: "10px", marginLeft: "6px" }}>/ {peak.toFixed(2)} %</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const corners: Array<keyof typeof cornerColors> = ["NW", "NE", "SW", "SE"];

export function InterstoryDriftChart({ api }: InterstoryDriftChartProps = {}) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { precomputed } = animationData;
  const { getVisibleStoryOrder } = useFloorVisibility();
  const setPanelState = useViewStore((s) => s.setPanelState);
  const chartRef = useRef<ReactECharts>(null);
  const [chartReadyVersion, setChartReadyVersion] = useState(0);

  const panelId = api?.id ?? "interstory-drift-chart";
  const defaultState = getDefaultInterstoryDriftChartPanelState();
  const savedPanelState = useViewStore((s) => s.panelStates[panelId]);
  const panelState = savedPanelState?.type === "interstoryDriftChart" ? savedPanelState.state : defaultState;
  const visibleCorners = panelState.visibleCorners;

  // Listen to legend changes from ECharts
  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    const handleLegendChange = () => {
      const option = chart.getOption() as { legend?: Array<{ selected?: Record<string, boolean> }> };
      if (option && option.legend && option.legend[0] && option.legend[0].selected) {
        const selected = Object.entries(option.legend[0].selected)
          .filter(([_, isVisible]) => isVisible)
          .map(([name]) => name);
        setPanelState(panelId, "interstoryDriftChart", { visibleCorners: selected });
      }
    };

    chart.on("legendselectchanged", handleLegendChange);
    return () => {
      chart.off("legendselectchanged", handleLegendChange);
    };
  }, [chartReadyVersion, panelId, setPanelState]);

  // Static configuration that doesn't change with frameIndex
  const staticConfig = useMemo(() => {
    const { storyHeights } = animationData.metadata;
    const { storyElevations } = precomputed;
    const { peakStoryDrift } = precomputed;
    const visibleStoryOrder = getVisibleStoryOrder();
    const fullStoryOrder = animationData.metadata.storyOrder;
    const storyOrderWithoutGround = visibleStoryOrder.filter((storyId) => {
      const storyIndex = fullStoryOrder.indexOf(storyId);
      return storyIndex > 0 && peakStoryDrift[storyId] !== undefined;
    });

    const yAxisData = storyOrderWithoutGround.map((storyId) => {
      const elevationIn = storyElevations[storyId] ?? storyHeights[storyId] ?? 0;
      return formatStoryLabel(storyId, elevationIn);
    });

    // Pre-compute max peak ratio
    let maxPeakRatio = 0.0001;
    storyOrderWithoutGround.forEach((storyId) => {
      const peakCornerDrifts = [
        Math.abs(peakStoryDrift[storyId]?.NW || 0),
        Math.abs(peakStoryDrift[storyId]?.NE || 0),
        Math.abs(peakStoryDrift[storyId]?.SW || 0),
        Math.abs(peakStoryDrift[storyId]?.SE || 0),
      ];
      maxPeakRatio = Math.max(maxPeakRatio, ...peakCornerDrifts);
    });

    return {
      storyOrderWithoutGround,
      yAxisData,
      maxPeakRatio,
      peakStoryDrift,
      storyHeights,
      storyElevations,
    };
  }, [animationData.metadata, precomputed, getVisibleStoryOrder]);

  const { storyOrderWithoutGround, yAxisData, maxPeakRatio, peakStoryDrift, storyHeights, storyElevations } =
    staticConfig;

  // Current drifts that change with frameIndex
  // const [currentDrifts, setCurrentDrifts] = useState<Record<string, Record<string, number>>>({});

  const chartData = useMemo(() => {
    const { storyDrift } = precomputed;
    const storyOrder = animationData.metadata.storyOrder;
    const currentDrifts: Record<string, Record<string, number>> = {};
    let maxCurrentRatio = 0.0001;

    storyOrderWithoutGround.forEach((storyId) => {
      const storyIndex = storyOrder.indexOf(storyId);
      const cornerDrifts = storyDrift.getStoryDrift(storyIndex, frameIndex);
      currentDrifts[storyId] = {
        NW: Math.abs(cornerDrifts[0]),
        NE: Math.abs(cornerDrifts[1]),
        SW: Math.abs(cornerDrifts[2]),
        SE: Math.abs(cornerDrifts[3]),
      };
      maxCurrentRatio = Math.max(
        maxCurrentRatio,
        Math.abs(cornerDrifts[0]),
        Math.abs(cornerDrifts[1]),
        Math.abs(cornerDrifts[2]),
        Math.abs(cornerDrifts[3])
      );
    });

    return { currentDrifts, maxCurrentRatio };
  }, [precomputed, frameIndex, storyOrderWithoutGround, animationData.metadata.storyOrder]);

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
          const elevationIn = storyElevations[storyId] ?? storyHeights[storyId] ?? 0;

          return renderToString(
            <TooltipContent
              storyId={storyId}
              elevationIn={elevationIn}
              corners={corners}
              currentDrifts={currentDrifts}
              peakDrift={peakStoryDrift}
            />
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
  }, [storyOrderWithoutGround, yAxisData, storyHeights, storyElevations, peakStoryDrift, currentDrifts]);

  // Dynamic parts that change with frameIndex
  const seriesData = useMemo(() => {
    // Create peak series first (render behind)
    const peakSeries = corners.map((corner) => ({
      name: `${corner}`,
      type: "bar" as const,
      stack: corner,
      data: storyOrderWithoutGround.map((storyId) => {
        const peak = Math.abs(peakStoryDrift[storyId]?.[corner] || 0);
        const current = currentDrifts[storyId]?.[corner] ?? 0;
        return peak - current;
      }),
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
      data: storyOrderWithoutGround.map((storyId) => currentDrifts[storyId]?.[corner] ?? 0),
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
    const selected: Record<string, boolean> = {};
    corners.forEach((corner) => {
      selected[corner] = visibleCorners.includes(corner);
    });

    return {
      ...baseOption,
      legend: {
        ...baseOption.legend,
        selected,
      },
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
          formatter: (value: number) => value.toFixed(2),
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
  }, [baseOption, seriesData, xAxisMax, visibleCorners]);

  return (
    <div className="h-full w-full">
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "svg" }}
        onChartReady={() => setChartReadyVersion((v) => v + 1)}
      />
    </div>
  );
}
