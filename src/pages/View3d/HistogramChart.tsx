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
import { useAnimationData } from "../../hooks/nodeDataHook";
import { useThresholds } from "@/contexts/visualization/ThresholdContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import type { EChartsOption } from "echarts";

const POSITION_AXIS_CONFIG = {
  x: { id: "x", label: "X Position", color: "#f87171" },
  y: { id: "y", label: "Y Position", color: "#4ade80" },
  z: { id: "z", label: "Z Position (Elevation)", color: "#60a5fa" },
} as const;

const VALUE_TYPE_CONFIG = {
  displacement: { id: "displacement", label: "Displacement", unit: "in" },
  velocity: { id: "velocity", label: "Velocity", unit: "in/s" },
  acceleration: { id: "acceleration", label: "Acceleration", unit: "in/s²" },
  interstoryDrift: { id: "interstoryDrift", label: "Interstory Drift", unit: "%" },
} as const;

type PositionAxis = keyof typeof POSITION_AXIS_CONFIG;
type ValueType = keyof typeof VALUE_TYPE_CONFIG;

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

export function HistogramChart() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { thresholds, setThreshold, thresholdUnits } = useThresholds();
  const [positionAxis, setPositionAxis] = useState<PositionAxis>("z");
  const [valueType, setValueType] = useState<ValueType>("displacement");

  const histogramData = useMemo(() => {
    const { nodeCount, stories, storyOrder } = animationData.metadata;
    const { displacementLin, velocityLin, accelerationLin, initialPositions, precomputed } = animationData;
    const threshold = thresholds[valueType];

    const frameData = displacementLin.atFrame(frameIndex);
    const velFrameData = velocityLin?.atFrame(frameIndex);
    const accelFrameData = accelerationLin?.atFrame(frameIndex);

    const bins = 25;

    const positionValues: number[] = [];
    const exceedingNodes: number[] = [];

    const getNodeValue = (nodeIdx: number): number | null => {
      switch (valueType) {
        case "displacement": {
          const pos = frameData.at(nodeIdx);
          return Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
        }
        case "velocity": {
          if (!velFrameData) return null;
          const vel = velFrameData.at(nodeIdx);
          return Math.sqrt(vel[0] ** 2 + vel[1] ** 2 + vel[2] ** 2);
        }
        case "acceleration": {
          if (!accelFrameData) return null;
          const accel = accelFrameData.at(nodeIdx);
          return Math.sqrt(accel[0] ** 2 + accel[1] ** 2 + accel[2] ** 2);
        }
        case "interstoryDrift": {
          const storyIdx = storyOrder.findIndex((id) => stories[id]?.includes(nodeIdx));
          if (storyIdx <= 0) return null;
          const drifts = precomputed.storyDrift.getStoryDrift(storyIdx, frameIndex);
          return Math.max(...drifts);
        }
        default:
          return null;
      }
    };

    for (let i = 0; i < nodeCount; i++) {
      const pos = initialPositions.at(i);
      const positionValue = pos[positionAxis === "x" ? 0 : positionAxis === "y" ? 1 : 2];
      positionValues.push(positionValue);

      const value = getNodeValue(i);
      if (value !== null && value >= threshold) {
        exceedingNodes.push(positionValue);
      }
    }

    const minPos = Math.min(...positionValues);
    const maxPos = Math.max(...positionValues);
    const range = maxPos - minPos || 1;
    const binWidth = range / bins;

    const binEdges: number[] = [];
    for (let i = 0; i <= bins; i++) {
      binEdges.push(minPos + i * binWidth);
    }

    const totalCounts = new Array(bins).fill(0);
    const exceedingCounts = new Array(bins).fill(0);

    positionValues.forEach((v) => {
      let binIndex = Math.floor((v - minPos) / binWidth);
      if (binIndex >= bins) binIndex = bins - 1;
      if (binIndex < 0) binIndex = 0;
      totalCounts[binIndex]++;
    });

    exceedingNodes.forEach((v) => {
      let binIndex = Math.floor((v - minPos) / binWidth);
      if (binIndex >= bins) binIndex = bins - 1;
      if (binIndex < 0) binIndex = 0;
      exceedingCounts[binIndex]++;
    });

    const exceedingCount = exceedingNodes.length;
    const totalCount = nodeCount;

    return {
      binEdges,
      totalCounts,
      exceedingCounts,
      exceedingCount,
      totalCount,
      percentage: ((exceedingCount / totalCount) * 100).toFixed(1),
    };
  }, [animationData, frameIndex, positionAxis, valueType, thresholds]);

  const option: EChartsOption = useMemo((): EChartsOption => {
    const { binEdges, totalCounts, exceedingCounts } = histogramData;

    const barData = binEdges.slice(0, -1).map((edge, i) => ({
      value: [(edge + binEdges[i + 1]) / 2, exceedingCounts[i], totalCounts[i]],
    }));

    const posLabel = POSITION_AXIS_CONFIG[positionAxis].label;
    const valLabel = VALUE_TYPE_CONFIG[valueType].label;

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
          const paramsData = params[0].data as { value: number[] };
          const [pos, exceeding, total] = paramsData.value as number[];
          const pct = total > 0 ? ((exceeding / total) * 100).toFixed(1) : "0";
          return `
            <div style="font-weight: 600; margin-bottom: 4px;">${posLabel}: ${pos.toFixed(1)} in</div>
            <div>Exceeding: ${exceeding} / ${total} (${pct}%)</div>
          `;
        },
      },
      grid: {
        left: 60,
        right: 20,
        top: 40,
        bottom: 40,
      },
      title: {
        text: `Nodes Exceeding ${valLabel} Threshold`,
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
        min: histogramData.binEdges[0],
        max: histogramData.binEdges[histogramData.binEdges.length - 1],
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#6b7280", fontSize: 10, formatter: (v: number) => (v / 12).toFixed(0) + " ft" },
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
      series: [
        {
          name: "Total Nodes",
          type: "bar",
          data: barData.map((d) => [d.value[0], d.value[2]]),
          itemStyle: { color: "#e5e7eb", opacity: 0.5 },
          barGap: "-100%",
          z: 1,
          silent: true,
        },
        {
          name: "Exceeding Threshold",
          type: "bar",
          data: barData.map((d) => [d.value[0], d.value[1]]),
          itemStyle: { color: POSITION_AXIS_CONFIG[positionAxis].color, opacity: 0.9 },
          z: 2,
        },
      ],
      animation: false,
    };
  }, [histogramData, positionAxis, valueType]);

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
              options={["displacement", "velocity", "acceleration", "interstoryDrift"] as const}
              value={valueType}
              onChange={setValueType}
              labelFn={(v) => VALUE_TYPE_CONFIG[v].label}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600">
          <span>
            Threshold: {thresholds[valueType].toFixed(3)} {thresholdUnits[valueType]}
          </span>
          <input
            type="range"
            min={valueType === "interstoryDrift" ? 0 : 0}
            max={valueType === "interstoryDrift" ? 5 : 10}
            step={valueType === "interstoryDrift" ? 0.01 : 0.05}
            value={thresholds[valueType]}
            onChange={(e) => setThreshold(valueType, parseFloat(e.target.value))}
            className="w-24 h-1"
          />
          <span className="ml-auto">
            {histogramData.exceedingCount} / {histogramData.totalCount} nodes ({histogramData.percentage}%)
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} />
      </div>
    </div>
  );
}
