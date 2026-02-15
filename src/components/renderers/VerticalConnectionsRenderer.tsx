import { usePlayback } from "@/components/playback/PlaybackContext";
import { useExplodedView } from "@/contexts/visualization";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useMemo } from "react";
import * as THREE from "three";

interface VerticalConnectionsRendererProps {
  nodeIds: number[];
}

export function VerticalConnectionsRenderer({ nodeIds }: VerticalConnectionsRendererProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getExplodedPosition } = useExplodedView();

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.center[1];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];
  const offset: [number, number, number] = [offsetX, offsetY, offsetZ];

  const connections = useMemo(() => {
    const nodePositions = new Map<string, number[]>();
    
    nodeIds.forEach(nodeId => {
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
        const explodedA = getExplodedPosition(
          conn.nodeA,
          [posA[0], posA[1], posA[2]],
          [dispA[0], dispA[1], dispA[2]],
          offset,
          animationData.metadata
        );
        
        const posB = animationData.initialPositions.at(conn.nodeB);
        const dispB = animationData.displacementLin.atFrame(frameIndex).at(conn.nodeB);
        const explodedB = getExplodedPosition(
          conn.nodeB,
          [posB[0], posB[1], posB[2]],
          [dispB[0], dispB[1], dispB[2]],
          offset,
          animationData.metadata
        );

        const start = new THREE.Vector3(explodedA[0], explodedA[1], explodedA[2]);
        const end = new THREE.Vector3(explodedB[0], explodedB[1], explodedB[2]);

        const points = [start, end];

        return (
          <line key={idx}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#666" opacity={0.5} transparent />
          </line>
        );
      })}
    </group>
  );
}
