import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";
import { useNodeRendering } from "../contexts/useNodeRendering";

export function VerticalConnectionsRenderer({ nodeIds: overrideNodeIds }: { nodeIds?: number[] }) {
  const linesRef = useRef<THREE.LineSegments>(null);

  const { invalidate } = useThree();
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getNodeVisualPosition, visibleNodes } = useNodePositions();
  const { getNodeColorForCurrentMetric } = useMetrics();
  const { connectionLineWidth, connectionLineOpacity } = useNodeRendering();

  useEffect(() => {
    invalidate();
  }, [frameIndex, invalidate, connectionLineOpacity, connectionLineWidth]);

  const nodeIds = useMemo(() => (overrideNodeIds ? overrideNodeIds : visibleNodes), [visibleNodes, overrideNodeIds]);

  // Pre-allocate buffer arrays based on maximum possible connections
  // 1 connection = 1 line = 2 vertices (Point A, Point B) = 6 floats (x,y,z * 2)
  const maxVertices = nodeIds.length * 2;
  const positions = useMemo(() => new Float32Array(maxVertices * 3), [maxVertices]);
  const colors = useMemo(() => new Float32Array(maxVertices * 3).fill(1), [maxVertices]);

  useFrame(() => {
    if (!linesRef.current || nodeIds.length === 0) return;

    const geometry = linesRef.current.geometry;
    const posAttr = geometry.attributes.position;
    const colAttr = geometry.attributes.color;

    let vertexCount = 0;

    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      const nodeBelow = animationData.metadata.nodeToBelow[nodeId];

      if (nodeBelow === null) continue;

      const posA = getNodeVisualPosition(nodeId, frameIndex);
      const posB = getNodeVisualPosition(nodeBelow, frameIndex);
      const color = getNodeColorForCurrentMetric(nodeId, frameIndex).color;

      const baseIdx = vertexCount * 3;

      // --- Point A
      posAttr.array[baseIdx] = posA[0];
      posAttr.array[baseIdx + 1] = posA[1];
      posAttr.array[baseIdx + 2] = posA[2];

      colAttr.array[baseIdx] = color.r;
      colAttr.array[baseIdx + 1] = color.g;
      colAttr.array[baseIdx + 2] = color.b;

      // --- Point B
      posAttr.array[baseIdx + 3] = posB[0];
      posAttr.array[baseIdx + 4] = posB[1];
      posAttr.array[baseIdx + 5] = posB[2];

      colAttr.array[baseIdx + 3] = color.r;
      colAttr.array[baseIdx + 4] = color.g;
      colAttr.array[baseIdx + 5] = color.b;

      vertexCount += 2;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    geometry.setDrawRange(0, vertexCount);
  });

  return (
    <lineSegments ref={linesRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors />
    </lineSegments>
  );
}
