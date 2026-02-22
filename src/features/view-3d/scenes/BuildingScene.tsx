import { getNodeColor as getNodePanelColor } from "@/features/view-3d/components/NodePanel";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { FloorSlabsRenderer } from "@/features/view-3d/components/renderers/FloorSlabsRenderer";
import { VerticalConnectionsRenderer } from "@/features/view-3d/components/renderers/VerticalConnectionsRenderer";
import { useCamera } from "@/features/view-3d/contexts/CameraContext";
import { useNodeSelection } from "@/features/view-3d/contexts/NodeSelectionContext";
import {
  performBoxSelection,
  useColor,
  useExplodedView,
  useFloorVisibility,
  useNodeVisibility,
  useSliceSelection,
  useViewMode,
} from "@/features/view-3d/contexts/visualization";
import { ThresholdBuildingScene } from "@/features/view-3d/scenes/ThresholdBuildingScene";
import { useAnimationData } from "@/lib/useAnimationData";
import { UNIT_SCALE } from "@/lib/utils";
import { isNodeInteractionMode, isSlabInteractionMode } from "@/features/view-3d/lib/interactionPolicy";
import { Point, PointMaterial, Points, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export function BuildingScene() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { selectedNodes, selectNode } = useNodeSelection();
  const { getNodeColor } = useColor();
  const { mode, getVisibleNodes } = useViewMode();
  const { getExplodedPosition } = useExplodedView();
  const {
    openSlicePanel,
    sliceEnabled,
    xRange,
    yRange,
    zRange,
    setHovered: setHoveredSlice,
    deselectSlice,
  } = useSliceSelection();
  const { camera } = useThree();
  const { setEnablePan } = useCamera();
  const { getVisibleStoryOrder } = useFloorVisibility();
  const {
    selectedNodeIds,
    startBoxSelection,
    updateBoxSelection,
    endBoxSelection,
    setSelectedNodes,
    addSelectedNodes,
    hoveredNodeId,
    setHoveredNodeId,
    hideSelectedNodes,
  } = useNodeVisibility();
  const nodeInteractionEnabled = isNodeInteractionMode(mode);
  const slabInteractionEnabled = isSlabInteractionMode(mode);

  useEffect(() => {
    if (!nodeInteractionEnabled) {
      setHoveredNodeId(null);
      endBoxSelection();
    }
  }, [nodeInteractionEnabled, setHoveredNodeId, endBoxSelection]);

  useEffect(() => {
    if (!slabInteractionEnabled) {
      setHoveredSlice(null);
      deselectSlice();
    }
  }, [slabInteractionEnabled, setHoveredSlice, deselectSlice]);

  const offsets = useMemo(
    () => ({
      x: -animationData.precomputed.boundingBox.center[0],
      y: -animationData.precomputed.boundingBox.center[1],
      z: -animationData.precomputed.boundingBox.min[2],
    }),
    [animationData.precomputed.boundingBox],
  );

  const nodeCount = animationData.metadata.nodeCount;

  // Get visible nodes based on view mode and slice
  const visibleNodesBasedOnMode = useMemo(() => {
    return getVisibleNodes(
      nodeCount,
      animationData.metadata,
      animationData.initialPositions,
      xRange,
      yRange,
      zRange,
      sliceEnabled,
    );
  }, [
    getVisibleNodes,
    nodeCount,
    animationData.metadata,
    animationData.initialPositions,
    sliceEnabled,
    xRange,
    yRange,
    zRange,
  ]);

  // Filter by floor visibility
  const visibleNodes = useMemo(() => {
    const visibleStoryOrder = getVisibleStoryOrder();
    const visibleStorySet = new Set(visibleStoryOrder);

    return visibleNodesBasedOnMode.filter((nodeId) => {
      if (hideSelectedNodes && selectedNodeIds.has(nodeId)) {
        return false;
      }
      // Check which floor this node belongs to
      for (const storyId of visibleStorySet) {
        const storyNodes = animationData.metadata.stories[storyId];
        if (storyNodes && storyNodes.includes(nodeId)) {
          return true;
        }
      }
      // If node doesn't belong to any visible floor, hide it
      // But for nodes not in any story (like corner nodes), show them
      return false;
    });
  }, [
    visibleNodesBasedOnMode,
    getVisibleStoryOrder,
    animationData.metadata.stories,
    hideSelectedNodes,
    selectedNodeIds,
  ]);

  // Keyboard handler for ctrl/cmd to control pan and enable box select mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && nodeInteractionEnabled) {
        setEnablePan(false);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setEnablePan(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [setEnablePan, nodeInteractionEnabled]);
  // Ref to track mouse state for box selection
  const isMouseDownRef = useRef(false);
  const shiftHeldRef = useRef(false);

  // Component to attach mouse handlers to the canvas element
  function BoxSelectionHandler() {
    const { gl } = useThree();
    const { boxSelection: currentBoxSelection } = useNodeVisibility();
    const boxSelectionRef = useRef(currentBoxSelection);

    // Update ref when boxSelection changes
    useEffect(() => {
      boxSelectionRef.current = currentBoxSelection;
    }, [currentBoxSelection]);

    useEffect(() => {
      const domElement = gl.domElement;

      const handleMouseDown = (e: MouseEvent) => {
        if (!nodeInteractionEnabled) return;
        if (e.ctrlKey || e.metaKey) {
          shiftHeldRef.current = e.shiftKey;
          const rect = domElement.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          isMouseDownRef.current = true;
          startBoxSelection({ x, y });
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!nodeInteractionEnabled) return;
        if (isMouseDownRef.current && (e.ctrlKey || e.metaKey)) {
          const rect = domElement.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          updateBoxSelection({ x, y });
        }
      };

      const handleMouseUp = () => {
        if (!nodeInteractionEnabled) return;
        if (isMouseDownRef.current && boxSelectionRef.current) {
          const selected = performBoxSelection(camera, meshRef, boxSelectionRef.current, visibleNodes);
          if (shiftHeldRef.current) {
            addSelectedNodes(selected);
          } else {
            setSelectedNodes(selected);
          }
          endBoxSelection();
        }
        isMouseDownRef.current = false;
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (!nodeInteractionEnabled) return;
        if ((e.key === "Control" || e.key === "Meta" || e.key === "Ctrl") && isMouseDownRef.current) {
          endBoxSelection();
          isMouseDownRef.current = false;
        }
      };

      domElement.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
        domElement.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [gl]);

    return null;
  }

  // Keyboard handler to clear selection with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedNodes([]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedNodes]);

  const pointerDownNodeId = useRef<number | undefined>(undefined);

  const basePositions = useMemo(() => {
    const positions = new Float32Array(visibleNodes.length * 3);
    for (let i = 0; i < visibleNodes.length; i++) {
      const nodeId = visibleNodes[i];
      const initialPos = animationData.initialPositions.at(nodeId);
      positions[i * 3 + 0] = initialPos[0];
      positions[i * 3 + 1] = initialPos[1];
      positions[i * 3 + 2] = initialPos[2];
    }
    return positions;
  }, [visibleNodes, animationData.initialPositions]);

  const frameIndexRef = useRef(frameIndex);
  frameIndexRef.current = frameIndex;

  const handleNodeClick = useCallback(
    (event: { instanceId?: number; stopPropagation: () => void }) => {
      if (!nodeInteractionEnabled) return;
      if (event.instanceId === undefined) return;

      // Only trigger click if we're releasing over the same node that was clicked down on
      if (event.instanceId !== pointerDownNodeId.current) return;

      // Map instance index to actual node ID
      const nodeId = visibleNodes[event.instanceId];
      if (nodeId === undefined) return;

      selectNode(nodeId);
    },
    [selectNode, visibleNodes, nodeInteractionEnabled],
  );

  const handleNodeContextMenu = useCallback(
    (event: { instanceId?: number; stopPropagation: () => void; nativeEvent: { button: number } }) => {
      if (!nodeInteractionEnabled) return;
      event.stopPropagation();

      if (event.instanceId === undefined) return;
      if (event.nativeEvent.button !== 2) return; // Only right-click

      const nodeId = visibleNodes[event.instanceId];
      if (nodeId === undefined) return;

      // Find which story this node belongs to
      for (const [storyId, storyNodes] of Object.entries(animationData.metadata.stories)) {
        if (storyNodes.includes(nodeId)) {
          const sliceId = `floor-${storyId}`;
          openSlicePanel(sliceId, storyId);
          return;
        }
      }
    },
    [visibleNodes, animationData, openSlicePanel, nodeInteractionEnabled],
  );

  const handlePointerDown = useCallback(
    (event: { instanceId?: number; stopPropagation: () => void }) => {
      if (!nodeInteractionEnabled) return;
      event.stopPropagation();
      pointerDownNodeId.current = event.instanceId;
    },
    [nodeInteractionEnabled],
  );

  const handlePointerMove = useCallback(
    (event: { instanceId?: number; stopPropagation: () => void }) => {
      if (!nodeInteractionEnabled) return;
      event.stopPropagation();
      if (event.instanceId === undefined) {
        setHoveredNodeId(null);
        return;
      }
      const nodeId = visibleNodes[event.instanceId];
      setHoveredNodeId(nodeId ?? null);
    },
    [nodeInteractionEnabled, setHoveredNodeId, visibleNodes],
  );

  const handlePointerOut = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      setHoveredNodeId(null);
    },
    [setHoveredNodeId],
  );

  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Build a Set of instance indices that are box-selected (for O(1) lookup)
  const boxSelectedIndices = useMemo(() => {
    const indices = new Set<number>();
    for (let i = 0; i < visibleNodes.length; i++) {
      if (selectedNodeIds.has(visibleNodes[i])) {
        indices.add(i);
      }
    }
    return indices;
  }, [visibleNodes, selectedNodeIds]);

  useFrame(() => {
    if (!meshRef.current || visibleNodes.length === 0) return;

    const colorAttr = meshRef.current.geometry.attributes.color;
    if (!colorAttr) return;

    const currentFrame = frameIndexRef.current;

    for (let i = 0; i < visibleNodes.length; i++) {
      const nodeId = visibleNodes[i];

      // Compute displaced position directly
      const initX = basePositions[i * 3 + 0];
      const initY = basePositions[i * 3 + 1];
      const initZ = basePositions[i * 3 + 2];
      const displacement = animationData.displacementLin.atFrame(currentFrame).at(nodeId);
      const exploded = getExplodedPosition(
        nodeId,
        [initX, initY, initZ],
        [displacement[0], displacement[1], displacement[2]],
        [offsets.x, offsets.y, offsets.z],
        animationData.metadata,
      );

      tempObject.position.set(exploded[0], exploded[1], exploded[2]);

      const scale = hoveredNodeId === nodeId ? 50 : 1 / UNIT_SCALE;
      tempObject.scale.set(scale, scale, scale);

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      // Compute color directly in the loop
      if (hoveredNodeId === nodeId || boxSelectedIndices.has(i)) {
        tempColor.setRGB(2 / 255, 140 / 255, 180 / 255);
      } else {
        const color = getNodeColor(nodeId, currentFrame);
        tempColor.setRGB(color.r, color.g, color.b);
      }

      tempColor.toArray(colorAttr.array, i * 3);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  // Get positions and colors for all selected nodes
  const selectedNodesData = useMemo(() => {
    return selectedNodes.map((nodeId) => {
      const pos = animationData.initialPositions.at(nodeId);
      const displacement = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      const exploded = getExplodedPosition(
        nodeId,
        [pos[0], pos[1], pos[2]],
        [displacement[0], displacement[1], displacement[2]],
        [offsets.x, offsets.y, offsets.z],
        animationData.metadata,
      );
      return {
        nodeId,
        position: exploded,
        color: getNodePanelColor(nodeId), // Use unique color for selection
      };
    });
  }, [selectedNodes, frameIndex, animationData, getExplodedPosition, offsets]);

  return (
    <>
      <BoxSelectionHandler />
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />

      <group scale={UNIT_SCALE}>
        <group position={[offsets.x, offsets.y, offsets.z]}>
          {/* Render based on view mode */}
          {mode === "floor-slabs" && <FloorSlabsRenderer nodeIds={visibleNodes} />}

          {mode === "vertical-connections" && (
            <>
              <instancedMesh
                ref={meshRef}
                onPointerDown={handlePointerDown}
                onPointerMove={(e) => handlePointerMove(e)}
                onPointerOut={(e) => handlePointerOut(e)}
                onClick={(e) => (e.stopPropagation(), handleNodeClick(e))}
                onContextMenu={(e) => handleNodeContextMenu(e)}
                args={[undefined, undefined, visibleNodes.length]}
                frustumCulled={false}>
                <sphereGeometry args={[1, 4, 2]}>
                  <instancedBufferAttribute
                    attach="attributes-color"
                    args={[new Float32Array(visibleNodes.length * 3).fill(1), 3]}
                    usage={THREE.DynamicDrawUsage}
                  />
                </sphereGeometry>
                <meshBasicMaterial fog={false} vertexColors />
              </instancedMesh>
              <VerticalConnectionsRenderer nodeIds={visibleNodes} />
            </>
          )}

          {(mode === "all-nodes" || mode === "corners-only" || mode === "exterior-only") && (
            <instancedMesh
              ref={meshRef}
              onPointerDown={handlePointerDown}
              onPointerMove={(e) => handlePointerMove(e)}
              onPointerOut={(e) => handlePointerOut(e)}
              onClick={(e) => (e.stopPropagation(), handleNodeClick(e))}
              onContextMenu={(e) => handleNodeContextMenu(e)}
              args={[undefined, undefined, visibleNodes.length]}
              frustumCulled={false}>
              <sphereGeometry args={[1, 4, 2]}>
                <instancedBufferAttribute
                  attach="attributes-color"
                  args={[new Float32Array(visibleNodes.length * 3).fill(1), 3]}
                  usage={THREE.DynamicDrawUsage}
                />
              </sphereGeometry>
              <meshBasicMaterial fog={false} vertexColors />
            </instancedMesh>
          )}

          {mode === "threshold" && <ThresholdBuildingScene />}

          {/* Selected node highlights - one ring per selected node */}
          {selectedNodesData.map(({ nodeId, position, color }) => (
            <mesh key={`selected-${nodeId}`} position={position}>
              <torusGeometry args={[3, 0.3, 8, 32]} />
              <meshBasicMaterial color={color} transparent opacity={0.8} />
            </mesh>
          ))}

          <Points frustumCulled={false}>
            <PointMaterial
              transparent
              vertexColors
              size={8}
              sizeAttenuation={true}
              depthTest={true}
              depthWrite={true}
            />
            {selectedNodesData.map(({ nodeId, position, color }) => (
              <Point key={nodeId} position={position} color={color}></Point>
            ))}
          </Points>
        </group>
      </group>

      <gridHelper rotation={[Math.PI / 2, 0, 0]} args={[200, 20]} />

      {/* Direction indicators */}
      <Text position={[0, 116, 0]} fontSize={32} color="#fff" anchorX="center" anchorY="middle">
        N
      </Text>
      <Text
        position={[0, -116, 0]}
        rotation={[0, 0, Math.PI]}
        fontSize={32}
        color="#fff"
        anchorX="center"
        anchorY="middle">
        S
      </Text>
      <Text
        position={[116, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        fontSize={32}
        color="#fff"
        anchorX="center"
        anchorY="middle">
        E
      </Text>
      <Text
        position={[-116, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={32}
        color="#fff"
        anchorX="center"
        anchorY="middle">
        W
      </Text>
    </>
  );
}
