/**
 * HistogramChart Component
 * =============================================================================
 *
 * PURPOSE:
 * Shows the spatial distribution of nodes exceeding a threshold value.
 * This helps identify which parts of the building (by position) experience
 * the most extreme responses.
 *
 * WHAT IT SHOWS:
 * - X-axis: Initial position of nodes along selected axis (X, Y, or Z)
 * - Y-axis: Count of nodes exceeding the threshold
 * - Multiple value types can be selected (displacement, velocity, acceleration, ISD)
 *
 * DATA SOURCES:
 * - Initial positions: animationData.initialPositions
 * - Displacement: animationData.displacementLin
 * - Velocity: animationData.velocityLin (if available)
 * - Acceleration: animationData.accelerationLin (if available)
 * - Story drift: animationData.precomputed.storyDrift
 *
 * UNITS:
 * - Position: inches
 * - Displacement threshold: inches
 * - Velocity threshold: inches/second
 * - Acceleration threshold: inches/second²
 * - ISD threshold: percentage
 *
 * IMPORTANCE:
 * Helps engineers identify if certain regions of the building (e.g., corners,
 * specific floors) are more prone to exceeding response thresholds, which
 * can indicate localized structural issues.
 * =============================================================================
 */

import { usePlayback } from "@/components/playback/PlaybackContext";
import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useThresholds, useFloorVisibility, useColor } from "@/contexts/visualization";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import type { ThresholdType } from "@/stores/viewStore";
import type { EChartsOption } from "echarts";
import { COLOR_SCALES } from "@/lib/colors";
import { renderToString } from "react-dom/server";

const POSITION_AXIS_CONFIG = {
  x: { id: "x", label: "X Position", color: "#f87171" },
  y: { id: "y", label: "Y Position", color: "#4ade80" },
  z: { id: "z", label: "Z Position (Elevation)", color: "#60a5fa" },
} as const;

type PositionAxis = keyof typeof POSITION_AXIS_CONFIG;

