import { getNodeColor as getNodePanelColor } from "@/components/NodePanel";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { FloorSlabsRenderer } from "@/components/renderers/FloorSlabsRenderer";
import { VerticalConnectionsRenderer } from "@/components/renderers/VerticalConnectionsRenderer";
import { useCamera } from "@/contexts/CameraContext";
import { useNodeSelection } from "@/contexts/NodeSelectionContext";
import {
  performBoxSelection,
  useColor,
  useExplodedView,
  useNodeVisibility,
  useSliceSelection,
  useViewMode,
} from "@/contexts/visualization";
import { UNIT_SCALE } from "@/lib/utils";
import { Point, PointMaterial, Points, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAnimationData } from "../../hooks/nodeDataHook";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export function BuildingScene() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { selectedNodes, selectNode } = useNodeSelection();
  const { getNodeColor } = useColor();
  const { mode, getVisibleNodes } = useViewMode();
  const { getExplodedPosition } = useExplodedView();
  const { openSlicePanel, sliceEnabled, xRange, yRange, zRange } = useSliceSelection();
  const { camera } = useThree();
  const { setEnablePan } = useCamera();
  const {
    selectedNodeIds,
    boxSelection,
    startBoxSelection,
    updateBoxSelection,
    endBoxSelection,
    setSelectedNodes,
    addSelectedNodes,
  } = useNodeVisibility();

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.center[1];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];

  const nodeCount = animationData.metadata.nodeCount;

  // Get visible nodes based on view mode and slice
  const visibleNodes = useMemo(() => {
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

  // Keyboard handler for ctrl/cmd to control pan and enable box select mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
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
  }, [setEnablePan]);
  // Ref to track mouse state for box selection
  const isMouseDownRef = useRef(false);
  const shiftHeldRef = useRef(false);

  // Component to attach mouse handlers to the canvas element
  function BoxSelectionHandler() {
    const { gl } = useThree();
    const boxSelectionRef = useRef(boxSelection);

    // Update ref when boxSelection changes
    useEffect(() => {
      boxSelectionRef.current = boxSelection;
    }, [boxSelection]);

    useEffect(() => {
      const domElement = gl.domElement;

      const handleMouseDown = (e: MouseEvent) => {
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
        if (isMouseDownRef.current && (e.ctrlKey || e.metaKey)) {
          const rect = domElement.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          updateBoxSelection({ x, y });
        }
      };

      const handleMouseUp = () => {
        // Process selection if we were dragging (regardless of whether Ctrl is still held)
        if (isMouseDownRef.current && boxSelectionRef.current) {
          const selected = performBoxSelection(camera, meshRef, boxSelectionRef.current, visibleNodes);
          if (shiftHeldRef.current) {
            addSelectedNodes(selected);
          } else {
            setSelectedNodes(new Set(selected));
          }
          endBoxSelection();
        }
        isMouseDownRef.current = false;
      };

      domElement.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        domElement.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [gl, camera, positions, visibleNodes, startBoxSelection, updateBoxSelection, setSelectedNodes, endBoxSelection]);

    return null;
  }

  // Keyboard handler to clear selection with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedNodes(new Set());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedNodes]);

  const [hovered, setHovered] = useState<number | undefined>(undefined);
  const pointerDownNodeId = useRef<number | undefined>(undefined);

  const positions = useMemo(() => {
    const positions = new Float32Array(visibleNodes.length * 3);

    for (let i = 0; i < visibleNodes.length; i++) {
      const nodeId = visibleNodes[i];
      const initialPos = animationData.initialPositions.at(nodeId);
      const displacement = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      const exploded = getExplodedPosition(
        nodeId,
        [initialPos[0], initialPos[1], initialPos[2]],
        [displacement[0], displacement[1], displacement[2]],
        [offsetX, offsetY, offsetZ],
        animationData.metadata,
      );
      // Apply group offset and scale (same as renderer does)
      positions[i * 3 + 0] = exploded[0];
      positions[i * 3 + 1] = exploded[1];
      positions[i * 3 + 2] = exploded[2];
    }
    return positions;
  }, [frameIndex, animationData, visibleNodes, getExplodedPosition, offsetX, offsetY, offsetZ]);

  const handleNodeClick = useCallback(
    (event: { instanceId?: number; stopPropagation: () => void }) => {
      if (event.instanceId === undefined) return;

      // Only trigger click if we're releasing over the same node that was clicked down on
      if (event.instanceId !== pointerDownNodeId.current) return;

      // Map instance index to actual node ID
      const nodeId = visibleNodes[event.instanceId];
      if (nodeId === undefined) return;

      // Get the world position of the clicked node
      const worldPos = new THREE.Vector3(
        positions[event.instanceId * 3 + 0],
        positions[event.instanceId * 3 + 1],
        positions[event.instanceId * 3 + 2],
      );

      // Convert world coordinates to screen coordinates
      const vector = worldPos.clone();
      vector.project(camera);
      selectNode(nodeId);
    },
    [camera, selectNode, positions, visibleNodes],
  );

  const handleNodeContextMenu = useCallback(
    (event: { instanceId?: number; stopPropagation: () => void; nativeEvent: { button: number } }) => {
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
    [visibleNodes, animationData, openSlicePanel],
  );

  const handlePointerDown = useCallback((event: { instanceId?: number; stopPropagation: () => void }) => {
    event.stopPropagation();
    pointerDownNodeId.current = event.instanceId;
  }, []);

  const colors = useMemo(() => {
    const colors = new Float32Array(visibleNodes.length * 3);
    for (let i = 0; i < visibleNodes.length; i++) {
      const nodeId = visibleNodes[i];
      const color = getNodeColor(nodeId);
      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return colors;
  }, [visibleNodes, getNodeColor]);

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

    for (let i = 0; i < visibleNodes.length; i++) {
      tempObject.position.set(positions[i * 3 + 0], positions[i * 3 + 1], positions[i * 3 + 2]);

      const scale = hovered === i ? 50 : 1 / UNIT_SCALE;
      tempObject.scale.set(scale, scale, scale);

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      ///

      if (i === hovered || boxSelectedIndices.has(i)) tempColor.setRGB(2 / 255, 140 / 255, 180 / 255);
      // else tempColor.set(colors[i * 3 + 0], colors[i * 3 + 1], colors[i * 3 + 2]);
      else tempColor.fromArray(colors, i * 3);

      tempColor.toArray(colorAttr.array, i * 3);

      // meshRef.current.setColorAt(i, tempColor);
      // meshRef.current.geometry.attributes.color.needsUpdate = true;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  // Get positions and colors for all selected nodes
  const selectedNodesData = useMemo(() => {
    return selectedNodes.map((nodeId) => {
      const pos = animationData.initialPositions.at(nodeId);
      const displacement = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      return {
        nodeId,
        position: [pos[0] + displacement[0], pos[1] + displacement[1], pos[2] + displacement[2]] as const,
        color: getNodePanelColor(nodeId), // Use unique color for selection
      };
    });
  }, [selectedNodes, frameIndex, animationData]);

  return (
    <>
      <BoxSelectionHandler />
      <ambientLight intensity={2} />
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />

      <group scale={UNIT_SCALE}>
        <group position={[offsetX, offsetY, offsetZ]}>
          {/* Render based on view mode */}
          {mode === "floor-slabs" && <FloorSlabsRenderer nodeIds={visibleNodes} />}

          {mode === "vertical-connections" && (
            <>
              <instancedMesh
                ref={meshRef}
                onPointerDown={handlePointerDown}
                onPointerMove={(e) => (e.stopPropagation(), setHovered(e.instanceId))}
                onPointerOut={(e) => (e.stopPropagation(), setHovered(undefined))}
                onClick={(e) => (e.stopPropagation(), handleNodeClick(e))}
                onContextMenu={(e) => handleNodeContextMenu(e)}
                args={[undefined, undefined, visibleNodes.length]}
                frustumCulled={false}>
                <sphereGeometry args={[1, 4, 2]}>
                  <instancedBufferAttribute
                    attach="attributes-color"
                    args={[colors.slice(), 3]}
                    usage={THREE.DynamicDrawUsage}
                  />
                </sphereGeometry>
                <meshBasicMaterial fog={false} toneMapped={false} vertexColors />
              </instancedMesh>
              <VerticalConnectionsRenderer nodeIds={visibleNodes} />
            </>
          )}

          {(mode === "all-nodes" || mode === "corners-only" || mode === "exterior-only") && (
            <instancedMesh
              ref={meshRef}
              onPointerDown={handlePointerDown}
              onPointerMove={(e) => (e.stopPropagation(), setHovered(e.instanceId))}
              onPointerOut={(e) => (e.stopPropagation(), setHovered(undefined))}
              onClick={(e) => (e.stopPropagation(), handleNodeClick(e))}
              onContextMenu={(e) => handleNodeContextMenu(e)}
              args={[undefined, undefined, visibleNodes.length]}
              frustumCulled={false}>
              <sphereGeometry args={[1, 4, 2]}>
                <instancedBufferAttribute
                  attach="attributes-color"
                  args={[colors.slice(), 3]}
                  usage={THREE.DynamicDrawUsage}
                />
              </sphereGeometry>
              <meshBasicMaterial fog={false} toneMapped={false} vertexColors />
            </instancedMesh>
          )}

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
              toneMapped={false}
            />
            {selectedNodesData.map(({ nodeId, position, color }) => (
              <Point key={nodeId} position={position} color={color}></Point>
            ))}
          </Points>
        </group>
      </group>

      {/* <InSceneGraph frameIndex={frameIndex} scale={scale} displacementScale={displacementScale} /> */}

      {/* <arrowHelper
        args={[
          new Vector3(...animationData.groundMotion.at(frameIndex)),
          new Vector3(0, 0, 0),
          Math.hypot(...animationData.groundMotion.at(frameIndex)) * 10000,
          0xffff00,
        ]}
      /> */}

      {/* <axesHelper args={[75]} /> */}

      <gridHelper rotation={[Math.PI / 2, 0, 0]} args={[200, 20]} />

      {/* Direction indicators */}
      <Text position={[0, 116, 0]} fontSize={32} color="#eee" anchorX="center" anchorY="middle">
        N
      </Text>
      <Text
        position={[0, -116, 0]}
        rotation={[0, 0, Math.PI]}
        fontSize={32}
        color="#eee"
        anchorX="center"
        anchorY="middle">
        S
      </Text>
      <Text
        position={[116, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        fontSize={32}
        color="#eee"
        anchorX="center"
        anchorY="middle">
        E
      </Text>
      <Text
        position={[-116, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={32}
        color="#eee"
        anchorX="center"
        anchorY="middle">
        W
      </Text>
    </>
  );
}
