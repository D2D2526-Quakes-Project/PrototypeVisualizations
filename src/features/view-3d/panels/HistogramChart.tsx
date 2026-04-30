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

import { usePlayback } from "@/features/playback/PlaybackContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useColor, useFloorVisibility, useThresholds } from "@/features/view-3d/contexts/visualization";
import { getDefaultHistogramChartPanelState } from "@/features/view-3d/lib/statePersistence";
import { useAnimationData } from "@/lib/useAnimationData";
import { isHingeMetric, METRIC_CONFIGS, type Metric } from "@/lib/metrics";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { renderToString } from "react-dom/server";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import type { IDockviewPanelProps } from "dockview";
import { useViewStore } from "@/state";

const POSITION_AXIS_CONFIG = {
  x: { id: "x", label: "X Position", color: "#f87171" },
  y: { id: "y", label: "Y Position", color: "#fb7185" },
  z: { id: "z", label: "Z Position (Elevation)", color: "#60a5fa" },
} as const;

type PositionAxis = keyof typeof POSITION_AXIS_CONFIG;

interface HistogramChartProps {
  initialMetric?: Metric;
  metricOptions?: Metric[];
  title?: string;
  api?: IDockviewPanelProps["api"];
  params?: {
    initialMetric?: Metric;
  };
}

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
          <span className="flex-1 truncate">{labelFn(value)}</span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        <div className="flex flex-col gap-0.5">
          {options.map((opt) => (
            <Label
              key={opt}
              className={`hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
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

export function HistogramChart({
  initialMetric = "displacementMag",
  metricOptions,
  title = "Threshold Histogram",
  api,
  params,
}: HistogramChartProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  // const { thresholds, setThreshold } = useThresholds();
  const { thresholds } = useThresholds();
  const { visibleFloors } = useFloorVisibility();
  const { availableMetrics } = useColor();
  const setPanelState = useViewStore((s) => s.setPanelState);
  const panelId = api?.id ?? "histogram-chart";
  const savedPanelState = useViewStore((s) => s.panelStates[panelId]);
  const defaultState = getDefaultHistogramChartPanelState();
  const savedState = savedPanelState?.type === "histogramChart" ? savedPanelState.state : defaultState;
  const seededMetric = typeof params?.initialMetric === "string" ? params.initialMetric : undefined;

  const [positionAxis, setPositionAxis] = useState<PositionAxis>(() =>
    savedState.positionAxis === "x" || savedState.positionAxis === "y" || savedState.positionAxis === "z"
      ? savedState.positionAxis
      : "x"
  );
  const filteredMetrics = useMemo(() => {
    const allowed = metricOptions
      ? availableMetrics.filter((metric) => metricOptions.includes(metric) && !isHingeMetric(metric))
      : availableMetrics.filter((metric) => !isHingeMetric(metric));
    return allowed.length > 0 ? allowed : availableMetrics;
  }, [availableMetrics, metricOptions]);
  const [valueType, setValueType] = useState<Metric>(() => {
    const candidate = savedState.valueType;
    if (savedPanelState?.type === "histogramChart" && typeof candidate === "string" && candidate in METRIC_CONFIGS) {
      return candidate as Metric;
    }
    return seededMetric && seededMetric in METRIC_CONFIGS ? (seededMetric as Metric) : initialMetric;
  });

  useEffect(() => {
    if (filteredMetrics.includes(valueType)) {
      return;
    }

    if (filteredMetrics.length > 0) {
      setValueType(filteredMetrics[0]);
    }
  }, [filteredMetrics, valueType]);

  useEffect(() => {
    setPanelState(panelId, "histogramChart", { positionAxis, valueType });
  }, [panelId, positionAxis, setPanelState, valueType]);

  const staticConfig = useMemo(() => {
    const { nodeCount, stories, storyOrder } = animationData.metadata;
    const { initialPositions } = animationData;

    const getAxisIndex = (axis: PositionAxis) => (axis === "x" ? 0 : axis === "y" ? 1 : 2);
    const axisIdx = getAxisIndex(positionAxis);

    const nodeStoryMap: number[] = [];
    const positionValues: number[] = [];
    const filteredNodeIds: number[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const nodeStory = storyOrder.find((sid) => stories[sid]?.includes(i));
      if (!nodeStory || !visibleFloors.has(nodeStory)) continue;

      const pos = initialPositions.at(i);
      positionValues.push(pos[axisIdx]);
      nodeStoryMap.push(storyOrder.indexOf(nodeStory));
      filteredNodeIds.push(i);
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
      filteredNodeIds,
      binEdges,
      bins,
      binWidth,
      minPos,
      maxPos,
    };
  }, [animationData, visibleFloors, positionAxis]);

  const histogramData = useMemo(() => {
    const { binEdges, bins, binWidth, minPos, positionValues, filteredNodeIds } = staticConfig;
    const config = METRIC_CONFIGS[valueType];
    const threshold = thresholds[config.thresholdKey];
    const thresholdMagnitude = Math.abs(threshold);

    const getNodeValue = (nodeId: number): number | null => {
      const value = config.getValue(animationData, frameIndex, nodeId);
      if (value === undefined) return null;
      return value;
    };

    const totalCounts = new Array(bins).fill(0);
    const exceedingCounts = new Array(bins).fill(0);

    for (let i = 0; i < positionValues.length; i++) {
      const nodeValue = getNodeValue(filteredNodeIds[i]);
      if (nodeValue === null) continue;

      const binIndex = Math.min(Math.max(Math.floor((positionValues[i] - minPos) / binWidth), 0), bins - 1);
      totalCounts[binIndex]++;

      const exceedsThreshold = Math.abs(nodeValue) >= thresholdMagnitude;
      if (exceedsThreshold) {
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
  }, [animationData, staticConfig, frameIndex, valueType, thresholds]);

  // Base option - static parts
  const baseOption: EChartsOption = useMemo((): EChartsOption => {
    const posLabel = POSITION_AXIS_CONFIG[positionAxis].label;
    const config = METRIC_CONFIGS[valueType];

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
            />
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
        text: `Nodes Exceeding ${config.label ?? "Value"} Threshold`,
        left: 60,
        top: 5,
        textStyle: { fontSize: 12, fontWeight: "bold", color: "#374151" },
      },
      legend: {
        right: 20,
        top: 8,
        data: ["Total Nodes", "Exceeding Threshold"],
        textStyle: { fontSize: 10, color: "#4b5563" },
      },
      xAxis: {
        type: "value",
        name: `${posLabel} (in)`,
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: { fontSize: 11, color: "#4b5563" },
        min: Math.floor(staticConfig.minPos / 12) * 12,
        max: Math.ceil(staticConfig.maxPos / 12) * 12,
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: {
          color: "#6b7280",
          fontSize: 10,
          formatter: (v: number) => `${v.toFixed(0)} in`,
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
  }, [positionAxis, valueType, staticConfig]);

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
        itemStyle: { color: "#dc2626", opacity: 0.9 },
        emphasis: { itemStyle: { color: "#b91c1c", opacity: 1 } },
        z: 2,
      },
    ];
  }, [histogramData]);

  // Final option combining base and series
  const option: EChartsOption = useMemo(() => {
    return {
      ...baseOption,
      series: seriesData,
    };
  }, [baseOption, seriesData]);

  const config = METRIC_CONFIGS[valueType];

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="z-20 shrink-0 border-b border-neutral-100 bg-white px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-neutral-700">
            <span className="font-medium">{title}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
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
              options={filteredMetrics}
              value={valueType}
              onChange={(val) => setValueType(val)}
              labelFn={(v) => METRIC_CONFIGS[v].label}
            />
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
          <span>
            Threshold: <UnitTooltip value={thresholds[config.thresholdKey]} unit={config.unit.abbr} />
          </span>
          {/* TODO: Input for threshold */}
          <span className="ml-auto">
            {histogramData.exceedingCount} / {histogramData.totalCount} nodes ({histogramData.percentage}%)
          </span>
        </div>
      </div>
      <div className="min-h-0 w-full flex-1">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
      </div>
    </div>
  );
}
