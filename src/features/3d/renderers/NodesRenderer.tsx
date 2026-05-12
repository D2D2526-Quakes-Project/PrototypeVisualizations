import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";
import { useNodeRendering } from "../contexts/useNodeRendering";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export function NodesRenderer() {
  const nodesMeshRef = useRef<THREE.InstancedMesh>(null);

  const { invalidate } = useThree();
  const { frameIndex } = usePlayback();
  const { getNodeColorForCurrentMetric } = useMetrics();
  const { visibleNodes, getNodeVisualPosition } = useNodePositions();
  const { nodeOpacity, nodeScale, belowThresholdNodeScale } = useNodeRendering();

  useEffect(() => {
    invalidate();
  }, [frameIndex, invalidate, nodeScale, nodeOpacity, belowThresholdNodeScale]);

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
      // const scale = hoveredNodeId === nodeId ? effectiveScale * 1.35 : effectiveScale;
      const scale = effectiveScale;
      tempObject.scale.set(scale, scale, scale);

      tempObject.updateMatrix();
      nodesMeshRef.current.setMatrixAt(i, tempObject.matrix);

      // if (hoveredNodeId === nodeId || boxSelectedIndices.has(i)) {
      //   tempColor.setRGB(2 / 255, 140 / 255, 180 / 255);
      // } else {
      tempColor.setRGB(color.r, color.g, color.b);
      // }

      tempColor.toArray(colorAttr.array, i * 3);
    }

    nodesMeshRef.current.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={nodesMeshRef}
      // onPointerDown={handlePointerDown}
      // onPointerMove={(e) => handlePointerMove(e)}
      // onPointerOut={(e) => handlePointerOut(e)}
      // onClick={(e) => (e.stopPropagation(), handleNodeClick(e))}
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
  );
}
