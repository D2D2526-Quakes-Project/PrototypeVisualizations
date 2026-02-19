import type { IDockviewPanelProps } from "dockview";
import ReactECharts from "echarts-for-react";
import { type EChartsOption } from "echarts";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { useAnimationData } from "../hooks/nodeDataHook";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { usePlayback } from "./playback/PlaybackContext";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { formatFixed3 } from "@/lib/utils";

// Configuration for available data channels
const CHANNEL_CONFIG = {
  x: {
    id: "x",
    label: "X Ground Motion",
    shortName: "X",
    color: "#f87171", // red-400
  },
  y: {
    id: "y",
    label: "Y Ground Motion",
    shortName: "Y",
    color: "#4ade80", // green-400
  },
  z: {
    id: "z",
    label: "Z Ground Motion",
    shortName: "Z",
    color: "#60a5fa", // blue-400
  },
  magnitude: {
    id: "magnitude",
    label: "Ground Motion",
    shortName: "Mag",
    color: "#fbbf24", // amber-400
  },
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

// Custom Multi-Select Dropdown Component using shadcn Popover and Checkbox
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

  // Generate button label text
  const labelText = useMemo(() => {
    // Sort selected keys by fixed order for the label
    const sortedActive = CHANNEL_ORDER.filter((k) => selected.includes(k));
    if (sortedActive.length === 0) return "Select Channels";
    return sortedActive.map((k) => options[k].shortName).join(", ");
  }, [selected, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button title={labelText} variant={"outline"} size="xs" className="min-w-16">
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
            const isChecked = selected.includes(opt.id as ChannelKey);
            return (
              <Label
                key={opt.id}
                htmlFor={`channel-${opt.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                <Checkbox
                  id={`channel-${opt.id}`}
                  checked={isChecked}
                  onCheckedChange={() => toggleOption(opt.id as ChannelKey)}
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

export function Timeline({ api: _api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const { frameIndex, setFrameIndex } = usePlayback();
  const chartRef = useRef<ReactECharts>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Default to Magnitude
  const [selectedKeys, setSelectedKeys] = useState<ChannelKey[]>(["x", "y"]);

  const maxFrame = animationData.metadata.frameCount - 1;

  const times = useMemo(() => {
    const times: number[] = [];
    for (let i = 0; i <= maxFrame; i++) {
      times.push(i * animationData.metadata.dt);
    }
    return times;
  }, [animationData, maxFrame]);

  // 1. Prepare Data
  const getChannelData = useCallback(
    (key: ChannelKey) => {
      switch (key) {
        case "x":
          return {
            accessor: animationData.groundMotion.xAt,
            config: CHANNEL_CONFIG.x,
          };
        case "y":
          return {
            accessor: animationData.groundMotion.yAt,
            config: CHANNEL_CONFIG.y,
          };
        case "z":
          return {
            accessor: animationData.groundMotion.zAt,
            config: CHANNEL_CONFIG.z,
          };
        case "magnitude":
        default:
          return {
            accessor: (idx: number) => animationData.precomputed.groundMotion.magnitude.at(idx) ?? 0,
            config: CHANNEL_CONFIG.magnitude,
          };
      }
    },
    [animationData],
  );

  const chartData = useMemo(() => {
    const activeKeys = CHANNEL_ORDER.filter((k) => selectedKeys.includes(k));

    const seriesData = activeKeys.map((key) => {
      const { accessor, config } = getChannelData(key);
      const data: [number, number][] = [];
      for (let i = 0; i <= maxFrame; i++) {
        data.push([times[i], accessor(i)]);
      }
      return { key, data, config, accessor };
    });

    return { seriesData };
  }, [maxFrame, selectedKeys, getChannelData, times]);

  // 2. Build ECharts Option
  const option: EChartsOption = useMemo((): EChartsOption => {
    const { seriesData } = chartData;
    const count = seriesData.length;

    const grids: EChartsOption["grid"] = [];
    const xAxes: EChartsOption["xAxis"] = [];
    const yAxes: EChartsOption["yAxis"] = [];
    const series: EChartsOption["series"] = [];
    const titles: EChartsOption["title"] = [];

    // Layout Constants
    const LEFT_MARGIN = 45;
    const RIGHT_MARGIN = 20;

    // Calculate total available height percent (leaving room for dataZoom at bottom)
    const AVAILABLE_HEIGHT_PCT = 92;

    seriesData.forEach((item, index) => {
      const isLast = index === count - 1;

      // Vertical calculation
      const rowHeight = AVAILABLE_HEIGHT_PCT / count;
      const topPct = 2 + index * rowHeight; // start slightly down
      const heightPct = rowHeight - 6; // gap between charts

      grids.push({
        left: LEFT_MARGIN,
        right: RIGHT_MARGIN,
        top: `${topPct}%`,
        height: `${heightPct}%`,
        containLabel: false, // Keep false to ensure fixed alignment
      });

      // Titles (instead of Y-axis names)
      titles.push({
        text: item.config.label,
        left: LEFT_MARGIN + 5, // Align with the grid
        top: `${topPct}%`, // Top of the grid area
        textStyle: {
          fontSize: 11,
          fontWeight: "bold",
          color: item.config.color,
          textShadowColor: "#fff",
          textShadowBlur: 2,
          textShadowOffsetX: 0,
          textShadowOffsetY: 0,
        },
      });

      // X Axis
      xAxes.push({
        gridIndex: index,
        type: "value",
        min: 0,
        max: maxFrame * animationData.metadata.dt,
        axisLine: { show: isLast, lineStyle: { color: "#d1d5db" } },
        axisLabel: { show: isLast, color: "#6b7280", fontSize: 10, margin: 8 },
        axisTick: { show: isLast },
        splitLine: { show: true, lineStyle: { color: "#f3f4f6" } },
      });

      // Y Axis (Name hidden, moved to title)
      yAxes.push({
        gridIndex: index,
        type: "value",
        axisLine: { show: true, lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#6b7280", fontSize: 10, margin: 8 },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      });

      // Main Line Series
      series.push({
        name: item.config.label,
        type: "line",
        xAxisIndex: index,
        yAxisIndex: index,
        data: item.data,
        symbol: "none",
        lineStyle: { color: item.config.color, width: 2 },
        // Prevent color change on hover
        emphasis: {
          disabled: true,
          lineStyle: { color: item.config.color, width: 2 },
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: item.config.color + "40" },
              { offset: 1, color: item.config.color + "10" },
            ],
          },
        },
        markLine: {
          symbol: "none",
          data: [{ xAxis: 0 }],
          lineStyle: { color: "#9ca3af", width: 1, type: "solid" },
          label: { show: false },
          silent: true,
          animation: false,
        },
        markPoint: {
          silent: true,
          animation: false,
          name: "Playhead",
          symbol: "circle",
          label: { show: false },
          symbolSize: 8,
          itemStyle: {
            color: item.config.color,
            borderColor: "#fff",
            borderWidth: 2,
          },
          data: [{ coord: [0, 0], name: "Playhead" }],
        },
      });
    });

    return {
      grid: grids,
      title: titles,
      xAxis: xAxes,
      yAxis: yAxes,
      series,
      // Axis Pointer synchronizes hover across all charts
      axisPointer: {
        label: { backgroundColor: "#777" },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 10,
        textStyle: { color: "#374151", fontSize: 11 },
        transitionDuration: 0,
        axisPointer: {
          type: "line",
          lineStyle: { color: "#9ca3af", width: 1, type: "dashed" },
        },
        // Custom formatter to show ALL series regardless of which graph is hovered
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";

          const firstParam = params[0];
          const time = firstParam.value as number;
          const frame = Math.round(time / animationData.metadata.dt);

          const values: Array<{ name: string; color: string; value: number }> = [];

          params.forEach((p) => {
            if (!p || !p.seriesName || !p.data) return;
            if (p.seriesName.includes("Marker") || p.seriesName === "Playhead") return;

            const configKey = Object.keys(CHANNEL_CONFIG).find(
              (key) => CHANNEL_CONFIG[key as ChannelKey].label === p.seriesName,
            );
            const color = configKey ? CHANNEL_CONFIG[configKey as ChannelKey].color : (p.color as string);
            const value = (p.data as number[])[1];

            values.push({ name: p.seriesName, color, value });
          });

          return renderToString(<TooltipContent frame={frame} time={time} values={values} />);
        },
      },
      animation: false,
    };
  }, [chartData, maxFrame, animationData.metadata.dt]);

  // Scrubbing logic
  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    const convertToFrame = (pixelX: number) => {
      if (selectedKeys.length === 0) return null;
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
      if (newFrame !== null) {
        setFrameIndex(newFrame);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const chartDom = chart.getDom();
    chartDom.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      chartDom.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, animationData.metadata.dt, maxFrame, setFrameIndex, selectedKeys.length]);

  // Update for MarkLine and MarkPoint
  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart || !chart.getOption()) return;

    const currentTime = frameIndex * animationData.metadata.dt;

    // We map over the active series to update markers for each one
    const updatedSeries = chartData.seriesData.map((item) => {
      const currentValue = item.accessor(frameIndex);

      return {
        // markLine (Vertical playhead)
        markLine: {
          data: [{ xAxis: currentTime }],
        },
        // markPoint (The moving dot on the line)
        markPoint: {
          data: [
            {
              coord: [currentTime, currentValue],
            },
          ],
        },
      };
    });

    chart.setOption({
      series: updatedSeries,
    });
  }, [frameIndex, chartData, animationData.metadata.dt]);

  return (
    <div className="flex flex-col border-t-2 border-neutral-300 relative h-full w-full bg-white">
      {/* Top Bar Row 1: Controls & Time */}
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0 relative">
        <div className="float-right ml-2 mt-0.5">
          <CheckSelect options={CHANNEL_CONFIG} selected={selectedKeys} onChange={setSelectedKeys} />
        </div>
        <div className="text-sm text-neutral-700 flex items-center gap-2 flex-wrap">
          <span className="font-medium">Frame:</span>
          <span className="font-mono">{frameIndex + 1}</span>
          <span className="text-neutral-300">|</span>
          <span className="font-medium">Time:</span>
          <span className="font-mono">{formatFixed3(frameIndex * animationData.metadata.dt)}s</span>
          <div className="flex items-center gap-2 flex-wrap">
            {chartData.seriesData.map((item) => (
              <div key={item.key} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: item.config.color }} />
                <span className="font-medium text-neutral-500">{item.config.shortName}:</span>
                <span className="font-mono">{formatFixed3(item.accessor(frameIndex) ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-0 w-full relative" style={{ cursor: isDragging ? "grabbing" : "default" }}>
        {selectedKeys.length > 0 ? (
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge={true}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-neutral-400 text-sm">
            Select a data channel to view
          </div>
        )}
      </div>
    </div>
  );
}
