import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { type IDockviewPanelHeaderProps, type IDockviewPanelProps } from "dockview";
import { InfoIcon, XIcon } from "lucide-react";
import { useMemo } from "react";
import { Vector3 } from "three";
import { MiniRibbon } from "./MiniRibbon";
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
  const { frameIndex } = usePlayback();

  const initialPosRaw = animationData.initialPositions.at(nodeId);
  const currentDispRaw = animationData.displacementLin.atFrame(frameIndex).at(nodeId);

  const currentPos = useMemo(
    () =>
      [
        initialPosRaw[0] + currentDispRaw[0],
        initialPosRaw[1] + currentDispRaw[1],
        initialPosRaw[2] + currentDispRaw[2],
      ] as const,
    [initialPosRaw, currentDispRaw],
  );

  const displacementMag = useMemo(
    () => Math.hypot(currentDispRaw[0], currentDispRaw[1], currentDispRaw[2]),
    [currentDispRaw],
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
    <div className="h-full w-full flex flex-col bg-white/95 backdrop-blur-sm border border-neutral-200 shadow-xl overflow-hidden">
      <div className="p-3 space-y-3 text-xs flex-1 overflow-y-auto">
        {/* LOCATION INFO */}
        <div className="border-t pt-2 animate-fade-in">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-1">Location</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Story ID:</span>
              <div className="text-neutral-600 font-mono">{storyInfo.story}</div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Corner:</span>
              <div className="text-neutral-600">{cornerInfo}</div>
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

        {/* POSITION */}
        <div className="border-t pt-2 animate-fade-in">
          <h3 className="font-bold text-sm mb-2">Position (in)</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="font-medium text-neutral-700">X:</span>
              <div className="text-neutral-600 font-mono">
                <UnitTooltip value={currentPos[0]} unit="in" />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Y:</span>
              <div className="text-neutral-600 font-mono">
                <UnitTooltip value={currentPos[1]} unit="in" />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Z:</span>
              <div className="text-neutral-600 font-mono">
                <UnitTooltip value={currentPos[2]} unit="in" />
              </div>
            </div>
          </div>
        </div>

        {/* DISPLACEMENT */}
        <div className="border-t pt-2 animate-fade-in">
          <h3 className="font-bold text-sm mb-2">Displacement (in)</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Current Total:</span>
              <div className="text-neutral-600 font-mono">
                <UnitTooltip value={displacementMag} unit="in" />
              </div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Peak Total:</span>
              <div className="text-neutral-600 font-mono">
                <UnitTooltip value={peakDisplacement.magnitude} unit="in" />
                <span className="text-neutral-500 text-[9px]"> @ {peakDisplacement.time.toFixed(2)}s</span>
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current X:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip value={currentDispRaw[0]} unit="in" />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Peak X:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip value={peakDisplacement.x} unit="in" />
                <span className="text-neutral-500 text-[9px]"> @ {peakDisplacement.xTime.toFixed(2)}s</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current Y:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip value={currentDispRaw[1]} unit="in" />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Peak Y:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip value={peakDisplacement.y} unit="in" />
                <span className="text-neutral-500 text-[9px]"> @ {peakDisplacement.yTime.toFixed(2)}s</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current Z:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip value={currentDispRaw[2]} unit="in" />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Peak Z:</span>
              <span className="font-mono text-neutral-800">
                <UnitTooltip value={peakDisplacement.z} unit="in" />
                <span className="text-neutral-500 text-[9px]"> @ {peakDisplacement.zTime.toFixed(2)}s</span>
              </span>
            </div>
          </div>
        </div>

        {/* ROTATION */}
        {animationData.displacementRot && (
          <div className="border-t pt-2 animate-fade-in">
            <h3 className="font-bold text-sm mb-2">Rotation (rad)</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current Total:</span>
                <div className="text-neutral-600 font-mono">
                  <UnitTooltip value={currentRotation.magnitude} unit="rad" decimals={4} />
                </div>
              </div>
              <div>
                <span className="font-medium text-neutral-700">Peak Total:</span>
                <div className="text-neutral-600 font-mono">
                  <UnitTooltip value={peakRotation.magnitude} unit="rad" decimals={4} />
                </div>
                <div className="text-neutral-500 text-[9px]"> @ {peakRotation.time.toFixed(2)}s</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                <div className="text-neutral-600">Rx:</div>
                <div className="font-mono">
                  <UnitTooltip value={currentRotation.rx} unit="rad" decimals={4} />
                </div>
                <div className="font-mono text-neutral-500">
                  (<UnitTooltip value={peakRotation.rx} unit="rad" decimals={4} />
                  <span className="text-neutral-500 text-[9px]"> @ {peakRotation.rxTime.toFixed(2)}s)</span>
                </div>
              </div>
              <div>
                <div className="text-neutral-600">Ry:</div>
                <div className="font-mono">
                  <UnitTooltip value={currentRotation.ry} unit="rad" decimals={4} />
                </div>
                <div className="font-mono text-neutral-500">
                  (<UnitTooltip value={peakRotation.ry} unit="rad" decimals={4} />
                  <span className="text-neutral-500 text-[9px]"> @ {peakRotation.ryTime.toFixed(2)}s)</span>
                </div>
              </div>
              <div>
                <div className="text-neutral-600">Rz:</div>
                <div className="font-mono">
                  <UnitTooltip value={currentRotation.rz} unit="rad" decimals={4} />
                </div>
                <div className="font-mono text-neutral-500">
                  (<UnitTooltip value={peakRotation.rz} unit="rad" decimals={4} />
                  <span className="text-neutral-500 text-[9px]"> @ {peakRotation.rzTime.toFixed(2)}s)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VELOCITY */}
        {animationData.velocityLin && (
          <div className="border-t pt-2 animate-fade-in">
            <h3 className="font-bold text-sm mb-2">Velocity (in/s)</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current:</span>
                <div className="text-neutral-600 font-mono">
                  <UnitTooltip value={currentVelocity!.magnitude} unit="in/s" />
                </div>
              </div>
              {peakVelocity && (
                <div>
                  <span className="font-medium text-neutral-700">Peak:</span>
                  <div className="text-neutral-600 font-mono">
                    <UnitTooltip value={peakVelocity.magnitude} unit="in/s" />
                  </div>
                  <div className="text-neutral-500 text-[9px]"> @ {peakVelocity.time.toFixed(2)}s</div>
                </div>
              )}
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                X:{" "}
                <span className="font-mono">
                  <UnitTooltip value={currentVelocity!.x} unit="in/s" />
                </span>
              </div>
              <div>
                Y:{" "}
                <span className="font-mono">
                  <UnitTooltip value={currentVelocity!.y} unit="in/s" />
                </span>
              </div>
              <div>
                Z:{" "}
                <span className="font-mono">
                  <UnitTooltip value={currentVelocity!.z} unit="in/s" />
                </span>
              </div>
            </div>
            {peakVelocity && (
              <div className="mt-1 text-[9px] text-neutral-500">
                Peak: X: <UnitTooltip value={peakVelocity.x} unit="in/s" showConversions={false} />
                <span className="text-neutral-500 text-[9px]"> @ {peakVelocity.xTime.toFixed(2)}s, Y: </span>
                <UnitTooltip value={peakVelocity.y} unit="in/s" showConversions={false} />
                <span className="text-neutral-500 text-[9px]">
                  @ {peakVelocity.yTime.toFixed(2)}s, Z: <UnitTooltip value={peakVelocity.z} unit="in/s" showConversions={false} /> @{" "}
                </span>
                {peakVelocity.zTime.toFixed(2)}s
              </div>
            )}
          </div>
        )}

        {/* ACCELERATION */}
        {animationData.accelerationLin && (
          <div className="border-t pt-2 animate-fade-in">
            <h3 className="font-bold text-sm mb-2">Acceleration (in/s²)</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current:</span>
                <div className="text-neutral-600 font-mono">
                  <UnitTooltip value={currentAcceleration!.magnitude} unit="in/s²" />
                </div>
              </div>
              {peakAcceleration && (
                <div>
                  <span className="font-medium text-neutral-700">Peak:</span>
                  <div className="text-neutral-600 font-mono">
                    <UnitTooltip value={peakAcceleration.magnitude} unit="in/s²" />
                  </div>
                  <div className="text-neutral-500 text-[9px]"> @ {peakAcceleration.time.toFixed(2)}s</div>
                </div>
              )}
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                X:{" "}
                <span className="font-mono">
                  <UnitTooltip value={currentAcceleration!.x} unit="in/s²" />
                </span>
              </div>
              <div>
                Y:{" "}
                <span className="font-mono">
                  <UnitTooltip value={currentAcceleration!.y} unit="in/s²" />
                </span>
              </div>
              <div>
                Z:{" "}
                <span className="font-mono">
                  <UnitTooltip value={currentAcceleration!.z} unit="in/s²" />
                </span>
              </div>
            </div>
            {peakAcceleration && (
              <div className="mt-1 text-[9px] text-neutral-500">
                Peak: X: <UnitTooltip value={peakAcceleration.x} unit="in/s²" showConversions={false} />
                <span className="text-neutral-500 text-[9px]"> @ {peakAcceleration.xTime.toFixed(2)}s, Y: </span>
                <UnitTooltip value={peakAcceleration.y} unit="in/s²" showConversions={false} />
                <span className="text-neutral-500 text-[9px]"> @ {peakAcceleration.yTime.toFixed(2)}s, Z: </span>
                <UnitTooltip value={peakAcceleration.z} unit="in/s²" showConversions={false} />
                <span className="text-neutral-500 text-[9px]"> @ {peakAcceleration.zTime.toFixed(2)}s</span>
              </div>
            )}
          </div>
        )}

        {/* STORY DRIFT */}
        {storyDrift && (
          <div className="border-t pt-2 animate-fade-in">
            <h3 className="font-bold text-sm mb-2">Story Drift Ratio (%)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current:</span>
                <div className="text-neutral-600 font-mono">
                  <UnitTooltip value={storyDrift.current} unit="%" decimals={4} />
                </div>
              </div>
              <div>
                <span className="font-medium text-neutral-700">Peak:</span>
                <div className="text-neutral-600 font-mono">
                  <UnitTooltip value={storyDrift.peak} unit="%" decimals={4} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUMULATIVE STATS */}
        <div className="border-t pt-2 animate-fade-in">
          <h3 className="font-bold text-sm mb-2">Total Distance Traveled</h3>
          <div className="text-neutral-600 font-mono">
            <UnitTooltip value={totalDistanceTraveled} unit="in" />
          </div>
        </div>

        {/* RIBBONS */}
        <div className="border-t pt-2 animate-fade-in">
          <h3 className="font-bold text-sm mb-2">Displacement Path (Top View)</h3>
          <MiniRibbon path={ribbonPath} dt={animationData.metadata.dt} />
          <div className="text-neutral-400 text-[10px] italic flex gap-1">
            <InfoIcon className="size-3" /> Number of points reduced for performance
          </div>
        </div>

        <div>
          {!animationData.displacementRot && (
            <div className="text-neutral-400 text-[10px] italic">Rotations not loaded</div>
          )}
          {!animationData.velocityLin && (
            <div className="text-neutral-400 text-[10px] italic">Velocities not loaded</div>
          )}
          {!animationData.accelerationLin && (
            <div className="text-neutral-400 text-[10px] italic">Accelerations not loaded</div>
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
      className="flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing transition-colors"
      style={{ backgroundColor: lightColor, borderColor: color }}>
      <div className="flex items-center gap-2 pointer-events-none">
        <span className="text-sm font-semibold" style={{ color }}>
          Node {nodeId}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleClose}
          className="p-1 rounded transition-colors hover:bg-white/50"
          style={{ color }}
          title="Close">
          <XIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
