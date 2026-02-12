import { Html, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { formatHex, interpolate } from "culori";
import React, { useState, useMemo } from "react";
import { DoubleSide, Vector3 } from "three";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/resizable";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");

function PlaneShapes({
  displacementScale,
  anchorCorner,
  verticalSpacing,
}: {
  displacementScale: number;
  anchorCorner: boolean;
  verticalSpacing: number;
}) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const { stories, storyOrder, corners } = animationData.metadata;
  
  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.center[1];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];

  const maxDisplacement = animationData.precomputed.maxDisplacement;

  // Create corner sets for quick lookup
  const cornerSets = useMemo(() => ({
    NW: new Set(corners.NW),
    NE: new Set(corners.NE),
    SW: new Set(corners.SW),
    SE: new Set(corners.SE),
  }), [corners]);

  // Get building dimensions
  const buildingWidth = animationData.precomputed.boundingBox.max[0] - animationData.precomputed.boundingBox.min[0];
  const buildingDepth = animationData.precomputed.boundingBox.max[2] - animationData.precomputed.boundingBox.min[2];
  const buildingHeight = animationData.precomputed.boundingBox.max[1] - animationData.precomputed.boundingBox.min[1];

  const shiftX = animationData.precomputed.boundingBox.min[0] + offsetX;
  const shiftZ = animationData.precomputed.boundingBox.min[2] + offsetZ;

  return (
    <>
      {!anchorCorner && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[buildingWidth, buildingHeight, buildingDepth]} />
          <meshBasicMaterial color="gray" wireframe />
        </mesh>
      )}

      <group>
        {storyOrder.map((storyId) => {
          const nodeIndices = stories[storyId];
          const cornerNodes = nodeIndices.filter((idx) => 
            cornerSets.NW.has(idx) || cornerSets.NE.has(idx) || 
            cornerSets.SW.has(idx) || cornerSets.SE.has(idx)
          );

          if (cornerNodes.length !== 4) return null;

          const nodePositions = cornerNodes.map((nodeIdx) => {
            const initialPos = animationData.initialPositions.at(nodeIdx);
            const displacement = animationData.displacement.atFrame(frameIndex).at(nodeIdx);
            const corner = cornerSets.NW.has(nodeIdx) ? "NW" : 
                          cornerSets.NE.has(nodeIdx) ? "NE" : 
                          cornerSets.SW.has(nodeIdx) ? "SW" : "SE";

            const posX = initialPos[0] + displacement[0] * displacementScale + offsetX;
            const posY = initialPos[1] + displacement[1] + offsetY;
            const posZ = initialPos[2] + displacement[2] * displacementScale + offsetZ;

            return {
              pos: [posX, posY, posZ] as [number, number, number],
              disp: [displacement[0], displacement[1], displacement[2]] as [number, number, number],
              corner,
            };
          });

          const nwCorner = nodePositions.find((p) => p.corner === "NW")!;

          const repositionedNodePositions = anchorCorner
            ? nodePositions.map((p) => {
                const pos = p.pos;
                const disp = p.disp;
                return {
                  pos: [
                    pos[0] - nwCorner.pos[0] + shiftX,
                    pos[1] * verticalSpacing - nwCorner.pos[1],
                    pos[2] - nwCorner.pos[2] - shiftZ,
                  ] as [number, number, number],
                  disp,
                  corner: p.corner,
                };
              })
            : nodePositions;

          // Sort to ensure consistent ordering: NE, NW, SE, SW
          const sortedPositions = [...repositionedNodePositions].sort((a, b) => {
            const order = ["NE", "NW", "SE", "SW"];
            return order.indexOf(a.corner) - order.indexOf(b.corner);
          });

          const floorQuadPositions = new Float32Array([
            // Triangle 1
            ...sortedPositions[0].pos,
            ...sortedPositions[1].pos,
            ...sortedPositions[2].pos,
            // Triangle 2
            ...sortedPositions[0].pos,
            ...sortedPositions[2].pos,
            ...sortedPositions[3].pos,
          ]);

          // Calculate average displacement for this story
          let totalDx = 0, totalDy = 0, totalDz = 0;
          for (const nodeIdx of nodeIndices) {
            const disp = animationData.displacement.atFrame(frameIndex).at(nodeIdx);
            totalDx += disp[0];
            totalDy += disp[1];
            totalDz += disp[2];
          }
          const avgDisp = Math.hypot(totalDx / nodeIndices.length, totalDy / nodeIndices.length, totalDz / nodeIndices.length);
          const floorColor = formatHex(colorMap(avgDisp / maxDisplacement));

          return (
            <React.Fragment key={storyId}>
              <mesh>
                <bufferGeometry>
                  <bufferAttribute attach="attributes-position" args={[floorQuadPositions, 3]} />
                </bufferGeometry>
                <meshBasicMaterial color={floorColor} side={DoubleSide} fog={false} toneMapped={false} />
              </mesh>
              <Html
                position={new Vector3(...sortedPositions[3].pos).multiplyScalar(1.1)}
                center={false}
                transform
                scale={[50, 50, 1]}
                rotation={[-Math.PI / 2, 0, 0]}>
                <div className="text-center text-xs text-black select-none translate-x-1/2 -translate-y-1/2">
                  {storyId}
                </div>
              </Html>
            </React.Fragment>
          );
        })}
      </group>
    </>
  );
}

