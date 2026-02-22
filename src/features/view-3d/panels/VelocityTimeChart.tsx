/**
 * VelocityTimeChart Component
 * =============================================================================
 *
 * PURPOSE:
 * Shows the average velocity of all nodes over time, derived from
 * displacement data. Helps understand the rate of movement in the building.
 *
 * WHAT IT SHOWS:
 * - X-axis: Time (seconds)
 * - Y-axis: Average velocity (inches/second)
 * - Multiple lines for X, Y, Z components and speed (magnitude)
 * - Red vertical line: Current frame marker
 * - Scrubbing: Click/drag to change frame
 *
 * DATA SOURCES:
 * - Velocity: Derived from animationData.displacementLin
 * - Calculation: (pos[t] - pos[t-1]) / dt
 *
 * UNITS:
 * - Velocity: inches/second
 * - Time: seconds
 *
 * IMPORTANCE:
 * Velocity indicates how fast the building is moving. High velocities
 * can indicate rapid load changes. Used alongside displacement to
 * understand the dynamic response of the structure.
 * =============================================================================
 */

import { usePlayback } from "@/features/playback/PlaybackContext";
import ReactECharts from "echarts-for-react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useAnimationData } from "@/lib/useAnimationData";
import { useThresholds } from "@/features/view-3d/contexts/visualization";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import { renderToString } from "react-dom/server";
import { formatFixed3 } from "@/lib/utils";
import type { EChartsOption } from "echarts";

const CHANNEL_CONFIG = {
  x: { id: "x", label: "X Velocity", shortName: "X", color: "#f87171" },
  y: { id: "y", label: "Y Velocity", shortName: "Y", color: "#4ade80" },
  z: { id: "z", label: "Z Velocity", shortName: "Z", color: "#60a5fa" },
  magnitude: { id: "magnitude", label: "Speed", shortName: "Spd", color: "#fbbf24" },
} as const;

type ChannelKey = keyof typeof CHANNEL_CONFIG;
const CHANNEL_ORDER: ChannelKey[] = ["x", "y", "z", "magnitude"];

function TooltipContent({
  frame,
  time,
  values,
}: {
  frame: number;
  time: number;
  values: Array<{ name: string; color: string; value: number }>;
}) {
  return (
    <div style={{ minWidth: "180px" }}>
      <div
        style={{
          fontWeight: 600,
          marginBottom: "6px",
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: "4px",
          fontSize: "13px",
        }}>
        Frame {frame} <span style={{ fontWeight: 400, color: "#9ca3af" }}>|</span>{" "}
        {parseFloat(time.toString()).toFixed(3)}s
      </div>
      {values.map((item) => (
        <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
          <span style={{ color: "#6b7280", fontSize: "10px" }}>{item.name}:</span>
          <span style={{ fontWeight: 500, marginLeft: "auto", fontFamily: "monospace" }}>{item.value.toFixed(4)}</span>
        </div>
      ))}
    </div>
  );
}

