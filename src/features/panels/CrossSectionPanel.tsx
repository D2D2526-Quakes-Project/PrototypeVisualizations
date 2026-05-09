import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { usePlayback } from "@/features/playback/usePlayback";
import { getMetricKeyColor } from "@/lib/metrics";
import { useAnimationData } from "@/lib/animation-data/useAnimationData";

import type { IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview";
import { ChartNoAxesCombinedIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CrossSectionVisualization } from "../../cross-section-panel/CrossSectionVisualization";
import { MiniTimeSeries } from "./MiniTimeSeries";
import { IsometricBuilding } from "@/components/IsometricBoundingBox";
import { HingeLocalizedSummary } from "@/features/3d/components/HingeLocalizedSummary";

interface CrossSectionParams {
  crossSectionType: "X" | "Y";
  position: number;
  nodeIds: number[];
}

export function getCrossSectionColor(type: "X" | "Y", position: number): string {
  const hue = type === "X" ? 200 : 280;
  const offset = (position % 50) * 3;
  return `hsl(${hue + offset}, 70%, 45%)`;
}

export function getCrossSectionColorLight(type: "X" | "Y", position: number): string {
  const hue = type === "X" ? 200 : 280;
  const offset = (position % 50) * 3;
  return `hsl(${hue + offset}, 70%, 90%)`;
}

/** Returns the index of the absolute-maximum value in an array. */
function peakAbsIndex(arr: number[]): number {
  let idx = 0;
  let best = 0;
  for (let i = 0; i < arr.length; i++) {
    const a = Math.abs(arr[i]);
    if (a > best) {
      best = a;
      idx = i;
    }
  }
  return idx;
}

export function CrossSectionPanel(props: IDockviewPanelProps<CrossSectionParams>) {
  const { crossSectionType, position, nodeIds } = props.params;
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const nodePanelGraphVisibility = useViewStore((s) => s.nodePanelGraphVisibility);
  const toggleNodePanelGraph = useViewStore((s) => s.toggleNodePanelGraph);
  const metricPaletteOverrides = useViewStore((s) => s.metricPaletteOverrides);

  const displacementXColor = getMetricKeyColor("displacementX", metricPaletteOverrides);
  const displacementYColor = getMetricKeyColor("displacementY", metricPaletteOverrides);
  const displacementZColor = getMetricKeyColor("displacementZ", metricPaletteOverrides);
  const velocityXColor = getMetricKeyColor("velocityX", metricPaletteOverrides);
  const velocityYColor = getMetricKeyColor("velocityY", metricPaletteOverrides);
  const velocityZColor = getMetricKeyColor("velocityZ", metricPaletteOverrides);
  const accelerationXColor = getMetricKeyColor("accelerationX", metricPaletteOverrides);
  const accelerationYColor = getMetricKeyColor("accelerationY", metricPaletteOverrides);
  const accelerationZColor = getMetricKeyColor("accelerationZ", metricPaletteOverrides);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState(300);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions(width);
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // TIME SERIES
  const displacementTimeSeries = useMemo(() => {
    const nodeCount = nodeIds.length;
    if (nodeCount === 0) return null;
    const { frameCount, dt } = animationData.metadata;

    const times: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];

    for (let f = 0; f < frameCount; f++) {
      times.push(f * dt);
      let sx = 0,
        sy = 0,
        sz = 0;
      const frame = animationData.displacementLin.atFrame(f);
      for (const nodeId of nodeIds) {
        const d = frame.at(nodeId);
        sx += d[0];
        sy += d[1];
        sz += d[2];
      }
      xValues.push(sx / nodeCount);
      yValues.push(sy / nodeCount);
      zValues.push(sz / nodeCount);
    }

    return {
      times,
      xValues,
      yValues,
      zValues,
      peakTimes: {
        x: times[peakAbsIndex(xValues)],
        y: times[peakAbsIndex(yValues)],
        z: times[peakAbsIndex(zValues)],
      },
    };
  }, [nodeIds, animationData.displacementLin, animationData.metadata]);

  const velocityTimeSeries = useMemo(() => {
    if (!animationData.velocityLin || nodeIds.length === 0) return null;
    const nodeCount = nodeIds.length;
    const { frameCount, dt } = animationData.metadata;

    const times: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];

    for (let f = 0; f < frameCount; f++) {
      times.push(f * dt);
      let sx = 0,
        sy = 0,
        sz = 0;
      const frame = animationData.velocityLin.atFrame(f);
      for (const nodeId of nodeIds) {
        const v = frame.at(nodeId);
        sx += v[0];
        sy += v[1];
        sz += v[2];
      }
      xValues.push(sx / nodeCount);
      yValues.push(sy / nodeCount);
      zValues.push(sz / nodeCount);
    }

    return {
      times,
      xValues,
      yValues,
      zValues,
      peakTimes: {
        x: times[peakAbsIndex(xValues)],
        y: times[peakAbsIndex(yValues)],
        z: times[peakAbsIndex(zValues)],
      },
    };
  }, [nodeIds, animationData.velocityLin, animationData.metadata]);

  const accelerationTimeSeries = useMemo(() => {
    if (!animationData.accelerationLin || nodeIds.length === 0) return null;
    const nodeCount = nodeIds.length;
    const { frameCount, dt } = animationData.metadata;

    const times: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];

    for (let f = 0; f < frameCount; f++) {
      times.push(f * dt);
      let sx = 0,
        sy = 0,
        sz = 0;
      const frame = animationData.accelerationLin.atFrame(f);
      for (const nodeId of nodeIds) {
        const a = frame.at(nodeId);
        sx += a[0];
        sy += a[1];
        sz += a[2];
      }
      xValues.push(sx / nodeCount);
      yValues.push(sy / nodeCount);
      zValues.push(sz / nodeCount);
    }

    return {
      times,
      xValues,
      yValues,
      zValues,
      peakTimes: {
        x: times[peakAbsIndex(xValues)],
        y: times[peakAbsIndex(yValues)],
        z: times[peakAbsIndex(zValues)],
      },
    };
  }, [nodeIds, animationData.accelerationLin, animationData.metadata]);

  // PEAK VALUES
  const displacementPeak = useMemo(() => {
    if (!displacementTimeSeries) return null;
    const { times, xValues, yValues, zValues } = displacementTimeSeries;
    const xi = peakAbsIndex(xValues);
    const yi = peakAbsIndex(yValues);
    const zi = peakAbsIndex(zValues);
    return {
      x: xValues[xi],
      xTime: times[xi],
      y: yValues[yi],
      yTime: times[yi],
      z: zValues[zi],
      zTime: times[zi],
    };
  }, [displacementTimeSeries]);

  const velocityPeak = useMemo(() => {
    if (!velocityTimeSeries) return null;
    const { times, xValues, yValues, zValues } = velocityTimeSeries;
    const xi = peakAbsIndex(xValues);
    const yi = peakAbsIndex(yValues);
    const zi = peakAbsIndex(zValues);
    return {
      x: xValues[xi],
      xTime: times[xi],
      y: yValues[yi],
      yTime: times[yi],
      z: zValues[zi],
      zTime: times[zi],
    };
  }, [velocityTimeSeries]);

  const accelerationPeak = useMemo(() => {
    if (!accelerationTimeSeries) return null;
    const { times, xValues, yValues, zValues } = accelerationTimeSeries;
    const xi = peakAbsIndex(xValues);
    const yi = peakAbsIndex(yValues);
    const zi = peakAbsIndex(zValues);
    return {
      x: xValues[xi],
      xTime: times[xi],
      y: yValues[yi],
      yTime: times[yi],
      z: zValues[zi],
      zTime: times[zi],
    };
  }, [accelerationTimeSeries]);

  // -------------------------------------------------------------------------
  // CURRENT-FRAME VALUES  (cheap — only depend on frameIndex)
  // -------------------------------------------------------------------------

  const displacementCurrent = useMemo(() => {
    if (nodeIds.length === 0) return null;
    const nodeCount = nodeIds.length;
    let sx = 0,
      sy = 0,
      sz = 0;
    const frame = animationData.displacementLin.atFrame(frameIndex);
    for (const nodeId of nodeIds) {
      const d = frame.at(nodeId);
      sx += d[0];
      sy += d[1];
      sz += d[2];
    }
    return { x: sx / nodeCount, y: sy / nodeCount, z: sz / nodeCount };
  }, [nodeIds, animationData.displacementLin, frameIndex]);

  const velocityCurrent = useMemo(() => {
    if (!animationData.velocityLin || nodeIds.length === 0) return null;
    const nodeCount = nodeIds.length;
    let sx = 0,
      sy = 0,
      sz = 0;
    const frame = animationData.velocityLin.atFrame(frameIndex);
    for (const nodeId of nodeIds) {
      const v = frame.at(nodeId);
      sx += v[0];
      sy += v[1];
      sz += v[2];
    }
    return { x: sx / nodeCount, y: sy / nodeCount, z: sz / nodeCount };
  }, [nodeIds, animationData.velocityLin, frameIndex]);

  const accelerationCurrent = useMemo(() => {
    if (!animationData.accelerationLin || nodeIds.length === 0) return null;
    const nodeCount = nodeIds.length;
    let sx = 0,
      sy = 0,
      sz = 0;
    const frame = animationData.accelerationLin.atFrame(frameIndex);
    for (const nodeId of nodeIds) {
      const a = frame.at(nodeId);
      sx += a[0];
      sy += a[1];
      sz += a[2];
    }
    return { x: sx / nodeCount, y: sy / nodeCount, z: sz / nodeCount };
  }, [nodeIds, animationData.accelerationLin, frameIndex]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-scroll p-3 text-xs">
        {/* 3D VISUALIZATION */}
        <div className="animate-fade-in w-full" ref={containerRef}>
          <CrossSectionVisualization nodeIds={nodeIds} crossSectionType={crossSectionType} width={dimensions} />
        </div>

        {/* LOCATION INFO */}
        <div className="animate-fade-in grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium text-neutral-700">{crossSectionType} Position:</span>
            <div className="text-neutral-600">
              <UnitTooltip value={position} unit="in" decimals={1} />
            </div>
          </div>
          <div>
            <span className="font-medium text-neutral-700">Nodes:</span>
            <div className="text-neutral-600">{nodeIds.length}</div>
          </div>
        </div>

        {animationData.precomputed.hingeNodeMetrics && (
          <div className="animate-fade-in">
            <HingeLocalizedSummary
              title="Static Hinge Rotation"
              subtitle={`Hinge data localized to the ${crossSectionType}-section nodes.`}
              nodeIds={nodeIds}
            />
          </div>
        )}

        {/* DISPLACEMENT */}
        {displacementCurrent && displacementPeak && displacementTimeSeries && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Displacement</h3>
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementCurrent.x} unit="in" />
                  <button
                    onClick={() => toggleNodePanelGraph("dispX")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`dispX`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`dispX`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak X:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementPeak.x} unit="in" />
                  <span className="text-[9px] text-neutral-500"> @ {displacementPeak.xTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementCurrent.y} unit="in" />
                  <button
                    onClick={() => toggleNodePanelGraph("dispY")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`dispY`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`dispY`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Y:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementPeak.y} unit="in" />
                  <span className="text-[9px] text-neutral-500"> @ {displacementPeak.yTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementCurrent.z} unit="in" />
                  <button
                    onClick={() => toggleNodePanelGraph("dispZ")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`dispZ`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`dispZ`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Z:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementPeak.z} unit="in" />
                  <span className="text-[9px] text-neutral-500"> @ {displacementPeak.zTime.toFixed(2)} s</span>
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {nodePanelGraphVisibility[`dispX`] && (
                <MiniTimeSeries
                  data={displacementTimeSeries.xValues}
                  times={displacementTimeSeries.times}
                  color={displacementXColor}
                  currentValue={displacementCurrent.x}
                  unit="in"
                  label="Displacement X"
                  peakTime={displacementTimeSeries.peakTimes.x}
                />
              )}
              {nodePanelGraphVisibility[`dispY`] && (
                <MiniTimeSeries
                  data={displacementTimeSeries.yValues}
                  times={displacementTimeSeries.times}
                  color={displacementYColor}
                  currentValue={displacementCurrent.y}
                  unit="in"
                  label="Displacement Y"
                  peakTime={displacementTimeSeries.peakTimes.y}
                />
              )}
              {nodePanelGraphVisibility[`dispZ`] && (
                <MiniTimeSeries
                  data={displacementTimeSeries.zValues}
                  times={displacementTimeSeries.times}
                  color={displacementZColor}
                  currentValue={displacementCurrent.z}
                  unit="in"
                  label="Displacement Z"
                  peakTime={displacementTimeSeries.peakTimes.z}
                />
              )}
            </div>
          </div>
        )}

        {/* VELOCITY */}
        {velocityCurrent && velocityPeak && velocityTimeSeries && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Velocity</h3>
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityCurrent.x} unit="in/s" />
                  <button
                    onClick={() => toggleNodePanelGraph("velX")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`velX`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`velX`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak X:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityPeak.x} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">@ {velocityPeak.xTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityCurrent.y} unit="in/s" />
                  <button
                    onClick={() => toggleNodePanelGraph("velY")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`velY`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`velY`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Y:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityPeak.y} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">@ {velocityPeak.yTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityCurrent.z} unit="in/s" />
                  <button
                    onClick={() => toggleNodePanelGraph("velZ")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`velZ`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`velZ`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Z:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityPeak.z} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">@ {velocityPeak.zTime.toFixed(2)} s</span>
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {nodePanelGraphVisibility[`velX`] && (
                <MiniTimeSeries
                  data={velocityTimeSeries.xValues}
                  times={velocityTimeSeries.times}
                  color={velocityXColor}
                  currentValue={velocityCurrent.x}
                  unit="in/s"
                  label="Velocity X"
                  peakTime={velocityTimeSeries.peakTimes.x}
                />
              )}
              {nodePanelGraphVisibility[`velY`] && (
                <MiniTimeSeries
                  data={velocityTimeSeries.yValues}
                  times={velocityTimeSeries.times}
                  color={velocityYColor}
                  currentValue={velocityCurrent.y}
                  unit="in/s"
                  label="Velocity Y"
                  peakTime={velocityTimeSeries.peakTimes.y}
                />
              )}
              {nodePanelGraphVisibility[`velZ`] && (
                <MiniTimeSeries
                  data={velocityTimeSeries.zValues}
                  times={velocityTimeSeries.times}
                  color={velocityZColor}
                  currentValue={velocityCurrent.z}
                  unit="in/s"
                  label="Velocity Z"
                  peakTime={velocityTimeSeries.peakTimes.z}
                />
              )}
            </div>
          </div>
        )}

        {/* ACCELERATION */}
        {accelerationCurrent && accelerationPeak && accelerationTimeSeries && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Acceleration</h3>
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationCurrent.x} unit="in/s²" />
                  <button
                    onClick={() => toggleNodePanelGraph("accX")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`accX`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`accX`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak X:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationPeak.x} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">@ {accelerationPeak.xTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationCurrent.y} unit="in/s²" />
                  <button
                    onClick={() => toggleNodePanelGraph("accY")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`accY`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`accY`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Y:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationPeak.y} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">@ {accelerationPeak.yTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationCurrent.z} unit="in/s²" />
                  <button
                    onClick={() => toggleNodePanelGraph("accZ")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`accZ`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`accZ`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Z:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationPeak.z} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">@ {accelerationPeak.zTime.toFixed(2)} s</span>
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {nodePanelGraphVisibility[`accX`] && (
                <MiniTimeSeries
                  data={accelerationTimeSeries.xValues}
                  times={accelerationTimeSeries.times}
                  color={accelerationXColor}
                  currentValue={accelerationCurrent.x}
                  unit="in/s²"
                  label="Acceleration X"
                  peakTime={accelerationTimeSeries.peakTimes.x}
                />
              )}
              {nodePanelGraphVisibility[`accY`] && (
                <MiniTimeSeries
                  data={accelerationTimeSeries.yValues}
                  times={accelerationTimeSeries.times}
                  color={accelerationYColor}
                  currentValue={accelerationCurrent.y}
                  unit="in/s²"
                  label="Acceleration Y"
                  peakTime={accelerationTimeSeries.peakTimes.y}
                />
              )}
              {nodePanelGraphVisibility[`accZ`] && (
                <MiniTimeSeries
                  data={accelerationTimeSeries.zValues}
                  times={accelerationTimeSeries.times}
                  color={accelerationZColor}
                  currentValue={accelerationCurrent.z}
                  unit="in/s²"
                  label="Acceleration Z"
                  peakTime={accelerationTimeSeries.peakTimes.z}
                />
              )}
            </div>
          </div>
        )}

        {!animationData.velocityLin && <div className="text-[10px] text-neutral-400 italic">Velocities not loaded</div>}
        {!animationData.accelerationLin && (
          <div className="text-[10px] text-neutral-400 italic">Accelerations not loaded</div>
        )}
      </div>
    </div>
  );
}

export function CrossSectionTab(props: IDockviewPanelHeaderProps<CrossSectionParams>) {
  const { crossSectionType, position: dataPosition } = props.params;
  const color = getCrossSectionColor(crossSectionType, dataPosition);
  const lightColor = getCrossSectionColorLight(crossSectionType, dataPosition);
  const { animationData } = useAnimationData();
  const boundingBox = animationData.precomputed.boundingBox;

  const handleClose = () => {
    props.api.close();
  };

  const position = Math.trunc(
    crossSectionType == "X" ? dataPosition - boundingBox.center[0] : dataPosition - boundingBox.center[1]
  );

  return (
    <div
      className="flex cursor-grab items-center justify-between border-b px-3 py-2 transition-colors active:cursor-grabbing"
      style={{ backgroundColor: lightColor, borderColor: color }}>
      <div className="pointer-events-none flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color }}>
          {crossSectionType} Section {position}
        </span>
        <div className="size-5">
          <IsometricBuilding
            highlightSliceX={crossSectionType == "X" ? position : undefined}
            highlightSliceY={crossSectionType == "Y" ? position : undefined}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleClose}
          className="rounded p-1 transition-colors hover:bg-white/50"
          style={{ color }}
          title="Close">
          <XIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
