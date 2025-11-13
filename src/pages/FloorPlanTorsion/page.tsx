import { Html, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { formatHex, interpolate } from "culori";
import React, { useState } from "react";
import { DoubleSide, Vector3 } from "three";
import { PlaybackControls, usePlaybackControl } from "../../components/PlaybackControls";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../../components/resizable";
import { SmallTimeline } from "../../components/SmallTimeline";
import { useAnimationData } from "../../hooks/nodeDataHook";
import { polygonHull } from "../../lib/utils";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");

function PlaneShapes({ frameIndex, displacementScale, anchorCorner, verticalSpacing }: { frameIndex: number; displacementScale: number; anchorCorner: boolean; verticalSpacing: number }) {
  const animationData = useAnimationData();
  const frame = animationData.frames[frameIndex];

  const initalPositions = animationData.frames[0].nodePositions;

  const offsetX = (animationData.maxInitialPos[0] + animationData.minInitialPos[0]) / -2;
  const offsetY = (animationData.maxInitialPos[1] + animationData.minInitialPos[1]) / -2;
  const offsetZ = (animationData.maxInitialPos[2] + animationData.minInitialPos[2]) / -2;

  // minin + offset / 2
  const shiftX = animationData.minInitialPos[0] + offsetX;
  const shiftZ = animationData.minInitialPos[2] + offsetZ;

  const maxDisplacement = animationData.maxDisplacement;

  const buildingWidth = animationData.maxInitialPos[0] - animationData.minInitialPos[0];
  const buildingDepth = animationData.maxInitialPos[2] - animationData.minInitialPos[2];
  const buildingHeight = animationData.maxInitialPos[1] - animationData.minInitialPos[1];

  return (
    <>
      {!anchorCorner && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[buildingWidth, buildingHeight, buildingDepth]} />
          <meshBasicMaterial color="gray" wireframe />
        </mesh>
      )}

      <group>
        {Array.from(frame.stories.entries()).map(([storyId, story]) => {
          const nodePositions = story.nodeIds.map((nodeId) => {
            const initalPos = initalPositions.get(nodeId)!;
            const position = frame.nodePositions.get(nodeId)!;
            const corner = animationData.nodes.get(nodeId)!.corner;

            const displacementX = position[0] - initalPos[0];
            const displacementY = position[1] - initalPos[1];
            const displacementZ = position[2] - initalPos[2];

            let posX = initalPos[0] + displacementX * displacementScale + offsetX;
            let posY = initalPos[1] + displacementY * displacementScale + offsetY;
            let posZ = initalPos[2] + displacementZ * displacementScale + offsetZ;

            const finalPosX = posX;
            const finalPosY = posY;
            const finalPosZ = posZ;
            return { pos: [finalPosX, finalPosY, finalPosZ], disp: [displacementX, displacementY, displacementZ], corner };
          });

          const nwCorner = nodePositions.find((p) => p.corner === "NW")!;

          const repositionedNodePositions = anchorCorner
            ? nodePositions.map((p) => {
                const pos = p.pos;
                const disp = p.disp;
                return { pos: [pos[0] - nwCorner.pos[0] + shiftX, pos[1] * verticalSpacing - nwCorner.pos[1], pos[2] - nwCorner.pos[2] - shiftZ], disp };
              })
            : nodePositions;

          const floorQuadPositions = new Float32Array([
            // Triangle 1
            ...repositionedNodePositions[1].pos,
            ...repositionedNodePositions[0].pos,
            ...repositionedNodePositions[2].pos,
            // Triangle 2
            ...repositionedNodePositions[1].pos,
            ...repositionedNodePositions[2].pos,
            ...repositionedNodePositions[3].pos,
          ]);

          const avgDisp = Math.hypot(...story.averageDisplacement);
          const floorColor = formatHex(colorMap(avgDisp / maxDisplacement));

          return (
            <React.Fragment key={storyId}>
              <mesh>
                <bufferGeometry>
                  <bufferAttribute attach="attributes-position" args={[floorQuadPositions, 3]} />
                </bufferGeometry>
                <meshBasicMaterial color={floorColor} side={DoubleSide} fog={false} toneMapped={false} />
              </mesh>
              <Html position={new Vector3(...repositionedNodePositions[3].pos).multiplyScalar(1.1)} center={false} transform scale={[50, 50, 1]} rotation={[-Math.PI / 2, 0, 0]}>
                <div className="text-center text-xs text-black select-none translate-x-1/2 -translate-y-1/2">{storyId}</div>
              </Html>
            </React.Fragment>
          );
        })}
      </group>
    </>
  );
}

