import { usePlayback } from "@/components/playback/PlaybackContext";
import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";
import { useAnimationData } from "../../hooks/nodeDataHook";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";

const AXIS_CONFIG = {
  x: { id: "x", label: "X Displacement", color: "#f87171" },
  y: { id: "y", label: "Y Displacement", color: "#4ade80" },
  z: { id: "z", label: "Z Displacement", color: "#60a5fa" },
  magnitude: { id: "magnitude", label: "Magnitude", color: "#fbbf24" },
} as const;

type AxisKey = keyof typeof AXIS_CONFIG;
const AXIS_ORDER: AxisKey[] = ["x", "y", "z", "magnitude"];

function CheckSelect({
  options,
  selected,
  onChange,
}: {
  options: typeof AXIS_CONFIG;
  selected: AxisKey[];
  onChange: (keys: AxisKey[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggleOption = (key: AxisKey) => {
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
      ? "Select Axes"
      : AXIS_ORDER.filter((k) => selected.includes(k))
          .map((k) => k.toUpperCase())
          .join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="xs" className="min-w-16">
          <span className="truncate flex-1">{labelText}</span>
          <ChevronDown className={`w-3 h-3 text-neutral-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <div className="flex flex-col gap-0.5">
          {AXIS_ORDER.map((key) => {
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

export function HistogramChart() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const [selectedAxes, setSelectedAxes] = useState<AxisKey[]>(["x", "y", "z"]);

  const histogramData = useMemo(() => {
    const { nodeCount } = animationData.metadata;
    const { displacementLin } = animationData;
    const frameData = displacementLin.atFrame(frameIndex);

    const bins = 30;
    const result: Record<AxisKey, { counts: number[]; binEdges: number[]; stats: { mean: number; std: number; min: number; max: number } }> =
      {} as any;

    const computeHistogram = (values: number[], bins: number) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const binWidth = range / bins;
      const counts = new Array(bins).fill(0);
      const binEdges: number[] = [];

      for (let i = 0; i <= bins; i++) {
        binEdges.push(min + i * binWidth);
      }

      values.forEach((v) => {
        let binIndex = Math.floor((v - min) / binWidth);
        if (binIndex >= bins) binIndex = bins - 1;
        if (binIndex < 0) binIndex = 0;
        counts[binIndex]++;
      });

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);

      return { counts, binEdges, stats: { mean, std, min, max } };
    };

    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    const magValues: number[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const pos = frameData.at(i);
      xValues.push(pos[0]);
      yValues.push(pos[1]);
      zValues.push(pos[2]);
      magValues.push(Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2));
    }

    if (selectedAxes.includes("x")) result.x = computeHistogram(xValues, bins);
    if (selectedAxes.includes("y")) result.y = computeHistogram(yValues, bins);
    if (selectedAxes.includes("z")) result.z = computeHistogram(zValues, bins);
    if (selectedAxes.includes("magnitude")) result.magnitude = computeHistogram(magValues, bins);

    return result;
  }, [animationData, frameIndex, selectedAxes]);

  const option = useMemo(() => {
    const grids: any[] = [];
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    const series: any[] = [];
    const titles: any[] = [];

    const activeAxes = AXIS_ORDER.filter((k) => selectedAxes.includes(k) && histogramData[k]);
    const count = activeAxes.length;
    const LEFT_MARGIN = 50;
    const RIGHT_MARGIN = 20;
    const AVAILABLE_HEIGHT_PCT = 92;

    activeAxes.forEach((key, index) => {
      const data = histogramData[key];
      if (!data) return;

      const config = AXIS_CONFIG[key];
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

      titles.push({
        text: `${config.label} (μ=${data.stats.mean.toFixed(3)}, σ=${data.stats.std.toFixed(3)})`,
        left: LEFT_MARGIN + 5,
        top: `${topPct}%`,
        textStyle: { fontSize: 11, fontWeight: "bold", color: config.color },
      });

      const barData = data.counts.map((count, i) => [(data.binEdges[i] + data.binEdges[i + 1]) / 2, count]);
      const binWidth = data.binEdges[1] - data.binEdges[0];

      xAxes.push({
        gridIndex: index,
        type: "value",
        min: data.stats.min,
        max: data.stats.max,
        axisLine: { show: isLast, lineStyle: { color: "#d1d5db" } },
        axisLabel: { show: isLast, color: "#6b7280", fontSize: 10, formatter: (v: number) => v.toFixed(2) },
        splitLine: { show: true, lineStyle: { color: "#f3f4f6" } },
      });

      yAxes.push({
        gridIndex: index,
        type: "value",
        axisLine: { show: true, lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#6b7280", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      });

      series.push({
        name: config.label,
        type: "bar",
        xAxisIndex: index,
        yAxisIndex: index,
        data: barData,
        barWidth: `${binWidth}px`,
        itemStyle: { color: config.color, opacity: 0.8 },
        emphasis: { itemStyle: { color: config.color, opacity: 1 } },
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
        axisPointer: { type: "shadow" },
      },
      animation: false,
    };
  }, [histogramData, selectedAxes]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="float-right ml-2">
          <CheckSelect options={AXIS_CONFIG} selected={selectedAxes} onChange={setSelectedAxes} />
        </div>
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Frame {frameIndex + 1}</span>
          <span className="text-neutral-400 ml-2">- Displacement Distribution</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full">
        {selectedAxes.length > 0 ? (
          <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-neutral-400 text-sm">
            Select axes to view histograms
          </div>
        )}
      </div>
    </div>
  );
}
