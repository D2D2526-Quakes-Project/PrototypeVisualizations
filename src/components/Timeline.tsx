import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { useAnimationData } from "../hooks/nodeDataHook";
import type { IDockviewPanelProps } from "dockview";
import { usePlayback } from "./playback/PlaybackContext";

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

// Fixed order for display regardless of selection order
const CHANNEL_ORDER: ChannelKey[] = ["x", "y", "z", "magnitude"];

// Custom Multi-Select Dropdown Component
function CheckSelect({
  options,
  selected,
  onChange,
}: {
  options: typeof CHANNEL_CONFIG;
  selected: ChannelKey[];
  onChange: (keys: ChannelKey[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-neutral-100 border border-neutral-300 rounded px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 hover:bg-neutral-50 active:bg-neutral-200 max-w-[200px]"
        title={labelText}>
        <span className="truncate">{labelText}</span>
        <svg
          className={`w-3 h-3 text-neutral-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-neutral-200 shadow-lg rounded-md z-50 py-1">
          {CHANNEL_ORDER.map((key) => {
            const opt = options[key];
            return (
              <label
                key={opt.id}
                className="flex items-center px-3 py-2 hover:bg-neutral-100 cursor-pointer select-none text-sm text-neutral-700">
                <input
                  type="checkbox"
                  className="mr-3 rounded border-neutral-300 text-blue-500 focus:ring-blue-500"
                  checked={selected.includes(opt.id as ChannelKey)}
                  onChange={() => toggleOption(opt.id as ChannelKey)}
                />
                <span className="flex-1">{opt.label}</span>
                <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: opt.color }} />
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Timeline({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const { frameIndex, setFrameIndex } = usePlayback();
  const chartRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Default to Magnitude
  const [selectedKeys, setSelectedKeys] = useState<ChannelKey[]>(["magnitude"]);

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
            accessor: (idx: number) => animationData.precomputed.groundMotion.magnitude.at(idx),
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
        data.push([times[i], accessor(i) ?? 0]);
      }
      return { key, data, config, accessor };
    });

    return { seriesData };
  }, [animationData, maxFrame, selectedKeys]);

  // 2. Build ECharts Option
  const option = useMemo(() => {
    const { seriesData } = chartData;
    const count = seriesData.length;

    const grids: any[] = [];
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    const series: any[] = [];
    const titles: any[] = [];

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
          data: [{ coord: [0, 0] }],
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
        link: { xAxisIndex: "all" },
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
        formatter: (params: any) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";

          // Use the first param to get time
          const firstParam = params[0];
          const time = firstParam.axisValue;
          const frame = Math.round(time / animationData.metadata.dt);

          let html = `<div style="font-weight:600;margin-bottom:6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">
            Frame ${frame} <span style="font-weight:400;color:#9ca3af;">|</span> ${parseFloat(time).toFixed(3)}s
          </div>`;

          // Filter params to ignore Markers and Playheads, and remove duplicates
          const uniqueSeries = new Map();

          params.forEach((p: any) => {
            if (p.seriesName.includes("Marker") || p.seriesName === "Playhead") return;
            if (!uniqueSeries.has(p.seriesName)) {
              uniqueSeries.set(p.seriesName, p);
            }
          });

          uniqueSeries.forEach((param) => {
            // Find original config color because param.color might be slightly off due to gradients/areaStyle
            const configKey = Object.keys(CHANNEL_CONFIG).find(
              (key) => CHANNEL_CONFIG[key as ChannelKey].label === param.seriesName,
            );
            const color = configKey ? CHANNEL_CONFIG[configKey as ChannelKey].color : param.color;
            const value = param.data[1];

            html += `<div style="display:flex;align-items:center;gap:8px;margin-top:2px;">`;
            html += `<span style="width:8px;height:8px;border-radius:50%;background:${color};"></span>`;
            html += `<span style="color:#6b7280;font-size:10px;">${param.seriesName}:</span>`;
            html += `<span style="font-weight:500;margin-left:auto;font-family:monospace;">${value.toFixed(4)}</span>`;
            html += `</div>`;
          });

          return html;
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
      const rect = chartDom.getBoundingClientRect();
      const gridModel = chart.getModel().getComponent("grid", 0);
      if (!gridModel) return null;

      const gridRect = gridModel.coordinateSystem.getRect();
      const relativeX = pixelX - rect.left - gridRect.x;
      const gridWidth = gridRect.width;

      if (relativeX < 0 || relativeX > gridWidth) return null;

      const ratio = relativeX / gridWidth;

      // Account for zoom if necessary, but typically ratio logic works if axes are standard.
      // However, if zoomed in, ECharts coord system handles mapping.
      // Better approach: convert pixel to point in data space.
      const pointInGrid = chart.convertFromPixel({ seriesIndex: 0 }, [pixelX - rect.left, 0]);
      if (!pointInGrid) return null;

      const time = pointInGrid[0];
      const frame = Math.round(time / animationData.metadata.dt);

      return Math.max(0, Math.min(maxFrame, frame));
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Only scrub if clicking in the chart area, roughly
      if (e.offsetY < 80 && e.target instanceof HTMLElement) return; // avoidance for top bars

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
  }, [chartRef.current, isDragging, animationData.metadata.dt, maxFrame, setFrameIndex, selectedKeys.length]);

  // Update for MarkLine and MarkPoint
  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    const currentTime = frameIndex * animationData.metadata.dt;

    // We map over the active series to update markers for each one
    const updatedSeries = chartData.seriesData.map((item) => {
      const currentValue = item.accessor(frameIndex) ?? 0;

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

    // Use setOption to update ONLY the series markers
    chart.setOption({
      series: updatedSeries,
    });
  }, [frameIndex, chartData, animationData.metadata.dt]);

  return (
    <div className="flex flex-col border-t-2 border-neutral-300 relative h-full w-full bg-white">
      {/* Top Bar Row 1: Controls & Time */}
      <div className="flex justify-between items-center px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="text-sm text-neutral-700 flex items-center gap-2">
          <span className="font-medium">Frame:</span> {frameIndex + 1}
          <span className="text-neutral-300">|</span>
          <span className="font-medium">Time:</span> {(frameIndex * animationData.metadata.dt).toFixed(3)}s
          <span className="text-neutral-300">|</span>
          {chartData.seriesData.map((item) => (
            <div key={item.key} className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ background: item.config.color }} />
              <span className="font-medium text-neutral-500">{item.config.shortName}:</span>
              <span className="font-mono">{item.accessor(frameIndex)?.toFixed(3)}</span>
            </div>
          ))}
        </div>
        <CheckSelect options={CHANNEL_CONFIG} selected={selectedKeys} onChange={setSelectedKeys} />
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