function SimpleSelect<T extends string>({
  options,
  value,
  onChange,
  labelFn,
}: {
  options: readonly T[];
  value: T;
  onChange: (val: T) => void;
  labelFn: (val: T) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="xs" className="min-w-20">
          <span className="truncate flex-1">{labelFn(value)}</span>
          <ChevronDown
            className={`w-3 h-3 text-neutral-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        <div className="flex flex-col gap-0.5">
          {options.map((opt) => (
            <Label
              key={opt}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                value === opt ? "bg-blue-50 text-blue-700" : ""
              }`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}>
              {labelFn(opt)}
            </Label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TooltipContent({
  positionLabel,
  positionValue,
  exceeding,
  total,
  exceedingPercentage,
}: {
  positionLabel: string;
  positionValue: number;
  exceeding: number;
  total: number;
  exceedingPercentage: string;
}) {
  return (
    <div style={{ minWidth: "180px" }}>
      <div style={{ fontWeight: 600, marginBottom: "6px", fontSize: "12px" }}>
        {positionLabel}: {positionValue.toFixed(1)} in
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
        <span style={{ color: "#6b7280", fontSize: "11px" }}>Exceeding:</span>
        <span style={{ fontWeight: 500, fontSize: "11px" }}>
          {exceeding} / {total} ({exceedingPercentage}%)
        </span>
      </div>
    </div>
  );
}

export function HistogramChart() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { thresholds, setThreshold, thresholdUnits } = useThresholds();
  const { visibleFloors } = useFloorVisibility();
  const { availableMetrics } = useColor();

  const valueOptions = useMemo(() => {
    return availableMetrics.map((metric) => {
      let thresholdKey: ThresholdType;
      let dataKey: string;

      switch (metric) {
        case "displacement":
          thresholdKey = "displacement";
          dataKey = "displacement";
          break;
        case "displacement-x":
          thresholdKey = "displacementX";
          dataKey = "displacementX";
          break;
        case "displacement-y":
          thresholdKey = "displacementY";
          dataKey = "displacementY";
          break;
        case "displacement-z":
          thresholdKey = "displacementZ";
          dataKey = "displacementZ";
          break;
        case "velocity":
          thresholdKey = "velocity";
          dataKey = "velocity";
          break;
        case "velocity-x":
          thresholdKey = "velocityX";
          dataKey = "velocityX";
          break;
        case "velocity-y":
          thresholdKey = "velocityY";
          dataKey = "velocityY";
          break;
        case "velocity-z":
          thresholdKey = "velocityZ";
          dataKey = "velocityZ";
          break;
        case "acceleration":
          thresholdKey = "acceleration";
          dataKey = "acceleration";
          break;
        case "acceleration-x":
          thresholdKey = "accelerationX";
          dataKey = "accelerationX";
          break;
        case "acceleration-y":
          thresholdKey = "accelerationY";
          dataKey = "accelerationY";
          break;
        case "acceleration-z":
          thresholdKey = "accelerationZ";
          dataKey = "accelerationZ";
          break;
        case "story-drift":
          thresholdKey = "interstoryDrift";
          dataKey = "interstoryDrift";
          break;
        default:
          thresholdKey = "displacement";
          dataKey = "displacement";
      }

      return {
        id: metric,
        label: COLOR_SCALES[metric].label,
        unit: COLOR_SCALES[metric].unit,
        thresholdKey,
        dataKey,
      };
    });
  }, [availableMetrics]);

  const [positionAxis, setPositionAxis] = useState<PositionAxis>("x");
  const [valueType, setValueType] = useState<string>(() => {
    const defaultOption = valueOptions.find((v) => v.id === "displacement") ?? valueOptions[0];
    return defaultOption?.id ?? "displacement";
  });

  const staticConfig = useMemo(() => {
    const { nodeCount, stories, storyOrder } = animationData.metadata;
    const { initialPositions } = animationData;

    const getAxisIndex = (axis: PositionAxis) => (axis === "x" ? 0 : axis === "y" ? 1 : 2);
    const axisIdx = getAxisIndex(positionAxis);

    const nodeStoryMap: number[] = [];
    const positionValues: number[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const nodeStory = storyOrder.find((sid) => stories[sid]?.includes(i));
      if (!nodeStory || !visibleFloors.has(nodeStory)) continue;

      const pos = initialPositions.at(i);
      positionValues.push(pos[axisIdx]);
      nodeStoryMap.push(storyOrder.indexOf(nodeStory));
    }

    const minPos = positionValues.length > 0 ? Math.min(...positionValues) : 0;
    const maxPos = positionValues.length > 0 ? Math.max(...positionValues) : 1;
    const range = maxPos - minPos || 1;

    const bins = 25;
    const binWidth = range / bins;
    const binEdges: number[] = [];
    for (let i = 0; i <= bins; i++) {
      binEdges.push(minPos + i * binWidth);
    }

    return {
      positionValues,
      nodeStoryMap,
      binEdges,
      bins,
      binWidth,
      minPos,
      maxPos,
    };
  }, [animationData, visibleFloors, positionAxis]);

  const histogramData = useMemo(() => {
    const { displacementLin, velocityLin, accelerationLin, precomputed } = animationData;
    const { binEdges, bins, binWidth, minPos, nodeStoryMap, positionValues } = staticConfig;
    const currentOption = valueOptions.find((v) => v.id === valueType) ?? valueOptions[0];
    const threshold = thresholds[currentOption?.thresholdKey as ThresholdType] ?? 0;

    const frameData = displacementLin.atFrame(frameIndex);
    const velFrameData = velocityLin?.atFrame(frameIndex);
    const accelFrameData = accelerationLin?.atFrame(frameIndex);

    const getNodeValue = (nodeIdx: number): number | null => {
      const dataKey = currentOption?.dataKey ?? "displacement";

      switch (dataKey) {
        case "displacement": {
          const pos = frameData.at(nodeIdx);
          return Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
        }
        case "displacementX": {
          const pos = frameData.at(nodeIdx);
          return Math.abs(pos[0]);
        }
        case "displacementY": {
          const pos = frameData.at(nodeIdx);
          return Math.abs(pos[1]);
        }
        case "displacementZ": {
          const pos = frameData.at(nodeIdx);
          return Math.abs(pos[2]);
        }
        case "velocity": {
          if (!velFrameData) return null;
          const vel = velFrameData.at(nodeIdx);
          return Math.sqrt(vel[0] ** 2 + vel[1] ** 2 + vel[2] ** 2);
        }
        case "velocityX": {
          if (!velFrameData) return null;
          const vel = velFrameData.at(nodeIdx);
          return Math.abs(vel[0]);
        }
        case "velocityY": {
          if (!velFrameData) return null;
          const vel = velFrameData.at(nodeIdx);
          return Math.abs(vel[1]);
        }
        case "velocityZ": {
          if (!velFrameData) return null;
          const vel = velFrameData.at(nodeIdx);
          return Math.abs(vel[2]);
        }
        case "acceleration": {
          if (!accelFrameData) return null;
          const accel = accelFrameData.at(nodeIdx);
          return Math.sqrt(accel[0] ** 2 + accel[1] ** 2 + accel[2] ** 2);
        }
        case "accelerationX": {
          if (!accelFrameData) return null;
          const accel = accelFrameData.at(nodeIdx);
          return Math.abs(accel[0]);
        }
        case "accelerationY": {
          if (!accelFrameData) return null;
          const accel = accelFrameData.at(nodeIdx);
          return Math.abs(accel[1]);
        }
        case "accelerationZ": {
          if (!accelFrameData) return null;
          const accel = accelFrameData.at(nodeIdx);
          return Math.abs(accel[2]);
        }
        case "interstoryDrift": {
          const nodeStoryIdx = nodeStoryMap[nodeIdx];
          if (nodeStoryIdx <= 0) return null;
          const drifts = precomputed.storyDrift.getStoryDrift(nodeStoryIdx, frameIndex);
          return Math.max(...drifts);
        }
        default:
          return null;
      }
    };

    const totalCounts = new Array(bins).fill(0);
    const exceedingCounts = new Array(bins).fill(0);

    for (let i = 0; i < positionValues.length; i++) {
      const nodeValue = getNodeValue(i);
      if (nodeValue === null) continue;

      const binIndex = Math.min(Math.max(Math.floor((positionValues[i] - minPos) / binWidth), 0), bins - 1);
      totalCounts[binIndex]++;

      if (nodeValue >= threshold) {
        exceedingCounts[binIndex]++;
      }
    }

    const exceedingCount = exceedingCounts.reduce((a, b) => a + b, 0);
    const totalCount = totalCounts.reduce((a, b) => a + b, 0);

    return {
      binEdges,
      totalCounts,
      exceedingCounts,
      exceedingCount,
      totalCount,
      percentage: ((exceedingCount / totalCount) * 100).toFixed(1),
    };
  }, [animationData, staticConfig, frameIndex, valueType, valueOptions, thresholds]);

  // Base option - static parts
  const baseOption: EChartsOption = useMemo((): EChartsOption => {
    const posLabel = POSITION_AXIS_CONFIG[positionAxis].label;
    const currentOption = valueOptions.find((v) => v.id === valueType) ?? valueOptions[0];

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 12,
        textStyle: { color: "#374151", fontSize: 11 },
        axisPointer: { type: "shadow" },
        transitionDuration: 0,
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";
          const totalSeries = params[0].data as [number, number]; // Just the first series
          const exceedingThresholdSeries = params[1].data as [number, number];

          const pos = totalSeries[0];
          const total = totalSeries[1];
          const exceeding = exceedingThresholdSeries[1];
          const pct = total > 0 ? ((exceeding / total) * 100).toFixed(1) : "0";

          return renderToString(
            <TooltipContent
              positionLabel={posLabel}
              positionValue={pos}
              exceeding={exceeding}
              total={total}
              exceedingPercentage={pct}
            />,
          );
        },
      },
      grid: {
        left: 60,
        right: 20,
        top: 40,
        bottom: 40,
      },
      title: {
        text: `Nodes Exceeding ${currentOption?.label ?? "Value"} Threshold`,
        left: 60,
        top: 5,
        textStyle: { fontSize: 12, fontWeight: "bold", color: "#374151" },
      },
      xAxis: {
        type: "value",
        name: posLabel,
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: { fontSize: 11, color: "#4b5563" },
        min: Math.floor(staticConfig.minPos / 12) * 12,
        max: Math.ceil(staticConfig.maxPos / 12) * 12,
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: {
          color: "#6b7280",
          fontSize: 10,
          formatter: (v: number) => (v / 12).toFixed(0) + " ft",
        },
        splitLine: { show: true, lineStyle: { color: "#f3f4f6" } },
      },
      yAxis: {
        type: "value",
        name: "Node Count",
        nameLocation: "middle",
        nameGap: 40,
        nameTextStyle: { fontSize: 11, color: "#4b5563" },
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#6b7280", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      },
      animation: false,
    };
  }, [positionAxis, valueType, valueOptions, staticConfig]);

  // Series data - dynamic parts
  const seriesData = useMemo(() => {
    const { binEdges, totalCounts, exceedingCounts } = histogramData;

    const barData = binEdges.slice(0, -1).map((edge, i) => ({
      value: [(edge + binEdges[i + 1]) / 2, exceedingCounts[i], totalCounts[i]],
    }));

    return [
      {
        name: "Total Nodes",
        type: "bar" as const,
        data: barData.map((d) => [d.value[0], d.value[2]]),
        itemStyle: { color: "#e5e7eb", opacity: 0.5 },
        emphasis: { itemStyle: { color: "#9ca3af", opacity: 0.7 } },
        barGap: "-100%",
        z: 1,
        silent: true,
      },
      {
        name: "Exceeding Threshold",
        type: "bar" as const,
        data: barData.map((d) => [d.value[0], d.value[1]]),
        itemStyle: { color: POSITION_AXIS_CONFIG[positionAxis].color, opacity: 0.9 },
        emphasis: { itemStyle: { color: POSITION_AXIS_CONFIG[positionAxis].color, opacity: 1 } },
        z: 2,
      },
    ];
  }, [histogramData, positionAxis]);

  // Final option combining base and series
  const option: EChartsOption = useMemo(() => {
    return {
      ...baseOption,
      series: seriesData,
    };
  }, [baseOption, seriesData]);

  const currentValueOption = valueOptions.find((v) => v.id === valueType) ?? valueOptions[0];
  const thresholdKey = (currentValueOption?.thresholdKey ?? "displacement") as ThresholdType;
  const precomputed = animationData.precomputed;

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm text-neutral-700">
            <span className="font-medium">Threshold Histogram</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-neutral-500">Position:</span>
            <SimpleSelect
              options={["x", "y", "z"] as const}
              value={positionAxis}
              onChange={setPositionAxis}
              labelFn={(v) => POSITION_AXIS_CONFIG[v].label}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-500">Value:</span>
            <SimpleSelect
              options={valueOptions.map((v) => v.id) as readonly string[]}
              value={valueType}
              onChange={(val) => setValueType(val)}
              labelFn={(v) => valueOptions.find((opt) => opt.id === v)?.label ?? v}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600">
          <span>
            Threshold: {thresholds[thresholdKey].toFixed(3)} {thresholdUnits[thresholdKey]}
          </span>
          <input
            type="range"
            min={0}
            max={
              currentValueOption?.dataKey === "interstoryDrift"
                ? Math.max(precomputed.maxStoryDrift * 1.2, 0.5)
                : currentValueOption?.dataKey?.startsWith("velocity")
                  ? Math.max((precomputed[`max${currentValueOption.dataKey.charAt(0).toUpperCase() + currentValueOption.dataKey.slice(1)}` as keyof typeof precomputed] as number ?? 1) * 1.2, 1)
                  : currentValueOption?.dataKey?.startsWith("acceleration")
                    ? Math.max((precomputed[`max${currentValueOption.dataKey.charAt(0).toUpperCase() + currentValueOption.dataKey.slice(1)}` as keyof typeof precomputed] as number ?? 2) * 1.2, 2)
                    : currentValueOption?.dataKey?.startsWith("displacement")
                      ? Math.max((precomputed[`max${currentValueOption.dataKey.charAt(0).toUpperCase() + currentValueOption.dataKey.slice(1)}` as keyof typeof precomputed] as number ?? 0.1) * 1.2, 0.1)
                      : Math.max(precomputed.maxDisplacement * 1.2, 0.1)
            }
            step={currentValueOption?.dataKey === "interstoryDrift" ? 0.01 : 0.05}
            value={thresholds[thresholdKey]}
            onChange={(e) => setThreshold(thresholdKey, parseFloat(e.target.value))}
            className="w-24 h-1"
          />
          <span className="ml-auto">
            {histogramData.exceedingCount} / {histogramData.totalCount} nodes ({histogramData.percentage}%)
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
      </div>
    </div>
  );
}