export function FloorPlanTorsion() {
  const { frameIndex } = usePlayback();
  const { animationData } = useAnimationData();

  const { stories, storyOrder } = animationData.metadata;

  const [displacementScale, setDisplacementScale] = useState(1);
  const [anchorCorner, setAnchorCorner] = useState(false);
  const [verticalSpacing, setVerticalSpacing] = useState(1.1);

  return (
    <div className="flex h-full min-h-0">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={5} maxSize={40} className="flex">
          <div className="w-full p-4 flex flex-col gap-4 overflow-y-auto skinny-scrollbar border-r-2 border-neutral-300">
            <div>
              <h2 className="text-xl font-bold">Floor Torsion</h2>
              <p className="text-sm text-neutral-600">
                Analyzes the top-down rotation and displacement of a single floor and its neighbors.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col">
                <span className="font-semibold">Displacement Scale ({displacementScale.toFixed(1)})</span>
                <input
                  type="range"
                  min="1.0"
                  max="200.0"
                  step="0.1"
                  value={displacementScale}
                  onChange={(e) => setDisplacementScale(parseFloat(e.target.value))}
                />
              </label>
              <label className="flex gap-4">
                <span className="font-semibold">Anchor Corner</span>
                <input type="checkbox" checked={anchorCorner} onChange={(e) => setAnchorCorner(e.target.checked)} />
              </label>
              {anchorCorner && (
                <label className="flex flex-col">
                  <span className="font-semibold">Vertical Spacing ({verticalSpacing.toFixed(1)})</span>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={verticalSpacing}
                    onChange={(e) => setVerticalSpacing(parseFloat(e.target.value))}
                  />
                </label>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold mt-4">Stories</h3>
              <div className="w-full text-xs text-neutral-600 flex flex-col p-2 gap-1">
                {storyOrder.map((storyId) => {
                  const nodeIndices = stories[storyId];
                  
                  let minPoint = [Number.MAX_VALUE, Number.MAX_VALUE];
                  let maxPoint = [Number.MIN_VALUE, Number.MIN_VALUE];

                  const locs: [number, number][] = nodeIndices.map((nodeIdx) => {
                    const initialPos = animationData.initialPositions.at(nodeIdx);
                    const displacement = animationData.displacement.atFrame(frameIndex).at(nodeIdx);

                    const posX = initialPos[0] + displacement[0] * displacementScale;
                    const posZ = initialPos[2] + displacement[2] * displacementScale;

                    minPoint[0] = Math.min(minPoint[0], posX);
                    minPoint[1] = Math.min(minPoint[1], posZ);
                    maxPoint[0] = Math.max(maxPoint[0], posX);
                    maxPoint[1] = Math.max(maxPoint[1], posZ);

                    return [posX, posZ];
                  });

                  // Simple convex hull approximation
                  const hull = locs.length > 0 ? locs : [[0, 0]];
                  const points = hull.map(([x, z]) => `${x},${z}`).join(" ");

                  const width = maxPoint[0] - minPoint[0];
                  const height = maxPoint[1] - minPoint[1];

                  // Calculate average displacement
                  let totalDx = 0, totalDy = 0, totalDz = 0;
                  for (const nodeIdx of nodeIndices) {
                    const disp = animationData.displacement.atFrame(frameIndex).at(nodeIdx);
                    totalDx += disp[0];
                    totalDy += disp[1];
                    totalDz += disp[2];
                  }
                  const avgDisp = Math.hypot(totalDx / nodeIndices.length, totalDy / nodeIndices.length, totalDz / nodeIndices.length);
                  const floorColor = colorMap(avgDisp / animationData.precomputed.maxDisplacement);

                  return (
                    <div key={storyId} className="flex items-center justify-between w-full h-24">
                      <div className="font-mono">{storyId}</div>
                      <svg viewBox={`${minPoint[0]} ${minPoint[1]} ${width} ${height}`} height="100%">
                        <polygon points={points} fill={formatHex(floorColor)} stroke="black" strokeWidth="0.1" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} className="min-h-0 flex h-full">
          <div className="relative w-full grid grid-cols-2 grid-rows-2">
            <div className="relative size-full border-r-2 border-b-2 border-neutral-300">
              <Canvas>
                <PlaneShapes
                  verticalSpacing={verticalSpacing}
                  anchorCorner={anchorCorner}
                  displacementScale={displacementScale}
                />
                <OrbitControls />
              </Canvas>
            </div>
            <div className="relative size-full border-b-2 border-neutral-300">
              <div className="absolute bottom-2 left-2 font-mono text-xl">XZ Plane</div>
              <Canvas>
                <OrthographicCamera makeDefault zoom={2} position={[0, 100, 0]} rotation={[Math.PI / 2, 0, 0]} />
                <PlaneShapes
                  verticalSpacing={verticalSpacing * 2}
                  anchorCorner={anchorCorner}
                  displacementScale={displacementScale}
                />
                <OrbitControls enablePan={false} enableRotate={false} />
              </Canvas>
            </div>
            <div className="relative size-full border-r-2 border-neutral-300">
              <div className="absolute top-2 right-2 font-mono text-xl">XY Plane</div>
              <Canvas>
                <OrthographicCamera makeDefault zoom={2} position={[0, 0, 100]} rotation={[0, 0, 0]} />
                <PlaneShapes
                  verticalSpacing={verticalSpacing * 2}
                  anchorCorner={anchorCorner}
                  displacementScale={displacementScale}
                />
                <OrbitControls enablePan={false} enableRotate={false} />
              </Canvas>
            </div>
            <div className="relative size-full">
              <div className="absolute top-2 left-2 font-mono text-xl">YZ Plane</div>
              <Canvas>
                <OrthographicCamera makeDefault zoom={2} position={[100, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
                <PlaneShapes
                  verticalSpacing={verticalSpacing * 2}
                  anchorCorner={anchorCorner}
                  displacementScale={displacementScale}
                />
                <OrbitControls enablePan={false} enableRotate={false} />
              </Canvas>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
