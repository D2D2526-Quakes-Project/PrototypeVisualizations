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

import type { IDockviewPanelProps } from "dockview";
import { usePlayback } from "@/features/playback/PlaybackKeyboardEvents";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFloorVisibility } from "@/features/3d/contexts/visualization";
import { usePanelState } from "@/features/3d/hooks/usePanelState";
import { useAnimationData } from "@/lib/useAnimationData";
import {
  amber50,
  amber600,
  blue50,
  blue600,
  green50,
  green600,
  purple50,
  purple600,
  red50,
  red600,
} from "@/lib/colors/tailwindColors";
import { formatHex, interpolate } from "culori";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useRef, useState } from "react";

const CORNER_OPTIONS = ["NW", "NE", "SW", "SE", "Max"] as const;
type Corner = (typeof CORNER_OPTIONS)[number];
type StoryDriftHeatmapPanelState = {
  selectedCorners: string[];
  resolution: number;
};

const DEFAULT_STORY_DRIFT_HEATMAP_PANEL_STATE: StoryDriftHeatmapPanelState = {
  selectedCorners: ["NE"],
  resolution: 50,
};

const cornerColor: Record<Corner, [string, string]> = {
  NW: [blue50, blue600],
  NE: [red50, red600],
  SW: [green50, green600],
  SE: [amber50, amber600],
  Max: [purple50, purple600],
};

const purpleInterpolator = interpolate([purple50, purple600], "oklab");
const maxColorScale = [
  formatHex(purpleInterpolator(0))!,
  formatHex(purpleInterpolator(0.25))!,
  formatHex(purpleInterpolator(0.5))!,
  formatHex(purpleInterpolator(0.75))!,
  formatHex(purpleInterpolator(1))!,
];

const RESOLUTION_OPTIONS = [50, 100, 200, 400, 800, 1600] as const;
type Resolution = (typeof RESOLUTION_OPTIONS)[number];

function sanitizeSelectedCorners(value: unknown): Corner[] {
  if (!Array.isArray(value)) return ["Max"];

  const valid = value.filter(
    (v): v is Corner => typeof v === "string" && (CORNER_OPTIONS as readonly string[]).includes(v)
  );
  if (valid.length === 0) return ["Max"];

  if (valid.includes("Max")) return ["Max"];
  return Array.from(new Set(valid));
}

function sanitizeResolution(value: unknown): Resolution {
  return RESOLUTION_OPTIONS.includes(value as Resolution) ? (value as Resolution) : 200;
}