function CheckSelect({
  options,
  selected,
  onChange,
}: {
  options: typeof CHANNEL_CONFIG;
  selected: ChannelKey[];
  onChange: (keys: ChannelKey[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggleOption = (key: ChannelKey) => {
    if (selected.includes(key)) {
      if (selected.length > 1) {
        onChange(selected.filter((k) => k !== key));
      }
    } else {
      onChange([...selected, key]);
    }
  };

  const labelText =
    selected.length === 0
      ? "Select"
      : CHANNEL_ORDER.filter((k) => selected.includes(k))
          .map((k) => options[k].shortName)
          .join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="xs" className="min-w-16">
          <span className="truncate flex-1">{labelText}</span>
          <ChevronDown
            className={`w-3 h-3 text-neutral-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <div className="flex flex-col gap-0.5">
          {CHANNEL_ORDER.map((key) => {
            const opt = options[key];
            const isChecked = selected.includes(key);
            return (
              <Label
                key={opt.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleOption(key)}
                  className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                <span className="flex-1">{opt.label}</span>
                <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: opt.color }} />
              </Label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function VelocityTimeChart() {
  const { animationData } = useAnimationData();
  const { frameIndex, setFrameIndex } = usePlayback();
  const { thresholds } = useThresholds();
  const [selectedKeys, setSelectedKeys] = useState<ChannelKey[]>(["magnitude"]);
  const chartRef = useRef<ReactECharts>(null);
  const [isDragging, setIsDragging] = useState(false);

  const maxFrame = animationData.metadata.frameCount - 1;

  const times = useMemo(() => {
    const t: number[] = [];
    for (let i = 0; i <= maxFrame; i++) {
      t.push(i * animationData.metadata.dt);
    }
    return t;
  }, [animationData, maxFrame]);

  const velocityData = useMemo(() => {
    const { nodeCount, frameCount } = animationData.metadata;
    const { displacementLin } = animationData;

    const avgVelX: number[] = [];
    const avgVelY: number[] = [];
    const avgVelZ: number[] = [];
    const avgSpeed: number[] = [];

    for (let frame = 1; frame < frameCount; frame++) {
      const prevFrame = displacementLin.atFrame(frame - 1);
      const currFrame = displacementLin.atFrame(frame);
      const dt = animationData.metadata.dt;

      let sumVx = 0,
        sumVy = 0,
        sumVz = 0;

      for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
        const prevPos = prevFrame.at(nodeIdx);
        const currPos = currFrame.at(nodeIdx);
        sumVx += (currPos[0] - prevPos[0]) / dt;
        sumVy += (currPos[1] - prevPos[1]) / dt;
        sumVz += (currPos[2] - prevPos[2]) / dt;
      }

      const count = nodeCount;
      avgVelX.push(sumVx / count);
      avgVelY.push(sumVy / count);
      avgVelZ.push(sumVz / count);
      avgSpeed.push(Math.sqrt((sumVx / count) ** 2 + (sumVy / count) ** 2 + (sumVz / count) ** 2));
    }

    return { avgVelX, avgVelY, avgVelZ, avgSpeed };
  }, [animationData]);

  const getChannelData = useCallback(
    (key: ChannelKey) => {
      switch (key) {
        case "x":
          return { data: velocityData.avgVelX, config: CHANNEL_CONFIG.x };
        case "y":
          return { data: velocityData.avgVelY, config: CHANNEL_CONFIG.y };
        case "z":
          return { data: velocityData.avgVelZ, config: CHANNEL_CONFIG.z };
        case "magnitude":
        default:
          return { data: velocityData.avgSpeed, config: CHANNEL_CONFIG.magnitude };
      }
    },
    [velocityData],
  );

  const option: EChartsOption = useMemo((): EChartsOption => {
    const activeKeys = CHANNEL_ORDER.filter((k) => selectedKeys.includes(k));
    const grids: EChartsOption["grid"] = [];
    const xAxes: EChartsOption["xAxis"] = [];
    const yAxes: EChartsOption["yAxis"] = [];
    const series: EChartsOption["series"] = [];
    const titles: EChartsOption["title"] = [];

    const LEFT_MARGIN = 45;
    const RIGHT_MARGIN = 20;
    const AVAILABLE_HEIGHT_PCT = 92;

    activeKeys.forEach((key, index) => {
      const { data, config } = getChannelData(key);
      const isLast = index === activeKeys.length - 1;
      const rowHeight = AVAILABLE_HEIGHT_PCT / activeKeys.length;
      const topPct = 2 + index * rowHeight;
      const heightPct = rowHeight - 6;

      grids.push({
        left: LEFT_MARGIN,
        right: RIGHT_MARGIN,
        top: `${topPct}%`,
        height: `${heightPct}%`,
        containLabel: false,
      });

      titles.push({
        text: config.label,
        left: LEFT_MARGIN + 5,
        top: `${topPct}%`,
        textStyle: { fontSize: 11, fontWeight: "bold", color: config.color },
      });

      const seriesData: [number, number][] = data.map((v, i) => [times[i + 1], v]);

      xAxes.push({
        gridIndex: index,
        type: "value",
        min: 0,
        max: maxFrame * animationData.metadata.dt,
        axisLine: { show: isLast, lineStyle: { color: "#d1d5db" } },
        axisLabel: { show: isLast, color: "#6b7280", fontSize: 10 },
        splitLine: { show: true, lineStyle: { color: "#f3f4f6" } },
      });

      yAxes.push({
        gridIndex: index,
        type: "value",
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#6b7280", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      });

      const thresholdValue =
        key === "magnitude"
          ? thresholds.velocityMag
          : key === "x"
            ? thresholds.velocityX
            : key === "y"
              ? thresholds.velocityY
              : key === "z"
                ? thresholds.velocityZ
                : 0;

      const markLineData: Array<{ xAxis?: number; yAxis?: number; name?: string }> = [
        { xAxis: frameIndex * animationData.metadata.dt },
      ];

      if (thresholdValue > 0) {
        markLineData.push({ yAxis: thresholdValue, name: "Threshold" });
      }

      series.push({
        name: config.label,
        type: "line",
        xAxisIndex: index,
        yAxisIndex: index,
        data: seriesData,
        symbol: "none",
        lineStyle: { color: config.color, width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: config.color + "40" },
              { offset: 1, color: config.color + "10" },
            ],
          },
        },
        markLine: {
          symbol: "none",
          data: markLineData,
          lineStyle: { color: "#ef4444", width: 1, type: "dashed" },
          label: { show: false },
          silent: true,
        },
      });
    });

    return {
      grid: grids,
      title: titles,
      xAxis: xAxes,
      yAxis: yAxes,
      series,
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 10,
        textStyle: { color: "#374151", fontSize: 11 },
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";
          const time = params[0].value as number;
          const frame = Math.round(time / animationData.metadata.dt);
          const values = params.map((p) => ({
            name: p.seriesName!,
            color: CHANNEL_CONFIG[p.seriesName?.toLowerCase().split(" ")[0] as ChannelKey]?.color || p.color,
            value: (p.data as number[])[1],
          }));
          return renderToString(<TooltipContent frame={frame} time={time} values={values} />);
        },
      },
      animation: false,
    };
  }, [selectedKeys, frameIndex, thresholds, animationData.metadata.dt, maxFrame, times, getChannelData]);

  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    const convertToFrame = (pixelX: number) => {
      const chartDom = chart.getDom();
      if (!chartDom) return null;
      const rect = chartDom.getBoundingClientRect();
      const pointInGrid = chart.convertFromPixel({ seriesIndex: 0 }, [pixelX - rect.left, 0]);
      if (!pointInGrid) return null;
      const time = pointInGrid[0];
      const frame = Math.round(time / animationData.metadata.dt);
      return Math.max(0, Math.min(maxFrame, frame));
    };

    const handleMouseDown = (e: MouseEvent) => {
      const newFrame = convertToFrame(e.clientX);
      if (newFrame !== null) {
        setIsDragging(true);
        setFrameIndex(newFrame);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newFrame = convertToFrame(e.clientX);
      if (newFrame !== null) setFrameIndex(newFrame);
    };

    const handleMouseUp = () => setIsDragging(false);

    const chartDom = chart.getDom();
    chartDom.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      chartDom.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, animationData.metadata.dt, maxFrame, setFrameIndex]);

  return (
    <div className="flex flex-col border-t-2 border-neutral-300 relative h-full w-full bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0 relative">
        <div className="float-right ml-2 mt-0.5">
          <CheckSelect options={CHANNEL_CONFIG} selected={selectedKeys} onChange={setSelectedKeys} />
        </div>
        <div className="text-sm text-neutral-700 flex items-center gap-2">
          <span className="font-medium">Avg. Velocity</span>
          <span className="text-neutral-400">|</span>
          <span className="font-mono">Frame {frameIndex + 1}</span>
          <span className="text-neutral-400">|</span>
          <span className="font-mono">{formatFixed3(frameIndex * animationData.metadata.dt)}s</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full relative" style={{ cursor: isDragging ? "grabbing" : "default" }}>
        {selectedKeys.length > 0 ? (
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-neutral-400 text-sm">
            Select a channel to view
          </div>
        )}
      </div>
    </div>
  );
}
