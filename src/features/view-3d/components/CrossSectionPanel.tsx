import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { getMetricKeyColor } from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";
import { useViewStore } from "@/state";
import type { IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview";
import { ChartNoAxesCombinedIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CrossSectionVisualization } from "./CrossSectionVisualization";
import { MiniTimeSeries } from "./MiniTimeSeries";
import { IsometricBuilding } from "@/components/IsometricBoundingBox";

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

  const displacementData = useMemo(() => {
    const nodeCount = nodeIds.length;
    if (nodeCount === 0) return null;

    let totalMag = 0;
    let maxMag = 0;
    let maxMagFrame = 0;
    let maxX = 0,
      maxY = 0,
      maxZ = 0;
    let maxXFrame = 0,
      maxYFrame = 0,
      maxZFrame = 0;
    let sumX = 0,
      sumY = 0,
      sumZ = 0;

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      let frameMag = 0;
      let frameX = 0,
        frameY = 0,
        frameZ = 0;

      for (const nodeId of nodeIds) {
        const disp = animationData.displacementLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(disp[0], disp[1], disp[2]);
        frameX += disp[0];
        frameY += disp[1];
        frameZ += disp[2];
      }

      const avgMag = frameMag / nodeCount;
      const avgX = frameX / nodeCount;
      const avgY = frameY / nodeCount;
      const avgZ = frameZ / nodeCount;

      if (avgMag > maxMag) {
        maxMag = avgMag;
        maxMagFrame = f;
      }
      if (Math.abs(avgX) > Math.abs(maxX)) {
        maxX = avgX;
        maxXFrame = f;
      }
      if (Math.abs(avgY) > Math.abs(maxY)) {
        maxY = avgY;
        maxYFrame = f;
      }
      if (Math.abs(avgZ) > Math.abs(maxZ)) {
        maxZ = avgZ;
        maxZFrame = f;
      }
    }

    const currentDisp = animationData.displacementLin.atFrame(frameIndex);
    for (const nodeId of nodeIds) {
      const disp = currentDisp.at(nodeId);
      totalMag += Math.hypot(disp[0], disp[1], disp[2]);
      sumX += disp[0];
      sumY += disp[1];
      sumZ += disp[2];
    }

    return {
      current: {
        magnitude: totalMag / nodeCount,
        x: sumX / nodeCount,
        y: sumY / nodeCount,
        z: sumZ / nodeCount,
      },
      peak: {
        magnitude: maxMag,
        magnitudeTime: maxMagFrame * animationData.metadata.dt,
        x: maxX,
        xTime: maxXFrame * animationData.metadata.dt,
        y: maxY,
        yTime: maxYFrame * animationData.metadata.dt,
        z: maxZ,
        zTime: maxZFrame * animationData.metadata.dt,
      },
    };
  }, [nodeIds, animationData, frameIndex]);

  const velocityData = useMemo(() => {
    if (!animationData.velocityLin || nodeIds.length === 0) return null;

    let maxMag = 0,
      maxMagFrame = 0;
    let maxX = 0,
      maxY = 0,
      maxZ = 0;
    let maxXFrame = 0,
      maxYFrame = 0,
      maxZFrame = 0;

    const nodeCount = nodeIds.length;

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      let frameMag = 0;
      let frameX = 0,
        frameY = 0,
        frameZ = 0;

      for (const nodeId of nodeIds) {
        const vel = animationData.velocityLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(vel[0], vel[1], vel[2]);
        frameX += vel[0];
        frameY += vel[1];
        frameZ += vel[2];
      }

      const avgMag = frameMag / nodeCount;
      const avgX = frameX / nodeCount;
      const avgY = frameY / nodeCount;
      const avgZ = frameZ / nodeCount;

      if (avgMag > maxMag) {
        maxMag = avgMag;
        maxMagFrame = f;
      }
      if (Math.abs(avgX) > Math.abs(maxX)) {
        maxX = avgX;
        maxXFrame = f;
      }
      if (Math.abs(avgY) > Math.abs(maxY)) {
        maxY = avgY;
        maxYFrame = f;
      }
      if (Math.abs(avgZ) > Math.abs(maxZ)) {
        maxZ = avgZ;
        maxZFrame = f;
      }
    }

    const currentVel = animationData.velocityLin.atFrame(frameIndex);
    let sumMag = 0,
      sumX = 0,
      sumY = 0,
      sumZ = 0;

    for (const nodeId of nodeIds) {
      const vel = currentVel.at(nodeId);
      sumMag += Math.hypot(vel[0], vel[1], vel[2]);
      sumX += vel[0];
      sumY += vel[1];
      sumZ += vel[2];
    }

    return {
      current: {
        magnitude: sumMag / nodeCount,
        x: sumX / nodeCount,
        y: sumY / nodeCount,
        z: sumZ / nodeCount,
      },
      peak: {
        magnitude: maxMag,
        magnitudeTime: maxMagFrame * animationData.metadata.dt,
        x: maxX,
        xTime: maxXFrame * animationData.metadata.dt,
        y: maxY,
        yTime: maxYFrame * animationData.metadata.dt,
        z: maxZ,
        zTime: maxZFrame * animationData.metadata.dt,
      },
    };
  }, [nodeIds, animationData, frameIndex]);

  const accelerationData = useMemo(() => {
    if (!animationData.accelerationLin || nodeIds.length === 0) return null;

    let maxMag = 0,
      maxMagFrame = 0;
    let maxX = 0,
      maxY = 0,
      maxZ = 0;
    let maxXFrame = 0,
      maxYFrame = 0,
      maxZFrame = 0;

    const nodeCount = nodeIds.length;

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      let frameMag = 0;
      let frameX = 0,
        frameY = 0,
        frameZ = 0;

      for (const nodeId of nodeIds) {
        const acc = animationData.accelerationLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(acc[0], acc[1], acc[2]);
        frameX += acc[0];
        frameY += acc[1];
        frameZ += acc[2];
      }

      const avgMag = frameMag / nodeCount;
      const avgX = frameX / nodeCount;
      const avgY = frameY / nodeCount;
      const avgZ = frameZ / nodeCount;

      if (avgMag > maxMag) {
        maxMag = avgMag;
        maxMagFrame = f;
      }
      if (Math.abs(avgX) > Math.abs(maxX)) {
        maxX = avgX;
        maxXFrame = f;
      }
      if (Math.abs(avgY) > Math.abs(maxY)) {
        maxY = avgY;
        maxYFrame = f;
      }
      if (Math.abs(avgZ) > Math.abs(maxZ)) {
        maxZ = avgZ;
        maxZFrame = f;
      }
    }

    const currentAcc = animationData.accelerationLin.atFrame(frameIndex);
    let sumMag = 0,
      sumX = 0,
      sumY = 0,
      sumZ = 0;

    for (const nodeId of nodeIds) {
      const acc = currentAcc.at(nodeId);
      sumMag += Math.hypot(acc[0], acc[1], acc[2]);
      sumX += acc[0];
      sumY += acc[1];
      sumZ += acc[2];
    }

    return {
      current: {
        magnitude: sumMag / nodeCount,
        x: sumX / nodeCount,
        y: sumY / nodeCount,
        z: sumZ / nodeCount,
      },
      peak: {
        magnitude: maxMag,
        magnitudeTime: maxMagFrame * animationData.metadata.dt,
        x: maxX,
        xTime: maxXFrame * animationData.metadata.dt,
        y: maxY,
        yTime: maxYFrame * animationData.metadata.dt,
        z: maxZ,
        zTime: maxZFrame * animationData.metadata.dt,
      },
    };
  }, [nodeIds, animationData, frameIndex]);

  const displacementTimeSeries = useMemo(() => {
    const times = Array.from({ length: animationData.metadata.frameCount }, (_, i) => i * animationData.metadata.dt);
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    const peakTimes: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

    let maxX = 0,
      maxY = 0,
      maxZ = 0;

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      let sumX = 0,
        sumY = 0,
        sumZ = 0;
      const frameData = animationData.displacementLin.atFrame(f);
      for (const nodeId of nodeIds) {
        const disp = frameData.at(nodeId);
        sumX += disp[0];
        sumY += disp[1];
        sumZ += disp[2];
      }
      const avgX = sumX / nodeIds.length;
      const avgY = sumY / nodeIds.length;
      const avgZ = sumZ / nodeIds.length;
      xValues.push(avgX);
      yValues.push(avgY);
      zValues.push(avgZ);
      if (Math.abs(avgX) > Math.abs(maxX)) {
        maxX = Math.abs(avgX);
        peakTimes.x = times[f];
      }
      if (Math.abs(avgY) > Math.abs(maxY)) {
        maxY = Math.abs(avgY);
        peakTimes.y = times[f];
      }
      if (Math.abs(avgZ) > Math.abs(maxZ)) {
        maxZ = Math.abs(avgZ);
        peakTimes.z = times[f];
      }
    }

    return { times, xValues, yValues, zValues, peakTimes };
  }, [nodeIds, animationData]);

  const velocityTimeSeries = useMemo(() => {
    if (!nodeIds.length || !animationData.velocityLin) return null;

    const times = Array.from({ length: animationData.metadata.frameCount }, (_, i) => i * animationData.metadata.dt);
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    const peakTimes: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

    let maxX = 0,
      maxY = 0,
      maxZ = 0;

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      let sumX = 0,
        sumY = 0,
        sumZ = 0;
      const frameData = animationData.velocityLin.atFrame(f);
      for (const nodeId of nodeIds) {
        const vel = frameData.at(nodeId);
        sumX += vel[0];
        sumY += vel[1];
        sumZ += vel[2];
      }
      const avgX = sumX / nodeIds.length;
      const avgY = sumY / nodeIds.length;
      const avgZ = sumZ / nodeIds.length;
      xValues.push(avgX);
      yValues.push(avgY);
      zValues.push(avgZ);
      if (Math.abs(avgX) > Math.abs(maxX)) {
        maxX = Math.abs(avgX);
        peakTimes.x = times[f];
      }
      if (Math.abs(avgY) > Math.abs(maxY)) {
        maxY = Math.abs(avgY);
        peakTimes.y = times[f];
      }
      if (Math.abs(avgZ) > Math.abs(maxZ)) {
        maxZ = Math.abs(avgZ);
        peakTimes.z = times[f];
      }
    }

    return { times, xValues, yValues, zValues, peakTimes };
  }, [nodeIds, animationData]);

  const accelerationTimeSeries = useMemo(() => {
    if (!nodeIds.length || !animationData.accelerationLin) return null;

    const times = Array.from({ length: animationData.metadata.frameCount }, (_, i) => i * animationData.metadata.dt);
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    const peakTimes: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

    let maxX = 0,
      maxY = 0,
      maxZ = 0;

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      let sumX = 0,
        sumY = 0,
        sumZ = 0;
      const frameData = animationData.accelerationLin.atFrame(f);
      for (const nodeId of nodeIds) {
        const acc = frameData.at(nodeId);
        sumX += acc[0];
        sumY += acc[1];
        sumZ += acc[2];
      }
      const avgX = sumX / nodeIds.length;
      const avgY = sumY / nodeIds.length;
      const avgZ = sumZ / nodeIds.length;
      xValues.push(avgX);
      yValues.push(avgY);
      zValues.push(avgZ);
      if (Math.abs(avgX) > Math.abs(maxX)) {
        maxX = Math.abs(avgX);
        peakTimes.x = times[f];
      }
      if (Math.abs(avgY) > Math.abs(maxY)) {
        maxY = Math.abs(avgY);
        peakTimes.y = times[f];
      }
      if (Math.abs(avgZ) > Math.abs(maxZ)) {
        maxZ = Math.abs(avgZ);
        peakTimes.z = times[f];
      }
    }

    return { times, xValues, yValues, zValues, peakTimes };
  }, [nodeIds, animationData]);

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
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

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

        {/* DISPLACEMENT */}
        {displacementData && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Displacement</h3>
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.current.x} unit="in" />
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
                  <UnitTooltip value={displacementData.peak.x} unit="in" />
                  <span className="text-[9px] text-neutral-500"> @ {displacementData.peak.xTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.current.y} unit="in" />
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
                  <UnitTooltip value={displacementData.peak.y} unit="in" />
                  <span className="text-[9px] text-neutral-500"> @ {displacementData.peak.yTime.toFixed(2)} s</span>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current Z:</span>
              <span className="flex items-end justify-between font-mono text-neutral-800">
                <UnitTooltip value={displacementData.current.z} unit="in" />
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
                <UnitTooltip value={displacementData.peak.z} unit="in" />
                <span className="text-[9px] text-neutral-500"> @ {displacementData.peak.zTime.toFixed(2)} s</span>
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {nodePanelGraphVisibility[`dispX`] && (
                <MiniTimeSeries
                  data={displacementTimeSeries.xValues}
                  times={displacementTimeSeries.times}
                  color={displacementXColor}
                  currentValue={displacementData.current.x}
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
                  currentValue={displacementData.current.y}
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
                  currentValue={displacementData.current.z}
                  unit="in"
                  label="Displacement Z"
                  peakTime={displacementTimeSeries.peakTimes.z}
                />
              )}
            </div>
          </div>
        )}

        {/* VELOCITY */}
        {velocityData && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Velocity</h3>

            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityData.current.x} unit="in/s" />
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
                  <UnitTooltip value={velocityData.peak.x} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">@ {velocityData.peak.xTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityData.current.y} unit="in/s" />
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
                  <UnitTooltip value={velocityData.peak.y} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">@ {velocityData.peak.yTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={velocityData.current.z} unit="in/s" />
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
                  <UnitTooltip value={velocityData.peak.z} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">@ {velocityData.peak.zTime.toFixed(2)} s</span>
                </span>
              </div>
            </div>
            {velocityTimeSeries && (
              <div className="mt-3 space-y-2">
                {nodePanelGraphVisibility[`velX`] && (
                  <MiniTimeSeries
                    data={velocityTimeSeries.xValues}
                    times={velocityTimeSeries.times}
                    color={velocityXColor}
                    currentValue={velocityData.current.x}
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
                    currentValue={velocityData.current.y}
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
                    currentValue={velocityData.current.z}
                    unit="in/s"
                    label="Velocity Z"
                    peakTime={velocityTimeSeries.peakTimes.z}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ACCELERATION */}
        {accelerationData && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Acceleration</h3>

            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationData.current.x} unit="in/s²" />
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
                  <UnitTooltip value={accelerationData.peak.x} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">@ {accelerationData.peak.xTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationData.current.y} unit="in/s²" />
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
                  <UnitTooltip value={accelerationData.peak.y} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">@ {accelerationData.peak.yTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={accelerationData.current.z} unit="in/s²" />
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
                  <UnitTooltip value={accelerationData.peak.z} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">@ {accelerationData.peak.zTime.toFixed(2)} s</span>
                </span>
              </div>
            </div>
            {accelerationTimeSeries && (
              <div className="mt-3 space-y-2">
                {nodePanelGraphVisibility[`accX`] && (
                  <MiniTimeSeries
                    data={accelerationTimeSeries.xValues}
                    times={accelerationTimeSeries.times}
                    color={accelerationXColor}
                    currentValue={accelerationData.current.x}
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
                    currentValue={accelerationData.current.y}
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
                    currentValue={accelerationData.current.z}
                    unit="in/s²"
                    label="Acceleration Z"
                    peakTime={accelerationTimeSeries.peakTimes.z}
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
