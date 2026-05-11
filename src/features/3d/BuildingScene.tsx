// import { FloorTickMarks } from "@/features/3d/components/FloorTickMarks";
// import {
//   XCrossSectionSlabsRenderer,
//   YCrossSectionSlabsRenderer,
// } from "@/features/3d/components/renderers/CrossSectionSlabsRenderer";
// import { FloorSlabsRenderer } from "@/features/3d/components/renderers/FloorSlabsRenderer";
// import { HorizontalConnectionsRenderer } from "@/features/3d/components/renderers/HorizontalConnectionsRenderer";
// import { VerticalConnectionsRenderer } from "@/features/3d/components/renderers/VerticalConnectionsRenderer";
// import { useCamera } from "@/features/3d/contexts/CameraContext";
// import { useNodeSelection } from "@/features/3d/contexts/NodeSelectionContext";

// import { useNodeInteractionMode, useSlabInteractionMode } from "@/features/3d/lib/interactionPolicy";
// import { useVisualDisplacement } from "@/features/3d/lib/visualDisplacement";
// import { getMetricConfig, isHingeMetric } from "@/lib/metrics";
import { UNIT_SCALE } from "@/lib/utils";
import { useGlobalStore } from "@/state";
// import { Point, PointMaterial, Points, Text } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
// import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useAnimationData } from "../animation-data/useAnimationData";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();
const SCENE_LABEL_FONT = "/Atkinson_Hyperlegible_Next/AtkinsonHyperlegibleNext-VariableFont_wght.ttf";
const SCENE_LABEL_CHARACTERS = "+-XYNESW";

