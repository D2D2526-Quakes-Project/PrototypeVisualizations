// import { usePlayback } from "@/features/playback/usePlayback";
// import { useColor, useExpandedScale, useThresholds } from "@/features/3d/contexts/visualization";
// import { useVisualDisplacement } from "@/features/3d/lib/visualDisplacement";
// import { getMetricConfig, isHingeMetric } from "@/lib/metrics";
// import { useAnimationData } from "@/features/animation-data/useAnimationData";
// import { UNIT_SCALE } from "@/lib/utils";

// import { Canvas, useFrame, useThree } from "@react-three/fiber";
// import { useEffect, useMemo, useRef } from "react";
// import * as THREE from "three";
// import { BoundingGeometryRenderer } from "./renderers/BoundingGeometryRenderer";
// import { HorizontalConnectionsRenderer } from "./renderers/HorizontalConnectionsRenderer";
// import { VerticalConnectionsRenderer } from "./renderers/VerticalConnectionsRenderer";

// const tempObject = new THREE.Object3D();
// const tempColor = new THREE.Color();

// interface CrossSectionVisualizationProps {
//   nodeIds: number[];
//   crossSectionType: "X" | "Y";
//   width: number;
// }

// function CrossSectionScene({ nodeIds, axis }: { nodeIds: number[]; axis: "x" | "y" }) {
//   const { invalidate } = useThree();
//   const { animationData } = useAnimationData();
//   const { frameIndex } = usePlayback();
//   const { getExpandedPosition } = useExpandedScale();
//   const { getNodeColor: getRawNodeColor, currentMetric } = useColor();
//   const { thresholds } = useThresholds();
//   const { displacement: visualDisplacement, getNodeColor: getVisualNodeColor } = useVisualDisplacement();
//   const nodeScale = useViewStore((s) => s.nodeScale);
//   const nodeOpacity = useViewStore((s) => s.nodeOpacity);
//   const belowThresholdNodeScale = useViewStore((s) => s.belowThresholdNodeScale);
//   const hingeNodeScale = useViewStore((s) => s.hingeNodeScale);
//   const renderVerticalConnections = useViewStore((s) => s.renderVerticalConnections);
//   const renderHorizontalConnections = useViewStore((s) => s.renderHorizontalConnections);
//   const connectionLineWidth = useViewStore((s) => s.connectionLineWidth);
//   const connectionLineOpacity = useViewStore((s) => s.connectionLineOpacity);
//   const renderHingeNodes = isHingeMetric(currentMetric);

//   useEffect(() => {
//     invalidate();
//   }, [nodeScale, frameIndex, nodeOpacity, belowThresholdNodeScale, hingeNodeScale, renderHingeNodes, invalidate]);

//   const offsets = useMemo(
//     () => ({
//       x: -animationData.precomputed.boundingBox.center[0],
//       y: -animationData.precomputed.boundingBox.center[1],
//       z: -animationData.precomputed.boundingBox.center[2],
//     }),
//     [animationData.precomputed.boundingBox]
//   );

//   const basePositions = useMemo(() => {
//     const positions = new Float32Array(nodeIds.length * 3);
//     for (let i = 0; i < nodeIds.length; i++) {
//       const nodeId = nodeIds[i];
//       const initialPos = animationData.initialPositions.at(nodeId);
//       positions[i * 3 + 0] = initialPos[0];
//       positions[i * 3 + 1] = initialPos[1];
//       positions[i * 3 + 2] = initialPos[2];
//     }
//     return positions;
//   }, [nodeIds, animationData.initialPositions]);

//   const hingeNodeGeometry = useMemo(() => {
//     if (!animationData.hingeData || !animationData.beamData) return null;
//     if (nodeIds.length === 0) return null;

//     const visibleNodeSet = new Set(nodeIds);
//     const visibleNodesWithHinges = [];
//     for (let i = 0; i < animationData.hingeData.count; i++) {
//       const row = animationData.hingeData.getRow(i);
//       const beamIndex = row.beamIndex;

//       const beam = animationData.beamData.getRow(beamIndex);
//       const iNode = beam.iNodeIndex;
//       const jNode = beam.jNodeIndex;

//       if (visibleNodeSet.has(iNode) && visibleNodeSet.has(jNode)) {
//         const iNodePosFloat = animationData.initialPositions.at(iNode);
//         const jNodePosFloat = animationData.initialPositions.at(jNode);