export function FloorPlanTorsion() {
  const animationData = useAnimationData();
  const playback = usePlaybackControl();

  const stories = animationData.frames[0].stories;

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
              <p className="text-sm text-neutral-600">Analyzes the top-down rotation and displacement of a single floor and its neighbors.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col">
                <span className="font-semibold">Displacement Scale ({displacementScale.toFixed(1)})</span>
                <input type="range" min="1.0" max="200.0" step="0.1" value={displacementScale} onChange={(e) => setDisplacementScale(parseFloat(e.target.value))} />
              </label>
              <label className="flex gap-4">
                <span className="font-semibold">Anchor Corner</span>
                <input type="checkbox" checked={anchorCorner} onChange={(e) => setAnchorCorner(e.target.checked)} />
              </label>
              {anchorCorner && (
                <label className="flex flex-col">
                  <span className="font-semibold">Vertical Spacing ({verticalSpacing.toFixed(1)})</span>
                  <input type="range" min="1.0" max="5.0" step="0.1" value={verticalSpacing} onChange={(e) => setVerticalSpacing(parseFloat(e.target.value))} />
                </label>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold mt-4">Stories</h3>
              <div className="w-full text-xs text-neutral-600 flex flex-col p-2 gap-1">
                {[...stories.entries()].map(([storyId, data]) => {
                  let minPoint = [Number.MAX_VALUE, Number.MAX_VALUE];
                  let maxPoint = [Number.MIN_VALUE, Number.MIN_VALUE];

                  const locs = data.nodeIds.map((nodeId) => {
                    const initalPos = animationData.frames[0].nodePositions.get(nodeId)!;
                    const position = animationData.frames[playback.frameIndex].nodePositions.get(nodeId)!;

                    const displacementX = position[0] - initalPos[0];
                    const displacementZ = position[2] - initalPos[2];

                    let posX = initalPos[0] + displacementX * displacementScale;
                    let posZ = initalPos[2] + displacementZ * displacementScale;

                    minPoint[0] = Math.min(minPoint[0], posX);
                    minPoint[1] = Math.min(minPoint[1], posZ);
                    maxPoint[0] = Math.max(maxPoint[0], posX);
                    maxPoint[1] = Math.max(maxPoint[1], posZ);

                    return [posX, posZ];
                  });
                  const hull = polygonHull(locs);
                  const points = hull.map(([x, z]) => `${x},${z}`).join(" ");

                  const width = maxPoint[0] - minPoint[0];
                  const height = maxPoint[1] - minPoint[1];

                  const avgDisp = Math.hypot(...animationData.frames[playback.frameIndex].stories.get(storyId)!.averageDisplacement);
                  const floorColor = colorMap(avgDisp / animationData.maxDisplacement);

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
              <Canvas camera={{ position: [100, 100, 100], fov: 50 }}>
                <PlaneShapes verticalSpacing={verticalSpacing} anchorCorner={anchorCorner} displacementScale={displacementScale} frameIndex={playback.frameIndex} />
                <OrbitControls />
              </Canvas>
            </div>
            <div className="relative size-full border-b-2 border-neutral-300">
              <div className="absolute bottom-2 left-2 font-mono text-xl">XZ Plane</div>
              <Canvas>
                <OrthographicCamera makeDefault zoom={2} position={[0, 100, 0]} rotation={[Math.PI / 2, 0, 0]} />
                <PlaneShapes verticalSpacing={verticalSpacing * 2} anchorCorner={anchorCorner} displacementScale={displacementScale} frameIndex={playback.frameIndex} />
                <OrbitControls enablePan={false} enableRotate={false} />
              </Canvas>
            </div>
            <div className="relative size-full border-r-2 border-neutral-300">
              <div className="absolute top-2 right-2 font-mono text-xl">XY Plane</div>
              <Canvas>
                <OrthographicCamera makeDefault zoom={2} position={[0, 0, 100]} rotation={[0, 0, 0]} />
                <PlaneShapes verticalSpacing={verticalSpacing * 2} anchorCorner={anchorCorner} displacementScale={displacementScale} frameIndex={playback.frameIndex} />
                <OrbitControls enablePan={false} enableRotate={false} />
              </Canvas>
            </div>
            <div className="relative size-full">
              <div className="absolute top-2 left-2 font-mono text-xl">YZ Plane</div>
              <Canvas>
                <OrthographicCamera makeDefault zoom={2} position={[100, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
                <PlaneShapes verticalSpacing={verticalSpacing * 2} anchorCorner={anchorCorner} displacementScale={displacementScale} frameIndex={playback.frameIndex} />
                <OrbitControls enablePan={false} enableRotate={false} />
              </Canvas>
            </div>

            <div className="absolute bottom-2 inset-x-2 bg-white/80 backdrop-blur-sm rounded p-2 flex items-center gap-4 h-16">
              <PlaybackControls playback={playback} />
              <SmallTimeline frameIndex={playback.frameIndex} onFrameChange={playback.setFrameIndex} />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
