import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePanelState } from "@/features/dockview/usePanelState";
import { useExportRenderMode } from "@/features/export/renderMode";
import { usePlayback } from "@/features/playback/usePlayback";
import { formatFixed3, formatNumber } from "@/lib/utils";
import type { IDockviewPanelProps } from "dockview-react";
import { type ECharts, type EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";

import type { BuildingAnimationData } from "@/lib/types";
import { useGlobalStore } from "@/state";
import { useAnimationData } from "../animation-data/useAnimationData";
import { getMetricKeyColor, UNITS, type Metric, type UnitConfig } from "../metrics/metrics";
import { useMetrics } from "../metrics/useMetrics";

type ChannelOption = {
  label: string;
  shortName: string;
  metric?: Metric;
  unit: UnitConfig;
  enabled: (animationData: BuildingAnimationData) => boolean;
  accessor: (idx: number, animationData: BuildingAnimationData) => number;
};

const GROUND_MOTION_COLOR = "#444444";

const GROUND_CHANNEL_CONFIG: Record<string, ChannelOption> = {
  groundMotionX: {
    label: "X Ground Motion",
    shortName: "X",
    unit: UNITS.g,
    enabled: (animationData) => animationData.groundMotion.data.length > 0,
    accessor: (idx, animationData) => animationData.groundMotion.xAt(idx),
  },
  groundMotionY: {
    label: "Y Ground Motion",
    shortName: "Y",
    unit: UNITS.g,
    enabled: (animationData) => animationData.groundMotion.data.length > 0,
    accessor: (idx, animationData) => animationData.groundMotion.yAt(idx),
  },
  // groundMotionZ: {
  //   label: "Z Ground Motion",
  //   shortName: "Z",
  //   unit: UNITS.g,
  //   enabled: (animationData) => animationData.groundMotion.data.length > 0,
  //   accessor: (idx, animationData) => animationData.groundMotion.zAt(idx),
  // },
  groundMotionMagnitude: {
    label: "Ground Motion",
    shortName: "Mag",
    unit: UNITS.g,
    enabled: (animationData) => animationData.precomputed.groundMotion.magnitude.length > 0,
    accessor: (idx, animationData) => animationData.precomputed.groundMotion.magnitude[idx],
  },
  avgDisplacementMag: {
    label: "Avg Displacement Mag",
    shortName: "Disp. Mag",
    metric: "displacementMag",
    unit: UNITS.inches,
    enabled: (animationData) => animationData.precomputed.avgDisplacementPerFrame.mag.length > 0,
    accessor: (idx, animationData) => animationData.precomputed.avgDisplacementPerFrame.mag[idx],
  },
  avgDisplacementX: {
    label: "Avg Displacement X",
    shortName: "Disp. X",
    metric: "displacementX",
    unit: UNITS.inches,
    enabled: (animationData) => animationData.precomputed.avgDisplacementPerFrame.x.length > 0,
    accessor: (idx, animationData) => animationData.precomputed.avgDisplacementPerFrame.x[idx],
  },
  avgDisplacementY: {
    label: "Avg Displacement Y",
    shortName: "Disp. Y",
    metric: "displacementY",
    unit: UNITS.inches,
    enabled: (animationData) => animationData.precomputed.avgDisplacementPerFrame.y.length > 0,
    accessor: (idx, animationData) => animationData.precomputed.avgDisplacementPerFrame.y[idx],
  },
  // avgDisplacementZ: {
  //   label: "Avg Displacement Z",
  //   shortName: "Disp. Z",
  //   metic: "displacementZ",
  //   unit: UNITS.inches,
  //   accessor: (idx, animationData) => animationData.precomputed.avgDisplacementPerFrame.z[idx],
  // },
  avgVelocityMag: {
    label: "Avg Velocity Mag",
    shortName: "Vel. Mag",
    metric: "velocityMag",
    unit: UNITS.inches,
    enabled: (animationData) => !!animationData.precomputed.avgVelocityPerFrame,
    accessor: (idx, animationData) => animationData.precomputed.avgVelocityPerFrame!.mag[idx],
  },
  avgVelocityX: {
    label: "Avg Velocity X",
    shortName: "Vel. X",
    metric: "velocityX",
    unit: UNITS.inches,
    enabled: (animationData) => !!animationData.precomputed.avgVelocityPerFrame,
    accessor: (idx, animationData) => animationData.precomputed.avgVelocityPerFrame!.x[idx],
  },
  avgVelocityY: {
    label: "Avg Velocity Y",
    shortName: "Vel. Y",
    metric: "velocityY",
    unit: UNITS.inches,
    enabled: (animationData) => !!animationData.precomputed.avgVelocityPerFrame,
    accessor: (idx, animationData) => animationData.precomputed.avgVelocityPerFrame!.y[idx],
  },
  // avgVelocityZ: {
  //   label: "Avg Velocity Z",
  //   shortName: "Vel. Z",
  //   metic: "velocityZ",
  //   unit: UNITS.inches,
  //   enabled: (animationData) => animationData.precomputed.avgVelocityPerFrame?.z.length > 0,
  //   accessor: (idx, animationData) => animationData.precomputed.avgVelocityPerFrame?.z[idx],
  // },
  avgAccelerationMag: {
    label: "Avg Acceleration Mag",
    shortName: "Acc. Mag",
    metric: "accelerationMag",
    unit: UNITS.inches,
    enabled: (animationData) => !!animationData.precomputed.avgAccelerationPerFrame,
    accessor: (idx, animationData) => animationData.precomputed.avgAccelerationPerFrame!.mag[idx],
  },
  avgAccelerationX: {
    label: "Avg Acceleration X",
    shortName: "Acc. X",
    metric: "accelerationX",
    unit: UNITS.inches,
    enabled: (animationData) => !!animationData.precomputed.avgAccelerationPerFrame,
    accessor: (idx, animationData) => animationData.precomputed.avgAccelerationPerFrame!.x[idx],
  },
  avgAccelerationY: {
    label: "Avg Acceleration Y",
    shortName: "Acc. Y",
    metric: "accelerationY",
    unit: UNITS.inches,
    enabled: (animationData) => !!animationData.precomputed.avgAccelerationPerFrame,
    accessor: (idx, animationData) => animationData.precomputed.avgAccelerationPerFrame!.y[idx],
  },
  // avgAccelerationZ: {
  //   label: "Avg Acceleration Z",
  //   shortName: "Acc. Z",
  //   metic: "accelerationZ",
  //   unit: UNITS.inches,
  //   enabled: (animationData) => animationData.precomputed.avgAccelerationPerFrame?.z.length > 0,
  //   accessor: (idx, animationData) => animationData.precomputed.avgAccelerationPerFrame?.z[idx],
  // },
} as const;

type TimelinePanelState = {
  selectedKeys: string[];
};

const DEFAULT_TIMELINE_PANEL_STATE: TimelinePanelState = {
  selectedKeys: ["groundMotionX", "groundMotionY"],
};

function TooltipContent({
  frame,
  time,
  values,
}: {
  frame: number;
  time: number;
  values: Array<{
    name: string;
    color: string;
    value: number;
    unit: UnitConfig;
  }>;
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
        <div
          key={item.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "2px",
          }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: item.color,
            }}
          />
          <span style={{ color: "#6b7280", fontSize: "10px" }}>{item.name}:</span>
          <span
            style={{
              fontWeight: 500,
              marginLeft: "auto",
              fontFamily: "monospace",
            }}>
            {formatNumber(item.value)}
            {item.unit ? ` ${item.unit.abbr}` : ""}
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
  options: [string, ChannelOption][];
  selected: string[];
  onChange: (keys: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);

  const toggleOption = (key: string) => {
    if (selected.includes(key)) {
      if (selected.length > 1) {
        onChange(selected.filter((k) => k !== key && k in GROUND_CHANNEL_CONFIG));
      }
    } else {
      onChange([...selected, key]);
    }
  };

  const labelText = useMemo(() => {
    if (selected.length === 0) return "Select Channels";
    return selected.map((key) => GROUND_CHANNEL_CONFIG[key]?.shortName).join(", ");
  }, [selected]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button title={labelText} variant={"outline"} size="xs" className="min-w-16">
          <span className="flex-1 truncate">{labelText}</span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div className="flex flex-col gap-0.5">
          {options.map(([id, option]) => {
            const isChecked = selected.includes(id);
            const config = GROUND_CHANNEL_CONFIG[id];
            const color = config.metric
              ? getMetricKeyColor(config.metric, metricPaletteOverrides)
              : GROUND_MOTION_COLOR;
            return (
              <Label
                key={id}
                htmlFor={`channel-${id}`}
                className="text-foreground hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors">
                <Checkbox
                  id={`channel-${id}`}
                  checked={isChecked}
                  onCheckedChange={() => toggleOption(id)}
                  className="data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500"
                />
                <span className="flex-1">{option.label}</span>
                <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color }} />
              </Label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Timeline({ api }: IDockviewPanelProps) {
  const exportRenderMode = useExportRenderMode();
  const { animationData } = useAnimationData();
  const { frameIndex, setFrameIndex } = usePlayback();
  const chartRef = useRef<ReactECharts>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const dotsRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [chartReadyVersion, setChartReadyVersion] = useState(0);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);
  const { selectedKeys, setSelectedKeys } = usePanelState({
    panelId: api.id,
    panelType: "Timeline",
    defaultState: DEFAULT_TIMELINE_PANEL_STATE,
  });
  const { isCurrentMetricStatic } = useMetrics();

  const maxFrame = animationData.metadata.frameCount - 1;
  const dt = animationData.metadata.dt;

  const availableChannelOptions = useMemo(() => {
    return Object.entries(GROUND_CHANNEL_CONFIG).filter(([, option]) => option.enabled(animationData));
  }, [animationData]);

  const times = useMemo(() => {
    const times: number[] = [];
    for (let i = 0; i <= maxFrame; i++) {
      times.push(i * animationData.metadata.dt);
    }
    return times;
  }, [animationData, maxFrame]);

  const seriesData = useMemo(() => {
    return selectedKeys.flatMap((key) => {
      if (!GROUND_CHANNEL_CONFIG[key]) return [];
      const { accessor, enabled } = GROUND_CHANNEL_CONFIG[key];
      if (!enabled(animationData)) return [];

      const data: [number, number][] = [];
      for (let i = 0; i <= maxFrame; i++) {
        data.push([times[i], accessor(i, animationData)]);
      }
      return [{ key, data }];
    });
  }, [animationData, selectedKeys, maxFrame, times]);

  // 2. Build ECharts Option
  const option: EChartsOption = useMemo((): EChartsOption => {
    const count = seriesData.length;

    const grids: EChartsOption["grid"] = [];
    const xAxes: EChartsOption["xAxis"] = [];
    const yAxes: EChartsOption["yAxis"] = [];
    const series: EChartsOption["series"] = [];
    const titles: EChartsOption["title"] = [];

    const LEFT_MARGIN = 45;
    const RIGHT_MARGIN = 20;
    const AVAILABLE_HEIGHT_PCT = 92;

    seriesData.forEach((item, index) => {
      const isLast = index === count - 1;

      const rowHeight = AVAILABLE_HEIGHT_PCT / count;
      const topPct = 2 + index * rowHeight;
      const heightPct = rowHeight - 6;

      grids.push({
        left: LEFT_MARGIN,
        right: RIGHT_MARGIN,
        top: `${topPct}%`,
        height: `${heightPct}%`,
        containLabel: false,
      });

      const config = GROUND_CHANNEL_CONFIG[item.key];
      const color = config.metric ? getMetricKeyColor(config.metric, metricPaletteOverrides) : GROUND_MOTION_COLOR;

      titles.push({
        text: config.label,
        left: LEFT_MARGIN + 5,
        top: `${topPct}%`,
        textStyle: {
          fontSize: 11,
          fontWeight: "bold",
          color,
          textShadowColor: "#fff",
          textShadowBlur: 2,
          textShadowOffsetX: 0,
          textShadowOffsetY: 0,
        },
      });

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

      yAxes.push({
        gridIndex: index,
        type: "value",
        axisLine: { show: true, lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#6b7280", fontSize: 10, margin: 8 },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      });

      series.push({
        id: `main-line-${item.key}`,
        name: config.label,
        type: "line",
        xAxisIndex: index,
        yAxisIndex: index,
        data: item.data,
        symbol: "none",
        lineStyle: { color, width: 2 },
        emphasis: {
          disabled: true,
          lineStyle: { color, width: 2 },
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: color + "40" },
              { offset: 1, color: color + "10" },
            ],
          },
        },
      });
    });

    return {
      grid: grids,
      title: titles,
      xAxis: xAxes,
      yAxis: yAxes,
      series,
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
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";

          const firstParam = params[0];
          const value = firstParam.value as [number, number];
          const time = value[0];
          const dt = animationData.metadata.dt;
          const frame = Math.round(time / dt);

          const values: Array<{
            name: string;
            color: string;
            value: number;
            unit: UnitConfig;
          }> = [];

          params.forEach((p) => {
            if (!p || !p.seriesName || !p.data) return;

            const seriesMatch = seriesData.find(
              (seriesItem) => GROUND_CHANNEL_CONFIG[seriesItem.key].label === p.seriesName
            );

            let color;
            let config: ChannelOption | undefined = undefined;
            if (seriesMatch) {
              config = GROUND_CHANNEL_CONFIG[seriesMatch.key];
              color = config.metric ? getMetricKeyColor(config.metric, metricPaletteOverrides) : GROUND_MOTION_COLOR;
            } else {
              color = p.color as string;
            }
            const value = (p.data as number[])[1];

            values.push({
              name: p.seriesName,
              color,
              value,
              unit: config?.unit ?? UNITS.inches,
            });
          });

          return renderToString(<TooltipContent frame={frame} time={time} values={values} />);
        },
      },
      animation: false,
    };
  }, [seriesData, maxFrame, animationData.metadata.dt, metricPaletteOverrides]);

  useEffect(() => {
    if (isCurrentMetricStatic) return;

    let zr: ReturnType<ECharts["getZr"]> | null = null;
    let currentChart: ECharts | null = null;

    const convertToFrame = (pixelX: number, chart: NonNullable<typeof currentChart>) => {
      const chartDom = chart.getDom();
      if (!chartDom) return null;
      const rect = chartDom.getBoundingClientRect();

      const pointInGrid = chart.convertFromPixel({ seriesIndex: 0 }, [pixelX - rect.left, 0]);
      if (!pointInGrid) return null;

      const time = pointInGrid[0];
      const frame = Math.round(time / dt);

      return Math.max(0, Math.min(maxFrame, frame));
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
      zr = chart.getZr();
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
  }, [isCurrentMetricStatic, setFrameIndex, dt, maxFrame]);

  useEffect(() => {
    if (isCurrentMetricStatic || selectedKeys.length === 0) return;

    const applyFrameToChart = () => {
      const chart = chartRef.current?.getEchartsInstance();
      if (!chart || !playheadRef.current) return false;

      const currentOption = chart.getOption();
      if (
        !currentOption ||
        !currentOption.series ||
        (Array.isArray(currentOption.series) && currentOption.series.length === 0)
      ) {
        return false;
      }

      const currentTime = frameIndex * animationData.metadata.dt;
      const xPixel = chart.convertToPixel({ xAxisIndex: 0 }, currentTime);

      if (xPixel != null && isFinite(xPixel as number)) {
        playheadRef.current.style.transform = `translateX(${xPixel}px)`;
        playheadRef.current.style.display = "block";

        seriesData.forEach((item, index) => {
          const dot = dotsRefs.current[index];
          if (!dot) return;

          const accessor = GROUND_CHANNEL_CONFIG[item.key].accessor;
          const currentValue = accessor(frameIndex, animationData);

          const coords = chart.convertToPixel({ xAxisIndex: index, yAxisIndex: index }, [currentTime, currentValue]);

          if (coords && coords.length === 2 && isFinite(coords[1])) {
            dot.style.transform = `translate(-50%, calc(${coords[1]}px - 50%))`;
            dot.style.display = "block";
          } else {
            dot.style.display = "none";
          }
        });
        return true;
      }

      playheadRef.current.style.display = "none";
      return false;
    };

    if (applyFrameToChart()) return;

    const rafId = requestAnimationFrame(() => applyFrameToChart());
    return () => cancelAnimationFrame(rafId);
  }, [frameIndex, seriesData, animationData, isCurrentMetricStatic, chartReadyVersion, selectedKeys]);

  return (
    <div className="relative flex h-full w-full flex-col border-t-2 border-neutral-300 bg-white">
      {/* Top Bar Row 1: Controls & Time */}
      <div className="relative z-20 shrink-0 border-b border-neutral-100 bg-white px-3 py-1.5">
        {exportRenderMode.showTransientUi && (
          <div className="float-right mt-0.5 ml-2">
            <CheckSelect options={availableChannelOptions} selected={selectedKeys} onChange={setSelectedKeys} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
          <span className="font-medium">Frame:</span>
          <span className="font-mono">{frameIndex + 1}</span>
          <span className="text-neutral-300">|</span>
          <span className="font-medium">Time:</span>
          <span className="font-mono">{formatFixed3(frameIndex * animationData.metadata.dt)} s</span>
          <div className="flex flex-wrap items-center gap-2">
            {seriesData.map((item) => {
              const config = GROUND_CHANNEL_CONFIG[item.key];
              const color = config.metric
                ? getMetricKeyColor(config.metric, metricPaletteOverrides)
                : GROUND_MOTION_COLOR;
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-1 border-l-2 pl-1.5 text-xs"
                  style={{ borderLeftColor: color }}>
                  <span className="font-medium text-neutral-500">{config.shortName}:</span>
                  <span className="font-mono">
                    {formatFixed3(config.accessor(frameIndex, animationData) ?? 0)} {config.unit.abbr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative min-h-0 w-full flex-1" style={{ cursor: isDragging ? "grabbing" : "default" }}>
        {selectedKeys.length > 0 ? (
          <>
            <ReactECharts
              ref={chartRef}
              option={option}
              style={{ height: "100%", width: "100%", opacity: isCurrentMetricStatic ? 0.65 : 1 }}
              opts={{ renderer: "canvas" }}
              onChartReady={() => setChartReadyVersion((v) => v + 1)}
            />

            {/* HTML Overlay Playhead */}
            <div
              ref={playheadRef}
              className="pointer-events-none absolute top-0 bottom-4 left-0 z-10 w-px bg-neutral-400"
              style={{ display: "none" }}>
              {seriesData.map((item, index) => {
                const config = GROUND_CHANNEL_CONFIG[item.key];
                const color = config.metric
                  ? getMetricKeyColor(config.metric, metricPaletteOverrides)
                  : GROUND_MOTION_COLOR;
                return (
                  <div
                    key={`dot-${item.key}`}
                    ref={(el) => {
                      dotsRefs.current[index] = el;
                    }}
                    className="absolute top-0 left-0 h-2 w-2 rounded-full border-[1.5px] border-white shadow-sm"
                    style={{
                      backgroundColor: color,
                      display: "none",
                    }}
                  />
                );
              })}
            </div>

            {isCurrentMetricStatic && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <div className="rounded border border-neutral-200 bg-white/95 px-3 py-2 text-center text-xs text-neutral-600 shadow-sm">
                  This metric is static.
                  <div className="mt-1 text-[10px] text-neutral-500">
                    Playback and scrubbing are disabled in this mode.
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            Select a data channel to view
          </div>
        )}
      </div>
    </div>
  );
}
