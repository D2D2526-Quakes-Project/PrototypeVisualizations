import { usePlayback } from "@/features/playback/PlaybackContext";
import { getMetricKeyColor } from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";
import { useViewStore, useViewStoreRaw } from "@/state";
import { type IDockviewPanelHeaderProps, type IDockviewPanelProps } from "dockview";
import { InfoIcon, XIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Vector3 } from "three";
import { MiniRibbon } from "./MiniRibbon";
import { MiniTimeSeries } from "./MiniTimeSeries";
import { UnitTooltip } from "@/components/ui/unit-tooltip";

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
  const { frameIndex, playing } = usePlayback();
  const store = useViewStoreRaw();
  const metricPaletteOverrides = useViewStore((s) => s.metricPaletteOverrides);
  const displacementMagColor = getMetricKeyColor("displacementMag", metricPaletteOverrides);
  const displacementXColor = getMetricKeyColor("displacementX", metricPaletteOverrides);
  const displacementYColor = getMetricKeyColor("displacementY", metricPaletteOverrides);
  const displacementZColor = getMetricKeyColor("displacementZ", metricPaletteOverrides);

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

  const displacementMag = useMemo(
    () => Math.hypot(currentDispRaw[0], currentDispRaw[1], currentDispRaw[2]),
    [currentDispRaw]
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

  // TIME SERIES DATA FOR MINI CHARTS
  const velocityTimeSeries = useMemo(() => {
    if (!animationData.velocityLin) return null;
    const times: number[] = [];
    const magnitudes: number[] = [];
    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      times.push(i * animationData.metadata.dt);
      const vel = animationData.velocityLin.atFrame(i).at(nodeId);
      magnitudes.push(Math.hypot(vel[0], vel[1], vel[2]));
    }
    return { times, magnitudes };
  }, [animationData.velocityLin, animationData.metadata.frameCount, animationData.metadata.dt, nodeId]);

  const accelerationTimeSeries = useMemo(() => {
    if (!animationData.accelerationLin) return null;
    const times: number[] = [];
    const magnitudes: number[] = [];
    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      times.push(i * animationData.metadata.dt);
      const acc = animationData.accelerationLin.atFrame(i).at(nodeId);
      magnitudes.push(Math.hypot(acc[0], acc[1], acc[2]));
    }
    return { times, magnitudes };
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
    return { times, magnitudes, xValues, yValues, zValues };
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

  // STORY DRIFT (if this is a corner node)
  const storyDrift = useMemo(() => {
    if (cornerInfo === "Interior") return null;

    const storyIndex = animationData.metadata.storyOrder.indexOf(storyInfo.story);
    if (storyIndex <= 0) return null; // No drift for ground floor

    // const corners = animationData.precomputed.cornerNodes[storyInfo.story];
    const cornerOrder = ["NW", "NE", "SW", "SE"];
    const cornerIndex = cornerOrder.indexOf(cornerInfo);

    if (cornerIndex === -1) return null;

    const currentDrift = animationData.precomputed.storyDrift.getStoryDrift(storyIndex, frameIndex)[cornerIndex];
    const peakDrift =
      animationData.precomputed.peakStoryDrift[storyInfo.story][cornerInfo as "NW" | "NE" | "SW" | "SE"];

    return {
      current: currentDrift,
      peak: peakDrift,
    };
  }, [cornerInfo, storyInfo, frameIndex, animationData]);

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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border border-neutral-200 bg-white/95 shadow-xl backdrop-blur-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs">
        {/* LOCATION INFO */}
        <div className="animate-fade-in border-t pt-2">
          <h3 className="mb-2 flex items-center gap-1 text-sm font-bold">Location</h3>
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
                <UnitTooltip interactive={!playing} value={storyInfo.elevation} unit="in" decimals={0} />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Story Height:</span>
              <div className="text-neutral-600">
                <UnitTooltip interactive={!playing} value={storyInfo.height} unit="in" decimals={0} />
              </div>
            </div>
          </div>
        </div>

        {/* POSITION */}
        <div className="animate-fade-in border-t pt-2">
          <h3 className="mb-2 text-sm font-bold">Position (in)</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="font-medium text-neutral-700">X:</span>
              <div className="font-mono text-neutral-600">
                <UnitTooltip interactive={!playing} value={currentPos[0]} unit="in" />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Y:</span>
              <div className="font-mono text-neutral-600">
                <UnitTooltip interactive={!playing} value={currentPos[1]} unit="in" />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Z:</span>
              <div className="font-mono text-neutral-600">
                <UnitTooltip interactive={!playing} value={currentPos[2]} unit="in" />
              </div>
            </div>
          </div>
        </div>

        {/* DISPLACEMENT */}
        <div className="animate-fade-in border-t pt-2">
          <h3 className="mb-2 text-sm font-bold">Displacement (in)</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Current Total:</span>
              <div className="font-mono text-neutral-600">
                <UnitTooltip interactive={!playing} value={displacementMag} unit="in" />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Peak Total:</span>
              <div className="font-mono text-neutral-600">
                <UnitTooltip interactive={!playing} value={peakDisplacement.magnitude} unit="in" />
                <span className="text-[9px] text-neutral-500"> @ {peakDisplacement.time.toFixed(2)} s</span>
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current X:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip interactive={!playing} value={currentDispRaw[0]} unit="in" />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Peak X:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip interactive={!playing} value={peakDisplacement.x} unit="in" />
                <span className="text-[9px] text-neutral-500"> @ {peakDisplacement.xTime.toFixed(2)} s</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current Y:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip interactive={!playing} value={currentDispRaw[1]} unit="in" />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Peak Y:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip interactive={!playing} value={peakDisplacement.y} unit="in" />
                <span className="text-[9px] text-neutral-500"> @ {peakDisplacement.yTime.toFixed(2)} s</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current Z:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip interactive={!playing} value={currentDispRaw[2]} unit="in" />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Peak Z:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip interactive={!playing} value={peakDisplacement.z} unit="in" />
                <span className="text-[9px] text-neutral-500"> @ {peakDisplacement.zTime.toFixed(2)} s</span>
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <MiniTimeSeries
                data={displacementTimeSeries.magnitudes}
                times={displacementTimeSeries.times}
                color={displacementMagColor}
                currentValue={displacementMag}
                unit="in"
                label="Displacement Magnitude"
              />
              <MiniTimeSeries
                data={displacementTimeSeries.xValues}
                times={displacementTimeSeries.times}
                color={displacementXColor}
                currentValue={currentDispRaw[0]}
                unit="in"
                label="Displacement X"
              />
              <MiniTimeSeries
                data={displacementTimeSeries.yValues}
                times={displacementTimeSeries.times}
                color={displacementYColor}
                currentValue={currentDispRaw[1]}
                unit="in"
                label="Displacement Y"
              />
              <MiniTimeSeries
                data={displacementTimeSeries.zValues}
                times={displacementTimeSeries.times}
                color={displacementZColor}
                currentValue={currentDispRaw[2]}
                unit="in"
                label="Displacement Z"
              />
            </div>
          </div>
        </div>

        {/* ROTATION */}
        {animationData.displacementRot && (
          <div className="animate-fade-in border-t pt-2">
            <h3 className="mb-2 text-sm font-bold">Rotation (rad)</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current Total:</span>
                <div className="font-mono text-neutral-600">
                  <UnitTooltip interactive={!playing} value={currentRotation.magnitude} unit="rad" />
                </div>
              </div>
              <div>
                <span className="font-medium text-neutral-700">Peak Total:</span>
                <div className="font-mono text-neutral-600">
                  <UnitTooltip interactive={!playing} value={peakRotation.magnitude} unit="rad" />
                </div>
                <div className="text-[9px] text-neutral-500"> @ {peakRotation.time.toFixed(2)} s</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                <div className="text-neutral-600">Rx:</div>
                <div className="font-mono">
                  <UnitTooltip interactive={!playing} value={currentRotation.rx} unit="rad" />
                </div>
                <div className="font-mono text-neutral-500">
                  (<UnitTooltip interactive={!playing} value={peakRotation.rx} unit="rad" />
                  <span className="text-[9px] text-neutral-500"> @ {peakRotation.rxTime.toFixed(2)} s)</span>
                </div>
              </div>
              <div>
                <div className="text-neutral-600">Ry:</div>
                <div className="font-mono">
                  <UnitTooltip interactive={!playing} value={currentRotation.ry} unit="rad" />
                </div>
                <div className="font-mono text-neutral-500">
                  (<UnitTooltip interactive={!playing} value={peakRotation.ry} unit="rad" />
                  <span className="text-[9px] text-neutral-500"> @ {peakRotation.ryTime.toFixed(2)} s)</span>
                </div>
              </div>
              <div>
                <div className="text-neutral-600">Rz:</div>
                <div className="font-mono">
                  <UnitTooltip interactive={!playing} value={currentRotation.rz} unit="rad" />
                </div>
                <div className="font-mono text-neutral-500">
                  (<UnitTooltip interactive={!playing} value={peakRotation.rz} unit="rad" />
                  <span className="text-[9px] text-neutral-500"> @ {peakRotation.rzTime.toFixed(2)} s)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VELOCITY */}
        {animationData.velocityLin && (
          <div className="animate-fade-in border-t pt-2">
            <h3 className="mb-2 text-sm font-bold">Velocity (in/s)</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current:</span>
                <div className="font-mono text-neutral-600">
                  <UnitTooltip interactive={!playing} value={currentVelocity!.magnitude} unit="in/s" />
                </div>
              </div>
              {peakVelocity && (
                <div>
                  <span className="font-medium text-neutral-700">Peak:</span>
                  <div className="font-mono text-neutral-600">
                    <UnitTooltip interactive={!playing} value={peakVelocity.magnitude} unit="in/s" />
                  </div>
                  <div className="text-[9px] text-neutral-500"> @ {peakVelocity.time.toFixed(2)} s</div>
                </div>
              )}
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                X:{" "}
                <span className="font-mono">
                  <UnitTooltip interactive={!playing} value={currentVelocity!.x} unit="in/s" />
                </span>
              </div>
              <div>
                Y:{" "}
                <span className="font-mono">
                  <UnitTooltip interactive={!playing} value={currentVelocity!.y} unit="in/s" />
                </span>
              </div>
              <div>
                Z:{" "}
                <span className="font-mono">
                  <UnitTooltip interactive={!playing} value={currentVelocity!.z} unit="in/s" />
                </span>
              </div>
            </div>
            {peakVelocity && (
              <div className="mt-1 text-[9px] text-neutral-500">
                Peak: X:{" "}
                <UnitTooltip interactive={!playing} value={peakVelocity.x} unit="in/s" showConversions={false} />
                <span className="text-[9px] text-neutral-500"> @ {peakVelocity.xTime.toFixed(2)} s, Y: </span>
                <UnitTooltip interactive={!playing} value={peakVelocity.y} unit="in/s" showConversions={false} />
                <span className="text-[9px] text-neutral-500">
                  @ {peakVelocity.yTime.toFixed(2)} s, Z:{" "}
                  <UnitTooltip interactive={!playing} value={peakVelocity.z} unit="in/s" showConversions={false} />{" "}
                  @{" "}
                </span>
                {peakVelocity.zTime.toFixed(2)} s
              </div>
            )}
            {velocityTimeSeries && (
              <div className="mt-3 space-y-2">
                <MiniTimeSeries
                  data={velocityTimeSeries.magnitudes}
                  times={velocityTimeSeries.times}
                  color={displacementMagColor}
                  currentValue={currentVelocity?.magnitude ?? 0}
                  unit="in/s"
                  label="Velocity Magnitude"
                />
              </div>
            )}
          </div>
        )}

        {/* ACCELERATION */}
        {animationData.accelerationLin && (
          <div className="animate-fade-in border-t pt-2">
            <h3 className="mb-2 text-sm font-bold">Acceleration (in/s²)</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current:</span>
                <div className="font-mono text-neutral-600">
                  <UnitTooltip interactive={!playing} value={currentAcceleration!.magnitude} unit="in/s²" />
                </div>
              </div>
              {peakAcceleration && (
                <div>
                  <span className="font-medium text-neutral-700">Peak:</span>
                  <div className="font-mono text-neutral-600">
                    <UnitTooltip interactive={!playing} value={peakAcceleration.magnitude} unit="in/s²" />
                  </div>
                  <div className="text-[9px] text-neutral-500"> @ {peakAcceleration.time.toFixed(2)} s</div>
                </div>
              )}
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                X:{" "}
                <span className="font-mono">
                  <UnitTooltip interactive={!playing} value={currentAcceleration!.x} unit="in/s²" />
                </span>
              </div>
              <div>
                Y:{" "}
                <span className="font-mono">
                  <UnitTooltip interactive={!playing} value={currentAcceleration!.y} unit="in/s²" />
                </span>
              </div>
              <div>
                Z:{" "}
                <span className="font-mono">
                  <UnitTooltip interactive={!playing} value={currentAcceleration!.z} unit="in/s²" />
                </span>
              </div>
            </div>
            {peakAcceleration && (
              <div className="mt-1 text-[9px] text-neutral-500">
                Peak: X:{" "}
                <UnitTooltip interactive={!playing} value={peakAcceleration.x} unit="in/s²" showConversions={false} />
                <span className="text-[9px] text-neutral-500"> @ {peakAcceleration.xTime.toFixed(2)} s, Y: </span>
                <UnitTooltip interactive={!playing} value={peakAcceleration.y} unit="in/s²" showConversions={false} />
                <span className="text-[9px] text-neutral-500"> @ {peakAcceleration.yTime.toFixed(2)} s, Z: </span>
                <UnitTooltip interactive={!playing} value={peakAcceleration.z} unit="in/s²" showConversions={false} />
                <span className="text-[9px] text-neutral-500"> @ {peakAcceleration.zTime.toFixed(2)} s</span>
              </div>
            )}
            {accelerationTimeSeries && (
              <div className="mt-3 space-y-2">
                <MiniTimeSeries
                  data={accelerationTimeSeries.magnitudes}
                  times={accelerationTimeSeries.times}
                  color={displacementMagColor}
                  currentValue={currentAcceleration?.magnitude ?? 0}
                  unit="in/s²"
                  label="Acceleration Magnitude"
                />
              </div>
            )}
          </div>
        )}

        {/* STORY DRIFT */}
        {storyDrift && (
          <div className="animate-fade-in border-t pt-2">
            <h3 className="mb-2 text-sm font-bold">Story Drift Ratio (%)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current:</span>
                <div className="font-mono text-neutral-600">
                  <UnitTooltip interactive={!playing} value={storyDrift.current} unit="%" />
                </div>
              </div>
              <div>
                <span className="font-medium text-neutral-700">Peak:</span>
                <div className="font-mono text-neutral-600">
                  <UnitTooltip interactive={!playing} value={storyDrift.peak} unit="%" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUMULATIVE STATS */}
        <div className="animate-fade-in border-t pt-2">
          <h3 className="mb-2 text-sm font-bold">Total Distance Traveled</h3>
          <div className="font-mono text-neutral-600">
            <UnitTooltip interactive={!playing} value={totalDistanceTraveled} unit="in" />
          </div>
        </div>

        {/* RIBBONS */}
        <div className="animate-fade-in border-t pt-2">
          <h3 className="mb-2 text-sm font-bold">Displacement Path (Top View)</h3>
          <MiniRibbon path={ribbonPath} dt={animationData.metadata.dt} frameIndex={frameIndex} />
          <div className="flex gap-1 text-[10px] text-neutral-400 italic">
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
