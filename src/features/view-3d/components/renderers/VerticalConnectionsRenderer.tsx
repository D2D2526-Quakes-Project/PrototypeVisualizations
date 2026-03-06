import { usePlayback } from "@/features/playback/PlaybackContext";
import { useExpandedScale } from "@/features/view-3d/contexts/visualization";
import { useAnimationData } from "@/lib/useAnimationData";
import { useMemo } from "react";
import * as THREE from "three";

interface VerticalConnectionsRendererProps {
  nodeIds: number[];
}

export function VerticalConnectionsRenderer({ nodeIds }: VerticalConnectionsRendererProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getExpandedPosition } = useExpandedScale();

  const offset = useMemo(
    (): [number, number, number] => [
      -animationData.precomputed.boundingBox.center[0],
      -animationData.precomputed.boundingBox.center[1],
      -animationData.precomputed.boundingBox.min[2],
    ],
    [animationData.precomputed.boundingBox]
  );

  const connections = useMemo(() => {
    const nodePositions = new Map<string, number[]>();

    nodeIds.forEach((nodeId) => {
      const pos = animationData.initialPositions.at(nodeId);
      const key = `${pos[0].toFixed(2)},${pos[1].toFixed(2)}`;
      if (!nodePositions.has(key)) {
        nodePositions.set(key, []);
      }
      nodePositions.get(key)!.push(nodeId);
    });

    const result: Array<{ nodeA: number; nodeB: number; key: string }> = [];

    nodePositions.forEach((ids, key) => {
      const sorted = ids.sort((a, b) => {
        const posA = animationData.initialPositions.at(a);
        const posB = animationData.initialPositions.at(b);
        return posA[2] - posB[2];
      });

      for (let i = 0; i < sorted.length - 1; i++) {
        result.push({ nodeA: sorted[i], nodeB: sorted[i + 1], key });
      }
    });

    return result;
  }, [nodeIds, animationData]);

  return (
    <group>
      {connections.map((conn, idx) => {
        const posA = animationData.initialPositions.at(conn.nodeA);
        const dispA = animationData.displacementLin.atFrame(frameIndex).at(conn.nodeA);
        const expandedA = getExpandedPosition(
          conn.nodeA,
          [posA[0], posA[1], posA[2]],
          [dispA[0], dispA[1], dispA[2]],
          offset,
          animationData.metadata
        );

        const posB = animationData.initialPositions.at(conn.nodeB);
        const dispB = animationData.displacementLin.atFrame(frameIndex).at(conn.nodeB);
        const expandedB = getExpandedPosition(
          conn.nodeB,
          [posB[0], posB[1], posB[2]],
          [dispB[0], dispB[1], dispB[2]],
          offset,
          animationData.metadata
        );

        const start = new THREE.Vector3(expandedA[0], expandedA[1], expandedA[2]);
        const end = new THREE.Vector3(expandedB[0], expandedB[1], expandedB[2]);

        const points = [start, end];

        return (
          <line key={idx}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#666" opacity={0.5} transparent />
          </line>
        );
      })}
    </group>
  );
}
