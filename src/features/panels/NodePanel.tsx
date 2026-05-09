import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { usePlayback } from "@/features/playback/usePlayback";
import { interpolateColor } from "@/lib/colors";
import { getMetricColorScale, getMetricConfig, getMetricKeyColor, isHingeMetric } from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";

import { interpolate } from "culori";
import { type IDockviewPanelHeaderProps, type IDockviewPanelProps } from "dockview";
import { ChartNoAxesCombinedIcon, InfoIcon, TriangleIcon, XIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Vector3 } from "three";
import { MiniRibbon } from "./MiniRibbon";
import { MiniTimeSeries } from "./MiniTimeSeries";

// Generate a unique vibrant color based on node ID
export function getNodeColor(nodeId: number): string {
  // Use golden ratio for good distribution
  const hue = (nodeId * 137.508) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

// Generate a lighter version for backgrounds
export function getNodeColorLight(nodeId: number): string {
  const hue = (nodeId * 137.508) % 360;
  return `hsl(${hue}, 70%, 90%)`;
}

export function NodePanel({ params: { nodeId } }: IDockviewPanelProps<{ nodeId: number }>) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const store = useViewStoreRaw();
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
  const rotationXColor = getMetricKeyColor("rotationX", metricPaletteOverrides);
  const rotationYColor = getMetricKeyColor("rotationY", metricPaletteOverrides);
  const rotationZColor = getMetricKeyColor("rotationZ", metricPaletteOverrides);
  const storyDriftColor = getMetricKeyColor("interstoryDrift", metricPaletteOverrides);

  useEffect(() => {
    store.getState().addOpenedNodePanel(nodeId);
    return () => {
      store.getState().removeOpenedNodePanel(nodeId);
    };
  }, [nodeId, store]);

  const initialPosRaw = animationData.initialPositions.at(nodeId);
  const currentDispRaw = animationData.displacementLin.atFrame(frameIndex).at(nodeId);

  const currentPos = useMemo(
    () =>
      [
        initialPosRaw[0] + currentDispRaw[0],
        initialPosRaw[1] + currentDispRaw[1],
        initialPosRaw[2] + currentDispRaw[2],
      ] as const,
    [initialPosRaw, currentDispRaw]
  );

  // RIBBONS AND PATHS
  const ribbonPath = useMemo(() => {
    const path = new Array(animationData.metadata.frameCount).fill(null).map(() => new Vector3(0, 0, 0));
    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const pos = animationData.displacementLin.atFrame(i).at(nodeId);
      path[i] = new Vector3(pos[0], pos[1], pos[2]);
    }
    return path;
  }, [animationData.metadata.frameCount, animationData.displacementLin, nodeId]);

  // PEAK DISPLACEMENT ACROSS ALL TIME
  const peakDisplacement = useMemo(() => {
    let maxMag = 0,
      maxX = 0,
      maxY = 0,
      maxZ = 0,
      maxFrame = 0;
    let maxAbsX = 0,
      maxAbsXFrame = 0;
    let maxAbsY = 0,
      maxAbsYFrame = 0;
    let maxAbsZ = 0,
      maxAbsZFrame = 0;

    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const disp = animationData.displacementLin.atFrame(i).at(nodeId);
      const mag = Math.hypot(disp[0], disp[1], disp[2]);
      const absX = Math.abs(disp[0]);
      const absY = Math.abs(disp[1]);
      const absZ = Math.abs(disp[2]);

      if (mag > maxMag) {
        maxMag = mag;
        maxX = disp[0];
        maxY = disp[1];
        maxZ = disp[2];
        maxFrame = i;
      }
      if (absX > maxAbsX) {
        maxAbsX = absX;
        maxAbsXFrame = i;
      }
      if (absY > maxAbsY) {
        maxAbsY = absY;
        maxAbsYFrame = i;
      }
      if (absZ > maxAbsZ) {
        maxAbsZ = absZ;
        maxAbsZFrame = i;
      }
    }

    return {
      magnitude: maxMag,
      x: maxX,
      xTime: maxAbsXFrame * animationData.metadata.dt,
      y: maxY,
      yTime: maxAbsYFrame * animationData.metadata.dt,
      z: maxZ,
      zTime: maxAbsZFrame * animationData.metadata.dt,
      frame: maxFrame,
      time: maxFrame * animationData.metadata.dt,
    };
  }, [animationData, nodeId]);

  // VELOCITY (if available)
  const currentVelocity = useMemo(() => {
    if (!animationData.velocityLin) return null;
    const vel = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
    return {
      x: vel[0],
      y: vel[1],
      z: vel[2],
      magnitude: Math.hypot(vel[0], vel[1], vel[2]),
    };
  }, [animationData.velocityLin, frameIndex, nodeId]);

  const peakVelocity = useMemo(() => {
    if (!animationData.velocityLin) return null;
    let maxMag = 0,
      maxX = 0,
      maxY = 0,
      maxZ = 0,
      maxFrame = 0;
    let maxAbsX = 0,
      maxAbsXFrame = 0;
    let maxAbsY = 0,
      maxAbsYFrame = 0;
    let maxAbsZ = 0,
      maxAbsZFrame = 0;

    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const vel = animationData.velocityLin.atFrame(i).at(nodeId);
      const mag = Math.hypot(vel[0], vel[1], vel[2]);
      const absX = Math.abs(vel[0]);
      const absY = Math.abs(vel[1]);
      const absZ = Math.abs(vel[2]);

      if (mag > maxMag) {
        maxMag = mag;
        maxX = vel[0];
        maxY = vel[1];
        maxZ = vel[2];
        maxFrame = i;
      }
      if (absX > maxAbsX) {
        maxAbsX = absX;
        maxAbsXFrame = i;
      }
      if (absY > maxAbsY) {
        maxAbsY = absY;
        maxAbsYFrame = i;
      }
      if (absZ > maxAbsZ) {
        maxAbsZ = absZ;
        maxAbsZFrame = i;
      }
    }

    return {
      magnitude: maxMag,
      x: maxX,
      xTime: maxAbsXFrame * animationData.metadata.dt,
      y: maxY,
      yTime: maxAbsYFrame * animationData.metadata.dt,
      z: maxZ,
      zTime: maxAbsZFrame * animationData.metadata.dt,
      frame: maxFrame,
      time: maxFrame * animationData.metadata.dt,
    };
  }, [animationData.velocityLin, animationData.metadata.frameCount, animationData.metadata.dt, nodeId]);

  // ACCELERATION (if available)
  const currentAcceleration = useMemo(() => {
    if (!animationData.accelerationLin) return null;
    const acc = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
    return {
      x: acc[0],
      y: acc[1],
      z: acc[2],
      magnitude: Math.hypot(acc[0], acc[1], acc[2]),
    };
  }, [animationData.accelerationLin, frameIndex, nodeId]);

  const peakAcceleration = useMemo(() => {
    if (!animationData.accelerationLin) return null;
    let maxMag = 0,
      maxX = 0,
      maxY = 0,
      maxZ = 0,
      maxFrame = 0;
    let maxAbsX = 0,
      maxAbsXFrame = 0;
    let maxAbsY = 0,
      maxAbsYFrame = 0;
    let maxAbsZ = 0,
      maxAbsZFrame = 0;

    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const acc = animationData.accelerationLin.atFrame(i).at(nodeId);
      const mag = Math.hypot(acc[0], acc[1], acc[2]);
      const absX = Math.abs(acc[0]);
      const absY = Math.abs(acc[1]);
      const absZ = Math.abs(acc[2]);

      if (mag > maxMag) {
        maxMag = mag;
        maxX = acc[0];
        maxY = acc[1];
        maxZ = acc[2];
        maxFrame = i;
      }
      if (absX > maxAbsX) {
        maxAbsX = absX;
        maxAbsXFrame = i;
      }
      if (absY > maxAbsY) {
        maxAbsY = absY;
        maxAbsYFrame = i;
      }
      if (absZ > maxAbsZ) {
        maxAbsZ = absZ;
        maxAbsZFrame = i;
      }
    }

    return {
      magnitude: maxMag,
      x: maxX,
      xTime: maxAbsXFrame * animationData.metadata.dt,
      y: maxY,
      yTime: maxAbsYFrame * animationData.metadata.dt,
      z: maxZ,
      zTime: maxAbsZFrame * animationData.metadata.dt,
      frame: maxFrame,
      time: maxFrame * animationData.metadata.dt,
    };
  }, [animationData.accelerationLin, animationData.metadata.frameCount, animationData.metadata.dt, nodeId]);

  // ROTATION TIME SERIES (for mini chart)
  const rotationTimeSeries = useMemo(() => {
    if (!animationData.displacementRot) return null;
    const times: number[] = [];
    const magnitudes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      times.push(i * animationData.metadata.dt);
      const rot = animationData.displacementRot.atFrame(i).at(nodeId);
      magnitudes.push(Math.hypot(rot[0], rot[1], rot[2]));
      xValues.push(rot[0]);
      yValues.push(rot[1]);
      zValues.push(rot[2]);
    }
    const getPeakTime = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const maxIdx = arr.reduce((maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx), 0);
      return times[maxIdx];
    };
    return {
      times,
      magnitudes,
      xValues,
      yValues,
      zValues,
      peakTimes: {
        magnitudes: getPeakTime(magnitudes),
        x: getPeakTime(xValues),
        y: getPeakTime(yValues),
        z: getPeakTime(zValues),
      },
    };
  }, [animationData.displacementRot, animationData.metadata.frameCount, animationData.metadata.dt, nodeId]);

  // TIME SERIES DATA FOR MINI CHARTS
  const velocityTimeSeries = useMemo(() => {
    if (!animationData.velocityLin) return null;
    const times: number[] = [];
    const magnitudes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      times.push(i * animationData.metadata.dt);
      const vel = animationData.velocityLin.atFrame(i).at(nodeId);
      magnitudes.push(Math.hypot(vel[0], vel[1], vel[2]));
      xValues.push(vel[0]);
      yValues.push(vel[1]);
      zValues.push(vel[2]);
    }
    const getPeakTime = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const maxIdx = arr.reduce((maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx), 0);
      return times[maxIdx];
    };
    return {
      times,
      magnitudes,
      xValues,
      yValues,
      zValues,
      peakTimes: {
        magnitudes: getPeakTime(magnitudes),
        x: getPeakTime(xValues),
        y: getPeakTime(yValues),
        z: getPeakTime(zValues),
      },
    };
  }, [animationData.velocityLin, animationData.metadata.frameCount, animationData.metadata.dt, nodeId]);

  const accelerationTimeSeries = useMemo(() => {
    if (!animationData.accelerationLin) return null;
    const times: number[] = [];
    const magnitudes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      times.push(i * animationData.metadata.dt);
      const acc = animationData.accelerationLin.atFrame(i).at(nodeId);
      magnitudes.push(Math.hypot(acc[0], acc[1], acc[2]));
      xValues.push(acc[0]);
      yValues.push(acc[1]);
      zValues.push(acc[2]);
    }
    const getPeakTime = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const maxIdx = arr.reduce((maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx), 0);
      return times[maxIdx];
    };
    return {
      times,
      magnitudes,
      xValues,
      yValues,
      zValues,
      peakTimes: {
        magnitudes: getPeakTime(magnitudes),
        x: getPeakTime(xValues),
        y: getPeakTime(yValues),
        z: getPeakTime(zValues),
      },
    };
  }, [animationData.accelerationLin, animationData.metadata.frameCount, animationData.metadata.dt, nodeId]);

  // DISPLACEMENT TIME SERIES (for mini chart)
  const displacementTimeSeries = useMemo(() => {
    const times: number[] = [];
    const magnitudes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      times.push(i * animationData.metadata.dt);
      const disp = animationData.displacementLin.atFrame(i).at(nodeId);
      magnitudes.push(Math.hypot(disp[0], disp[1], disp[2]));
      xValues.push(disp[0]);
      yValues.push(disp[1]);
      zValues.push(disp[2]);
    }
    const getPeakTime = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const maxIdx = arr.reduce((maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx), 0);
      return times[maxIdx];
    };
    return {
      times,
      magnitudes,
      xValues,
      yValues,
      zValues,
      peakTimes: {
        magnitudes: getPeakTime(magnitudes),
        x: getPeakTime(xValues),
        y: getPeakTime(yValues),
        z: getPeakTime(zValues),
      },
    };
  }, [animationData.displacementLin, animationData.metadata.frameCount, animationData.metadata.dt, nodeId]);

  // STRUCTURAL INFO
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const storyInfo = useMemo(() => {
    for (const [storyName, nodeIds] of Object.entries(animationData.metadata.stories)) {
      if (nodeIds.includes(nodeId)) {
        const storyIndex = animationData.metadata.storyOrder.indexOf(storyName);
        return {
          story: storyName,
          height: animationData.metadata.storyHeights[storyName],
          elevation: animationData.precomputed.storyElevations[storyName] || 0,
          floorNumber: storyIndex + 1,
          totalFloors: animationData.metadata.storyOrder.length,
        };
      }
    }
    return { story: "Unknown", height: 0, elevation: 0, floorNumber: 0, totalFloors: 0 };
  }, [animationData, nodeId]);

  const cornerInfo = useMemo(() => {
    for (const [cornerName, nodeIds] of Object.entries(animationData.metadata.corners)) {
      if (nodeIds.includes(nodeId)) return cornerName;
    }
    return "Interior";
  }, [nodeId, animationData]);

  // STORY DRIFT
  const storyDrift = useMemo(() => {
    const currentDrift = animationData.storyDrift.get(frameIndex, nodeId) ?? 0;
    const peakDrift = animationData.precomputed.peakStoryDrift[nodeId] ?? 0;
    const peakFrame = animationData.precomputed.peakStoryDriftFrame[nodeId] ?? 0;
    const peakTime = peakFrame * animationData.metadata.dt;

    return {
      current: currentDrift,
      peak: peakDrift,
      peakTime: peakTime,
    };
  }, [frameIndex, animationData, nodeId]);

  // STORY DRIFT TIME SERIES (for mini chart)
  const storyDriftTimeSeries = useMemo(() => {
    if (!storyDrift) return null;
    const times: number[] = [];
    const values: number[] = [];
    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      times.push(i * animationData.metadata.dt);
      values.push(animationData.storyDrift.get(i, nodeId));
    }
    const peakTime = (animationData.precomputed.peakStoryDriftFrame[nodeId] ?? 0) * animationData.metadata.dt;
    return { times, values, peakTime };
  }, [animationData, storyDrift, nodeId]);

  // DISTANCE TRAVELED
  const totalDistanceTraveled = useMemo(() => {
    let distance = 0;
    for (let i = 1; i < animationData.metadata.frameCount; i++) {
      const prev = animationData.displacementLin.atFrame(i - 1).at(nodeId);
      const curr = animationData.displacementLin.atFrame(i).at(nodeId);
      const dx = curr[0] - prev[0];
      const dy = curr[1] - prev[1];
      const dz = curr[2] - prev[2];
      distance += Math.hypot(dx, dy, dz);
    }
    return distance;
  }, [animationData, nodeId]);

  // ROTATION (current and peak)
  const currentRotation = useMemo(() => {
    if (!animationData.displacementRot) return { rx: 0, ry: 0, rz: 0, magnitude: 0 };
    const rot = animationData.displacementRot.atFrame(frameIndex).at(nodeId);
    return {
      rx: rot[0],
      ry: rot[1],
      rz: rot[2],
      magnitude: Math.hypot(rot[0], rot[1], rot[2]),
    };
  }, [animationData.displacementRot, frameIndex, nodeId]);

  const peakRotation = useMemo(() => {
    if (!animationData.displacementRot)
      return { magnitude: 0, rx: 0, ry: 0, rz: 0, rxTime: 0, ryTime: 0, rzTime: 0, frame: 0, time: 0 };
    let maxMag = 0,
      maxRx = 0,
      maxRy = 0,
      maxRz = 0,
      maxFrame = 0;
    let maxAbsRx = 0,
      maxAbsRxFrame = 0;
    let maxAbsRy = 0,
      maxAbsRyFrame = 0;
    let maxAbsRz = 0,
      maxAbsRzFrame = 0;

    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const rot = animationData.displacementRot.atFrame(i).at(nodeId);
      const mag = Math.hypot(rot[0], rot[1], rot[2]);
      const absRx = Math.abs(rot[0]);
      const absRy = Math.abs(rot[1]);
      const absRz = Math.abs(rot[2]);

      if (mag > maxMag) {
        maxMag = mag;
        maxRx = rot[0];
        maxRy = rot[1];
        maxRz = rot[2];
        maxFrame = i;
      }
      if (absRx > maxAbsRx) {
        maxAbsRx = absRx;
        maxAbsRxFrame = i;
      }
      if (absRy > maxAbsRy) {
        maxAbsRy = absRy;
        maxAbsRyFrame = i;
      }
      if (absRz > maxAbsRz) {
        maxAbsRz = absRz;
        maxAbsRzFrame = i;
      }
    }

    return {
      magnitude: maxMag,
      rx: maxRx,
      rxTime: maxAbsRxFrame * animationData.metadata.dt,
      ry: maxRy,
      ryTime: maxAbsRyFrame * animationData.metadata.dt,
      rz: maxRz,
      rzTime: maxAbsRzFrame * animationData.metadata.dt,
      frame: maxFrame,
      time: maxFrame * animationData.metadata.dt,
    };
  }, [animationData.displacementRot, animationData.metadata.frameCount, animationData.metadata.dt, nodeId]);

  const currentMetric = useViewStore((s) => s.currentMetric);
  const hingeEntries = useMemo(() => {
    const nodeToHingeIndexMap = animationData.precomputed.nodeToHingeIndexMap;
    const hingeData = animationData.hingeData;
    if (!nodeToHingeIndexMap || !hingeData || !isHingeMetric(currentMetric)) {
      return null;
    }

    const metricConfig = getMetricConfig(currentMetric);
    const metricColorScale = getMetricColorScale(currentMetric, metricPaletteOverrides);
    const maxValue = metricConfig.getPrecomputedMax(animationData);

    const interpolator = interpolate(metricColorScale.positiveColorStops, "oklab");
    const entries: Array<{
      hingeIdx: number;
      endCap: number;
      beamIdx: number;
      maxValue: number;
      minValue: number;
      color: string;
    }> = [];

    const hingesForNode = nodeToHingeIndexMap[nodeId];
    if (!hingesForNode || hingesForNode.length === 0) {
      return null;
    }

    for (const { hingeIdx, endCap } of hingesForNode) {
      const hingeRow = hingeData.getRow(hingeIdx);
      const maxVal = endCap === 1 ? hingeRow.iR3Max : hingeRow.jR3Max;
      const minVal = endCap === 1 ? hingeRow.iR3Min : hingeRow.jR3Min;

      const colorValue = maxValue > 0 ? Math.min(1, Math.max(0, Math.abs(maxVal) / maxValue)) : 0;
      const rgb = interpolateColor(interpolator, colorValue);
      const color = `rgb(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)})`;

      entries.push({
        hingeIdx,
        endCap,
        beamIdx: hingeRow.beamIndex,
        maxValue: maxVal,
        minValue: minVal,
        color,
      });
    }

    return entries.length > 0 ? entries : null;
  }, [currentMetric, nodeId, metricPaletteOverrides, animationData]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs *:border-b *:pb-3">
        {/* LOCATION INFO */}
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Story ID:</span>
              <div className="font-mono text-neutral-600">{storyInfo.story}</div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Corner:</span>
              <div className="text-neutral-600">{cornerInfo}</div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Elevation:</span>
              <div className="text-neutral-600">
                <UnitTooltip value={storyInfo.elevation} unit="in" decimals={0} />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Story Height:</span>
              <div className="text-neutral-600">
                <UnitTooltip value={storyInfo.height} unit="in" decimals={0} />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Node below:</span>
              <div className="text-neutral-600">{animationData.metadata.nodeToBelow[nodeId]}</div>
            </div>
          </div>
        </div>

        {/* POSITION */}
        <div className="animate-fade-in">
          {/* <h3 className="mb-2 text-sm font-bold">Position (in)</h3> */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="font-medium text-neutral-700">
                X:{" "}
                <span className="font-mono text-neutral-600">
                  <UnitTooltip value={currentPos[0]} unit="in" />
                </span>
              </span>
            </div>
            <div>
              <span className="font-medium text-neutral-700">
                Y:{" "}
                <span className="font-mono text-neutral-600">
                  <UnitTooltip value={currentPos[1]} unit="in" />
                </span>
              </span>
            </div>
            <div>
              <span className="font-medium text-neutral-700">
                Z:{" "}
                <span className="font-mono text-neutral-600">
                  <UnitTooltip value={currentPos[2]} unit="in" />
                </span>
              </span>
            </div>
          </div>
        </div>

        {hingeEntries && (
          <div className="animate-fade-in">
            <h3 className="text-sm font-bold">Hinge Rotation</h3>
            <div className="space-y-2">
              <div className="mb-0 grid grid-cols-3 items-center gap-2">
                <div className="flex items-center gap-1"></div>
                <div className="text-right">
                  <div className="text-[10px] text-neutral-500">Max</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-neutral-500">Min</div>
                </div>
              </div>
              {hingeEntries.map((entry) => (
                <div key={entry.hingeIdx} className="grid grid-cols-3 items-center gap-2">
                  <div className="flex items-center gap-1">
                    <TriangleIcon className="text-border size-4" style={{ fill: entry.color }} />
                    <span className="text-neutral-700">{entry.endCap === 1 ? "I" : "J"}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-neutral-900">
                      <UnitTooltip value={entry.maxValue} unit="rad" decimals={4} showConversions={false} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-neutral-900">
                      <UnitTooltip value={entry.minValue} unit="rad" decimals={4} showConversions={false} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DISPLACEMENT */}
        <div className="animate-fade-in">
          <h3 className="mb-2 text-sm font-bold">Displacement</h3>
          {/* <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Current Total:</span>
              <div className="font-mono text-neutral-600">
                <UnitTooltip  value={displacementMag} unit="in" />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Peak Total:</span>
              <div className="font-mono text-neutral-600">
                <UnitTooltip  value={peakDisplacement.magnitude} unit="in" />
                <span className="text-[9px]  text-neutral-500"> @ {peakDisplacement.time.toFixed(2)} s</span>
              </div>
            </div>
          </div> */}
          <div className="mt-2 space-y-1">
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current X:</span>
              <span className="flex items-end justify-between font-mono text-neutral-800">
                <UnitTooltip value={currentDispRaw[0]} unit="in" />
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
                <UnitTooltip value={peakDisplacement.x} unit="in" />
                <span className="text-[9px] text-neutral-500"> @ {peakDisplacement.xTime.toFixed(2)} s</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current Y:</span>
              <span className="flex items-end justify-between font-mono text-neutral-800">
                <UnitTooltip value={currentDispRaw[1]} unit="in" />
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
                <UnitTooltip value={peakDisplacement.y} unit="in" />
                <span className="text-[9px] text-neutral-500"> @ {peakDisplacement.yTime.toFixed(2)} s</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current Z:</span>
              <span className="flex items-end justify-between font-mono text-neutral-800">
                <UnitTooltip value={currentDispRaw[2]} unit="in" />
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
                <UnitTooltip value={peakDisplacement.z} unit="in" />
                <span className="text-[9px] text-neutral-500"> @ {peakDisplacement.zTime.toFixed(2)} s</span>
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {nodePanelGraphVisibility[`dispX`] && (
                <MiniTimeSeries
                  data={displacementTimeSeries.xValues}
                  times={displacementTimeSeries.times}
                  color={displacementXColor}
                  currentValue={currentDispRaw[0]}
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
                  currentValue={currentDispRaw[1]}
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
                  currentValue={currentDispRaw[2]}
                  unit="in"
                  label="Displacement Z"
                  peakTime={displacementTimeSeries.peakTimes.z}
                />
              )}
            </div>
          </div>
        </div>

        {/* ROTATION */}
        {animationData.displacementRot && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Rotation</h3>

            {/* <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current Total:</span>
                <div className="font-mono text-neutral-600">
                  <UnitTooltip  value={currentRotation.magnitude} unit="rad" />
                </div>
              </div>
              <div>
                <span className="font-medium text-neutral-700">Peak Total:</span>
                <div className="font-mono text-neutral-600">
                  <UnitTooltip  value={peakRotation.magnitude} unit="rad" />
                </div>
                <div className="text-[9px]  text-neutral-500"> @ {peakRotation.time.toFixed(2)} s</div>
              </div>
            </div> */}

            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={currentRotation.rx} unit="rad" />
                  <button
                    onClick={() => toggleNodePanelGraph("rotX")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`rotX`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`rotX`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak X:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={peakRotation.rx} unit="rad" />
                  <span className="text-[9px] text-neutral-500"> @ {peakRotation.rxTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={currentRotation.ry} unit="rad" />
                  <button
                    onClick={() => toggleNodePanelGraph("rotY")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`rotY`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`rotY`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Y:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={peakRotation.ry} unit="rad" />
                  <span className="text-[9px] text-neutral-500"> @ {peakRotation.ryTime.toFixed(2)} s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={currentRotation.rz} unit="rad" />
                  <button
                    onClick={() => toggleNodePanelGraph("rotZ")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`rotZ`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`rotZ`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Z:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={peakRotation.rz} unit="rad" />
                  <span className="text-[9px] text-neutral-500"> @ {peakRotation.rzTime.toFixed(2)} s</span>
                </span>
              </div>
              {rotationTimeSeries && (
                <div className="mt-3 space-y-2">
                  {nodePanelGraphVisibility[`rotX`] && (
                    <MiniTimeSeries
                      data={rotationTimeSeries.xValues}
                      times={rotationTimeSeries.times}
                      color={rotationXColor}
                      currentValue={currentRotation.rx}
                      unit="rad"
                      label="Rotation X"
                      peakTime={rotationTimeSeries.peakTimes.x}
                    />
                  )}
                  {nodePanelGraphVisibility[`rotY`] && (
                    <MiniTimeSeries
                      data={rotationTimeSeries.yValues}
                      times={rotationTimeSeries.times}
                      color={rotationYColor}
                      currentValue={currentRotation.ry}
                      unit="rad"
                      label="Rotation Y"
                      peakTime={rotationTimeSeries.peakTimes.y}
                    />
                  )}
                  {nodePanelGraphVisibility[`rotZ`] && (
                    <MiniTimeSeries
                      data={rotationTimeSeries.zValues}
                      times={rotationTimeSeries.times}
                      color={rotationZColor}
                      currentValue={currentRotation.rz}
                      unit="rad"
                      label="Rotation Z"
                      peakTime={rotationTimeSeries.peakTimes.z}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VELOCITY */}
        {animationData.velocityLin && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Velocity</h3>

            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={currentVelocity!.x} unit="in/s" />
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
                  <UnitTooltip value={peakVelocity?.x ?? 0} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">
                    @ {peakVelocity ? peakVelocity.xTime.toFixed(2) : "0.00"} s
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={currentVelocity!.y} unit="in/s" />
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
                  <UnitTooltip value={peakVelocity?.y ?? 0} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">
                    @ {peakVelocity ? peakVelocity.yTime.toFixed(2) : "0.00"} s
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={currentVelocity!.z} unit="in/s" />
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
                  <UnitTooltip value={peakVelocity?.z ?? 0} unit="in/s" />
                  <span className="text-[9px] text-neutral-500">
                    @ {peakVelocity ? peakVelocity.zTime.toFixed(2) : "0.00"} s
                  </span>
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
                    currentValue={currentVelocity?.x ?? 0}
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
                    currentValue={currentVelocity?.y ?? 0}
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
                    currentValue={currentVelocity?.z ?? 0}
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
        {animationData.accelerationLin && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Acceleration</h3>

            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={currentAcceleration!.x} unit="in/s²" />
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
                  <UnitTooltip value={peakAcceleration?.x ?? 0} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">
                    @ {peakAcceleration ? peakAcceleration.xTime.toFixed(2) : "0.00"} s
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={currentAcceleration!.y} unit="in/s²" />
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
                  <UnitTooltip value={peakAcceleration?.y ?? 0} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">
                    @ {peakAcceleration ? peakAcceleration.yTime.toFixed(2) : "0.00"} s
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={currentAcceleration!.z} unit="in/s²" />
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
                  <UnitTooltip value={peakAcceleration?.z ?? 0} unit="in/s²" />
                  <span className="text-[9px] text-neutral-500">
                    @ {peakAcceleration ? peakAcceleration.zTime.toFixed(2) : "0.00"} s
                  </span>
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
                    currentValue={currentAcceleration?.x ?? 0}
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
                    currentValue={currentAcceleration?.y ?? 0}
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
                    currentValue={currentAcceleration?.z ?? 0}
                    unit="in/s²"
                    label="Acceleration Z"
                    peakTime={accelerationTimeSeries.peakTimes.z}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* STORY DRIFT */}
        {storyDrift && (
          <div className="animate-fade-in">
            <h3 className="mb-2 text-sm font-bold">Story Drift Ratio</h3>
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current:</span>
                <span className="flex items-end justify-between font-mono text-neutral-800">
                  <UnitTooltip value={storyDrift.current} unit="%" />
                  <button
                    onClick={() => toggleNodePanelGraph("drift")}
                    className="rounded p-0.5 transition-colors hover:bg-neutral-200"
                    title={nodePanelGraphVisibility[`drift`] ? "Hide graph" : "Show graph"}>
                    <ChartNoAxesCombinedIcon
                      className={`size-4 ${nodePanelGraphVisibility[`drift`] ? "text-blue-500" : "text-neutral-300"}`}
                    />
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak:</span>
                <span className="flex items-baseline justify-between font-mono text-neutral-800">
                  <UnitTooltip value={storyDrift.peak} unit="%" />
                  <span className="text-[9px] text-neutral-500"> @ {storyDrift.peakTime.toFixed(2)} s</span>
                </span>
              </div>
            </div>
            {storyDriftTimeSeries && (
              <div className="mt-3 space-y-2">
                {nodePanelGraphVisibility[`drift`] && (
                  <MiniTimeSeries
                    data={storyDriftTimeSeries.values}
                    times={storyDriftTimeSeries.times}
                    color={storyDriftColor}
                    currentValue={storyDrift.current}
                    unit="%"
                    label="Story Drift"
                    peakTime={storyDriftTimeSeries.peakTime}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* CUMULATIVE STATS */}
        <div className="animate-fade-in">
          <h3 className="mb-2 text-sm font-bold">Total Distance Traveled</h3>
          <div className="font-mono text-neutral-600">
            <UnitTooltip value={totalDistanceTraveled} unit="in" />
          </div>
        </div>

        {/* RIBBONS */}
        <div className="animate-fade-in">
          <h3 className="mb-2 text-sm font-bold">Displacement Path (Top View)</h3>
          <MiniRibbon path={ribbonPath} dt={animationData.metadata.dt} frameIndex={frameIndex} />
          <div className="mt-1 flex gap-1 text-[10px] text-neutral-400 italic">
            <InfoIcon className="size-3" /> Number of points reduced for performance
          </div>
        </div>

        <div>
          {!animationData.displacementRot && (
            <div className="text-[10px] text-neutral-400 italic">Rotations not loaded</div>
          )}
          {!animationData.velocityLin && (
            <div className="text-[10px] text-neutral-400 italic">Velocities not loaded</div>
          )}
          {!animationData.accelerationLin && (
            <div className="text-[10px] text-neutral-400 italic">Accelerations not loaded</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NodeTab(props: IDockviewPanelHeaderProps<{ nodeId: number }>) {
  const nodeId = props.params.nodeId;
  const color = getNodeColor(nodeId);
  const lightColor = getNodeColorLight(nodeId);

  const handleClose = () => {
    props.api.close();
  };

  return (
    <div
      className="flex cursor-grab items-center justify-between border-b px-3 py-2 transition-colors active:cursor-grabbing"
      style={{ backgroundColor: lightColor, borderColor: color }}>
      <div className="pointer-events-none flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color }}>
          Node {nodeId}
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