export function StoryDriftHeatmap({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { visibleFloors } = useFloorVisibility();
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  const { state: savedState, setState: setSavedState } = usePanelState<StoryDriftHeatmapPanelState>({
    panelId: api?.id,
    fallbackPanelId: "story-drift-heatmap",
    panelType: "storyDriftHeatmap",
    defaultState: DEFAULT_STORY_DRIFT_HEATMAP_PANEL_STATE,
  });

  const [selectedCorners, setSelectedCorner] = useState<Corner[]>(() =>
    sanitizeSelectedCorners(savedState.selectedCorners)
  );
  const [resolution, setResolution] = useState<Resolution>(() => sanitizeResolution(savedState.resolution));
  useEffect(() => {
    setSavedState({
      selectedCorners,
      resolution,
    });
  }, [resolution, selectedCorners, setSavedState]);

  const isMaxSelected = selectedCorners.includes("Max");
  const legendCorner = selectedCorners[0] ?? "Max";
  const visibleStories = useMemo(() => Array.from(visibleFloors).slice(1), [visibleFloors]);

  const heatmapData = useMemo(() => {
    const { peakStoryDrift } = animationData.precomputed;
    const timeStep = Math.max(1, Math.floor(animationData.metadata.frameCount / resolution));

    const data: Array<[number, number, number]> = [];
    const yAxisLabels: [string, string][] = [];

    // if (selectedCorner === "All") {

    let yIdx = 0;
    visibleStories.forEach((storyId) => {
      let corners = selectedCorners;
      if (isMaxSelected) {
        corners = ["NW", "NE", "SW", "SE"] as const;
      }
      const cornerNodes = animationData.metadata.cornerNodes[storyId];
      (corners as ("NW" | "NE" | "SW" | "SE")[]).forEach((corner) => {
        for (let frame = 0; frame < animationData.metadata.frameCount; frame += timeStep) {
          const drift = animationData.storyDrift.get(frame, cornerNodes[corner]);
          data.push([Math.floor(frame / timeStep), yIdx, drift]);
        }
        yAxisLabels.push([storyId, corner]);
        yIdx++;
      });
    });

    let maxValue: number;
    if (isMaxSelected) {
      maxValue = Math.max(
        ...visibleStories.map((storyId) => {
          const cornerNodes = animationData.metadata.cornerNodes[storyId];
          const nw = peakStoryDrift[cornerNodes.NW] ?? 0;
          const ne = peakStoryDrift[cornerNodes.NE] ?? 0;
          const sw = peakStoryDrift[cornerNodes.SW] ?? 0;
          const se = peakStoryDrift[cornerNodes.SE] ?? 0;
          return Math.max(nw, ne, sw, se);
        })
      );
    } else {
      maxValue = Math.max(
        ...visibleStories.flatMap((storyId) => {
          const cornerNodes = animationData.metadata.cornerNodes[storyId];
          return selectedCorners.map((corner) => (corner == "Max" ? 0 : (peakStoryDrift[cornerNodes[corner]] ?? 0)));
        })
      );
    }

    if (!Number.isFinite(maxValue) || maxValue <= 0) {
      maxValue = 1;
    }

    return {
      data,
      yAxisLabels,
      maxValue,
      timeStep,
      frameCount: Math.ceil(animationData.metadata.frameCount / timeStep),
      hasVisibleStories: visibleStories.length > 0,
    };
  }, [animationData, visibleStories, selectedCorners, resolution, isMaxSelected]);

  const baseOption: EChartsOption = useMemo((): EChartsOption => {
    const { data, yAxisLabels, maxValue, frameCount } = heatmapData;

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
          const [storyId, corner] = yAxisLabels[storyIdx];
          return `
            <div style="font-weight: 600;">Story ${storyId} ${corner}</div>
            <div>Frame: ${actualFrame + 1}</div>
            <div>Time: ${time.toFixed(1).replace(/\.0$/u, "")} s</div>
            ${isMaxSelected ? `<div>Max Drift: ${value.toFixed(2)}%</div>` : `<div>${corner} Drift: ${value.toFixed(2)}%</div>`}
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
          (i * heatmapData.timeStep * animationData.metadata.dt).toFixed(1)
        ),
        axisLabel: {
          color: "#6b7280",
          fontSize: 9,
          interval: Math.floor(frameCount / 8),
          formatter: (v: string) => `${v.replace(/\.0$/u, "")} s`,
        },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: "#d1d5db" } },
      },
      yAxis: {
        type: "category" as const,
        zlevel: 1,
        data: yAxisLabels.map(([storyId, corner]) => `${storyId} ${corner}`),
        axisLabel: { color: "#374151", fontSize: 10 },
        splitArea: {
          show: !isMaxSelected,
          interval: 0,
          areaStyle: {
            color: selectedCorners.map((c) => cornerColor[c][1]),
            // color: ["#e0f700", "#ff00c4"],
          },
        },
        axisLine: { lineStyle: { color: "#d1d5db" } },
      },
      visualMap: {
        type: "continuous",
        min: 0,
        max: maxValue,
        calculable: true,
        orient: "vertical",
        right: 5,
        top: "center",
        show: heatmapData.hasVisibleStories,
        inRange: {
          color: isMaxSelected ? maxColorScale : ["#fffffff0", "#FFFFFF00"],
          opacity: 1,
        },
        controller: {
          inRange: {
            color: cornerColor[legendCorner],
            opacity: 1,
          },
        },
        textStyle: { fontSize: 10 },
        // Drift values are already stored as percent in precomputed story drift data.
        formatter: (v) => `${(v as number).toFixed(1).replace(/\.0$/u, "")}%`,
      },
      series: [
        {
          zlevel: 1,
          name: "Story Drift",
          type: "heatmap",
          data: data,
          label: { show: false },
          emphasis: {
            itemStyle: {
              borderColor: "#333",
              borderWidth: 1,
            },
          },
        },
      ],
      animation: false,
    };
  }, [heatmapData, animationData.metadata.dt, selectedCorners, isMaxSelected, legendCorner]);

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
    <div className="flex h-full w-full flex-col bg-white">
      <div className="z-20 flex shrink-0 items-center justify-between border-b border-neutral-100 bg-white px-3 py-1.5">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Story Drift Heatmap</span>
          <span className="ml-2 text-neutral-400">- {selectedCorners.join(", ")} drift over time</span>
        </div>
        <div className="flex items-center gap-1">
          <ToggleGroup
            type="multiple"
            size="sm"
            variant="outline"
            value={selectedCorners}
            onValueChange={(v) => {
              if (v.length == 0) return;
              if (v.includes("Max") && v[0] != "Max") setSelectedCorner(["Max"]);
              else setSelectedCorner(v.filter((s) => s != "Max") as Corner[]);
            }}>
            {CORNER_OPTIONS.map((corner) => (
              <ToggleGroupItem key={corner} value={corner}>
                {corner}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="ml-2 text-xs text-neutral-400">Res:</span>
          <NativeSelect
            size="sm"
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value) as Resolution)}
            className="min-w-20">
            {RESOLUTION_OPTIONS.map((res) => (
              <NativeSelectOption key={res} value={res}>
                {res}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div ref={containerRef} className="relative min-h-0 w-full flex-1">
        <ReactECharts
          ref={chartRef}
          option={baseOption}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
        {!heatmapData.hasVisibleStories && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-neutral-600">
            No visible stories above ground. Show at least one non-ground floor to render the heatmap.
          </div>
        )}
        <div
          ref={playheadRef}
          className="pointer-events-none absolute top-0 bottom-8 w-0.5 bg-red-500"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      </div>
    </div>
  );
}
