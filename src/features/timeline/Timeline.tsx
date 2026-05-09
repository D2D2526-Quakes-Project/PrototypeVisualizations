import type { IDockviewPanelProps } from "dockview";
import ReactECharts from "echarts-for-react";
import { type EChartsOption } from "echarts";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { useAnimationData } from "@/lib/animation-data/useAnimationData";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useExportRenderMode } from "@/features/export/renderMode";
import { usePlayback } from "@/features/playback/usePlayback";
import { SmallPlaybackControls } from "@/features/playback/PlaybackControls";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatFixed3 } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/utils";
import { usePanelState } from "@/features/3d/hooks/usePanelState";

import { getMetricKeyColor, isStaticMetric, UNITS, type UnitConfig } from "@/lib/metrics";

const GROUND_CHANNEL_CONFIG = {
  x: {
    id: "x",
    label: "X Ground Motion",
    shortName: "X",
    color: "#f87171",
    unit: UNITS.g,
    group: "Ground Motion",
  },
  y: {
    id: "y",
    label: "Y Ground Motion",
    shortName: "Y",
    color: "#fb7185",
    unit: UNITS.g,
    group: "Ground Motion",
  },
  z: {
    id: "z",
    label: "Z Ground Motion",
    shortName: "Z",
    color: "#60a5fa",
    unit: UNITS.g,
    group: "Ground Motion",
  },
  magnitude: {
    id: "magnitude",
    label: "Ground Motion",
    shortName: "Mag",
    color: "#fbbf24",
    unit: UNITS.g,
    group: "Ground Motion",
  },
} as const;

const NODE_AVERAGE_CHANNEL_CONFIG = {
  avgDisplacementX: {
    id: "avgDisplacementX",
    label: "Avg Displacement X",
    shortName: "Disp X",
    metric: "displacementX",
    unit: UNITS.inches,
    group: "Node Averages",
  },
  avgDisplacementY: {
    id: "avgDisplacementY",
    label: "Avg Displacement Y",
    shortName: "Disp Y",
    metric: "displacementY",
    unit: UNITS.inches,
    group: "Node Averages",
  },
  avgDisplacementZ: {
    id: "avgDisplacementZ",
    label: "Avg Displacement Z",
    shortName: "Disp Z",
    metric: "displacementZ",
    unit: UNITS.inches,
    group: "Node Averages",
  },
  avgDisplacementMag: {
    id: "avgDisplacementMag",
    label: "Avg Displacement",
    shortName: "Disp Mag",
    metric: "displacementMag",
    unit: UNITS.inches,
    group: "Node Averages",
  },
  avgVelocityX: {
    id: "avgVelocityX",
    label: "Avg Velocity X",
    shortName: "Vel X",
    metric: "velocityX",
    unit: UNITS["inches/second"],
    group: "Node Averages",
  },
  avgVelocityY: {
    id: "avgVelocityY",
    label: "Avg Velocity Y",
    shortName: "Vel Y",
    metric: "velocityY",
    unit: UNITS["inches/second"],
    group: "Node Averages",
  },
  avgVelocityZ: {
    id: "avgVelocityZ",
    label: "Avg Velocity Z",
    shortName: "Vel Z",
    metric: "velocityZ",
    unit: UNITS["inches/second"],
    group: "Node Averages",
  },
  avgVelocityMag: {
    id: "avgVelocityMag",
    label: "Avg Velocity",
    shortName: "Vel Mag",
    metric: "velocityMag",
    unit: UNITS["inches/second"],
    group: "Node Averages",
  },
  avgAccelerationX: {
    id: "avgAccelerationX",
    label: "Avg Acceleration X",
    shortName: "Acc X",
    metric: "accelerationX",
    unit: UNITS["inches/second²"],
    group: "Node Averages",
  },
  avgAccelerationY: {
    id: "avgAccelerationY",
    label: "Avg Acceleration Y",
    shortName: "Acc Y",
    metric: "accelerationY",
    unit: UNITS["inches/second²"],
    group: "Node Averages",
  },
  avgAccelerationZ: {
    id: "avgAccelerationZ",
    label: "Avg Acceleration Z",
    shortName: "Acc Z",
    metric: "accelerationZ",
    unit: UNITS["inches/second²"],
    group: "Node Averages",
  },
  avgAccelerationMag: {
    id: "avgAccelerationMag",
    label: "Avg Acceleration",
    shortName: "Acc Mag",
    metric: "accelerationMag",
    unit: UNITS["inches/second²"],
    group: "Node Averages",
  },
  avgRotationX: {
    id: "avgRotationX",
    label: "Avg Rotation X",
    shortName: "Rot X",
    metric: "rotationX",
    unit: UNITS.radians,
    group: "Node Averages",
  },
  avgRotationY: {
    id: "avgRotationY",
    label: "Avg Rotation Y",
    shortName: "Rot Y",
    metric: "rotationY",
    unit: UNITS.radians,
    group: "Node Averages",
  },
  avgRotationZ: {
    id: "avgRotationZ",
    label: "Avg Rotation Z",
    shortName: "Rot Z",
    metric: "rotationZ",
    unit: UNITS.radians,
    group: "Node Averages",
  },
  avgRotationMag: {
    id: "avgRotationMag",
    label: "Avg Rotation",
    shortName: "Rot Mag",
    metric: "rotationMag",
    unit: UNITS.radians,
    group: "Node Averages",
  },
} as const;

