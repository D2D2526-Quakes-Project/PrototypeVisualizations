import type { IDockviewPanelProps } from "dockview";
import ReactECharts from "echarts-for-react";
import { type EChartsOption } from "echarts";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { useAnimationData } from "@/lib/useAnimationData";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatFixed3 } from "@/lib/utils";
import { getDefaultTimelinePanelState } from "@/features/view-3d/lib/statePersistence";
import { useViewStore } from "@/state";

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

export function Timeline({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const { frameIndex, setFrameIndex } = usePlayback();
  const chartRef = useRef<ReactECharts>(null);
  const [chartReadyVersion, setChartReadyVersion] = useState(0);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const setPanelState = useViewStore((s) => s.setPanelState);

  const panelId = api?.id ?? "timeline";
  const defaultState = getDefaultTimelinePanelState();
  const savedPanelState = useViewStore((s) => s.panelStates[panelId]);
  const savedState = savedPanelState?.type === "timeline" ? savedPanelState.state : defaultState;

  const [selectedKeys, setSelectedKeys] = useState<ChannelKey[]>(savedState.selectedKeys);

  const maxFrame = animationData.metadata.frameCount - 1;
  const dt = animationData.metadata.dt;

  const dtRef = useRef(dt);
  const maxFrameRef = useRef(maxFrame);
  const selectedKeysRef = useRef(selectedKeys);
  const panelIdRef = useRef(panelId);

  useEffect(() => {
    dtRef.current = dt;
    maxFrameRef.current = maxFrame;
    selectedKeysRef.current = selectedKeys;
  }, [dt, maxFrame, selectedKeys]);

  useEffect(() => {
    setPanelState(panelIdRef.current, "timeline", { selectedKeys });
  }, [selectedKeys, setPanelState]);

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
          const value = firstParam.value as [number, number];
          const time = value[0];
          const dt = animationData.metadata.dt;
          const frame = Math.round(time / dt);

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

  // Scrubbing logic - uses refs to access current values and tracks chart instance changes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let zr: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentChart: any = null;

    const convertToFrame = (pixelX: number, chart: NonNullable<typeof currentChart>) => {
      if (selectedKeysRef.current.length === 0) return null;
      const chartDom = chart.getDom();
      if (!chartDom) return null;
      const rect = chartDom.getBoundingClientRect();

      const pointInGrid = chart.convertFromPixel({ seriesIndex: 0 }, [pixelX - rect.left, 0]);
      if (!pointInGrid) return null;

      const time = pointInGrid[0];
      const frame = Math.round(time / dtRef.current);

      return Math.max(0, Math.min(maxFrameRef.current, frame));
    };

    const handleMouseDown = (e: { event?: MouseEvent }) => {
      if (!e.event) return;
      const chart = chartRef.current?.getEchartsInstance();
      if (!chart) return;
      const newFrame = convertToFrame(e.event.clientX, chart);
      if (newFrame !== null) {
        isDraggingRef.current = true;
        setIsDragging(true);
        setFrameIndex(newFrame);
      }
    };

    const handleMouseMove = (e: { event?: MouseEvent }) => {
      if (!isDraggingRef.current || !e.event) return;
      const chart = chartRef.current?.getEchartsInstance();
      if (!chart) return;
      const newFrame = convertToFrame(e.event.clientX, chart);
      if (newFrame !== null) {
        setFrameIndex(newFrame);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
    };

    const attachListeners = () => {
      const chart = chartRef.current?.getEchartsInstance();
      if (!chart || chart === currentChart) return;

      if (zr) {
        zr.off("mousedown", handleMouseDown);
        zr.off("mousemove", handleMouseMove);
        zr.off("mouseup", handleMouseUp);
      }

      currentChart = chart;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      zr = chart.getZr() as any;
      if (!zr) return;

      zr.on("mousedown", handleMouseDown);
      zr.on("mousemove", handleMouseMove);
      zr.on("mouseup", handleMouseUp);
      window.addEventListener("mouseup", handleMouseUp);
    };

    attachListeners();

    const intervalId = setInterval(attachListeners, 100);

    return () => {
      clearInterval(intervalId);
      if (zr) {
        zr.off("mousedown", handleMouseDown);
        zr.off("mousemove", handleMouseMove);
        zr.off("mouseup", handleMouseUp);
      }
      window.removeEventListener("mouseup", handleMouseUp);
      currentChart = null;
    };
  }, [setFrameIndex]);

  // Update for MarkLine and MarkPoint
  useEffect(() => {
    const applyFrameToChart = () => {
      const chart = chartRef.current?.getEchartsInstance();
      if (!chart || !chart.getOption()) return false;

      const currentTime = frameIndex * animationData.metadata.dt;

      const updatedSeries = chartData.seriesData.map((item) => {
        const currentValue = item.accessor(frameIndex);

        return {
          markLine: {
            data: [{ xAxis: currentTime }],
          },
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
      return true;
    };

    if (applyFrameToChart()) return;
    const rafId = requestAnimationFrame(() => {
      applyFrameToChart();
    });
    return () => cancelAnimationFrame(rafId);
  }, [frameIndex, chartData, animationData.metadata.dt, chartReadyVersion]);

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
            onChartReady={() => setChartReadyVersion((v) => v + 1)}
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
