import { Line, Sphere } from "@react-three/drei";
import { CanvasWithControls } from "@/components/CanvasWithControls";
import { converter, formatHex, interpolate } from "culori";
import React, { useEffect, useState, useRef } from "react";
import { Color, Vector3 } from "three";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { SmallTimeline } from "@/components/SmallTimeline";

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

function MotionRibbons({
  ribbonData,
  visibleStories,
  frameIndex,
  xzScale,
  viewMode,
}: {
  ribbonData: Map<string, Ribbon> | null;
  visibleStories: Record<string, boolean>;
  frameIndex: number;
  xzScale: number;
  viewMode: ViewMode;
}) {
  if (!ribbonData) return null;

  return (
    <>
      {Array.from(ribbonData.entries()).map(([id, { path, colors, position }]) => {
        if (viewMode === "storyCenters" && !visibleStories[id]) {
          return null;
        }

        return (
          <React.Fragment key={id}>
            <group scale={[xzScale, viewMode === "storyCenters" ? 1 : xzScale, xzScale]} position={position}>
              <Line points={path} vertexColors={colors} lineWidth={2} fog={false} toneMapped={false} />
              <Sphere args={[0.5 / xzScale]} position={path[frameIndex]}>
                <meshBasicMaterial
                  color={formatHex({
                    r: colors[frameIndex].r,
                    g: colors[frameIndex].g,
                    b: colors[frameIndex].b,
                    mode: "rgb",
                  })}
                  fog={false}
                  toneMapped={false}
                />
              </Sphere>
            </group>
          </React.Fragment>
        );
      })}
      <axesHelper args={[75]} />
    </>
  );
}

function MiniRibbon({ ribbon, storyId, frameIndex }: { ribbon: Ribbon; storyId: string; frameIndex: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState(0.6);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      setAspectRatio(entry.contentRect.height / entry.contentRect.width);
    });

    resizeObserver.observe(containerRef.current);

    const rect = containerRef.current.getBoundingClientRect();
    setAspectRatio(rect.height / rect.width);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const viewBoxHeight = aspectRatio * 100;

  // Calculate bounds for top-down projection (XZ plane)
  const xCoords = ribbon.path.map((p) => p.x);
  const zCoords = ribbon.path.map((p) => p.z);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minZ = Math.min(...zCoords);
  const maxZ = Math.max(...zCoords);

  const xRange = maxX - minX || 1;
  const zRange = maxZ - minZ || 1;

  // Add small padding
  const padding = 0.1;
  const xMin = minX - xRange * padding;
  const xMax = maxX + xRange * padding;
  const zMin = minZ - zRange * padding;
  const zMax = maxZ + zRange * padding;
  const xRangePadded = xMax - xMin;
  const zRangePadded = zMax - zMin;

  // Normalize to SVG coordinates
  const normalizeX = (x: number) => ((x - xMin) / xRangePadded) * 100;
  const normalizeZ = (z: number) => ((z - zMin) / zRangePadded) * viewBoxHeight;

  return (
    <div ref={containerRef} className="w-full h-20 mb-3">
      <div className="text-sm font-medium mb-1">{storyId}</div>
      <svg className="w-full h-full border border-neutral-200 rounded" viewBox={`0 0 100 ${viewBoxHeight}`}>
        {/* Draw ribbon segments with velocity colors */}
        {ribbon.path.slice(1).map((point, i) => {
          const prevPoint = ribbon.path[i];
          const x1 = normalizeX(prevPoint.x);
          const z1 = normalizeZ(prevPoint.z);
          const x2 = normalizeX(point.x);
          const z2 = normalizeZ(point.z);

          const color = ribbon.colors[i + 1];

          return (
            <line
              key={i}
              x1={x1}
              y1={z1}
              x2={x2}
              y2={z2}
              stroke={`rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`}
              strokeWidth="0.8"
            />
          );
        })}

        {/* Current position circle */}
        {frameIndex < ribbon.path.length && (
          <circle
            cx={normalizeX(ribbon.path[frameIndex].x)}
            cy={normalizeZ(ribbon.path[frameIndex].z)}
            r="2"
            className="fill-amber-500 stroke-white"
            strokeWidth="0.5"
          />
        )}
      </svg>
    </div>
  );
}

