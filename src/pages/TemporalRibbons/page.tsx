import { Line, OrbitControls, Sphere } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { converter, interpolate } from "culori";
import React, { useEffect, useMemo, useState } from "react";
import { Color, Vector3 } from "three";
import { PlaybackControls, usePlaybackControl } from "../../components/PlaybackControls";
import { useAnimationData } from "../../hooks/nodeDataHook";
import { SmallTimeline } from "../../components/SmallTimeline";

const velocityColorMap = interpolate(["blue", "aquamarine", "lime", "red"], "oklab");
const rgbConverter = converter("rgb");

type Ribbon = {
  path: Vector3[];
  colors: Color[];
  position: [number, number, number];
};

type ViewMode = "storyCenters" | "allNodes";

type ComputedRibbonData = {
  storyCenters: Map<string, Ribbon>;
  allNodes: Map<string, Ribbon>;
};

function MotionRibbons({ ribbonData, visibleStories, frameIndex, xzScale, viewMode }: { ribbonData: Map<string, Ribbon> | null; visibleStories: Record<string, boolean>; frameIndex: number; xzScale: number; viewMode: ViewMode }) {
  if (!ribbonData) return null;

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[100, 100, 50]} intensity={2} />
      {Array.from(ribbonData.entries()).map(([id, { path, colors, position }]) => {
        if (viewMode === "storyCenters" && !visibleStories[id]) {
          return null;
        }

        return (
          <React.Fragment key={id}>
            <group scale={[xzScale, xzScale, xzScale]} position={position}>
              <Line points={path} vertexColors={colors} lineWidth={1} />
              <Sphere args={[0.5 / xzScale]} position={path[frameIndex]}>
                <meshStandardMaterial color={colors[frameIndex]} />
              </Sphere>
            </group>
          </React.Fragment>
        );
      })}
      <OrbitControls />
      <axesHelper args={[75]} />
    </>
  );
}

