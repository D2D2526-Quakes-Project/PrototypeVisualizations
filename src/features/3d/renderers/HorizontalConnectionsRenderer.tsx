import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";

export function HorizontalConnectionsRenderer({ nodeIds: overrideNodeIds }: { nodeIds?: number[] }) {
  const linesRef = useRef<THREE.LineSegments>(null);

  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getNodeVisualPosition, visibleNodes } = useNodePositions();
  const { getNodeColorForCurrentMetric } = useMetrics();

  const nodeIds = useMemo(() => (overrideNodeIds ? overrideNodeIds : visibleNodes), [visibleNodes, overrideNodeIds]);

  const connections = useMemo(() => {
    const beamData = animationData.beamData;
    if (!beamData) return [];

    const result: [number, number][] = [];
    const visibleNodeSet = new Set(nodeIds);

    for (let i = 0; i < beamData.count; i++) {
      const row = beamData.getRow(i);
      const iNode = row.iNodeIndex;
      const jNode = row.jNodeIndex;

      if (visibleNodeSet.has(iNode) && visibleNodeSet.has(jNode)) {
        result.push([iNode, jNode]);
      }
    }

    return result;
  }, [animationData, nodeIds]);

  const maxVertices = connections.length * 2;
  const positions = useMemo(() => new Float32Array(maxVertices * 3), [maxVertices]);
  const colors = useMemo(() => new Float32Array(maxVertices * 3).fill(1), [maxVertices]);

  useFrame(() => {
    if (!linesRef.current || connections.length === 0) return;

    const geometry = linesRef.current.geometry;
    const posAttr = geometry.attributes.position;
    const colAttr = geometry.attributes.color;

    let vertexCount = 0;

    for (let i = 0; i < connections.length; i++) {
      const [nodeA, nodeB] = connections[i];

      const posA = getNodeVisualPosition(nodeA, frameIndex);
      const posB = getNodeVisualPosition(nodeB, frameIndex);
      const color = getNodeColorForCurrentMetric(nodeA, frameIndex).color;

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

  if (!animationData.beamData) return null;

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
