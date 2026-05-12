import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";
import { useNodeRendering } from "../contexts/useNodeRendering";
import { BoxSelectionHandler } from "@/features/canvas/components/BoxSelection";
import { useHover } from "../lib/useHover";
import { useLiveStore } from "@/state";
import { useCanvasState } from "../contexts/CanvasContext";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export function NodesRenderer() {
  const nodesMeshRef = useRef<THREE.InstancedMesh>(null);

  const { invalidate } = useThree();
  const { frameIndex } = usePlayback();
  const { getNodeColorForCurrentMetric } = useMetrics();
  const { visibleNodes, getNodeVisualPosition } = useNodePositions();
  const { nodeOpacity, nodeScale, belowThresholdNodeScale } = useNodeRendering();
  const { hoveredNode, setHoveredNode } = useHover();
  const selectedNodeIds = useLiveStore((s) => s.selectedNodeIds);
  const { nodeInteractionEnabled } = useCanvasState();

  const boxSelectedIndices = useMemo(() => {
    const indices = new Set<number>();
    for (let i = 0; i < visibleNodes.length; i++) {
      if (selectedNodeIds.includes(visibleNodes[i])) {
        indices.add(i);
      }
    }
    return indices;
  }, [visibleNodes, selectedNodeIds]);

  useEffect(() => {
    invalidate();
  }, [frameIndex, invalidate, nodeScale, nodeOpacity, belowThresholdNodeScale, visibleNodes.length]);

  useFrame(() => {
    if (!nodesMeshRef.current || visibleNodes.length === 0) return;

    const colorAttr = nodesMeshRef.current.geometry.attributes.color;
    if (!colorAttr) return;

    for (let i = 0; i < visibleNodes.length; i++) {
      const nodeId = visibleNodes[i];
      const position = getNodeVisualPosition(nodeId, frameIndex);
      tempObject.position.set(position[0], position[1], position[2]);

      const { passesThreshold, color } = getNodeColorForCurrentMetric(nodeId, frameIndex);

      const effectiveScale = passesThreshold ? nodeScale : nodeScale * belowThresholdNodeScale;
      const scale = hoveredNode?.nodeId === nodeId ? effectiveScale * 1.35 : effectiveScale;
      tempObject.scale.set(scale, scale, scale);

      tempObject.updateMatrix();
      nodesMeshRef.current.setMatrixAt(i, tempObject.matrix);

      if (hoveredNode?.nodeId === nodeId || boxSelectedIndices.has(i)) {
        tempColor.setRGB(2 / 255, 140 / 255, 180 / 255);
      } else {
        tempColor.setRGB(color.r, color.g, color.b);
      }

      tempColor.toArray(colorAttr.array, i * 3);
    }

    nodesMeshRef.current.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  const pointerDownNodeId = useRef<number | undefined>(undefined);

  const handlePointerDown = useCallback(
    (event: { instanceId?: number; stopPropagation: () => void }) => {
      if (!nodeInteractionEnabled) return;
      event.stopPropagation();
      pointerDownNodeId.current = event.instanceId;
    },
    [nodeInteractionEnabled]
  );

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!nodeInteractionEnabled) return;
      event.stopPropagation();
      if (event.instanceId === undefined) {
        setHoveredNode(null);
        return;
      }
      const nodeId = visibleNodes[event.instanceId];
      setHoveredNode({
        type: "node",
        nodeId,
        screenPos: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
      });
    },
    [nodeInteractionEnabled, setHoveredNode, visibleNodes]
  );

  const handlePointerOut = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      setHoveredNode(null);
    },
    [setHoveredNode]
  );

  const handleNodeClick = useCallback(
    (event: { instanceId?: number; stopPropagation: () => void }) => {
      if (!nodeInteractionEnabled) return;
      if (event.instanceId === undefined) return;
      if (event.instanceId !== pointerDownNodeId.current) return;
      // const nodeId = visibleNodes[event.instanceId];
      // selectNode(nodeId); // TODO: OPEN NODE PANEL
    },
    [nodeInteractionEnabled]
  );

  return (
    <>
      <instancedMesh
        ref={nodesMeshRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => handlePointerMove(e)}
        onPointerOut={(e) => handlePointerOut(e)}
        onClick={(e) => (e.stopPropagation(), handleNodeClick(e))}
        args={[undefined, undefined, visibleNodes.length]}
        frustumCulled={false}>
        <sphereGeometry args={[40, 4, 2]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[new Float32Array(visibleNodes.length * 3).fill(1), 3]}
            usage={THREE.DynamicDrawUsage}
          />
        </sphereGeometry>
        <meshBasicMaterial fog={false} vertexColors transparent opacity={nodeOpacity} />
      </instancedMesh>
      <BoxSelectionHandler nodesMeshRef={nodesMeshRef} />
    </>
  );
}
