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

import { usePlayback } from "@/features/playback/usePlayback";
import ReactECharts from "echarts-for-react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useThresholds } from "@/features/3d/contexts/visualization";
import { usePanelState } from "@/features/dockview/usePanelState";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import { renderToString } from "react-dom/server";
import { formatFixed3 } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import { getMetricKeyColor } from "@/lib/metrics";
import type { EChartsOption } from "echarts";
import type { IDockviewPanelProps } from "dockview";

const CHANNEL_CONFIG = {
  x: { id: "x", label: "X Velocity", shortName: "X", metric: "velocityX", unit: "in/s", thresholdKey: "velocity" },
  y: { id: "y", label: "Y Velocity", shortName: "Y", metric: "velocityY", unit: "in/s", thresholdKey: "velocity" },
  z: { id: "z", label: "Z Velocity", shortName: "Z", metric: "velocityZ", unit: "in/s", thresholdKey: "velocity" },
  magnitude: {
    id: "magnitude",
    label: "Speed",
    shortName: "Spd",
    metric: "velocityMag",
    unit: "in/s",
    thresholdKey: "velocity",
  },
} as const;

type ChannelKey = keyof typeof CHANNEL_CONFIG;
type VelocityTimeChartPanelState = {
  selectedKeys: ChannelKey[];
};

const DEFAULT_VELOCITY_TIME_CHART_PANEL_STATE: VelocityTimeChartPanelState = {
  selectedKeys: ["magnitude"],
};
const CHANNEL_ORDER: ChannelKey[] = ["x", "y", "z", "magnitude"];

