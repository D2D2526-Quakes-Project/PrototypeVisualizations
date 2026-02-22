import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import type { IDockviewPanelProps } from "dockview";
import { useMemo } from "react";
import { MiniTimeSeries } from "./MiniTimeSeries";
import { UnitTooltip } from "@/components/ui/unit-tooltip";

export function SlicePanel(props: IDockviewPanelProps<{ sliceId: string }>) {
  const { sliceId } = props.params;
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const storyId = useMemo(() => {
    const parts = sliceId.split("-");
    return parts[1];
  }, [sliceId]);

  const nodeIds = useMemo(
    () => animationData.metadata.stories[storyId] || [],
    [storyId, animationData.metadata.stories],
  );

  // LOCATION INFO
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

  // DISPLACEMENT
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

  // VELOCITY
  const velocityData = useMemo(() => {
    if (!animationData.velocityLin || nodeIds.length === 0) return null;

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

    const nodeCount = nodeIds.length;
    return {
      current: {
        magnitude: sumMag / nodeCount,
        x: sumX / nodeCount,
        y: sumY / nodeCount,
        z: sumZ / nodeCount,
      },
    };
  }, [animationData.velocityLin, nodeIds, frameIndex]);

  // ACCELERATION
  const accelerationData = useMemo(() => {
    if (!animationData.accelerationLin || nodeIds.length === 0) return null;

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

    const nodeCount = nodeIds.length;
    return {
      current: {
        magnitude: sumMag / nodeCount,
        x: sumX / nodeCount,
        y: sumY / nodeCount,
        z: sumZ / nodeCount,
      },
    };
  }, [animationData.accelerationLin, nodeIds, frameIndex]);

  // CORNER DRIFT VALUES
  const cornerDrifts = useMemo(() => {
    const storyIndex = animationData.metadata.storyOrder.indexOf(storyId);
    if (storyIndex <= 0) return null;

    const corners = ["NW", "NE", "SW", "SE"];
    const cornerNodeIds = animationData.metadata.corners;
    const cornerData: Record<string, { current: number; peak: number } | null> = {};

    for (const corner of corners) {
      const cornerNodes = cornerNodeIds[corner];
      if (!cornerNodes || cornerNodes.length === 0) {
        cornerData[corner] = null;
        continue;
      }

      const nodesOnThisFloor = cornerNodes.filter((n) => nodeIds.includes(n));
      if (nodesOnThisFloor.length === 0) {
        cornerData[corner] = null;
        continue;
      }

      const currentDrift = animationData.precomputed.storyDrift.getStoryDrift(storyIndex, frameIndex);
      const cornerIndex = corners.indexOf(corner);
      const peakDrift = animationData.precomputed.peakStoryDrift[storyId]?.[corner as "NW" | "NE" | "SW" | "SE"];

      cornerData[corner] = {
        current: currentDrift[cornerIndex],
        peak: peakDrift ?? 0,
      };
    }

    return cornerData;
  }, [storyId, animationData, frameIndex, nodeIds]);

  // TIME SERIES FOR MINI CHARTS
  const displacementTimeSeries = useMemo(() => {
    const times: number[] = [];
    const magnitudes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      times.push(f * animationData.metadata.dt);
      let frameMag = 0;
      let frameX = 0;
      let frameY = 0;
      let frameZ = 0;
      for (const nodeId of nodeIds) {
        const disp = animationData.displacementLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(disp[0], disp[1], disp[2]);
        frameX += disp[0];
        frameY += disp[1];
        frameZ += disp[2];
      }
      magnitudes.push(frameMag / nodeIds.length);
      xValues.push(frameX / nodeIds.length);
      yValues.push(frameY / nodeIds.length);
      zValues.push(frameZ / nodeIds.length);
    }

    return { times, magnitudes, xValues, yValues, zValues };
  }, [nodeIds, animationData.metadata.frameCount, animationData.metadata.dt, animationData.displacementLin]);

  const velocityTimeSeries = useMemo(() => {
    if (!animationData.velocityLin) return null;
    const times: number[] = [];
    const magnitudes: number[] = [];
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];

    for (let f = 0; f < animationData.metadata.frameCount; f++) {
      times.push(f * animationData.metadata.dt);
      let frameMag = 0;
      let frameX = 0;
      let frameY = 0;
      let frameZ = 0;
      for (const nodeId of nodeIds) {
        const vel = animationData.velocityLin.atFrame(f).at(nodeId);
        frameMag += Math.hypot(vel[0], vel[1], vel[2]);
        frameX += vel[0];
        frameY += vel[1];
        frameZ += vel[2];
      }
      magnitudes.push(frameMag / nodeIds.length);
      xValues.push(frameX / nodeIds.length);
      yValues.push(frameY / nodeIds.length);
      zValues.push(frameZ / nodeIds.length);
    }

    return { times, magnitudes, xValues, yValues, zValues };
  }, [animationData.velocityLin, nodeIds, animationData.metadata.frameCount, animationData.metadata.dt]);

  return (
    <div className="h-full w-full flex flex-col bg-white/95 backdrop-blur-sm border border-neutral-200 shadow-xl overflow-hidden">
      <div className="p-3 space-y-3 text-xs flex-1 overflow-y-auto">
        {/* LOCATION INFO */}
        <div className="border-t pt-2 animate-fade-in">
          <h3 className="font-bold text-sm mb-2">Location</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Story:</span>
              <div className="text-neutral-600 font-mono">{storyInfo.story}</div>
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

        {/* DISPLACEMENT */}
        {displacementData && (
          <div className="border-t pt-2 animate-fade-in">
            <h3 className="font-bold text-sm mb-2">Displacement (in)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current Avg:</span>
                <div className="text-neutral-600 font-mono">
                  <UnitTooltip value={displacementData.current.magnitude} unit="in" />
                </div>
              </div>
              <div>
                <span className="font-medium text-neutral-700">Peak Avg:</span>
                <div className="text-neutral-600 font-mono">
                  <UnitTooltip value={displacementData.peak.magnitude} unit="in" />
                </div>
                <span className="text-neutral-500 text-[9px]"> @ {displacementData.peak.magnitudeTime.toFixed(2)}s</span>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current X:</span>
                <span className="font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.current.x} unit="in" />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak X:</span>
                <span className="font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.peak.x} unit="in" />
                  <span className="text-neutral-500 text-[9px]"> @ {displacementData.peak.xTime.toFixed(2)}s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Y:</span>
                <span className="font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.current.y} unit="in" />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Y:</span>
                <span className="font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.peak.y} unit="in" />
                  <span className="text-neutral-500 text-[9px]"> @ {displacementData.peak.yTime.toFixed(2)}s</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Current Z:</span>
                <span className="font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.current.z} unit="in" />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-neutral-600">Peak Z:</span>
                <span className="font-mono text-neutral-800">
                  <UnitTooltip value={displacementData.peak.z} unit="in" />
                  <span className="text-neutral-500 text-[9px]"> @ {displacementData.peak.zTime.toFixed(2)}s</span>
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <MiniTimeSeries
                data={displacementTimeSeries.magnitudes}
                times={displacementTimeSeries.times}
                color="#f59e0b"
                currentValue={displacementData.current.magnitude}
                unit="in"
                label="Displacement Magnitude"
              />
              <MiniTimeSeries
                data={displacementTimeSeries.xValues}
                times={displacementTimeSeries.times}
                color="#ef4444"
                currentValue={displacementData.current.x}
                unit="in"
                label="Displacement X"
              />
              <MiniTimeSeries
                data={displacementTimeSeries.yValues}
                times={displacementTimeSeries.times}
                color="#22c55e"
                currentValue={displacementData.current.y}
                unit="in"
                label="Displacement Y"
              />
              <MiniTimeSeries
                data={displacementTimeSeries.zValues}
                times={displacementTimeSeries.times}
                color="#3b82f6"
                currentValue={displacementData.current.z}
                unit="in"
                label="Displacement Z"
              />
            </div>
          </div>
        )}

        {/* VELOCITY */}
        {velocityData && (
          <div className="border-t pt-2 animate-fade-in">
            <h3 className="font-bold text-sm mb-2">Velocity (in/s)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current Avg:</span>
                <div className="text-neutral-600 font-mono">
                  <UnitTooltip value={velocityData.current.magnitude} unit="in/s" />
                </div>
              </div>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                X:{" "}
                <span className="font-mono">
                  <UnitTooltip value={velocityData.current.x} unit="in/s" />
                </span>
              </div>
              <div>
                Y:{" "}
                <span className="font-mono">
                  <UnitTooltip value={velocityData.current.y} unit="in/s" />
                </span>
              </div>
              <div>
                Z:{" "}
                <span className="font-mono">
                  <UnitTooltip value={velocityData.current.z} unit="in/s" />
                </span>
              </div>
            </div>
            {velocityTimeSeries && (
              <div className="mt-3 space-y-2">
                <MiniTimeSeries
                  data={velocityTimeSeries.magnitudes}
                  times={velocityTimeSeries.times}
                  color="#f59e0b"
                  currentValue={velocityData.current.magnitude}
                  unit="in/s"
                  label="Velocity Magnitude"
                />
                <MiniTimeSeries
                  data={velocityTimeSeries.xValues}
                  times={velocityTimeSeries.times}
                  color="#ef4444"
                  currentValue={velocityData.current.x}
                  unit="in/s"
                  label="Velocity X"
                />
                <MiniTimeSeries
                  data={velocityTimeSeries.yValues}
                  times={velocityTimeSeries.times}
                  color="#22c55e"
                  currentValue={velocityData.current.y}
                  unit="in/s"
                  label="Velocity Y"
                />
                <MiniTimeSeries
                  data={velocityTimeSeries.zValues}
                  times={velocityTimeSeries.times}
                  color="#3b82f6"
                  currentValue={velocityData.current.z}
                  unit="in/s"
                  label="Velocity Z"
                />
              </div>
            )}
          </div>
        )}

        {/* ACCELERATION */}
        {accelerationData && (
          <div className="border-t pt-2 animate-fade-in">
            <h3 className="font-bold text-sm mb-2">Acceleration (in/s²)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current Avg:</span>
                <div className="text-neutral-600 font-mono">
                  <UnitTooltip value={accelerationData.current.magnitude} unit="in/s²" />
                </div>
              </div>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                X:{" "}
                <span className="font-mono">
                  <UnitTooltip value={accelerationData.current.x} unit="in/s²" />
                </span>
              </div>
              <div>
                Y:{" "}
                <span className="font-mono">
                  <UnitTooltip value={accelerationData.current.y} unit="in/s²" />
                </span>
              </div>
              <div>
                Z:{" "}
                <span className="font-mono">
                  <UnitTooltip value={accelerationData.current.z} unit="in/s²" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CORNER DRIFTS */}
        {cornerDrifts && (
          <div className="border-t pt-2 animate-fade-in">
            <h3 className="font-bold text-sm mb-2">Corner Drifts (%)</h3>
            <div className="space-y-1">
              {Object.entries(cornerDrifts).map(([corner, data]) => (
                <div key={corner} className="flex items-center gap-2">
                  <span className="font-medium text-neutral-700 w-8">{corner}:</span>
                  {data ? (
                    <div className="text-neutral-600 font-mono text-[10px]">
                      <span className="mr-1">Current:</span>
                      <UnitTooltip value={data.current} unit="%" decimals={4} />
                      <span className="mx-2 text-neutral-300">|</span>
                      <span className="mr-1">Peak:</span>
                      <UnitTooltip value={data.peak} unit="%" decimals={4} />
                    </div>
                  ) : (
                    <div className="text-neutral-400 text-[10px]">N/A</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!animationData.velocityLin && (
          <div className="text-neutral-400 text-[10px] italic">Velocities not loaded</div>
        )}
        {!animationData.accelerationLin && (
          <div className="text-neutral-400 text-[10px] italic">Accelerations not loaded</div>
        )}
      </div>
    </div>
  );
}

export function SliceTab(props: { sliceId: string; storyId: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing bg-neutral-100 border-neutral-300">
      <span className="text-sm font-semibold text-neutral-700">Floor {props.storyId}</span>
    </div>
  );
}
