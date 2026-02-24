import { Html, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { formatHex, interpolate } from "culori";
import React, { useState, useMemo } from "react";
import { DoubleSide, Vector3 } from "three";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/resizable";
import { FloorTorsionPlanPreview } from "@/features/view-3d/components/FloorTorsionPlanPreview";
import { buildFloorTorsionSnapshot } from "@/features/view-3d/lib/floorTorsion";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { useAnimationData } from "@/lib/useAnimationData";
import { SmallTimeline } from "@/features/playback/SmallTimeline";

const torsionColorScale = interpolate(["#2563eb", "#f8fafc", "#dc2626"], "oklab");

function formatSigned(value: number, digits = 5) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function PlaneShapes({
  displacementScale,
  anchorCorner,
  verticalSpacing,
  storyRotationById,
  rotationScaleAbsMax,
}: {
  displacementScale: number;
  anchorCorner: boolean;
  verticalSpacing: number;
  storyRotationById: ReadonlyMap<string, number>;
  rotationScaleAbsMax: number;
}) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const { stories, storyOrder, corners } = animationData.metadata;

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.center[1];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];

  // Create corner sets for quick lookup
  const cornerSets = useMemo(
    () => ({
      NW: new Set(corners.NW),
      NE: new Set(corners.NE),
      SW: new Set(corners.SW),
      SE: new Set(corners.SE),
    }),
    [corners],
  );

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
          const cornerNodes = nodeIndices.filter(
            (idx) =>
              cornerSets.NW.has(idx) || cornerSets.NE.has(idx) || cornerSets.SW.has(idx) || cornerSets.SE.has(idx),
          );

          if (cornerNodes.length !== 4) return null;

          const nodePositions = cornerNodes.map((nodeIdx) => {
            const initialPos = animationData.initialPositions.at(nodeIdx);
            const displacement = animationData.displacementLin.atFrame(frameIndex).at(nodeIdx);
            const corner = cornerSets.NW.has(nodeIdx)
              ? "NW"
              : cornerSets.NE.has(nodeIdx)
                ? "NE"
                : cornerSets.SW.has(nodeIdx)
                  ? "SW"
                  : "SE";

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

          const rotationRad = storyRotationById.get(storyId) ?? 0;
          const normalized = Math.max(-1, Math.min(1, rotationRad / Math.max(rotationScaleAbsMax, 1e-6)));
          const floorColor = formatHex(torsionColorScale((normalized + 1) / 2)) ?? "#f8fafc";

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

  const [displacementScale, setDisplacementScale] = useState(1);
  const [anchorCorner, setAnchorCorner] = useState(false);
  const [verticalSpacing, setVerticalSpacing] = useState(1.1);

  const torsionRows = useMemo(
    () =>
      animationData.metadata.storyOrder
        .map((storyId) => buildFloorTorsionSnapshot(animationData, storyId, frameIndex))
        .filter((row): row is NonNullable<typeof row> => row !== null),
    [animationData, frameIndex],
  );

  const maxAbsRotation = useMemo(() => {
    let maxAbs = 0;
    for (const row of torsionRows) {
      maxAbs = Math.max(maxAbs, Math.abs(row.rotationRad));
    }
    return Math.max(maxAbs, 1e-6);
  }, [torsionRows]);

  const storyRotationById = useMemo(() => new Map(torsionRows.map((row) => [row.storyId, row.rotationRad])), [torsionRows]);

  return (
    <div className="flex h-full min-h-0">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={5} maxSize={40} className="flex">
          <div className="w-full p-4 flex flex-col gap-4 overflow-y-auto skinny-scrollbar border-r-2 border-neutral-300">
            <div>
              <h2 className="text-xl font-bold">Floor Torsion</h2>
              <p className="text-sm text-neutral-600">
                Top-down floor rotation by story. Colors and previews show signed torsion rotation in radians (rad).
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col">
                <span className="font-semibold">Displacement Scale (visual) ({displacementScale.toFixed(1)}x)</span>
                <input
                  type="range"
                  min="1.0"
                  max="200.0"
                  step="0.1"
                  value={displacementScale}
                  onChange={(e) => setDisplacementScale(parseFloat(e.target.value))}
                />
              </label>
              <p className="text-xs text-neutral-500">
                Visual exaggeration only. Torsion coloring uses computed plan rotation (`rad`), not displacement magnitude.
              </p>
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

            <div className="h-8 shrink-0">
              <SmallTimeline />
            </div>

            <div>
              <h3 className="text-lg font-bold mt-2">Torsion Color Scale</h3>
              <div className="mt-2 rounded border border-neutral-200 bg-neutral-50 p-2">
                <div className="flex items-center justify-between text-[10px] text-neutral-600 mb-1">
                  <span>Rotation (rad)</span>
                  <span>Frame {frameIndex}</span>
                </div>
                <div
                  className="h-2 rounded border border-neutral-200"
                  style={{ background: "linear-gradient(90deg, #2563eb 0%, #f8fafc 50%, #dc2626 100%)" }}
                  title={`Torsion rotation color scale from -${maxAbsRotation.toFixed(6)} rad to +${maxAbsRotation.toFixed(6)} rad`}
                />
                <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span>{(-maxAbsRotation).toFixed(6)}</span>
                  <span>0.000000</span>
                  <span>{maxAbsRotation.toFixed(6)}</span>
                </div>
                <div className="mt-1 text-[10px] text-neutral-500">
                  Previews include X/Y plan axes. 3D panes are labeled by viewing plane.
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mt-4">Stories</h3>
              <div className="w-full text-xs text-neutral-600 flex flex-col p-2 gap-2">
                {torsionRows.toReversed().map((row) => {
                  const normalized = Math.max(-1, Math.min(1, row.rotationRad / maxAbsRotation));
                  const fill = formatHex(torsionColorScale((normalized + 1) / 2)) ?? "#f8fafc";
                  const tooltip = `Story ${row.storyId}\nRotation: ${row.rotationRad.toFixed(6)} rad\nNodes: ${row.nodeCount}`;

                  return (
                    <div key={row.storyId} className="rounded border border-neutral-200 bg-white p-2" title={tooltip}>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] text-neutral-500">Story</div>
                          <div className="font-mono text-xs text-neutral-800 truncate">{row.storyId}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] shrink-0">
                          <span className="text-neutral-500">Rotation (rad)</span>
                          <span className="font-mono text-right text-neutral-800">{formatSigned(row.rotationRad, 6)}</span>
                          <span className="text-neutral-500">|Rotation|</span>
                          <span className="font-mono text-right text-neutral-700">{Math.abs(row.rotationRad).toFixed(6)}</span>
                        </div>
                      </div>
                      <div className="h-28 rounded border border-neutral-100 bg-neutral-50">
                        <FloorTorsionPlanPreview snapshot={row} fill={fill} className="h-full w-full" />
                      </div>
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
              <div className="absolute top-2 left-2 font-mono text-xl z-10">Perspective</div>
              <Canvas>
                <PlaneShapes
                  verticalSpacing={verticalSpacing}
                  anchorCorner={anchorCorner}
                  displacementScale={displacementScale}
                  storyRotationById={storyRotationById}
                  rotationScaleAbsMax={maxAbsRotation}
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
                  storyRotationById={storyRotationById}
                  rotationScaleAbsMax={maxAbsRotation}
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
                  storyRotationById={storyRotationById}
                  rotationScaleAbsMax={maxAbsRotation}
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
                  storyRotationById={storyRotationById}
                  rotationScaleAbsMax={maxAbsRotation}
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