//         const iNodePos = [iNodePosFloat[0], iNodePosFloat[1], iNodePosFloat[2]];
//         const jNodePos = [jNodePosFloat[0], jNodePosFloat[1], jNodePosFloat[2]];

//         if (row.endMask & 0b01) {
//           visibleNodesWithHinges.push({ hingeIdx: i, endCap: 1, pos: iNodePos, otherPos: jNodePos });
//         }
//         if (row.endMask & 0b10) {
//           visibleNodesWithHinges.push({ hingeIdx: i, endCap: 2, pos: jNodePos, otherPos: iNodePos });
//         }
//       }
//     }

//     return {
//       count: visibleNodesWithHinges.length,
//       visibleNodesWithHinges,
//     };
//   }, [animationData.hingeData, animationData.beamData, nodeIds, animationData.initialPositions]);

//   const meshRef = useRef<THREE.InstancedMesh>(null);
//   const hingeNodesMeshRef = useRef<THREE.InstancedMesh>(null);

//   useFrame(() => {
//     if (!meshRef.current || nodeIds.length === 0) return;

//     const colorAttr = meshRef.current.geometry.attributes.color;
//     if (!colorAttr) return;

//     const currentFrame = frameIndex;

//     for (let i = 0; i < nodeIds.length; i++) {
//       const nodeId = nodeIds[i];

//       const initX = basePositions[i * 3 + 0];
//       const initY = basePositions[i * 3 + 1];
//       const initZ = basePositions[i * 3 + 2];
//       const displacement = visualDisplacement.atFrame(currentFrame).at(nodeId);
//       const expandedPosition = getExpandedPosition(
//         [initX, initY, initZ],
//         [displacement[0], displacement[1], displacement[2]],
//         [offsets.x, offsets.y, offsets.z],
//         animationData.metadata
//       );

//       tempObject.position.set(expandedPosition[0], expandedPosition[1], expandedPosition[2]);

//       const metricConfig = getMetricConfig(currentMetric);
//       const thresholdValue = thresholds[metricConfig.thresholdKey] ?? 0;
//       const maxValue = metricConfig.getPrecomputedMax(animationData);
//       const normalizedThreshold = maxValue > 0 ? thresholdValue / maxValue : 0;
//       const nodeValue = metricConfig.getValue(animationData, currentFrame, nodeId);
//       const normalizedValue = nodeValue !== undefined && maxValue > 0 ? Math.abs(nodeValue) / maxValue : 0;

//       const baseNodeScale = (1 / UNIT_SCALE) * nodeScale;
//       const passesThreshold = normalizedValue >= normalizedThreshold && thresholdValue > 0;
//       const effectiveScale = passesThreshold ? baseNodeScale : baseNodeScale * belowThresholdNodeScale;
//       const scale = effectiveScale;
//       tempObject.scale.set(scale, scale, scale);

//       tempObject.updateMatrix();
//       meshRef.current.setMatrixAt(i, tempObject.matrix);

//       const color = getVisualNodeColor(nodeId, currentFrame, getRawNodeColor);
//       tempColor.setRGB(color.r, color.g, color.b);
//       tempColor.toArray(colorAttr.array, i * 3);
//     }

//     meshRef.current.instanceMatrix.needsUpdate = true;
//     colorAttr.needsUpdate = true;
//   });

//   useFrame(() => {
//     if (!hingeNodesMeshRef.current) return;
//     if (!hingeNodeGeometry) return;

//     const { visibleNodesWithHinges } = hingeNodeGeometry;

//     const geometry = hingeNodesMeshRef.current.geometry;
//     const colorAttr = geometry.attributes.color;
//     if (!colorAttr) return;

//     for (let i = 0; i < visibleNodesWithHinges.length; i += 1) {
//       const { hingeIdx, endCap, pos, otherPos } = visibleNodesWithHinges[i];
//       const dx = otherPos[0] - pos[0];
//       const dy = otherPos[1] - pos[1];
//       const dz = otherPos[2] - pos[2];

//       const expandedPosition = getExpandedPosition(
//         [pos[0], pos[1], pos[2]],
//         [0, 0, 0],
//         [offsets.x, offsets.y, offsets.z],
//         animationData.metadata
//       );

//       const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
//       const nudge = Math.max(nodeScale / UNIT_SCALE, hingeNodeScale / UNIT_SCALE / 5);
//       const nudgedPos = [
//         expandedPosition[0] + (dx / dist) * nudge,
//         expandedPosition[1] + (dy / dist) * nudge,
//         expandedPosition[2] + (dz / dist) * nudge,
//       ];

