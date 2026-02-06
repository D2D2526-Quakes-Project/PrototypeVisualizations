import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { type IDockviewPanelHeaderProps, type IDockviewPanelProps } from "dockview";
import { TrendingUpIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { Vector3 } from "three";
import { MiniRibbon } from "./MiniRibbon";

export function NodePanel(props: IDockviewPanelProps<{ nodeId: number }>) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const nodeId = props.params.nodeId;

  const initialPos = animationData.initialPositions.at(nodeId);
  const currentDisp = animationData.displacement.atFrame(frameIndex).at(nodeId);
  const currentPos = [initialPos[0] + currentDisp[0], initialPos[1] + currentDisp[1], initialPos[2] + currentDisp[2]];
  const displacementMag = Math.hypot(currentDisp[0], currentDisp[1], currentDisp[2]);

  // RIBBONS AND PATHS
  const ribbonPath = useMemo(() => {
    const path = new Array(animationData.metadata.frameCount).fill(null).map(() => new Vector3(0, 0, 0));
    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const pos = animationData.displacement.atFrame(i).at(nodeId);
      path[i] = new Vector3(pos[0], pos[1], pos[2]);
    }
    return path;
  }, [animationData.metadata.frameCount, animationData.displacement, nodeId]);

  // PEAK DISPLACEMENT ACROSS ALL TIME
  const peakDisplacement = useMemo(() => {
    let maxMag = 0;
    let maxX = 0,
      maxY = 0,
      maxZ = 0;
    let maxFrame = 0;

    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const disp = animationData.displacement.atFrame(i).at(nodeId);
      const mag = Math.hypot(disp[0], disp[1], disp[2]);

      if (mag > maxMag) {
        maxMag = mag;
        maxX = disp[0];
        maxY = disp[1];
        maxZ = disp[2];
        maxFrame = i;
      }
    }

    return {
      magnitude: maxMag,
      x: maxX,
      y: maxY,
      z: maxZ,
      frame: maxFrame,
      time: maxFrame * animationData.metadata.dt,
    };
  }, [animationData, nodeId]);

  // VELOCITY (if available)
  const currentVelocity = useMemo(() => {
    if (!animationData.velocity) return null;
    const vel = animationData.velocity.atFrame(frameIndex).at(nodeId);
    return {
      x: vel[0],
      y: vel[1],
      z: vel[2],
      magnitude: Math.hypot(vel[0], vel[1], vel[2]),
    };
  }, [animationData.velocity, frameIndex, nodeId]);

  const peakVelocity = useMemo(() => {
    if (!animationData.velocity) return null;
    let maxMag = 0;
    let maxFrame = 0;

    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const vel = animationData.velocity.atFrame(i).at(nodeId);
      const mag = Math.hypot(vel[0], vel[1], vel[2]);
      if (mag > maxMag) {
        maxMag = mag;
        maxFrame = i;
      }
    }

    return { magnitude: maxMag, frame: maxFrame, time: maxFrame * animationData.metadata.dt };
  }, [animationData.velocity, nodeId]);

  // ACCELERATION (if available)
  const currentAcceleration = useMemo(() => {
    if (!animationData.acceleration) return null;
    const acc = animationData.acceleration.atFrame(frameIndex).at(nodeId);
    return {
      x: acc[0],
      y: acc[1],
      z: acc[2],
      magnitude: Math.hypot(acc[0], acc[1], acc[2]),
    };
  }, [animationData.acceleration, frameIndex, nodeId]);

  const peakAcceleration = useMemo(() => {
    if (!animationData.acceleration) return null;
    let maxMag = 0;
    let maxFrame = 0;

    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const acc = animationData.acceleration.atFrame(i).at(nodeId);
      const mag = Math.hypot(acc[0], acc[1], acc[2]);
      if (mag > maxMag) {
        maxMag = mag;
        maxFrame = i;
      }
    }

    return { magnitude: maxMag, frame: maxFrame, time: maxFrame * animationData.metadata.dt };
  }, [animationData.acceleration, nodeId]);

  // STRUCTURAL INFO
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
  }, [nodeId, animationData]);

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
    const cornerOrder = ["NW", "NE", "SW", "SE"] as const;
    const cornerIndex = cornerOrder.indexOf(cornerInfo as any);

    if (cornerIndex === -1) return null;

    const currentDrift = animationData.precomputed.storyDrift.getStoryDrift(storyIndex, frameIndex)[cornerIndex];
    const peakDrift =
      animationData.precomputed.peakStoryDrift[storyInfo.story][cornerInfo as "NW" | "NE" | "SW" | "SE"];

    return {
      current: currentDrift,
      peak: peakDrift,
    };
  }, [cornerInfo, storyInfo, frameIndex, animationData, nodeId]);

  // DISTANCE TRAVELED
  const totalDistanceTraveled = useMemo(() => {
    let distance = 0;
    for (let i = 1; i < animationData.metadata.frameCount; i++) {
      const prev = animationData.displacement.atFrame(i - 1).at(nodeId);
      const curr = animationData.displacement.atFrame(i).at(nodeId);
      const dx = curr[0] - prev[0];
      const dy = curr[1] - prev[1];
      const dz = curr[2] - prev[2];
      distance += Math.hypot(dx, dy, dz);
    }
    return distance;
  }, [animationData, nodeId]);

  // ROTATION (current and peak)
  const currentRotation = useMemo(() => {
    const rot = currentDisp.slice(3, 6);
    return {
      rx: rot[0],
      ry: rot[1],
      rz: rot[2],
      magnitude: Math.hypot(rot[0], rot[1], rot[2]),
    };
  }, [currentDisp]);

  const peakRotation = useMemo(() => {
    let maxMag = 0;
    let maxRx = 0,
      maxRy = 0,
      maxRz = 0;

    for (let i = 0; i < animationData.metadata.frameCount; i++) {
      const disp = animationData.displacement.atFrame(i).at(nodeId);
      const rot = disp.slice(3, 6);
      const mag = Math.hypot(rot[0], rot[1], rot[2]);

      if (mag > maxMag) {
        maxMag = mag;
        maxRx = rot[0];
        maxRy = rot[1];
        maxRz = rot[2];
      }
    }

    return { magnitude: maxMag, rx: maxRx, ry: maxRy, rz: maxRz };
  }, [animationData, nodeId]);

  return (
    <div className="h-full w-full flex flex-col bg-white/95 backdrop-blur-sm border border-neutral-200 shadow-xl overflow-hidden rounded-lg">
      <AnimatePresence>
        <motion.div
          className="p-3 space-y-3 text-xs flex-1 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}>
          {/* LOCATION INFO */}

          <h3 className="font-bold text-sm mb-2 flex items-center gap-1">Location</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Floor:</span>
              <div className="text-neutral-600">
                {storyInfo.floorNumber} of {storyInfo.totalFloors}
              </div>
            </div>
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
              <div className="text-neutral-600">{storyInfo.elevation.toFixed(1)}"</div>
            </div>
            <div>
              <span className="font-medium text-neutral-700">Story Height:</span>
              <div className="text-neutral-600">{storyInfo.height.toFixed(1)}"</div>
            </div>
          </div>

          {/* POSITION */}
          <div className="border-t pt-2">
            <span className="font-medium text-neutral-700">Position (in):</span>
            <div className="text-neutral-600 font-mono text-[10px]">
              X: {currentPos[0].toFixed(3)}
              <br />
              Y: {currentPos[1].toFixed(3)}
              <br />
              Z: {currentPos[2].toFixed(3)}
            </div>
          </div>

          {/* DISPLACEMENT */}

          <h3 className="font-bold text-sm mb-2 flex items-center gap-1">Displacement (in)</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-neutral-700">Current Total:</span>
              <div className="text-neutral-600 font-mono">{displacementMag.toFixed(3)}"</div>
            </div>
            <div>
              <span className="font-medium text-neutral-700 flex items-center gap-1">
                <TrendingUpIcon className="size-3" />
                Peak Total:
              </span>
              <div className="text-neutral-600 font-mono">{peakDisplacement.magnitude.toFixed(3)}"</div>
              <div className="text-neutral-500 text-[9px]">@ {peakDisplacement.time.toFixed(2)}s</div>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current X:</span>
              <span className="font-mono text-neutral-800">{currentDisp[0].toFixed(3)}"</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Peak X:</span>
              <span className="font-mono text-neutral-800">{peakDisplacement.x.toFixed(3)}"</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current Y:</span>
              <span className="font-mono text-neutral-800">{currentDisp[1].toFixed(3)}"</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Peak Y:</span>
              <span className="font-mono text-neutral-800">{peakDisplacement.y.toFixed(3)}"</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Current Z:</span>
              <span className="font-mono text-neutral-800">{currentDisp[2].toFixed(3)}"</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-neutral-600">Peak Z:</span>
              <span className="font-mono text-neutral-800">{peakDisplacement.z.toFixed(3)}"</span>
            </div>
          </div>

          {/* ROTATION */}
          <div className="border-t pt-2">
            <h3 className="font-bold text-sm mb-2">Rotation (rad)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-neutral-700">Current Total:</span>
                <div className="text-neutral-600 font-mono">{currentRotation.magnitude.toFixed(4)}</div>
              </div>
              <div>
                <span className="font-medium text-neutral-700">Peak Total:</span>
                <div className="text-neutral-600 font-mono">{peakRotation.magnitude.toFixed(4)}</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
              <div>
                <div className="text-neutral-600">Rx:</div>
                <div className="font-mono">{currentRotation.rx.toFixed(4)}</div>
                <div className="font-mono text-neutral-500">({peakRotation.rx.toFixed(4)})</div>
              </div>
              <div>
                <div className="text-neutral-600">Ry:</div>
                <div className="font-mono">{currentRotation.ry.toFixed(4)}</div>
                <div className="font-mono text-neutral-500">({peakRotation.ry.toFixed(4)})</div>
              </div>
              <div>
                <div className="text-neutral-600">Rz:</div>
                <div className="font-mono">{currentRotation.rz.toFixed(4)}</div>
                <div className="font-mono text-neutral-500">({peakRotation.rz.toFixed(4)})</div>
              </div>
            </div>
          </div>

          {/* VELOCITY */}
          {currentVelocity && (
            <div className="bg-green-50 p-2 rounded">
              <h3 className="font-bold text-sm mb-2">Velocity (in/s)</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium text-neutral-700">Current:</span>
                  <div className="text-neutral-600 font-mono">{currentVelocity.magnitude.toFixed(3)}</div>
                </div>
                {peakVelocity && (
                  <div>
                    <span className="font-medium text-neutral-700">Peak:</span>
                    <div className="text-neutral-600 font-mono">{peakVelocity.magnitude.toFixed(3)}</div>
                    <div className="text-neutral-500 text-[9px]">@ {peakVelocity.time.toFixed(2)}s</div>
                  </div>
                )}
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
                <div>
                  X: <span className="font-mono">{currentVelocity.x.toFixed(3)}</span>
                </div>
                <div>
                  Y: <span className="font-mono">{currentVelocity.y.toFixed(3)}</span>
                </div>
                <div>
                  Z: <span className="font-mono">{currentVelocity.z.toFixed(3)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ACCELERATION */}
          {currentAcceleration && (
            <div className="bg-red-50 p-2 rounded">
              <h3 className="font-bold text-sm mb-2">Acceleration (in/s²)</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium text-neutral-700">Current:</span>
                  <div className="text-neutral-600 font-mono">{currentAcceleration.magnitude.toFixed(3)}</div>
                </div>
                {peakAcceleration && (
                  <div>
                    <span className="font-medium text-neutral-700">Peak:</span>
                    <div className="text-neutral-600 font-mono">{peakAcceleration.magnitude.toFixed(3)}</div>
                    <div className="text-neutral-500 text-[9px]">@ {peakAcceleration.time.toFixed(2)}s</div>
                  </div>
                )}
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
                <div>
                  X: <span className="font-mono">{currentAcceleration.x.toFixed(3)}</span>
                </div>
                <div>
                  Y: <span className="font-mono">{currentAcceleration.y.toFixed(3)}</span>
                </div>
                <div>
                  Z: <span className="font-mono">{currentAcceleration.z.toFixed(3)}</span>
                </div>
              </div>
            </div>
          )}

          {/* STORY DRIFT */}
          {storyDrift && (
            <div className="bg-purple-50 p-2 rounded">
              <h3 className="font-bold text-sm mb-2">Story Drift Ratio (%)</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium text-neutral-700">Current:</span>
                  <div className="text-neutral-600 font-mono">{storyDrift.current.toFixed(4)}%</div>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">Peak:</span>
                  <div className="text-neutral-600 font-mono">{storyDrift.peak.toFixed(4)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* CUMULATIVE STATS */}
          <div className="border-t pt-2">
            <span className="font-medium text-neutral-700">Total Distance Traveled:</span>
            <div className="text-neutral-600 font-mono">{totalDistanceTraveled.toFixed(3)}"</div>
          </div>

          {/* RIBBONS */}
          <div className="border-t pt-2">
            <span className="font-medium text-neutral-700">Displacement Path (Top View):</span>
            <MiniRibbon path={ribbonPath} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function NodeTab(props: IDockviewPanelHeaderProps<{ nodeId: number }>) {
  const nodeId = props.params.nodeId;

  const handleClose = () => {
    props.api.close();
  };

  return (
    <div className="flex items-center justify-between bg-neutral-100/50 px-3 py-2 border-b border-neutral-200 cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-2 pointer-events-none">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="text-sm font-medium text-neutral-800">Node {nodeId}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleClose}
          className="p-1 hover:bg-red-100 rounded transition-colors text-neutral-600 hover:text-red-600">
          <XIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
