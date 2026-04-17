import { usePlayback } from "@/features/playback/PlaybackContext";
import { useAnimationData } from "@/lib/useAnimationData";
import type { IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview";
import { useMemo } from "react";
import { MiniTimeSeries } from "./MiniTimeSeries";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { getMetricKeyColor } from "@/lib/metrics";
import { useViewStore } from "@/state";
import { ChartNoAxesCombinedIcon, XIcon } from "lucide-react";

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

  const locationInfo = useMemo(() => {
    return {
      type: crossSectionType,
      position,
      nodeCount: nodeIds.length,
    };
  }, [crossSectionType, position, nodeIds]);

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
    if (!nodeIds.length || !animationData.displacementLin) return null;

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

  const sectionKey = `${crossSectionType.toLowerCase()}${position}`;

  const toggles = (
    <div className="flex flex-wrap gap-1">
      <button
        onClick={() => toggleNodePanelGraph(`disp${sectionKey}`)}
        className={`rounded p-1 ${nodePanelGraphVisibility[`disp${sectionKey}`] ? "bg-neutral-200" : ""}`}
        title="Toggle Displacement Graph">
        <ChartNoAxesCombinedIcon className="size-3" />
      </button>
      {velocityData && (
        <button
          onClick={() => toggleNodePanelGraph(`vel${sectionKey}`)}
          className={`rounded p-1 ${nodePanelGraphVisibility[`vel${sectionKey}`] ? "bg-neutral-200" : ""}`}
          title="Toggle Velocity Graph">
          <ChartNoAxesCombinedIcon className="size-3" />
        </button>
      )}
      {accelerationData && (
        <button
          onClick={() => toggleNodePanelGraph(`acc${sectionKey}`)}
          className={`rounded p-1 ${nodePanelGraphVisibility[`acc${sectionKey}`] ? "bg-neutral-200" : ""}`}
          title="Toggle Acceleration Graph">
          <ChartNoAxesCombinedIcon className="size-3" />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">
          {crossSectionType} Section {position}
        </h2>
        {toggles}
      </div>

      {/* LOCATION INFO */}
      <div className="mb-4 rounded bg-neutral-50 p-2">
        <h3 className="mb-1 text-xs font-semibold text-neutral-500">Location</h3>
        <div className="space-y-1 text-xs">
          <div>
            <span className="text-neutral-500">Type:</span> <span className="font-medium">{crossSectionType}</span>
          </div>
          <div>
            <span className="text-neutral-500">Position:</span> <UnitTooltip value={position} unit="in" />
          </div>
          <div>
            <span className="text-neutral-500">Nodes:</span>{" "}
            <span className="font-medium">{locationInfo.nodeCount}</span>
          </div>
        </div>
      </div>

      {/* DISPLACEMENT */}
      {displacementData && (
        <div className="animate-fade-in mb-4">
          <h3 className="mb-2 text-sm font-bold">Displacement</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">Mag:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={displacementData.current.magnitude} unit="in" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">X:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={displacementData.current.x} unit="in" />
                <span className="mx-2 text-neutral-300">|</span>
                <span className="mr-1">Peak:</span>
                <UnitTooltip value={displacementData.peak.x} unit="in" />
                <span className="text-[9px] text-neutral-500">@ {displacementData.peak.xTime.toFixed(2)} s</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">Y:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={displacementData.current.y} unit="in" />
                <span className="mx-2 text-neutral-300">|</span>
                <span className="mr-1">Peak:</span>
                <UnitTooltip value={displacementData.peak.y} unit="in" />
                <span className="text-[9px] text-neutral-500">@ {displacementData.peak.yTime.toFixed(2)} s</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">Z:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={displacementData.current.z} unit="in" />
                <span className="mx-2 text-neutral-300">|</span>
                <span className="mr-1">Peak:</span>
                <UnitTooltip value={displacementData.peak.z} unit="in" />
                <span className="text-[9px] text-neutral-500">@ {displacementData.peak.zTime.toFixed(2)} s</span>
              </div>
            </div>
          </div>
          {displacementTimeSeries && nodePanelGraphVisibility[`disp${sectionKey}`] && (
            <div className="mt-2 space-y-2">
              <MiniTimeSeries
                data={displacementTimeSeries.xValues}
                times={displacementTimeSeries.times}
                color={displacementXColor}
                currentValue={displacementData.current.x}
                unit="in"
                label="Displacement X"
                peakTime={displacementTimeSeries.peakTimes.x}
              />
              <MiniTimeSeries
                data={displacementTimeSeries.yValues}
                times={displacementTimeSeries.times}
                color={displacementYColor}
                currentValue={displacementData.current.y}
                unit="in"
                label="Displacement Y"
                peakTime={displacementTimeSeries.peakTimes.y}
              />
              <MiniTimeSeries
                data={displacementTimeSeries.zValues}
                times={displacementTimeSeries.times}
                color={displacementZColor}
                currentValue={displacementData.current.z}
                unit="in"
                label="Displacement Z"
                peakTime={displacementTimeSeries.peakTimes.z}
              />
            </div>
          )}
        </div>
      )}

      {/* VELOCITY */}
      {velocityData && (
        <div className="animate-fade-in mb-4">
          <h3 className="mb-2 text-sm font-bold">Velocity</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">Mag:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={velocityData.current.magnitude} unit="in/s" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">X:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={velocityData.current.x} unit="in/s" />
                <span className="mx-2 text-neutral-300">|</span>
                <span className="mr-1">Peak:</span>
                <UnitTooltip value={velocityData.peak.x} unit="in/s" />
                <span className="text-[9px] text-neutral-500">@ {velocityData.peak.xTime.toFixed(2)} s</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">Y:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={velocityData.current.y} unit="in/s" />
                <span className="mx-2 text-neutral-300">|</span>
                <span className="mr-1">Peak:</span>
                <UnitTooltip value={velocityData.peak.y} unit="in/s" />
                <span className="text-[9px] text-neutral-500">@ {velocityData.peak.yTime.toFixed(2)} s</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">Z:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={velocityData.current.z} unit="in/s" />
                <span className="mx-2 text-neutral-300">|</span>
                <span className="mr-1">Peak:</span>
                <UnitTooltip value={velocityData.peak.z} unit="in/s" />
                <span className="text-[9px] text-neutral-500">@ {velocityData.peak.zTime.toFixed(2)} s</span>
              </div>
            </div>
          </div>
          {velocityTimeSeries && nodePanelGraphVisibility[`vel${sectionKey}`] && (
            <div className="mt-2 space-y-2">
              <MiniTimeSeries
                data={velocityTimeSeries.xValues}
                times={velocityTimeSeries.times}
                color={velocityXColor}
                currentValue={velocityData.current.x}
                unit="in/s"
                label="Velocity X"
                peakTime={velocityTimeSeries.peakTimes.x}
              />
              <MiniTimeSeries
                data={velocityTimeSeries.yValues}
                times={velocityTimeSeries.times}
                color={velocityYColor}
                currentValue={velocityData.current.y}
                unit="in/s"
                label="Velocity Y"
                peakTime={velocityTimeSeries.peakTimes.y}
              />
              <MiniTimeSeries
                data={velocityTimeSeries.zValues}
                times={velocityTimeSeries.times}
                color={velocityZColor}
                currentValue={velocityData.current.z}
                unit="in/s"
                label="Velocity Z"
                peakTime={velocityTimeSeries.peakTimes.z}
              />
            </div>
          )}
        </div>
      )}

      {/* ACCELERATION */}
      {accelerationData && (
        <div className="animate-fade-in mb-4">
          <h3 className="mb-2 text-sm font-bold">Acceleration</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">Mag:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={accelerationData.current.magnitude} unit="in/s²" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">X:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={accelerationData.current.x} unit="in/s²" />
                <span className="mx-2 text-neutral-300">|</span>
                <span className="mr-1">Peak:</span>
                <UnitTooltip value={accelerationData.peak.x} unit="in/s²" />
                <span className="text-[9px] text-neutral-500">@ {accelerationData.peak.xTime.toFixed(2)} s</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">Y:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={accelerationData.current.y} unit="in/s²" />
                <span className="mx-2 text-neutral-300">|</span>
                <span className="mr-1">Peak:</span>
                <UnitTooltip value={accelerationData.peak.y} unit="in/s²" />
                <span className="text-[9px] text-neutral-500">@ {accelerationData.peak.yTime.toFixed(2)} s</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 font-medium text-neutral-700">Z:</span>
              <div className="font-mono text-[10px] text-neutral-600">
                <span className="mr-1">Current:</span>
                <UnitTooltip value={accelerationData.current.z} unit="in/s²" />
                <span className="mx-2 text-neutral-300">|</span>
                <span className="mr-1">Peak:</span>
                <UnitTooltip value={accelerationData.peak.z} unit="in/s²" />
                <span className="text-[9px] text-neutral-500">@ {accelerationData.peak.zTime.toFixed(2)} s</span>
              </div>
            </div>
          </div>
          {accelerationTimeSeries && nodePanelGraphVisibility[`acc${sectionKey}`] && (
            <div className="mt-2 space-y-2">
              <MiniTimeSeries
                data={accelerationTimeSeries.xValues}
                times={accelerationTimeSeries.times}
                color={accelerationXColor}
                currentValue={accelerationData.current.x}
                unit="in/s²"
                label="Acceleration X"
                peakTime={accelerationTimeSeries.peakTimes.x}
              />
              <MiniTimeSeries
                data={accelerationTimeSeries.yValues}
                times={accelerationTimeSeries.times}
                color={accelerationYColor}
                currentValue={accelerationData.current.y}
                unit="in/s²"
                label="Acceleration Y"
                peakTime={accelerationTimeSeries.peakTimes.y}
              />
              <MiniTimeSeries
                data={accelerationTimeSeries.zValues}
                times={accelerationTimeSeries.times}
                color={accelerationZColor}
                currentValue={accelerationData.current.z}
                unit="in/s²"
                label="Acceleration Z"
                peakTime={accelerationTimeSeries.peakTimes.z}
              />
            </div>
          )}
        </div>
      )}

      {!animationData.velocityLin && <div className="text-[10px] text-neutral-400 italic">Velocities not loaded</div>}
      {!animationData.accelerationLin && (
        <div className="text-[10px] text-neutral-400 italic">Accelerations not loaded</div>
      )}
    </div>
  );
}

export function CrossSectionTab(props: IDockviewPanelHeaderProps<CrossSectionParams>) {
  const { crossSectionType, position } = props.params;
  const color = getCrossSectionColor(crossSectionType, position);
  const lightColor = getCrossSectionColorLight(crossSectionType, position);

  const handleClose = () => {
    props.api.close();
  };

  return (
    <div
      className="flex cursor-grab items-center justify-between border-b px-3 py-2 transition-colors active:cursor-grabbing"
      style={{ backgroundColor: lightColor, borderColor: color }}>
      <div className="pointer-events-none flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color }}>
          {crossSectionType} Section {position}
        </span>
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