export function ViewTemporalRibbons() {
  const animationData = useAnimationData();
  const [computedRibbons, setComputedRibbons] = useState<ComputedRibbonData | null>(null);

  const storyIds = useMemo(
    () =>
      Array.from(animationData.nodes.values())
        .map((n) => n.story)
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort((a, b) => parseInt(b.replace("S", "")) - parseInt(a.replace("S", ""))),
    [animationData.nodes]
  );

  const [visibleStories, setVisibleStories] = useState<Record<string, boolean>>(() => storyIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}));
  const [viewMode, setViewMode] = useState<ViewMode>("storyCenters");
  const [xzScale, setXzScale] = useState(1);

  /**
   * Frame playback and animation controls
   */
  const playback = usePlaybackControl();

  // Effect to perform the heavy computation when animationData is ready
  useEffect(() => {
    if (!animationData.frames.length) return;

    // Use a timeout to allow the UI to update and show the loading spinner
    // before the main thread is blocked by the heavy computation.
    setTimeout(() => {
      const offsetX = (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
      const offsetY = -animationData.minInitialPos[1];
      const offsetZ = (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;

      const computeDataForMode = (mode: ViewMode): Map<string, Ribbon> => {
        const paths = new Map<string, Vector3[]>();
        let maxVelocity = 0;

        if (mode === "storyCenters") {
          for (const storyId of storyIds) paths.set(storyId, []);
          for (const frame of animationData.frames) {
            for (const [storyId, storyData] of frame.stories.entries()) {
              const center = new Vector3(0, 0, 0);
              storyData.nodeIds.forEach((nodeId) => {
                const pos = frame.nodePositions.get(nodeId)!;
                center.add(new Vector3(pos[0] + offsetX, pos[1] + offsetY, pos[2] + offsetZ));
              });
              center.divideScalar(storyData.nodeIds.length);
              paths.get(storyId)?.push(center);
            }
          }
        } else {
          // "allNodes"
          const nodeIds = Array.from(animationData.nodes.keys());
          for (const nodeId of nodeIds) paths.set(nodeId, []);

          for (const frame of animationData.frames) {
            for (const [nodeId, pos] of frame.nodePositions.entries()) {
              const initalPos = animationData.nodes.get(nodeId)!.initial_pos;
              paths.get(nodeId)?.push(new Vector3(pos[0] - initalPos[0], pos[1] - initalPos[1], pos[2] - initalPos[2]));
            }
          }
        }

        // --- Calculate max velocity ---
        for (const path of paths.values()) {
          for (let i = 1; i < path.length; i++) {
            const dist = path[i].distanceTo(path[i - 1]);
            const timeDelta = animationData.timeSteps[i] - animationData.timeSteps[i - 1];
            const velocity = timeDelta > 0 ? dist / timeDelta : 0;
            if (velocity > maxVelocity) maxVelocity = velocity;
          }
        }
        const safeMaxVelocity = maxVelocity > 0 ? maxVelocity : 1;

        // --- Calculate colors and finalize data ---
        const finalRibbonData = new Map<string, Ribbon>();
        for (const [id, path] of paths.entries()) {
          const colors = path.map((_, i) => {
            if (i === 0) return new Color("#5e8bff");
            const dist = path[i].distanceTo(path[i - 1]);
            const timeDelta = animationData.timeSteps[i] - animationData.timeSteps[i - 1];
            const velocity = timeDelta > 0 ? dist / timeDelta : 0;
            const rgb = rgbConverter(velocityColorMap(velocity / safeMaxVelocity));
            return new Color(rgb.r, rgb.g, rgb.b);
          });
          let position: [number, number, number] = [0, 0, 0];
          if (mode === "allNodes") {
            const initial_pos = animationData.nodes.get(id)!.initial_pos;
            position = [initial_pos[0] + offsetX, initial_pos[1] + offsetY, initial_pos[2] + offsetZ];
          }
          finalRibbonData.set(id, { path, colors, position });
        }
        return finalRibbonData;
      };

      const storyCentersData = computeDataForMode("storyCenters");
      const allNodesData = computeDataForMode("allNodes");

      setComputedRibbons({ storyCenters: storyCentersData, allNodes: allNodesData });
    }, 0);
  }, [animationData, storyIds]);

  const handleToggleStory = (storyId: string) => {
    setVisibleStories((prev) => ({ ...prev, [storyId]: !prev[storyId] }));
  };

  const currentRibbonData = computedRibbons ? computedRibbons[viewMode] : null;

  return (
    <div className="flex h-full min-h-0">
      <div className="w-64 p-4 flex flex-col gap-4 overflow-y-auto border-r-2 border-neutral-300">
        <div>
          <h2 className="text-xl font-bold">Temporal Ribbons</h2>
          <p className="text-sm text-neutral-600">Traces motion over time. Color indicates velocity.</p>
        </div>

        <div>
          <h3 className="font-bold">View Mode</h3>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)} className="w-full p-2 border border-neutral-300 rounded bg-white mt-1">
            <option value="storyCenters">Story Centers</option>
            <option value="allNodes">All Nodes</option>
          </select>
        </div>

        <div>
          <h3 className="font-bold">XZ Scale: {xzScale.toFixed(1)}x</h3>
          <input type="range" min="1" max="30" step="0.1" value={xzScale} onChange={(e) => setXzScale(parseFloat(e.target.value))} className="w-full mt-1" />
        </div>

        {viewMode === "storyCenters" && (
          <div>
            <h3 className="font-bold">Visible Floors</h3>
            <div className="flex flex-col mt-2">
              {storyIds.map((id) => (
                <label key={id} className="flex items-center gap-2 p-1 hover:bg-neutral-100 rounded">
                  <input type="checkbox" checked={visibleStories[id] ?? true} onChange={() => handleToggleStory(id)} />
                  {id}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grow min-w-0 relative">
        <Canvas camera={{ position: [80, 80, 80], fov: 50 }}>{<MotionRibbons ribbonData={currentRibbonData} visibleStories={visibleStories} frameIndex={playback.frameIndex} xzScale={xzScale} viewMode={viewMode} />}</Canvas>
        <div className="absolute bottom-2 inset-x-2 bg-white/80 backdrop-blur-sm rounded p-2 flex items-center gap-4 h-16">
          <PlaybackControls playback={playback} />
          <SmallTimeline animationData={animationData} frameIndex={playback.frameIndex} onFrameChange={playback.setFrameIndex} />
        </div>
      </div>
    </div>
  );
}
