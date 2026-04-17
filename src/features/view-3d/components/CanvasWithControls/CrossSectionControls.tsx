import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layers } from "lucide-react";

import { useAnimationData } from "@/lib/useAnimationData";
import { useViewStore } from "@/state";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getMetricConfig, getMetricColorScale } from "@/lib/metrics";
import { interpolate } from "culori";
import { interpolateColor } from "@/lib/colors/colorUtils";

interface SliceItemProps {
  value: number;
  nodeIds: number[];
  positions: Float32Array;
  stride: number;
  currentMetric: string;
  metricColorScale: ReturnType<typeof getMetricColorScale>;
  maxValue: number;
  isSelected: boolean;
  onSelect: (value: number) => void;
  axis: "x" | "y" | "z";
}

function SliceItem({
  value,
  nodeIds,
  positions,
  stride,
  metricColorScale,
  maxValue,
  isSelected,
  onSelect,
  axis,
}: SliceItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (nodeIds.length === 0) {
      ctx.fillStyle = "#e5e5e5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#666";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("No nodes", canvas.width / 2, canvas.height / 2);
      return;
    }

    const interpolator = interpolate(
      [metricColorScale.positiveColorStops[0], metricColorScale.positiveColorStops[3]],
      "oklab"
    );

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const nodeId of nodeIds) {
      const base = nodeId * stride;
      const x = positions[base];
      const y = axis === "z" ? positions[base + 1] : positions[base + 2];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const padding = 10;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const scale = Math.min(width / rangeX, height / rangeY);
    const offsetX = (width - rangeX * scale) / 2 + padding;
    const offsetY = (height - rangeY * scale) / 2 + padding;

    for (const nodeId of nodeIds) {
      const base = nodeId * stride;
      const px = positions[base];
      const py = axis === "z" ? positions[base + 1] : positions[base + 2];

      const canvasX = (px - minX) * scale + offsetX;
      const canvasY = height - ((py - minY) * scale + offsetY) + padding;

      const nodeValue = axis === "x" ? Math.abs(px) : axis === "y" ? Math.abs(py) : Math.abs(py);
      const normalizedValue = maxValue > 0 ? Math.min(1, nodeValue / maxValue) : 0;
      const rgbColor = interpolateColor(interpolator, normalizedValue);
      const color = `rgb(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]})`;

      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [nodeIds, positions, stride, metricColorScale, maxValue, axis]);

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`hover:bg-muted/50 flex flex-col items-center gap-1 rounded border p-2 transition-colors ${
        isSelected ? "border-primary bg-primary/10" : "border-border"
      }`}>
      <canvas ref={canvasRef} width={80} height={60} className="bg-background rounded" />
      <span className="text-xs font-medium">
        {axis === "z" ? `Floor ${value.toFixed(0)}` : `${axis.toUpperCase()} = ${value.toFixed(0)}"`}
      </span>
      <span className="text-muted-foreground text-[10px]">{nodeIds.length} nodes</span>
    </button>
  );
}

type DirectionTab = "x" | "y" | "z";