//       tempObject.scale.set(hingeNodeScale, hingeNodeScale, hingeNodeScale);
//       tempObject.rotation.set(0, 0, Math.atan2(dy, dx) - Math.PI / 2);
//       tempObject.position.set(nudgedPos[0], nudgedPos[1], nudgedPos[2]);
//       tempObject.updateMatrix();
//       hingeNodesMeshRef.current.setMatrixAt(i, tempObject.matrix);

//       const color = getRawNodeColor(hingeIdx, endCap);
//       tempColor.setRGB(color.r, color.g, color.b);
//       tempColor.toArray(colorAttr.array, i * 3);
//     }
//     hingeNodesMeshRef.current.instanceMatrix.needsUpdate = true;
//     colorAttr.needsUpdate = true;
//   });

//   return (
//     <group scale={UNIT_SCALE}>
//       <group position={[offsets.x, offsets.y, offsets.z]}>
//         <BoundingGeometryRenderer axis={axis} opacity={0.15} />

//         {renderVerticalConnections && (
//           <VerticalConnectionsRenderer
//             nodeIds={nodeIds}
//             lineWidth={connectionLineWidth}
//             lineOpacity={connectionLineOpacity}
//           />
//         )}

//         {renderHorizontalConnections && (
//           <HorizontalConnectionsRenderer
//             nodeIds={nodeIds}
//             lineWidth={connectionLineWidth}
//             lineOpacity={connectionLineOpacity}
//           />
//         )}

//         <instancedMesh ref={meshRef} args={[undefined, undefined, nodeIds.length]} frustumCulled={false}>
//           <sphereGeometry args={[1, 4, 2]}>
//             <instancedBufferAttribute
//               attach="attributes-color"
//               args={[new Float32Array(nodeIds.length * 3).fill(1), 3]}
//               usage={THREE.DynamicDrawUsage}
//             />
//           </sphereGeometry>
//           <meshBasicMaterial fog={false} vertexColors transparent opacity={nodeOpacity} />
//         </instancedMesh>

//         {renderHingeNodes && hingeNodeGeometry && (
//           <instancedMesh
//             ref={hingeNodesMeshRef}
//             args={[undefined, undefined, hingeNodeGeometry.count]}
//             frustumCulled={false}>
//             <coneGeometry args={[16, 30, 4]}>
//               <instancedBufferAttribute
//                 attach="attributes-color"
//                 args={[new Float32Array(hingeNodeGeometry.count * 3).fill(1), 3]}
//                 usage={THREE.DynamicDrawUsage}
//               />
//             </coneGeometry>
//             <meshBasicMaterial fog={false} vertexColors transparent />
//           </instancedMesh>
//         )}
//       </group>
//     </group>
//   );
// }

// export function CrossSectionVisualization({ nodeIds, crossSectionType, width }: CrossSectionVisualizationProps) {
//   const { animationData } = useAnimationData();
//   const colorTheme = useViewStore((s) => s.colorTheme);
//   const boundingBox = useMemo(() => animationData.precomputed.boundingBox, [animationData.precomputed.boundingBox]);
//   const widthSpan = crossSectionType == "X" ? boundingBox.span[1] : boundingBox.span[0];
//   const aspect = boundingBox.span[2] / widthSpan;
//   const height = width * aspect;
//   return (
//     <div
//       style={{ width: width, height: height }}
//       className="overflow-hidden rounded border border-neutral-300 bg-neutral-900">
//       <Canvas
//         frameloop="demand"
//         orthographic
//         linear
//         flat
//         camera={{
//           zoom: 0.9,
//           position: crossSectionType == "X" ? [-100, 0, 0] : [0, -100, 0],
//           up: [0, 0, 1],
//           // near: -1000,
//           // far: 1000,
//           left: (-widthSpan / 2) * UNIT_SCALE,
//           right: (widthSpan / 2) * UNIT_SCALE,
//           top: (boundingBox.span[2] / 2) * UNIT_SCALE,
//           bottom: (-boundingBox.span[2] / 2) * UNIT_SCALE,
//         }}
//         onCreated={({ scene }) => {
//           scene.fog = null;
//         }}
//         gl={{ antialias: true, preserveDrawingBuffer: true }}
//         style={{ width: width, height: height }}>
//         <color attach="background" args={[colorTheme.background]} />
//         <ambientLight intensity={2} />
//         <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />
//         <CrossSectionScene nodeIds={nodeIds} axis={crossSectionType === "X" ? "x" : "y"} />
//       </Canvas>
//     </div>
//   );
// }
