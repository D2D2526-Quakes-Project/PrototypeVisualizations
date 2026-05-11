import { usePlayback } from "@/features/playback/usePlayback";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import type { IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview";
import { useEffect, useMemo, useRef, useState } from "react";
import { FloorVisualization } from "./FloorVisualization";
import { MiniTimeSeries } from "./MiniTimeSeries";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { getMetricKeyColor } from "@/lib/metrics";

import { ChartNoAxesCombinedIcon, XIcon } from "lucide-react";
import { stringToNumber } from "@/lib/utils";
import { IsometricBuilding } from "@/components/IsometricBoundingBox";
import { HingeLocalizedSummary } from "@/components/HingeLocalizedSummary";
import type { ShearRow } from "@/lib/types";

// Generate a unique vibrant color based on node ID
export function getFloorColor(storyId: string): string {
  const num: number = stringToNumber(storyId);
  const hue = (num * 137.508) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

export function getFloorColorLight(storyId: string): string {
  const num: number = stringToNumber(storyId);
  const hue = (num * 137.508) % 360;
  return `hsl(${hue}, 70%, 90%)`;
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

export function FloorPanel(props: IDockviewPanelProps<{ storyId: string }>) {
  const storyId = props.params.storyId;
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
  const shearXColor = getMetricKeyColor("shearXAbs", metricPaletteOverrides);
  const shearYColor = getMetricKeyColor("shearYAbs", metricPaletteOverrides);
  const storyDriftColor = getMetricKeyColor("interstoryDrift", metricPaletteOverrides);

  const nodeIds = useMemo(
    () => animationData.metadata.stories[storyId] || [],
    [storyId, animationData.metadata.stories]
  );

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

  // LOCATION INFO — no frameIndex dep, fine as-is
  const storyInfo = useMemo(() => {
    const storyIndex = animationData.metadata.storyOrder.indexOf(storyId);
    return {
      story: storyId,
      height: animationData.metadata.storyHeights[storyId] || 0,
      elevation: animationData.precomputed.storyElevations[storyId] || 0,
      floorNumber: storyIndex + 1,
      totalFloors: animationData.metadata.storyOrder.length,
    };
  }, [storyId, animationData]);

  const shearSummary = useMemo<ShearRow | null>(
    () => animationData.shearData?.getByStory(storyId) ?? null,
    [animationData.shearData, storyId]
  );

  // DISPLACEMENT
  const displacementTimeSeries = useMemo(() => {
    const nodeCount = nodeIds.length;
    const frameCount = animationData.metadata.frameCount;
    const dt = animationData.metadata.dt;

    const times: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    const magnitudes: number[] = [];

    for (let f = 0; f < frameCount; f++) {
      times.push(f * dt);
      let mx = 0,
        my = 0,
        mz = 0;
      const frame = animationData.displacementLin.atFrame(f);
      for (const nodeId of nodeIds) {
        const d = frame.at(nodeId);
        mx += d[0];
        my += d[1];
        mz += d[2];
      }
      xValues.push(mx / nodeCount);
      yValues.push(my / nodeCount);
      zValues.push(mz / nodeCount);
      magnitudes.push(Math.hypot(mx / nodeCount, my / nodeCount, mz / nodeCount));
    }

    return {
      times,
      xValues,
      yValues,
      zValues,
      magnitudes,
      peakTimes: {
        x: times[peakAbsIndex(xValues)],
        y: times[peakAbsIndex(yValues)],
        z: times[peakAbsIndex(zValues)],
        magnitude: times[peakAbsIndex(magnitudes)],
      },
    };
  }, [nodeIds, animationData.metadata.frameCount, animationData.metadata.dt, animationData.displacementLin]);

  const velocityTimeSeries = useMemo(() => {
    if (!animationData.velocityLin) return null;
    const nodeCount = nodeIds.length;
    const frameCount = animationData.metadata.frameCount;
    const dt = animationData.metadata.dt;

    const times: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    const magnitudes: number[] = [];

    for (let f = 0; f < frameCount; f++) {
      times.push(f * dt);
      let mx = 0,
        my = 0,
        mz = 0;
      const frame = animationData.velocityLin.atFrame(f);
      for (const nodeId of nodeIds) {
        const v = frame.at(nodeId);
        mx += v[0];
        my += v[1];
        mz += v[2];
      }
      xValues.push(mx / nodeCount);
      yValues.push(my / nodeCount);
      zValues.push(mz / nodeCount);
      magnitudes.push(Math.hypot(mx / nodeCount, my / nodeCount, mz / nodeCount));
    }

    return {
      times,
      xValues,
      yValues,
      zValues,
      magnitudes,
      peakTimes: {
        x: times[peakAbsIndex(xValues)],
        y: times[peakAbsIndex(yValues)],
        z: times[peakAbsIndex(zValues)],
        magnitude: times[peakAbsIndex(magnitudes)],
      },
    };
  }, [animationData.velocityLin, nodeIds, animationData.metadata.frameCount, animationData.metadata.dt]);

  const accelerationTimeSeries = useMemo(() => {
    if (!animationData.accelerationLin) return null;
    const nodeCount = nodeIds.length;
    const frameCount = animationData.metadata.frameCount;
    const dt = animationData.metadata.dt;

    const times: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    const magnitudes: number[] = [];

    for (let f = 0; f < frameCount; f++) {
      times.push(f * dt);
      let mx = 0,
        my = 0,
        mz = 0;
      const frame = animationData.accelerationLin.atFrame(f);
      for (const nodeId of nodeIds) {
        const a = frame.at(nodeId);
        mx += a[0];
        my += a[1];
        mz += a[2];
      }
      xValues.push(mx / nodeCount);
      yValues.push(my / nodeCount);
      zValues.push(mz / nodeCount);
      magnitudes.push(Math.hypot(mx / nodeCount, my / nodeCount, mz / nodeCount));
    }

    return {
      times,
      xValues,
      yValues,
      zValues,
      magnitudes,
      peakTimes: {
        x: times[peakAbsIndex(xValues)],
        y: times[peakAbsIndex(yValues)],
        z: times[peakAbsIndex(zValues)],
        magnitude: times[peakAbsIndex(magnitudes)],
      },
    };
  }, [animationData.accelerationLin, nodeIds, animationData.metadata.frameCount, animationData.metadata.dt]);

  const driftTimeSeries = useMemo(() => {
    const cornerNodes = animationData.metadata.cornerNodes[storyId];
    const frameCount = animationData.metadata.frameCount;
    const dt = animationData.metadata.dt;

    const times: number[] = [];
    const nwValues: number[] = [];
    const neValues: number[] = [];
    const swValues: number[] = [];
    const seValues: number[] = [];

    for (let f = 0; f < frameCount; f++) {
      times.push(f * dt);
      nwValues.push(animationData.storyDrift.get(f, cornerNodes.NW));
      neValues.push(animationData.storyDrift.get(f, cornerNodes.NE));
      swValues.push(animationData.storyDrift.get(f, cornerNodes.SW));
      seValues.push(animationData.storyDrift.get(f, cornerNodes.SE));
    }

    return {
      times,
      nwValues,
      neValues,
      swValues,
      seValues,
      peakTimes: {
        nw: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.NW] ?? 0) * dt,
        ne: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.NE] ?? 0) * dt,
        sw: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.SW] ?? 0) * dt,
        se: (animationData.precomputed.peakStoryDriftFrame[cornerNodes.SE] ?? 0) * dt,
      },
    };
  }, [animationData, storyId]);

  // PEAK VALUES
  const displacementPeak = useMemo(() => {
    if (nodeIds.length === 0) return null;
    const { times, xValues, yValues, zValues, magnitudes } = displacementTimeSeries;
    const xi = peakAbsIndex(xValues);
    const yi = peakAbsIndex(yValues);
    const zi = peakAbsIndex(zValues);
    const mi = peakAbsIndex(magnitudes);
    return {
      magnitude: magnitudes[mi],
      magnitudeTime: times[mi],
      x: xValues[xi],
      xTime: times[xi],
      y: yValues[yi],
      yTime: times[yi],
      z: zValues[zi],
      zTime: times[zi],
    };
  }, [nodeIds, displacementTimeSeries]);

  const velocityPeak = useMemo(() => {
    if (!velocityTimeSeries) return null;
    const { times, xValues, yValues, zValues, magnitudes } = velocityTimeSeries;
    const xi = peakAbsIndex(xValues);
    const yi = peakAbsIndex(yValues);
    const zi = peakAbsIndex(zValues);
    const mi = peakAbsIndex(magnitudes);
    return {
      magnitude: magnitudes[mi],
      magnitudeTime: times[mi],
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
    const { times, xValues, yValues, zValues, magnitudes } = accelerationTimeSeries;
    const xi = peakAbsIndex(xValues);
    const yi = peakAbsIndex(yValues);
    const zi = peakAbsIndex(zValues);
    const mi = peakAbsIndex(magnitudes);
    return {
      magnitude: magnitudes[mi],
      magnitudeTime: times[mi],
      x: xValues[xi],
      xTime: times[xi],
      y: yValues[yi],
      yTime: times[yi],
      z: zValues[zi],
      zTime: times[zi],
    };
  }, [accelerationTimeSeries]);

  const cornerDriftPeaks = useMemo(() => {
    const cornerNodes = animationData.metadata.cornerNodes[storyId];
    const dt = animationData.metadata.dt;
    const result: Record<string, { peak: number; peakTime: number }> = {};
    for (const corner in cornerNodes) {
      const nodeId = cornerNodes[corner as keyof typeof cornerNodes];
      result[corner] = {
        peak: animationData.precomputed.peakStoryDrift[nodeId] ?? 0,
        peakTime: (animationData.precomputed.peakStoryDriftFrame[nodeId] ?? 0) * dt,
      };
    }
    return result;
  }, [storyId, animationData]);

  // -------------------------------------------------------------------------
  // CURRENT-FRAME VALUES  (cheap — only depend on frameIndex)
  // -------------------------------------------------------------------------

  const displacementCurrent = useMemo(() => {
    if (nodeIds.length === 0) return null;
    const nodeCount = nodeIds.length;
    let mx = 0,
      my = 0,
      mz = 0;
    const frame = animationData.displacementLin.atFrame(frameIndex);
    for (const nodeId of nodeIds) {
      const d = frame.at(nodeId);
      mx += d[0];
      my += d[1];
      mz += d[2];
    }
    return {
      x: mx / nodeCount,
      y: my / nodeCount,
      z: mz / nodeCount,
      magnitude: Math.hypot(mx / nodeCount, my / nodeCount, mz / nodeCount),
    };
  }, [nodeIds, animationData.displacementLin, frameIndex]);

  const velocityCurrent = useMemo(() => {
    if (!animationData.velocityLin || nodeIds.length === 0) return null;
    const nodeCount = nodeIds.length;
    let mx = 0,
      my = 0,
      mz = 0;
    const frame = animationData.velocityLin.atFrame(frameIndex);
    for (const nodeId of nodeIds) {
      const v = frame.at(nodeId);
      mx += v[0];
      my += v[1];
      mz += v[2];
    }
    return {
      x: mx / nodeCount,
      y: my / nodeCount,
      z: mz / nodeCount,
      magnitude: Math.hypot(mx / nodeCount, my / nodeCount, mz / nodeCount),
    };
  }, [nodeIds, animationData.velocityLin, frameIndex]);

  const accelerationCurrent = useMemo(() => {
    if (!animationData.accelerationLin || nodeIds.length === 0) return null;
    const nodeCount = nodeIds.length;
    let mx = 0,
      my = 0,
      mz = 0;
    const frame = animationData.accelerationLin.atFrame(frameIndex);
    for (const nodeId of nodeIds) {
      const a = frame.at(nodeId);
      mx += a[0];
      my += a[1];
      mz += a[2];
    }
    return {
      x: mx / nodeCount,
      y: my / nodeCount,
      z: mz / nodeCount,
      magnitude: Math.hypot(mx / nodeCount, my / nodeCount, mz / nodeCount),
    };
  }, [nodeIds, animationData.accelerationLin, frameIndex]);

  const cornerDriftsCurrent = useMemo(() => {
    const cornerNodes = animationData.metadata.cornerNodes[storyId];
    const result: Record<string, number> = {};
    for (const corner in cornerNodes) {
      const nodeId = cornerNodes[corner as keyof typeof cornerNodes];
      result[corner] = animationData.storyDrift.get(frameIndex, nodeId) ?? 0;
    }
    return result;
  }, [storyId, animationData.storyDrift, animationData.metadata.cornerNodes, frameIndex]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs *:border-b *:pb-3">
        {/* 3D VISUALIZATION */}
        <div className="animate-fade-in w-full" ref={containerRef}>
          <FloorVisualization nodeIds={nodeIds} width={dimensions} />
        </div>

        {/* LOCATION INFO */}
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Story:</span>
              <div className="font-mono text-neutral-600">{storyInfo.story}</div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Nodes:</span>
              <div className="text-neutral-600">{nodeIds.length}</div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Elevation:</span>
              <div className="text-neutral-600">
                <UnitTooltip value={storyInfo.elevation} unit="in" decimals={1} />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Story Height:</span>
              <div className="text-neutral-600">
                <UnitTooltip value={storyInfo.height} unit="in" decimals={1} />
              </div>
            </div>
          </div>
        </div>

        {animationData.precomputed.hingeNodeMetrics && (
          <div className="animate-fade-in">
            <HingeLocalizedSummary
              title="Static Hinge Rotation"
              subtitle="Hinge data localized to this floor's nodes."
              nodeIds={nodeIds}
            />
          </div>
        )}

        {shearSummary && (
          <div className="animate-fade-in">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Static Shear</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: shearXColor }} />
                  <span className="text-xs font-medium text-neutral-700">X Direction</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-neutral-600">Max</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.xMax} unit="kip" />
                  </span>
                  <span className="text-neutral-600">Min</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.xMin} unit="kip" />
                  </span>
                  <span className="text-neutral-600">Abs</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.xAbs} unit="kip" />
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: shearYColor }} />
                  <span className="text-xs font-medium text-neutral-700">Y Direction</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-neutral-600">Max</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.yMax} unit="kip" />
                  </span>
                  <span className="text-neutral-600">Min</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.yMin} unit="kip" />
                  </span>
                  <span className="text-neutral-600">Abs</span>
                  <span className="font-mono text-neutral-800">
                    <UnitTooltip value={shearSummary.yAbs} unit="kip" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DISPLACEMENT */}
        {displacementCurrent && displacementPeak && (
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

        {/* CORNER DRIFTS */}
        {cornerDriftsCurrent && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Story Drifts</h3>
            <div className="space-y-1">
              {Object.entries(cornerDriftsCurrent).map(([corner, current]) => {
                const peaks = cornerDriftPeaks[corner];
                return (
                  <div key={corner} className="flex items-center gap-2">
                    <span className="w-8 font-medium text-neutral-700">{corner}:</span>
                    <div className="font-mono text-[10px] text-neutral-600">
                      <span className="mr-1">Current:</span>
                      <UnitTooltip value={current} unit="%" />
                      <span className="mx-2 text-neutral-300">|</span>
                      <span className="mr-1">Peak:</span>
                      <UnitTooltip value={peaks.peak} unit="%" />
                      <span className="text-[9px] text-neutral-500">@ {peaks.peakTime.toFixed(2)} s</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {driftTimeSeries && (
              <div className="mt-3 space-y-2">
                {nodePanelGraphVisibility[`driftNW`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.nwValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDriftsCurrent.NW ?? 0}
                    unit="%"
                    label="Drift NW"
                    peakTime={driftTimeSeries.peakTimes.nw}
                  />
                )}
                {nodePanelGraphVisibility[`driftNE`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.neValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDriftsCurrent.NE ?? 0}
                    unit="%"
                    label="Drift NE"
                    peakTime={driftTimeSeries.peakTimes.ne}
                  />
                )}
                {nodePanelGraphVisibility[`driftSW`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.swValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDriftsCurrent.SW ?? 0}
                    unit="%"
                    label="Drift SW"
                    peakTime={driftTimeSeries.peakTimes.sw}
                  />
                )}
                {nodePanelGraphVisibility[`driftSE`] && (
                  <MiniTimeSeries
                    data={driftTimeSeries.seValues}
                    times={driftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={cornerDriftsCurrent.SE ?? 0}
                    unit="%"
                    label="Drift SE"
                    peakTime={driftTimeSeries.peakTimes.se}
                  />
                )}
              </div>
            )}
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

export function FloorTab(props: IDockviewPanelHeaderProps<{ storyId: string }>) {
  const storyId = props.params.storyId;
  const color = getFloorColor(storyId);
  const lightColor = getFloorColorLight(storyId);
  const { animationData } = useAnimationData();
  const storyElevations = animationData.precomputed.storyElevations;

  const handleClose = () => {
    props.api.close();
  };

  return (
    <div
      className="flex cursor-grab items-center justify-between border-b px-3 py-2 transition-colors active:cursor-grabbing"
      style={{ backgroundColor: lightColor, borderColor: color }}>
      <div className="pointer-events-none flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color }}>
          Floor {storyId}
        </span>
        <div className="size-5">
          <IsometricBuilding highlightSliceZ={storyElevations[storyId] ?? undefined} />
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