type ChannelKey = keyof typeof GROUND_CHANNEL_CONFIG | keyof typeof NODE_AVERAGE_CHANNEL_CONFIG;

type ChannelOption = {
  id: ChannelKey;
  label: string;
  shortName: string;
  color: string;
  unit: UnitConfig;
  group: "Ground Motion" | "Node Averages";
};

export type TimelinePanelState = {
  selectedKeys: ChannelKey[];
};

export const DEFAULT_TIMELINE_PANEL_STATE: TimelinePanelState = {
  selectedKeys: ["x", "y"],
};

const CHANNEL_ORDER: ChannelKey[] = [
  "x",
  "y",
  "z",
  "magnitude",
  "avgDisplacementX",
  "avgDisplacementY",
  "avgDisplacementZ",
  "avgDisplacementMag",
  "avgVelocityX",
  "avgVelocityY",
  "avgVelocityZ",
  "avgVelocityMag",
  "avgAccelerationX",
  "avgAccelerationY",
  "avgAccelerationZ",
  "avgAccelerationMag",
  "avgRotationX",
  "avgRotationY",
  "avgRotationZ",
  "avgRotationMag",
];

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
        Frame {frame} <span style={{ fontWeight: 400, color: "#9ca3af" }}>|</span> {formatCompactNumber(time)} s
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
            {formatCompactNumber(item.value)}
            {item.unit ? ` ${item.unit.abbr}` : ""}
          </span>
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
  options: ChannelOption[];
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
    const shortNameById = new Map(options.map((option) => [option.id, option.shortName]));
    return sortedActive.map((key) => shortNameById.get(key) ?? key).join(", ");
  }, [selected, options]);

  const groupedOptions = useMemo(() => {
    const groups: Array<{
      title: "Ground Motion" | "Node Averages";
      options: ChannelOption[];
    }> = [
      { title: "Ground Motion", options: [] },
      { title: "Node Averages", options: [] },
    ];

    options.forEach((option) => {
      const group = groups.find((g) => g.title === option.group);
      if (group) {
        group.options.push(option);
      }
    });

    return groups.filter((group) => group.options.length > 0);
  }, [options]);

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
          {groupedOptions.map((group) => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <div className="px-2 py-1 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                {group.title}
              </div>
              {group.options.map((option) => {
                const isChecked = selected.includes(option.id);
                return (
                  <Label
                    key={option.id}
                    htmlFor={`channel-${option.id}`}
                    className="text-foreground hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors">
                    <Checkbox
                      id={`channel-${option.id}`}
                      checked={isChecked}
                      onCheckedChange={() => toggleOption(option.id)}
                      className="data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500"
                    />
                    <span className="flex-1">{option.label}</span>
                    <span
                      className="h-3 w-3 rounded-full border border-black/10"
                      style={{ backgroundColor: option.color }}
                    />
                  </Label>
                );
              })}
            </div>
          ))}
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
  const [chartReadyVersion, setChartReadyVersion] = useState(0);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const metricPaletteOverrides = useViewStore((s) => s.metricPaletteOverrides);
  const { state: savedState, setState: setSavedState } = usePanelState<TimelinePanelState>({
    panelId: api?.id,
    fallbackPanelId: "timeline",
    panelType: "timeline",
    defaultState: DEFAULT_TIMELINE_PANEL_STATE,
  });
  const currentMetric = useViewStore((s) => s.currentMetric);
  const staticMetricMode = isStaticMetric(currentMetric);

  const [selectedKeys, setSelectedKeys] = useState<ChannelKey[]>(savedState.selectedKeys);

  const maxFrame = animationData.metadata.frameCount - 1;
  const dt = animationData.metadata.dt;

  const dtRef = useRef(dt);
  const maxFrameRef = useRef(maxFrame);
  const selectedKeysRef = useRef(selectedKeys);
  const averageRotationByFrame = useMemo(() => {
    const result = {
      x: new Array<number>(animationData.metadata.frameCount).fill(0),
      y: new Array<number>(animationData.metadata.frameCount).fill(0),
      z: new Array<number>(animationData.metadata.frameCount).fill(0),
      mag: new Array<number>(animationData.metadata.frameCount).fill(0),
    };
    if (!animationData.displacementRot) {
      return result;
    }

    const nodeCount = animationData.metadata.nodeCount;
    for (let frame = 0; frame < animationData.metadata.frameCount; frame++) {
      const frameData = animationData.displacementRot.atFrame(frame);
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;
      for (let nodeId = 0; nodeId < nodeCount; nodeId++) {
        const rotation = frameData.at(nodeId);
        sumX += rotation[0];
        sumY += rotation[1];
        sumZ += rotation[2];
      }

      result.x[frame] = sumX / nodeCount;
      result.y[frame] = sumY / nodeCount;
      result.z[frame] = sumZ / nodeCount;
      result.mag[frame] = Math.hypot(result.x[frame], result.y[frame], result.z[frame]);
    }

    return result;
  }, [animationData]);

  const nodeAverageChannelConfig = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(NODE_AVERAGE_CHANNEL_CONFIG).map(([key, config]) => [
          key,
          { ...config, color: getMetricKeyColor(config.metric, metricPaletteOverrides) },
        ])
      ) as {
        [K in keyof typeof NODE_AVERAGE_CHANNEL_CONFIG]: (typeof NODE_AVERAGE_CHANNEL_CONFIG)[K] & { color: string };
      },
    [metricPaletteOverrides]
  );

  const channelAccessors = useMemo(() => {
    return {
      x: {
        accessor: animationData.groundMotion.xAt,
        config: GROUND_CHANNEL_CONFIG.x,
      },
      y: {
        accessor: animationData.groundMotion.yAt,
        config: GROUND_CHANNEL_CONFIG.y,
      },
      z: {
        accessor: animationData.groundMotion.zAt,
        config: GROUND_CHANNEL_CONFIG.z,
      },
      magnitude: {
        accessor: (idx: number) => animationData.precomputed.groundMotion.magnitude.at(idx) ?? 0,
        config: GROUND_CHANNEL_CONFIG.magnitude,
      },
      avgDisplacementMag: {
        accessor: (idx: number) => animationData.precomputed.avgDisplacementPerFrame.mag[idx] ?? 0,
        config: nodeAverageChannelConfig.avgDisplacementMag,
      },
      avgDisplacementX: {
        accessor: (idx: number) => animationData.precomputed.avgDisplacementPerFrame.x[idx] ?? 0,
        config: nodeAverageChannelConfig.avgDisplacementX,
      },
      avgDisplacementY: {
        accessor: (idx: number) => animationData.precomputed.avgDisplacementPerFrame.y[idx] ?? 0,
        config: nodeAverageChannelConfig.avgDisplacementY,
      },
      avgDisplacementZ: {
        accessor: (idx: number) => animationData.precomputed.avgDisplacementPerFrame.z[idx] ?? 0,
        config: nodeAverageChannelConfig.avgDisplacementZ,
      },
      avgVelocityMag: {
        accessor: (idx: number) => animationData.precomputed.avgVelocityPerFrame?.mag[idx] ?? 0,
        config: nodeAverageChannelConfig.avgVelocityMag,
      },
      avgVelocityX: {
        accessor: (idx: number) => animationData.precomputed.avgVelocityPerFrame?.x[idx] ?? 0,
        config: nodeAverageChannelConfig.avgVelocityX,
      },
      avgVelocityY: {
        accessor: (idx: number) => animationData.precomputed.avgVelocityPerFrame?.y[idx] ?? 0,
        config: nodeAverageChannelConfig.avgVelocityY,
      },
      avgVelocityZ: {
        accessor: (idx: number) => animationData.precomputed.avgVelocityPerFrame?.z[idx] ?? 0,
        config: nodeAverageChannelConfig.avgVelocityZ,
      },
      avgAccelerationMag: {
        accessor: (idx: number) => animationData.precomputed.avgAccelerationPerFrame?.mag[idx] ?? 0,
        config: nodeAverageChannelConfig.avgAccelerationMag,
      },
      avgAccelerationX: {
        accessor: (idx: number) => animationData.precomputed.avgAccelerationPerFrame?.x[idx] ?? 0,
        config: nodeAverageChannelConfig.avgAccelerationX,
      },
      avgAccelerationY: {
        accessor: (idx: number) => animationData.precomputed.avgAccelerationPerFrame?.y[idx] ?? 0,
        config: nodeAverageChannelConfig.avgAccelerationY,
      },
      avgAccelerationZ: {
        accessor: (idx: number) => animationData.precomputed.avgAccelerationPerFrame?.z[idx] ?? 0,
        config: nodeAverageChannelConfig.avgAccelerationZ,
      },
      avgRotationMag: {
        accessor: (idx: number) => averageRotationByFrame.mag[idx] ?? 0,
        config: nodeAverageChannelConfig.avgRotationMag,
      },
      avgRotationX: {
        accessor: (idx: number) => averageRotationByFrame.x[idx] ?? 0,
        config: nodeAverageChannelConfig.avgRotationX,
      },
      avgRotationY: {
        accessor: (idx: number) => averageRotationByFrame.y[idx] ?? 0,
        config: nodeAverageChannelConfig.avgRotationY,
      },
      avgRotationZ: {
        accessor: (idx: number) => averageRotationByFrame.z[idx] ?? 0,
        config: nodeAverageChannelConfig.avgRotationZ,
      },
    } as const;
  }, [animationData, averageRotationByFrame, nodeAverageChannelConfig]);

  const availableChannelOptions = useMemo(() => {
    const options: ChannelOption[] = [
      channelAccessors.x.config,
      channelAccessors.y.config,
      channelAccessors.z.config,
      channelAccessors.magnitude.config,
      channelAccessors.avgDisplacementX.config,
      channelAccessors.avgDisplacementY.config,
      channelAccessors.avgDisplacementZ.config,
      channelAccessors.avgDisplacementMag.config,
    ];

    if (animationData.precomputed.avgVelocityPerFrame) {
      options.push(channelAccessors.avgVelocityX.config);
      options.push(channelAccessors.avgVelocityY.config);
      options.push(channelAccessors.avgVelocityZ.config);
      options.push(channelAccessors.avgVelocityMag.config);
    }

    if (animationData.precomputed.avgAccelerationPerFrame) {
      options.push(channelAccessors.avgAccelerationX.config);
      options.push(channelAccessors.avgAccelerationY.config);
      options.push(channelAccessors.avgAccelerationZ.config);
      options.push(channelAccessors.avgAccelerationMag.config);
    }

    if (animationData.displacementRot) {
      options.push(channelAccessors.avgRotationX.config);
      options.push(channelAccessors.avgRotationY.config);
      options.push(channelAccessors.avgRotationZ.config);
      options.push(channelAccessors.avgRotationMag.config);
    }

    return options;
  }, [animationData, channelAccessors]);

  const effectiveSelectedKeys = useMemo(() => {
    const availableIds = new Set(availableChannelOptions.map((option) => option.id));
    const filtered = selectedKeys.filter((key) => availableIds.has(key));
    if (filtered.length > 0) {
      return filtered;
    }
    return [availableChannelOptions[0]?.id ?? "x"];
  }, [availableChannelOptions, selectedKeys]);

  useEffect(() => {
    dtRef.current = dt;
    maxFrameRef.current = maxFrame;
    selectedKeysRef.current = effectiveSelectedKeys;
  }, [dt, maxFrame, effectiveSelectedKeys]);

  useEffect(() => {
    setSavedState({
      selectedKeys: effectiveSelectedKeys,
    });
  }, [effectiveSelectedKeys, setSavedState]);

  const times = useMemo(() => {
    const times: number[] = [];
    for (let i = 0; i <= maxFrame; i++) {
      times.push(i * animationData.metadata.dt);
    }
    return times;
  }, [animationData, maxFrame]);

  const chartData = useMemo(() => {
    const activeKeys = CHANNEL_ORDER.filter((k) => effectiveSelectedKeys.includes(k));

    const seriesData = activeKeys.map((key) => {
      const { accessor, config } = channelAccessors[key];
      const data: [number, number][] = [];
      for (let i = 0; i <= maxFrame; i++) {
        data.push([times[i], accessor(i)]);
      }
      return { key, data, config, accessor };
    });

    return { seriesData };
  }, [channelAccessors, effectiveSelectedKeys, maxFrame, times]);

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

          const values: Array<{
            name: string;
            color: string;
            value: number;
            unit: UnitConfig;
          }> = [];

          params.forEach((p) => {
            if (!p || !p.seriesName || !p.data) return;
            if (p.seriesName.includes("Marker") || p.seriesName === "Playhead") return;

            const seriesMatch = chartData.seriesData.find((seriesItem) => seriesItem.config.label === p.seriesName);
            const color = seriesMatch ? seriesMatch.config.color : (p.color as string);
            const value = (p.data as number[])[1];

            values.push({
              name: p.seriesName,
              color,
              value,
              unit: seriesMatch?.config.unit ?? UNITS.inches,
            });
          });

          return renderToString(<TooltipContent frame={frame} time={time} values={values} />);
        },
      },
      animation: false,
    };
  }, [chartData, maxFrame, animationData.metadata.dt]);

  // Scrubbing logic - uses refs to access current values and tracks chart instance changes
  useEffect(() => {
    if (staticMetricMode) {
      return;
    }

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
  }, [staticMetricMode, setFrameIndex]);

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
    <div className="relative flex h-full w-full flex-col border-t-2 border-neutral-300 bg-white">
      {/* Top Bar Row 1: Controls & Time */}
      <div className="relative z-20 shrink-0 border-b border-neutral-100 bg-white px-3 py-1.5">
        {exportRenderMode.showTransientUi && (
          <div className="float-right mt-0.5 ml-2">
            <CheckSelect
              options={availableChannelOptions}
              selected={effectiveSelectedKeys}
              onChange={setSelectedKeys}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
          {exportRenderMode.showTransientUi && (
            <>
              <SmallPlaybackControls inline />
              <span className="text-neutral-300">|</span>
            </>
          )}
          <span className="font-medium">Frame:</span>
          <span className="font-mono">{frameIndex + 1}</span>
          <span className="text-neutral-300">|</span>
          <span className="font-medium">Time:</span>
          <span className="font-mono">{formatFixed3(frameIndex * animationData.metadata.dt)} s</span>
          <div className="flex flex-wrap items-center gap-2">
            {chartData.seriesData.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-1 border-l-2 pl-1.5 text-xs"
                style={{ borderLeftColor: item.config.color }}>
                <span className="font-medium text-neutral-500">{item.config.shortName}:</span>
                <span className="font-mono">
                  {formatFixed3(item.accessor(frameIndex) ?? 0)} {item.config.unit.abbr}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative min-h-0 w-full flex-1" style={{ cursor: isDragging ? "grabbing" : "default" }}>
        {effectiveSelectedKeys.length > 0 ? (
          <>
            <ReactECharts
              ref={chartRef}
              option={option}
              style={{ height: "100%", width: "100%", opacity: staticMetricMode ? 0.65 : 1 }}
              opts={{ renderer: "canvas" }}
              notMerge={true}
              onChartReady={() => setChartReadyVersion((v) => v + 1)}
            />
            {staticMetricMode && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
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