function clampToViewport(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function BuildingScene({ panelId }: { panelId: string }) {
  const { animationData } = useAnimationData();
  // const { frameIndex } = usePlayback();
  // const { selectedNodes, selectNode } = useNodeSelection();
  // const { getNodeColor: getRawNodeColor, currentMetric } = useColor();
  // const { thresholds } = useThresholds();
  // const { getVisibleNodes } = useViewMode();
  // const { getExpandedPosition } = useExpandedScale();
  // const { displacement: visualDisplacement, getNodeColor: getVisualNodeColor } = useVisualDisplacement();
  // const { sliceEnabled, xRange, yRange, zRange } = useCamera();
  // const { setHovered: setHoveredCrossSection, deselectCrossSection } = useCrossSectionSelection();
  // const { camera } = useThree();
  // const { setEnablePan } = useCamera();
  // const { visibleFloors } = useFloorVisibility();
  // const selectedNodeIds = useViewStore((s) => s.selectedNodeIds);
  // const hiddenNodeIds = useViewStore((s) => s.hiddenNodeIds);
  // const startBoxSelection = useViewStore((s) => s.startBoxSelection);
  // const updateBoxSelection = useViewStore((s) => s.updateBoxSelection);
  // const endBoxSelection = useViewStore((s) => s.endBoxSelection);
  // const setSelectedNodes = useViewStore((s) => s.setSelectedNodes);
  // const addSelectedNodes = useViewStore((s) => s.addSelectedNodes);
  // const hoveredNodeId = useViewStore((s) => s.hoveredNodeId);
  // const setHoveredNodeId = useViewStore((s) => s.setHoveredNodeId);
  // const renderNodes = useViewStore((s) => s.renderNodes);
  // const renderHingeNodes = isHingeMetric(currentMetric);
  // const renderFloorSlabs = useViewStore((s) => s.renderFloorSlabs);
  // const renderXCrossSectionSlabs = useViewStore((s) => s.renderXCrossSectionSlabs);
  // const renderYCrossSectionSlabs = useViewStore((s) => s.renderYCrossSectionSlabs);
  // const showCornersOnly = useViewStore((s) => s.showCornersOnly);
  // const renderVerticalConnections = useViewStore((s) => s.renderVerticalConnections);
  // const renderHorizontalConnections = useViewStore((s) => s.renderHorizontalConnections);
  // const nodeInteractionEnabled = useNodeInteractionMode();
  // const slabInteractionEnabled = useSlabInteractionMode();
  // const nodeScale = useViewStore((s) => s.nodeScale);
  // const nodeOpacity = useViewStore((s) => s.nodeOpacity);
  // const floorOpacity = useViewStore((s) => s.floorOpacity);
  // const belowThresholdNodeScale = useViewStore((s) => s.belowThresholdNodeScale);
  // const hingeNodeScale = useViewStore((s) => s.hingeNodeScale);
  // const belowThresholdHingeScale = useViewStore((s) => s.belowThresholdHingeScale);
  // const connectionLineWidth = useViewStore((s) => s.connectionLineWidth);
  // const connectionLineOpacity = useViewStore((s) => s.connectionLineOpacity);
  const colorTheme = useGlobalStore((s) => s.colorTheme);
  // const selectedNodeIdSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  // const hiddenNodeIdSet = useMemo(() => new Set(hiddenNodeIds), [hiddenNodeIds]);

  // useEffect(() => {
  //   if (!nodeInteractionEnabled) {
  //     setHoveredNodeId(null);
  //     endBoxSelection(panelId);
  //   }
  // }, [nodeInteractionEnabled, setHoveredNodeId, endBoxSelection, panelId]);

  // useEffect(() => {
  //   if (!slabInteractionEnabled) {
  //     setHoveredCrossSection(null);
  //     deselectCrossSection();
  //   }
  // }, [slabInteractionEnabled, setHoveredCrossSection, deselectCrossSection]);

  // const offsets = useMemo(
  //   () => ({
  //     x: -animationData.precomputed.boundingBox.center[0],
  //     y: -animationData.precomputed.boundingBox.center[1],
  //     z: -animationData.precomputed.boundingBox.min[2],
  //   }),
  //   [animationData.precomputed.boundingBox]
  // );

  // const nodeCount = animationData.metadata.nodeCount;

  // // Get visible nodes based on view mode and slice
  // const visibleNodesBasedOnMode = useMemo(() => {
  //   return getVisibleNodes(
  //     nodeCount,
  //     animationData.metadata,
  //     animationData.initialPositions,
  //     xRange,
  //     yRange,
  //     zRange,
  //     sliceEnabled
  //   );
  // }, [
  //   getVisibleNodes,
  //   nodeCount,
  //   animationData.metadata,
  //   animationData.initialPositions,
  //   sliceEnabled,
  //   xRange,
  //   yRange,
  //   zRange,
  // ]);

  // // Filter by floor visibility
  // const visibleNodes = useMemo(() => {
  //   return visibleNodesBasedOnMode.filter((nodeId) => {
  //     if (hiddenNodeIdSet.has(nodeId)) {
  //       return false;
  //     }
  //     // Check which floor this node belongs to
  //     for (const storyId of visibleFloors) {
  //       const storyNodes = animationData.metadata.stories[storyId];
  //       if (storyNodes && storyNodes.includes(nodeId)) {
  //         return true;
  //       }
  //     }
  //     // If node doesn't belong to any visible floor, hide it
  //     // But for nodes not in any story (like corner nodes), show them
  //     return false;
  //   });
  // }, [visibleNodesBasedOnMode, visibleFloors, animationData.metadata.stories, hiddenNodeIdSet]);
  // const visibleStoriesKey = useMemo(() => Array.from(visibleFloors).join("|"), [visibleFloors]);

  // const hingeNodeGeometry = useMemo(() => {
  //   if (!animationData.hingeData || !animationData.beamData) return null;
  //   if (visibleNodes.length === 0) return null;

  //   const visibleNodeSet = new Set(visibleNodes);
  //   const visibleNodesWithHinges = [];
  //   for (let i = 0; i < animationData.hingeData.count; i++) {
  //     const row = animationData.hingeData.getRow(i);
  //     const beamIndex = row.beamIndex;

  //     const beam = animationData.beamData.getRow(beamIndex);
  //     const iNode = beam.iNodeIndex;
  //     const jNode = beam.jNodeIndex;

  //     if (visibleNodeSet.has(iNode) && visibleNodeSet.has(jNode)) {
  //       const iNodePosFloat = animationData.initialPositions.at(iNode);
  //       const jNodePosFloat = animationData.initialPositions.at(jNode);

  //       const iNodePos = [iNodePosFloat[0], iNodePosFloat[1], iNodePosFloat[2]];
  //       const jNodePos = [jNodePosFloat[0], jNodePosFloat[1], jNodePosFloat[2]];

  //       if (row.endMask & 0b01) {
  //         visibleNodesWithHinges.push({ hingeIdx: i, endCap: 1, pos: iNodePos, otherPos: jNodePos });
  //       }
  //       if (row.endMask & 0b10) {
  //         visibleNodesWithHinges.push({ hingeIdx: i, endCap: 2, pos: jNodePos, otherPos: iNodePos });
  //       }
  //     }
  //   }

  //   return {
  //     count: visibleNodesWithHinges.length,
  //     visibleNodesWithHinges,
  //   };
  // }, [animationData.hingeData, animationData.beamData, visibleNodes, animationData.initialPositions]);

  // const interactiveSceneKey = useMemo(
  //   () =>
  //     `${renderNodes}:${renderFloorSlabs}:${renderXCrossSectionSlabs}:${renderYCrossSectionSlabs}:${showCornersOnly}:${visibleStoriesKey}:${visibleNodes.length}:${renderHingeNodes}:${hingeNodeGeometry ? hingeNodeGeometry.count : ""}`,
  //   [
  //     renderNodes,
  //     renderFloorSlabs,
  //     renderXCrossSectionSlabs,
  //     renderYCrossSectionSlabs,
  //     showCornersOnly,
  //     visibleStoriesKey,
  //     visibleNodes.length,
  //     renderHingeNodes,
  //     hingeNodeGeometry,
  //   ]
  // );

  // // Keyboard handler for ctrl/cmd to control pan and enable box select mode
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if ((e.ctrlKey || e.metaKey) && nodeInteractionEnabled) {
  //       setEnablePan(false);
  //     }
  //   };
  //   const handleKeyUp = (e: KeyboardEvent) => {
  //     if (!e.ctrlKey && !e.metaKey) {
  //       setEnablePan(true);
  //     }
  //   };
  //   window.addEventListener("keydown", handleKeyDown);
  //   window.addEventListener("keyup", handleKeyUp);
  //   return () => {
  //     window.removeEventListener("keydown", handleKeyDown);
  //     window.removeEventListener("keyup", handleKeyUp);
  //   };
  // }, [setEnablePan, nodeInteractionEnabled]);
  // // Ref to track mouse state for box selection
  // const isMouseDownRef = useRef(false);
  // const shiftHeldRef = useRef(false);

  // // Component to attach mouse handlers to the canvas element
  // function BoxSelectionHandler() {
  //   const { gl } = useThree();
  //   const currentBoxSelection = useViewStore((s) => s.boxSelection);
  //   const boxSelectionRef = useRef(currentBoxSelection);
  //   const panelIdRef = useRef(panelId);
  //   const cameraRef = useRef(camera);
  //   const startBoxSelectionRef = useRef(startBoxSelection);
  //   const updateBoxSelectionRef = useRef(updateBoxSelection);
  //   const endBoxSelectionRef = useRef(endBoxSelection);
  //   const setSelectedNodesRef = useRef(setSelectedNodes);
  //   const addSelectedNodesRef = useRef(addSelectedNodes);
  //   const nodeInteractionEnabledRef = useRef(nodeInteractionEnabled);
  //   const visibleNodesRef = useRef(visibleNodes);
  //   const dragRectRef = useRef<DOMRect | null>(null);
  //   const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
  //   const updateRafRef = useRef<number | null>(null);

  //   boxSelectionRef.current = currentBoxSelection;
  //   panelIdRef.current = panelId;
  //   cameraRef.current = camera;
  //   startBoxSelectionRef.current = startBoxSelection;
  //   updateBoxSelectionRef.current = updateBoxSelection;
  //   endBoxSelectionRef.current = endBoxSelection;
  //   setSelectedNodesRef.current = setSelectedNodes;
  //   addSelectedNodesRef.current = addSelectedNodes;
  //   nodeInteractionEnabledRef.current = nodeInteractionEnabled;
  //   visibleNodesRef.current = visibleNodes;

  //   useEffect(() => {
  //     const domElement = gl.domElement;

  //     const clearPendingUpdate = () => {
  //       pendingPointRef.current = null;
  //       if (updateRafRef.current !== null) {
  //         cancelAnimationFrame(updateRafRef.current);
  //         updateRafRef.current = null;
  //       }
  //     };

  //     const toNormalizedPoint = (e: MouseEvent, rect: DOMRect) => ({
  //       x: clampToViewport((e.clientX - rect.left) / rect.width),
  //       y: clampToViewport((e.clientY - rect.top) / rect.height),
  //     });

  //     const flushPendingUpdate = () => {
  //       updateRafRef.current = null;
  //       const pendingPoint = pendingPointRef.current;
  //       if (!pendingPoint) return;
  //       pendingPointRef.current = null;
  //       updateBoxSelectionRef.current(pendingPoint, panelIdRef.current);
  //     };

  //     const scheduleBoxUpdate = (point: { x: number; y: number }) => {
  //       pendingPointRef.current = point;
  //       if (updateRafRef.current !== null) return;
  //       updateRafRef.current = requestAnimationFrame(flushPendingUpdate);
  //     };

  //     const endDrag = (commitSelection: boolean) => {
  //       if (!isMouseDownRef.current) return;

  //       clearPendingUpdate();

  //       if (commitSelection && boxSelectionRef.current) {
  //         const selected = performBoxSelection(
  //           cameraRef.current,
  //           nodesMeshRef,
  //           boxSelectionRef.current,
  //           visibleNodesRef.current
  //         );
  //         if (shiftHeldRef.current) {
  //           addSelectedNodesRef.current(selected);
  //         } else {
  //           setSelectedNodesRef.current(selected);
  //         }
  //       }

  //       endBoxSelectionRef.current(panelIdRef.current);
  //       isMouseDownRef.current = false;
  //       shiftHeldRef.current = false;
  //       dragRectRef.current = null;
  //     };

  //     const handleMouseDown = (e: MouseEvent) => {
  //       if (!nodeInteractionEnabledRef.current) return;
  //       if (!(e.ctrlKey || e.metaKey) || e.button !== 0) return;

  //       const rect = domElement.getBoundingClientRect();
  //       if (rect.width <= 0 || rect.height <= 0) return;

  //       dragRectRef.current = rect;
  //       shiftHeldRef.current = e.shiftKey;
  //       isMouseDownRef.current = true;
  //       startBoxSelectionRef.current(toNormalizedPoint(e, rect), panelIdRef.current);
  //     };

  //     const handleMouseMove = (e: MouseEvent) => {
  //       if (!isMouseDownRef.current) return;

  //       if (!(e.ctrlKey || e.metaKey)) {
  //         endDrag(false);
  //         return;
  //       }

  //       const rect = dragRectRef.current ?? domElement.getBoundingClientRect();
  //       if (rect.width <= 0 || rect.height <= 0) return;

  //       scheduleBoxUpdate(toNormalizedPoint(e, rect));
  //     };

  //     const handleMouseUp = () => {
  //       endDrag(nodeInteractionEnabledRef.current);
  //     };

  //     const handleKeyUp = (e: KeyboardEvent) => {
  //       if (!isMouseDownRef.current) return;
  //       if (e.key === "Control" || e.key === "Meta") {
  //         endDrag(false);
  //       }
  //     };

  //     const handleWindowBlur = () => {
  //       endDrag(false);
  //     };

  //     const handleVisibilityChange = () => {
  //       if (document.visibilityState === "hidden") {
  //         endDrag(false);
  //       }
  //     };

  //     domElement.addEventListener("mousedown", handleMouseDown);
  //     window.addEventListener("mousemove", handleMouseMove);
  //     window.addEventListener("mouseup", handleMouseUp);
  //     window.addEventListener("keyup", handleKeyUp);
  //     window.addEventListener("blur", handleWindowBlur);
  //     document.addEventListener("visibilitychange", handleVisibilityChange);

  //     return () => {
  //       clearPendingUpdate();
  //       domElement.removeEventListener("mousedown", handleMouseDown);
  //       window.removeEventListener("mousemove", handleMouseMove);
  //       window.removeEventListener("mouseup", handleMouseUp);
  //       window.removeEventListener("keyup", handleKeyUp);
  //       window.removeEventListener("blur", handleWindowBlur);
  //       document.removeEventListener("visibilitychange", handleVisibilityChange);
  //     };
  //   }, [gl]);

  //   return null;
  // }

  // // Keyboard handler to clear selection with Escape
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.key === "Escape") {
  //       setSelectedNodes([]);
  //     }
  //   };
  //   window.addEventListener("keydown", handleKeyDown);
  //   return () => window.removeEventListener("keydown", handleKeyDown);
  // }, [setSelectedNodes]);

  // const pointerDownNodeId = useRef<number | undefined>(undefined);

  // useEffect(() => {
  //   pointerDownNodeId.current = undefined;
  //   if (hoveredNodeId !== null && !visibleNodes.includes(hoveredNodeId)) {
  //     setHoveredNodeId(null);
  //   }
  // }, [visibleNodes, hoveredNodeId, setHoveredNodeId]);

  // const basePositions = useMemo(() => {
  //   const positions = new Float32Array(visibleNodes.length * 3);
  //   for (let i = 0; i < visibleNodes.length; i++) {
  //     const nodeId = visibleNodes[i];
  //     const initialPos = animationData.initialPositions.at(nodeId);
  //     positions[i * 3 + 0] = initialPos[0];
  //     positions[i * 3 + 1] = initialPos[1];
  //     positions[i * 3 + 2] = initialPos[2];
  //   }
  //   return positions;
  // }, [visibleNodes, animationData.initialPositions]);

  // const frameIndexRef = useRef(frameIndex);
  // frameIndexRef.current = frameIndex;

  // const handleNodeClick = useCallback(
  //   (event: { instanceId?: number; stopPropagation: () => void }) => {
  //     if (!nodeInteractionEnabled) return;
  //     if (event.instanceId === undefined) return;

  //     // Only trigger click if we're releasing over the same node that was clicked down on
  //     if (event.instanceId !== pointerDownNodeId.current) return;

  //     // Map instance index to actual node ID
  //     const nodeId = visibleNodes[event.instanceId];
  //     if (nodeId === undefined) return;

  //     selectNode(nodeId);
  //   },
  //   [selectNode, visibleNodes, nodeInteractionEnabled]
  // );

  // const handlePointerDown = useCallback(
  //   (event: { instanceId?: number; stopPropagation: () => void }) => {
  //     if (!nodeInteractionEnabled) return;
  //     event.stopPropagation();
  //     pointerDownNodeId.current = event.instanceId;
  //   },
  //   [nodeInteractionEnabled]
  // );

  // const handlePointerMove = useCallback(
  //   (event: ThreeEvent<PointerEvent>) => {
  //     if (!nodeInteractionEnabled) return;
  //     event.stopPropagation();
  //     if (event.instanceId === undefined) {
  //       setHoveredNodeId(null);
  //       return;
  //     }
  //     const nodeId = visibleNodes[event.instanceId];
  //     setHoveredNodeId(nodeId ?? null, { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY });
  //   },
  //   [nodeInteractionEnabled, setHoveredNodeId, visibleNodes]
  // );

  // const handlePointerOut = useCallback(
  //   (event: { stopPropagation: () => void }) => {
  //     event.stopPropagation();
  //     setHoveredNodeId(null);
  //   },
  //   [setHoveredNodeId]
  // );

  // const nodesMeshRef = useRef<THREE.InstancedMesh>(null);
  // const hingeNodesMeshRef = useRef<THREE.InstancedMesh>(null);

  // // Build a Set of instance indices that are box-selected (for O(1) lookup)
  // const boxSelectedIndices = useMemo(() => {
  //   const indices = new Set<number>();
  //   for (let i = 0; i < visibleNodes.length; i++) {
  //     if (selectedNodeIdSet.has(visibleNodes[i])) {
  //       indices.add(i);
  //     }
  //   }
  //   return indices;
  // }, [visibleNodes, selectedNodeIdSet]);

  // useFrame(() => {
  //   if (!nodesMeshRef.current || visibleNodes.length === 0) return;

  //   const colorAttr = nodesMeshRef.current.geometry.attributes.color;
  //   if (!colorAttr) return;

  //   const currentFrame = frameIndexRef.current;

  //   for (let i = 0; i < visibleNodes.length; i++) {
  //     const nodeId = visibleNodes[i];

  //     // Compute displaced position directly
  //     const initX = basePositions[i * 3 + 0];
  //     const initY = basePositions[i * 3 + 1];
  //     const initZ = basePositions[i * 3 + 2];
  //     const displacement = visualDisplacement.atFrame(currentFrame).at(nodeId);
  //     const expandedPosition = getExpandedPosition(
  //       [initX, initY, initZ],
  //       [displacement[0], displacement[1], displacement[2]],
  //       [offsets.x, offsets.y, offsets.z],
  //       animationData.metadata
  //     );

  //     tempObject.position.set(expandedPosition[0], expandedPosition[1], expandedPosition[2]);

  //     const metricConfig = getMetricConfig(currentMetric);
  //     const thresholdValue = thresholds[metricConfig.thresholdKey] ?? 0;
  //     const maxValue = metricConfig.getPrecomputedMax(animationData);
  //     const normalizedThreshold = maxValue > 0 ? thresholdValue / maxValue : 0;
  //     const nodeValue = metricConfig.getValue(animationData, currentFrame, nodeId);
  //     const normalizedValue = nodeValue !== undefined && maxValue > 0 ? Math.abs(nodeValue) / maxValue : 0;

  //     const baseNodeScale = (1 / UNIT_SCALE) * nodeScale;
  //     const passesThreshold = normalizedValue >= normalizedThreshold && thresholdValue > 0;
  //     const effectiveScale = passesThreshold ? baseNodeScale : baseNodeScale * belowThresholdNodeScale;
  //     const scale = hoveredNodeId === nodeId ? effectiveScale * 1.35 : effectiveScale;
  //     tempObject.scale.set(scale, scale, scale);

  //     tempObject.updateMatrix();
  //     nodesMeshRef.current.setMatrixAt(i, tempObject.matrix);

  //     if (hoveredNodeId === nodeId || boxSelectedIndices.has(i)) {
  //       tempColor.setRGB(2 / 255, 140 / 255, 180 / 255);
  //     } else {
  //       const color = getVisualNodeColor(nodeId, currentFrame, getRawNodeColor);
  //       tempColor.setRGB(color.r, color.g, color.b);
  //     }

  //     tempColor.toArray(colorAttr.array, i * 3);
  //   }

  //   nodesMeshRef.current.instanceMatrix.needsUpdate = true;
  //   colorAttr.needsUpdate = true;
  // });

  // useFrame(() => {
  //   if (!hingeNodesMeshRef.current) return;
  //   if (!hingeNodeGeometry) return;

  //   const { visibleNodesWithHinges } = hingeNodeGeometry;

  //   const geometry = hingeNodesMeshRef.current.geometry;
  //   const colorAttr = geometry.attributes.color;
  //   if (!colorAttr) return;

  //   for (let i = 0; i < visibleNodesWithHinges.length; i += 1) {
  //     const { hingeIdx, endCap, pos, otherPos } = visibleNodesWithHinges[i];
  //     const dx = otherPos[0] - pos[0];
  //     const dy = otherPos[1] - pos[1];
  //     const dz = otherPos[2] - pos[2];

  //     const expandedPosition = getExpandedPosition(
  //       [pos[0], pos[1], pos[2]],
  //       [0, 0, 0],
  //       [offsets.x, offsets.y, offsets.z],
  //       animationData.metadata
  //     );

  //     const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  //     const nudge = Math.max(nodeScale / UNIT_SCALE, hingeNodeScale / UNIT_SCALE / 5);
  //     const nudgedPos = [
  //       expandedPosition[0] + (dx / dist) * nudge,
  //       expandedPosition[1] + (dy / dist) * nudge,
  //       expandedPosition[2] + (dz / dist) * nudge,
  //     ];

  //     // tempObject.scale.set(hingeNodeScale, hingeNodeScale, hingeNodeScale);
  //     const metricConfig = getMetricConfig(currentMetric);
  //     const thresholdValue = thresholds[metricConfig.thresholdKey] ?? 0;
  //     const nodeValue = metricConfig.getValue(animationData, endCap, hingeIdx);
  //     const maxValue = metricConfig.getPrecomputedMax(animationData);
  //     const normalizedThreshold = maxValue > 0 ? thresholdValue / maxValue : 0;
  //     const normalizedValue = nodeValue !== undefined && maxValue > 0 ? Math.abs(nodeValue) / maxValue : 0;

  //     const baseHingeNodeScale = hingeNodeScale;
  //     const passesThreshold = normalizedValue >= normalizedThreshold && thresholdValue > 0;
  //     const effectiveScale = passesThreshold ? baseHingeNodeScale : baseHingeNodeScale * belowThresholdHingeScale;
  //     tempObject.scale.set(effectiveScale, effectiveScale, effectiveScale);

  //     tempObject.rotation.set(0, 0, Math.atan2(dy, dx) - Math.PI / 2);
  //     tempObject.position.set(nudgedPos[0], nudgedPos[1], nudgedPos[2]);
  //     tempObject.updateMatrix();
  //     hingeNodesMeshRef.current.setMatrixAt(i, tempObject.matrix);

  //     const color = getRawNodeColor(hingeIdx, endCap);
  //     tempColor.setRGB(color.r, color.g, color.b);
  //     tempColor.toArray(colorAttr.array, i * 3);
  //   }
  //   hingeNodesMeshRef.current.instanceMatrix.needsUpdate = true;
  //   colorAttr.needsUpdate = true;
  // });

  // // Get positions and colors for all selected nodes
  // const selectedNodesData = useMemo(() => {
  //   return selectedNodes.map((nodeId) => {
  //     const pos = animationData.initialPositions.at(nodeId);
  //     const displacement = visualDisplacement.atFrame(frameIndex).at(nodeId);
  //     const expandedPosition = getExpandedPosition(
  //       [pos[0], pos[1], pos[2]],
  //       [displacement[0], displacement[1], displacement[2]],
  //       [offsets.x, offsets.y, offsets.z],
  //       animationData.metadata
  //     );
  //     return {
  //       nodeId,
  //       position: expandedPosition,
  //       color: getNodePanelColor(nodeId), // Use unique color for selection
  //     };
  //   });
  // }, [selectedNodes, frameIndex, animationData, getExpandedPosition, offsets, visualDisplacement]);

  return (
    <>
      {/* <BoxSelectionHandler /> */}
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />

      <group scale={UNIT_SCALE}>
        {/* <group position={[offsets.x, offsets.y, offsets.z]}> */}
        {/* Render based on visibility toggles */}
        {/* {renderFloorSlabs && (
            <FloorSlabsRenderer
              key={`floors-${interactiveSceneKey}`}
              nodeIds={visibleNodes}
              cornersOnly={showCornersOnly}
              floorOpacity={floorOpacity}
            />
          )} */}

        {/* {renderXCrossSectionSlabs && (
            <XCrossSectionSlabsRenderer
              key={`xsection-${interactiveSceneKey}`}
              nodeIds={visibleNodes}
              cornersOnly={showCornersOnly}
            />
          )} */}

        {/* {renderYCrossSectionSlabs && (
            <YCrossSectionSlabsRenderer
              key={`ysection-${interactiveSceneKey}`}
              nodeIds={visibleNodes}
              cornersOnly={showCornersOnly}
            />
          )} */}

        {/* {renderVerticalConnections && (
            <VerticalConnectionsRenderer
              key={`vertical-${interactiveSceneKey}`}
              nodeIds={visibleNodes}
              lineWidth={connectionLineWidth}
              lineOpacity={connectionLineOpacity}
            />
          )} */}

        {/* {renderHorizontalConnections && (
            <HorizontalConnectionsRenderer
              key={`horizontal-${interactiveSceneKey}`}
              nodeIds={visibleNodes}
              lineWidth={connectionLineWidth}
              lineOpacity={connectionLineOpacity}
            />
          )} */}

        {/* {renderNodes && (
            <instancedMesh
              key={`nodes-${interactiveSceneKey}`}
              ref={nodesMeshRef}
              onPointerDown={handlePointerDown}
              onPointerMove={(e) => handlePointerMove(e)}
              onPointerOut={(e) => handlePointerOut(e)}
              onClick={(e) => (e.stopPropagation(), handleNodeClick(e))}
              args={[undefined, undefined, visibleNodes.length]}
              frustumCulled={false}>
              <sphereGeometry args={[1, 4, 2]}>
                <instancedBufferAttribute
                  attach="attributes-color"
                  args={[new Float32Array(visibleNodes.length * 3).fill(1), 3]}
                  usage={THREE.DynamicDrawUsage}
                />
              </sphereGeometry>
              <meshBasicMaterial fog={false} vertexColors transparent opacity={nodeOpacity} />
            </instancedMesh>
          )} */}

        {/* {renderHingeNodes && hingeNodeGeometry && (
            <instancedMesh
              key={`hinge-nodes-${interactiveSceneKey}`}
              ref={hingeNodesMeshRef}
              args={[undefined, undefined, hingeNodeGeometry.count]}
              frustumCulled={false}>
              <coneGeometry args={[16, 30, 4]}>
                <instancedBufferAttribute
                  attach="attributes-color"
                  args={[new Float32Array(hingeNodeGeometry.count * 3).fill(1), 3]}
                  usage={THREE.DynamicDrawUsage}
                />
              </coneGeometry>
              <meshBasicMaterial fog={false} vertexColors transparent />
            </instancedMesh>
          )} */}

        {/* {selectedNodesData.map(({ nodeId, position, color }) => (
            <mesh key={`selected-${nodeId}`} position={position}>
              <torusGeometry args={[30, 5, 8, 32]} />
              <meshBasicMaterial color={color} transparent opacity={0.8} />
            </mesh>
          ))} */}

        {/* <Points frustumCulled={false}>
            <PointMaterial
              transparent
              vertexColors
              size={8}
              sizeAttenuation={true}
              depthTest={true}
              depthWrite={true}
              opacity={1}
            />
            {selectedNodesData.map(({ nodeId, position, color }) => (
              <Point key={nodeId} position={position} color={color}></Point>
            ))}
          </Points> */}
        {/* </group> */}
      </group>

      <gridHelper rotation={[Math.PI / 2, 0, 0]} args={[200, 1, colorTheme.grid, colorTheme.grid]} />

      {/* <FloorTickMarks /> */}

      {/* Direction indicators */}
      {/* <Text
        position={[0, 116, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        +Y
      </Text>
      <Text
        position={[0, -116, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, Math.PI]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        -Y
      </Text>
      <Text
        position={[116, 0, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, -Math.PI / 2]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        +X
      </Text>
      <Text
        position={[-116, 0, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        -X
      </Text> */}

      {/* Diagonal Direction indicators */}
      {/* <Text
        position={[100, 100, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, -Math.PI / 4]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        NE
      </Text>
      <Text
        position={[-100, 100, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, Math.PI / 4]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        NW
      </Text>
      <Text
        position={[100, -100, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, (-3 * Math.PI) / 4]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        SE
      </Text>
      <Text
        position={[-100, -100, 0]}
        font={SCENE_LABEL_FONT}
        characters={SCENE_LABEL_CHARACTERS}
        rotation={[0, 0, (3 * Math.PI) / 4]}
        fontSize={15}
        color={colorTheme.directionLabels}
        anchorX="center"
        anchorY="middle">
        SW
      </Text> */}
    </>
  );
}