export function ViewTemporalRibbons() {
  const { animationData } = useAnimationData();
  const [computedRibbons, setComputedRibbons] = useState<ComputedRibbonData | null>(null);

  const { stories, storyOrder } = animationData.metadata;
  const frameCount = animationData.metadata.frameCount;
  const dt = animationData.metadata.dt;
  const nodeCount = animationData.metadata.nodeCount;

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.min[1];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];

  const [visibleStories, setVisibleStories] = useState<Record<string, boolean>>(() =>
    storyOrder.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
  );
  const [viewMode, setViewMode] = useState<ViewMode>("storyCenters");
  const [xzScale, setXzScale] = useState(1);

  /**
   * Frame playback and animation controls
   */
  const { frameIndex } = usePlayback();

  // Effect to perform the heavy computation when animationData is ready
  useEffect(() => {
    if (frameCount === 0) return;

    // Use a timeout to allow the UI to update and show the loading spinner
    // before the main thread is blocked by the heavy computation.
    setTimeout(() => {
      const computeDataForMode = (mode: ViewMode): Map<string, Ribbon> => {
        const paths = new Map<string, Vector3[]>();
        let maxVelocity = 0;

        if (mode === "storyCenters") {
          for (const storyId of storyOrder) paths.set(storyId, []);
          
          for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
            for (const storyId of storyOrder) {
              const nodeIndices = stories[storyId];
              const center = new Vector3(0, 0, 0);
              
              for (const nodeIdx of nodeIndices) {
                const initialPos = animationData.initialPositions.at(nodeIdx);
                const displacement = animationData.displacementLin.atFrame(frameIdx).at(nodeIdx);
                center.add(new Vector3(
                  initialPos[0] + displacement[0] + offsetX,
                  initialPos[1] + displacement[1] + offsetY,
                  initialPos[2] + displacement[2] + offsetZ
                ));
              }
              center.divideScalar(nodeIndices.length);
              paths.get(storyId)?.push(center);
            }
          }
        } else {
          // "allNodes"
          for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
            paths.set(String(nodeIdx), []);
          }

          for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
            for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
              const displacement = animationData.displacementLin.atFrame(frameIdx).at(nodeIdx);
              paths.get(String(nodeIdx))?.push(new Vector3(
                displacement[0],
                displacement[1],
                displacement[2]
              ));
            }
          }
        }

        // Calculate max velocity
        for (const path of paths.values()) {
          for (let i = 1; i < path.length; i++) {
            const dist = path[i].distanceTo(path[i - 1]);
            const timeDelta = dt;
            const velocity = timeDelta > 0 ? dist / timeDelta : 0;
            if (velocity > maxVelocity) maxVelocity = velocity;
          }
        }
        const safeMaxVelocity = maxVelocity > 0 ? maxVelocity : 1;

        // Calculate colors and finalize data
        const finalRibbonData = new Map<string, Ribbon>();
        for (const [id, path] of paths.entries()) {
          const colors = path.map((_, i) => {
            if (i === 0) return new Color("#5e8bff");
            const dist = path[i].distanceTo(path[i - 1]);
            const timeDelta = dt;
            const velocity = timeDelta > 0 ? dist / timeDelta : 0;
            const rgb = rgbConverter(velocityColorMap(velocity / safeMaxVelocity));
            return new Color(rgb.r, rgb.g, rgb.b);
          });
          
          let position: [number, number, number] = [0, 0, 0];
          if (mode === "allNodes") {
            const nodeIdx = parseInt(id);
            const initialPosition = animationData.initialPositions.at(nodeIdx);
            position = [initialPosition[0] + offsetX, initialPosition[1] + offsetY, initialPosition[2] + offsetZ];
          }
          
          finalRibbonData.set(id, { path, colors, position });
        }
        return finalRibbonData;
      };

      const storyCentersData = computeDataForMode("storyCenters");
      const allNodesData = computeDataForMode("allNodes");

      setComputedRibbons({ storyCenters: storyCentersData, allNodes: allNodesData });
    }, 0);
  }, [animationData, storyOrder, stories, frameCount, dt, nodeCount, offsetX, offsetY, offsetZ]);

  const handleToggleStory = (storyId: string) => {
    setVisibleStories((prev) => ({ ...prev, [storyId]: !prev[storyId] }));
  };

  const handleToggleAllStories = (visible: boolean) => {
    const newState = { ...visibleStories };
    storyOrder.forEach((id) => {
      newState[id] = visible;
    });
    setVisibleStories(newState);
  };

  const currentRibbonData = computedRibbons ? computedRibbons[viewMode] : null;

  return (
    <div className="flex h-full min-h-0">
      <div className="w-64 p-4 flex flex-col gap-4 overflow-y-auto border-r-2 border-neutral-300">
        <div>
          <h2 className="text-xl font-bold">Temporal Ribbons</h2>
          <p className="text-sm text-neutral-600">Traces motion over time. Color indicates velocity.</p>
        </div>

        <div className="mb-4 p-3 bg-neutral-50 rounded border border-neutral-200">
          <h4 className="text-sm font-medium mb-2">Velocity Scale</h4>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "blue" }}></div>
            <span className="text-xs">Start</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "aquamarine" }}></div>
            <span className="text-xs">Slow</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "lime" }}></div>
            <span className="text-xs">Medium</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "red" }}></div>
            <span className="text-xs">Fast</span>
          </div>
        </div>

        <div>
          <h3 className="font-bold">View Mode</h3>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="w-full p-2 border border-neutral-300 rounded bg-white mt-1">
            <option value="storyCenters">Story Centers</option>
            <option value="allNodes">All Nodes</option>
          </select>
        </div>

        <div>
          <h3 className="font-bold">XZ Scale: {xzScale.toFixed(1)}x</h3>
          <input
            type="range"
            min="1"
            max="30"
            step="0.1"
            value={xzScale}
            onChange={(e) => setXzScale(parseFloat(e.target.value))}
            className="w-full mt-1"
          />
        </div>

        {viewMode === "storyCenters" && (
          <div>
            <h3 className="font-bold">Visible Floors</h3>
            <div className="flex flex-col mt-2">
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-2 p-1 hover:bg-neutral-100 cursor-pointer"
                  onClick={() => handleToggleAllStories(false)}>
                  All off
                </button>
                <button
                  className="flex items-center gap-2 p-1 hover:bg-neutral-100 cursor-pointer"
                  onClick={() => handleToggleAllStories(true)}>
                  All on
                </button>
              </div>
              {storyOrder.map((id) => (
                <label key={id} className="flex items-center gap-2 p-1 hover:bg-neutral-100 rounded">
                  <input type="checkbox" checked={visibleStories[id] ?? true} onChange={() => handleToggleStory(id)} />
                  {id}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grow min-w-0 relative flex flex-col">
        <div className="h-8 shrink-0">
          <SmallTimeline />
        </div>
        <div className="grow">
        <CanvasWithControls>
          {
            <MotionRibbons
              ribbonData={currentRibbonData}
              visibleStories={visibleStories}
              frameIndex={frameIndex}
              xzScale={xzScale}
              viewMode={viewMode}
            />
          }
        </CanvasWithControls>
        </div>
      </div>

      {/* Right sidebar with mini ribbons */}
      {viewMode === "storyCenters" && computedRibbons && (
        <div className="w-64 p-4 border-l-2 border-neutral-300 overflow-y-auto">
          <h3 className="font-bold mb-4">Floor Ribbons</h3>

          <div className="flex flex-col">
            {storyOrder.map((storyId) => {
              const ribbon = computedRibbons.storyCenters.get(storyId);
              if (!ribbon) return null;

              return <MiniRibbon key={storyId} ribbon={ribbon} storyId={storyId} frameIndex={frameIndex} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