function TooltipContent({
  frame,
  time,
  values,
}: {
  frame: number;
  time: number;
  values: Array<{ name: string; color: string; value: number; unit: string }>;
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
        Frame {frame} <span style={{ fontWeight: 400, color: "#9ca3af" }}>|</span> {formatNumber(time)} s
      </div>
      {values.map((item) => (
        <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
          <span style={{ color: "#6b7280", fontSize: "10px" }}>{item.name}:</span>
          <span style={{ fontWeight: 500, marginLeft: "auto", fontFamily: "monospace" }}>
            {formatNumber(item.value)} {item.unit}
          </span>
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
  options: { [K in ChannelKey]: (typeof CHANNEL_CONFIG)[K] & { color: string } };
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
          <span className="flex-1 truncate">{labelText}</span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
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
                className="text-foreground hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleOption(key)}
                  className="data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500"
                />
                <span className="flex-1">{opt.label}</span>
                <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: opt.color }} />
              </Label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function sanitizeSelectedKeys(value: unknown): ChannelKey[] {
  if (!Array.isArray(value)) return ["magnitude"];
  const valid = value.filter((v): v is ChannelKey => typeof v === "string" && CHANNEL_ORDER.includes(v as ChannelKey));
  return valid.length > 0 ? Array.from(new Set(valid)) : ["magnitude"];
}

export function VelocityTimeChart({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const { frameIndex, setFrameIndex } = usePlayback();
  const { thresholds } = useThresholds();
  const metricPaletteOverrides = useViewStore((s) => s.metricPaletteOverrides);
  const { state: savedState, setState: setSavedState } = usePanelState<VelocityTimeChartPanelState>({
    panelId: api?.id,
    fallbackPanelId: "velocity-time-chart",
    panelType: "velocityTimeChart",
    defaultState: DEFAULT_VELOCITY_TIME_CHART_PANEL_STATE,
  });
  const [selectedKeys, setSelectedKeys] = useState<ChannelKey[]>(() => sanitizeSelectedKeys(savedState.selectedKeys));
  const chartRef = useRef<ReactECharts>(null);
  const [isDragging, setIsDragging] = useState(false);
  const channelConfig = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(CHANNEL_CONFIG).map(([key, config]) => [
          key,
          { ...config, color: getMetricKeyColor(config.metric, metricPaletteOverrides) },
        ])
      ) as { [K in ChannelKey]: (typeof CHANNEL_CONFIG)[K] & { color: string } },
    [metricPaletteOverrides]
  );

  const maxFrame = animationData.metadata.frameCount - 1;

  const times = useMemo(() => {
    const t: number[] = [];
    for (let i = 0; i <= maxFrame; i++) {
      t.push(i * animationData.metadata.dt);
    }
    return t;
  }, [animationData, maxFrame]);

  const getChannelData = useCallback(
    (key: ChannelKey) => {
      const { precomputed } = animationData;
      if (!precomputed.avgVelocityPerFrame) return undefined;
      switch (key) {
        case "x":
          return { data: precomputed.avgVelocityPerFrame.x, config: channelConfig.x };
        case "y":
          return { data: precomputed.avgVelocityPerFrame.y, config: channelConfig.y };
        case "z":
          return { data: precomputed.avgVelocityPerFrame.z, config: channelConfig.z };
        case "magnitude":
        default:
          return { data: precomputed.avgVelocityPerFrame.mag, config: channelConfig.magnitude };
      }
    },
    [animationData, channelConfig]
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
      const channelData = getChannelData(key);
      if (!channelData) return;
      const { data, config } = channelData;

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
        text: `${config.label} (${config.unit})`,
        left: LEFT_MARGIN + 5,
        top: `${topPct}%`,
        textStyle: { fontSize: 11, fontWeight: "bold", color: config.color },
      });

      const seriesData: [number, number][] = Array.from(data, (v, i) => [times[i] ?? 0, v]);

      xAxes.push({
        gridIndex: index,
        type: "value",
        min: 0,
        max: maxFrame * animationData.metadata.dt,
        axisLine: { show: isLast, lineStyle: { color: "#d1d5db" } },
        axisLabel: { show: isLast, color: "#6b7280", fontSize: 10 },
        name: isLast ? "Time (s)" : undefined,
        nameLocation: "middle",
        nameGap: 26,
        nameTextStyle: { color: "#4b5563", fontSize: 10 },
        splitLine: { show: true, lineStyle: { color: "#f3f4f6" } },
      });

      yAxes.push({
        gridIndex: index,
        type: "value",
        name: config.unit,
        nameLocation: "end",
        nameGap: 8,
        nameTextStyle: { color: "#6b7280", fontSize: 10 },
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#6b7280", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      });

      const thresholdValue = thresholds[config.thresholdKey] ?? 0;

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
            color:
              channelConfig[p.seriesName?.toLowerCase().split(" ")[0] as ChannelKey]?.color ||
              (typeof p.color === "string" ? p.color : "#6b7280"),
            unit: channelConfig[p.seriesName?.toLowerCase().split(" ")[0] as ChannelKey]?.unit || "in/s",
            value: (p.data as number[])[1],
          }));
          return renderToString(<TooltipContent frame={frame} time={time} values={values} />);
        },
      },
      animation: false,
    };
  }, [selectedKeys, frameIndex, thresholds, animationData.metadata.dt, maxFrame, times, getChannelData, channelConfig]);

  useEffect(() => {
    setSavedState({ selectedKeys });
  }, [selectedKeys, setSavedState]);

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
    <div className="relative flex h-full w-full flex-col border-t-2 border-neutral-300 bg-white">
      <div className="relative z-20 shrink-0 border-b border-neutral-100 bg-white px-3 py-1.5">
        <div className="float-right mt-0.5 ml-2">
          <CheckSelect options={channelConfig} selected={selectedKeys} onChange={setSelectedKeys} />
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <span className="font-medium">Avg. Velocity</span>
          <span className="text-neutral-400">|</span>
          <span className="font-mono">Frame {frameIndex + 1}</span>
          <span className="text-neutral-400">|</span>
          <span className="font-mono">{formatFixed3(frameIndex * animationData.metadata.dt)} s</span>
          <span className="text-neutral-400">|</span>
          <span className="text-xs text-neutral-500">Units: in/s</span>
          <span className="text-neutral-400">|</span>
          <span className="text-xs text-neutral-500">
            Source:{" "}
            {animationData.precomputed.avgVelocityPerFrame
              ? "precomputed avg velocity"
              : animationData.velocityLin
                ? "velocityLin"
                : "derived from displacement"}
          </span>
        </div>
      </div>
      <div className="relative min-h-0 w-full flex-1" style={{ cursor: isDragging ? "grabbing" : "default" }}>
        {selectedKeys.length > 0 ? (
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            Select a channel to view
          </div>
        )}
      </div>
    </div>
  );
}