export function CrossSectionControls() {
  const { animationData } = useAnimationData();
  const currentMetric = useViewStore((s) => s.currentMetric);
  const xRange = useViewStore((s) => s.xRange);
  const yRange = useViewStore((s) => s.yRange);
  const zRange = useViewStore((s) => s.zRange);
  const setXRange = useViewStore((s) => s.setXRange);
  const setYRange = useViewStore((s) => s.setYRange);
  const setZRange = useViewStore((s) => s.setZRange);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DirectionTab>("z");

  const positions = animationData.initialPositions.data;
  const stride = animationData.initialPositions.stride;
  const nodeCount = animationData.metadata.nodeCount;

  const metricColorScale = useMemo(() => getMetricColorScale(currentMetric, {}), [currentMetric]);
  const maxValue = useMemo(() => {
    const config = getMetricConfig(currentMetric);
    return config.getPrecomputedMax(animationData);
  }, [animationData, currentMetric]);

  const uniquePositions = useMemo(() => {
    const xSet = new Set<number>();
    const ySet = new Set<number>();
    const zSet = new Set<number>();

    for (let i = 0; i < nodeCount; i++) {
      const base = i * stride;
      xSet.add(positions[base]);
      ySet.add(positions[base + 1]);
      zSet.add(positions[base + 2]);
    }

    return {
      x: Array.from(xSet).sort((a, b) => a - b),
      y: Array.from(ySet).sort((a, b) => a - b),
      z: Array.from(zSet).sort((a, b) => a - b),
    };
  }, [positions, stride, nodeCount]);

  const slicesByAxis = useMemo(() => {
    const getNodesInSlice = (axis: "x" | "y" | "z", value: number) => {
      const nodes: number[] = [];
      for (let i = 0; i < nodeCount; i++) {
        const base = i * stride;
        const posValue = axis === "x" ? positions[base] : axis === "y" ? positions[base + 1] : positions[base + 2];
        if (Math.abs(posValue - value) < 0.01) {
          nodes.push(i);
        }
      }
      return nodes;
    };

    const buildSlices = (axis: "x" | "y" | "z", values: number[]) =>
      values.map((value) => ({
        value,
        nodeIds: getNodesInSlice(axis, value),
      }));

    return {
      x: buildSlices("x", uniquePositions.x),
      y: buildSlices("y", uniquePositions.y),
      z: buildSlices("z", uniquePositions.z),
    };
  }, [uniquePositions, positions, stride, nodeCount]);

  const getCurrentRange = useCallback(
    (axis: DirectionTab) => {
      switch (axis) {
        case "x":
          return xRange;
        case "y":
          return yRange;
        case "z":
          return zRange;
      }
    },
    [xRange, yRange, zRange]
  );

  const getSetRange = useCallback(
    (axis: DirectionTab) => {
      switch (axis) {
        case "x":
          return setXRange;
        case "y":
          return setYRange;
        case "z":
          return setZRange;
      }
    },
    [setXRange, setYRange, setZRange]
  );

  const getSliceFromRange = useCallback(
    (axis: DirectionTab, range: [number, number]) => {
      const values = axis === "x" ? uniquePositions.x : axis === "y" ? uniquePositions.y : uniquePositions.z;
      const midpoint = (range[0] + range[1]) / 2;
      const closest = values.reduce((prev, curr) =>
        Math.abs(curr - midpoint) < Math.abs(prev - midpoint) ? curr : prev
      );
      return closest;
    },
    [uniquePositions]
  );

  const handleSliceSelect = useCallback(
    (axis: DirectionTab, value: number) => {
      const setRange = getSetRange(axis);
      const halfWidth = axis === "z" ? 0.5 : 2;
      setRange([value - halfWidth, value + halfWidth]);
      setIsOpen(false);
    },
    [getSetRange]
  );

  const currentSlice = getSliceFromRange(activeTab, getCurrentRange(activeTab));

  const slices = activeTab === "x" ? slicesByAxis.x : activeTab === "y" ? slicesByAxis.y : slicesByAxis.z;

  return (
    <div className="absolute right-4 bottom-4 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="bg-background/90 flex items-center gap-2">
            <Layers size={16} />
            <span>Slices</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[420px] p-0" side="top">
          <div className="border-b px-3 py-2">
            <span className="text-sm font-medium">Cross-Section Navigator</span>
          </div>

          <div className="flex gap-1 border-b px-3 pt-2 pb-2">
            <ToggleGroup
              type="single"
              value={activeTab}
              onValueChange={(v) => v && setActiveTab(v as DirectionTab)}
              className="gap-1">
              <ToggleGroupItem value="x" className="px-3" variant="outline">
                X
              </ToggleGroupItem>
              <ToggleGroupItem value="y" className="px-3" variant="outline">
                Y
              </ToggleGroupItem>
              <ToggleGroupItem value="z" className="px-3" variant="outline">
                Z (Floors)
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-3">
            <div className="grid grid-cols-3 gap-2">
              {slices.map((slice) => (
                <SliceItem
                  key={slice.value}
                  value={slice.value}
                  nodeIds={slice.nodeIds}
                  positions={positions}
                  stride={stride}
                  currentMetric={currentMetric}
                  metricColorScale={metricColorScale}
                  maxValue={maxValue}
                  isSelected={Math.abs(slice.value - currentSlice) < 0.01}
                  onSelect={(v: number) => handleSliceSelect(activeTab, v)}
                  axis={activeTab}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
