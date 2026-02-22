import { usePlayback } from "@/features/playback/PlaybackContext";
import { useThresholds } from "@/features/view-3d/contexts/visualization";
import { useAnimationData } from "@/lib/useAnimationData";
import { formatFixed3 } from "@/lib/utils";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { ChevronDown } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import { renderToString } from "react-dom/server";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CHANNEL_CONFIG = {
  rx: { id: "rx", label: "RX Angular Velocity", shortName: "RX", color: "#f87171" },
  ry: { id: "ry", label: "RY Angular Velocity", shortName: "RY", color: "#4ade80" },
  rz: { id: "rz", label: "RZ Angular Velocity", shortName: "RZ", color: "#60a5fa" },
  magnitude: { id: "magnitude", label: "Angular Speed", shortName: "Mag", color: "#fbbf24" },
} as const;

type ChannelKey = keyof typeof CHANNEL_CONFIG;
const CHANNEL_ORDER: ChannelKey[] = ["rx", "ry", "rz", "magnitude"];

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
        Frame {frame} <span style={{ fontWeight: 400, color: "#9ca3af" }}>|</span> {parseFloat(time.toString()).toFixed(3)}s
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
  selected,
  onChange,
}: {
  selected: ChannelKey[];
  onChange: (keys: ChannelKey[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggleOption = (key: ChannelKey) => {
    if (selected.includes(key)) {
      if (selected.length > 1) {
        onChange(selected.filter((k) => k !== key));
      }
      return;
    }

    onChange([...selected, key]);
  };

  const labelText = CHANNEL_ORDER.filter((k) => selected.includes(k))
    .map((k) => CHANNEL_CONFIG[k].shortName)
    .join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="xs" className="min-w-16">
          <span className="truncate flex-1">{labelText || "Select"}</span>
          <ChevronDown className={`w-3 h-3 text-neutral-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div className="flex flex-col gap-0.5">
          {CHANNEL_ORDER.map((key) => {
            const option = CHANNEL_CONFIG[key];
            const isChecked = selected.includes(key);
            return (
              <Label
                key={option.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleOption(key)}
                  className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                <span className="flex-1">{option.label}</span>
                <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: option.color }} />
              </Label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function RotationTimeChart() {
  const { animationData } = useAnimationData();
  const { frameIndex, setFrameIndex } = usePlayback();
  const { thresholds } = useThresholds();
  const [selectedKeys, setSelectedKeys] = useState<ChannelKey[]>(["magnitude"]);
  const chartRef = useRef<ReactECharts>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasRotationVelocity = Boolean(animationData.velocityRot);

  const maxFrame = animationData.metadata.frameCount - 1;

  const times = useMemo(() => {
    const t: number[] = [];
    for (let i = 0; i <= maxFrame; i++) {
      t.push(i * animationData.metadata.dt);
    }
    return t;
  }, [animationData.metadata.dt, maxFrame]);

  const rotationData = useMemo(() => {
    const { nodeCount, frameCount } = animationData.metadata;
    const velocityRot = animationData.velocityRot;

    const avgRx: number[] = [];
    const avgRy: number[] = [];
    const avgRz: number[] = [];
    const avgMag: number[] = [];

    if (!velocityRot) {
      for (let frame = 0; frame < frameCount; frame++) {
        avgRx.push(0);
        avgRy.push(0);
        avgRz.push(0);
        avgMag.push(0);
      }
      return { avgRx, avgRy, avgRz, avgMag };
    }

    for (let frame = 0; frame < frameCount; frame++) {
      const currentFrame = velocityRot.atFrame(frame);
      let sumRx = 0;
      let sumRy = 0;
      let sumRz = 0;

      for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
        const rotVel = currentFrame.at(nodeIdx);
        sumRx += rotVel[0];
        sumRy += rotVel[1];
        sumRz += rotVel[2];
      }

      const avgFrameRx = sumRx / nodeCount;
      const avgFrameRy = sumRy / nodeCount;
      const avgFrameRz = sumRz / nodeCount;
      avgRx.push(avgFrameRx);
      avgRy.push(avgFrameRy);
      avgRz.push(avgFrameRz);
      avgMag.push(Math.sqrt(avgFrameRx ** 2 + avgFrameRy ** 2 + avgFrameRz ** 2));
    }

    return { avgRx, avgRy, avgRz, avgMag };
  }, [animationData]);

  const option: EChartsOption = useMemo(() => {
    const activeKeys = CHANNEL_ORDER.filter((key) => selectedKeys.includes(key));
    const grids: NonNullable<EChartsOption["grid"]> = [];
    const xAxes: NonNullable<EChartsOption["xAxis"]> = [];
    const yAxes: NonNullable<EChartsOption["yAxis"]> = [];
    const series: NonNullable<EChartsOption["series"]> = [];
    const titles: NonNullable<EChartsOption["title"]> = [];

    const LEFT_MARGIN = 45;
    const RIGHT_MARGIN = 20;
    const AVAILABLE_HEIGHT_PCT = 92;

    activeKeys.forEach((key, index) => {
      const config = CHANNEL_CONFIG[key];
      const data =
        key === "rx" ? rotationData.avgRx : key === "ry" ? rotationData.avgRy : key === "rz" ? rotationData.avgRz : rotationData.avgMag;
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
          ? thresholds.rotationVelocityMag
          : key === "rx"
            ? thresholds.rotationVelocityX
            : key === "ry"
              ? thresholds.rotationVelocityY
              : thresholds.rotationVelocityZ;

      const markLineData: Array<{ xAxis?: number; yAxis?: number; name?: string }> = [{ xAxis: frameIndex * animationData.metadata.dt }];
      if (thresholdValue > 0) {
        markLineData.push({ yAxis: thresholdValue, name: "Threshold" });
      }

      series.push({
        name: config.label,
        type: "line",
        xAxisIndex: index,
        yAxisIndex: index,
        data: data.map((value, i) => [times[i], value]),
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
          if (!params || !Array.isArray(params) || params.length === 0) {
            return "";
          }

          const time = (params[0].value as number[])[0];
          const frame = Math.round(time / animationData.metadata.dt);
          const values = params.map((param) => ({
            name: param.seriesName ?? "Series",
            color: typeof param.color === "string" ? param.color : "#6b7280",
            value: (param.data as number[])[1],
          }));

          return renderToString(<TooltipContent frame={frame} time={time} values={values} />);
        },
      },
      animation: false,
    };
  }, [animationData.metadata.dt, frameIndex, maxFrame, rotationData, selectedKeys, thresholds, times]);

  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart || selectedKeys.length === 0) {
      return;
    }

    const convertToFrame = (pixelX: number) => {
      const chartDom = chart.getDom();
      const rect = chartDom.getBoundingClientRect();
      const pointInGrid = chart.convertFromPixel({ seriesIndex: 0 }, [pixelX - rect.left, 0]);
      if (!pointInGrid) {
        return null;
      }

      const time = pointInGrid[0] as number;
      const frame = Math.round(time / animationData.metadata.dt);
      return Math.max(0, Math.min(maxFrame, frame));
    };

    const handleMouseDown = (event: MouseEvent) => {
      const newFrame = convertToFrame(event.clientX);
      if (newFrame !== null) {
        setIsDragging(true);
        setFrameIndex(newFrame);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) {
        return;
      }

      const newFrame = convertToFrame(event.clientX);
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
  }, [animationData.metadata.dt, isDragging, maxFrame, selectedKeys.length, setFrameIndex]);

  return (
    <div className="flex flex-col border-t-2 border-neutral-300 relative h-full w-full bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0 relative">
        <div className="float-right ml-2 mt-0.5">
          <CheckSelect selected={selectedKeys} onChange={setSelectedKeys} />
        </div>
        <div className="text-sm text-neutral-700 flex items-center gap-2">
          <span className="font-medium">Avg. Angular Velocity</span>
          <span className="text-neutral-400">|</span>
          <span className="font-mono">Frame {frameIndex + 1}</span>
          <span className="text-neutral-400">|</span>
          <span className="font-mono">{formatFixed3(frameIndex * animationData.metadata.dt)}s</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full relative" style={{ cursor: isDragging ? "grabbing" : "default" }}>
        {!hasRotationVelocity ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-neutral-500">
            No rotational velocity data available.
          </div>
        ) : selectedKeys.length > 0 ? (
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-neutral-400 text-sm">Select a channel to view</div>
        )}
      </div>
    </div>
  );
}
