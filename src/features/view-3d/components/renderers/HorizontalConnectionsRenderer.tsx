import { usePlayback } from "@/features/playback/PlaybackContext";
import { useColor, useExpandedScale } from "@/features/view-3d/contexts/visualization";
import { useVisualDisplacement } from "@/features/view-3d/lib/visualDisplacement";
import { useAnimationData } from "@/lib/useAnimationData";
import { useMemo } from "react";
import * as THREE from "three";

interface HorizontalConnectionsRendererProps {
  nodeIds: number[];
  lineWidth?: number;
  lineOpacity?: number;
}

export function HorizontalConnectionsRenderer({
  nodeIds,
  lineWidth = 2,
  lineOpacity = 0.6,
}: HorizontalConnectionsRendererProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getExpandedPosition } = useExpandedScale();
  // const connectionLineColor = useViewStore((s) => s.colorTheme.connectionLines);
  const { getNodeColor: getRawNodeColor } = useColor();
  const { displacement: visualDisplacement, getNodeColor: getVisualNodeColor } = useVisualDisplacement();

  const offset = useMemo(
    (): [number, number, number] => [
      -animationData.precomputed.boundingBox.center[0],
      -animationData.precomputed.boundingBox.center[1],
      -animationData.precomputed.boundingBox.min[2],
    ],
    [animationData.precomputed.boundingBox]
  );

  const connections = useMemo(() => {
    const beamData = animationData.beamData;
    if (!beamData) return [];

    const result: Array<{ nodeA: number; nodeB: number }> = [];
    const nodeIdSet = new Set(nodeIds);

    for (let i = 0; i < beamData.count; i++) {
      const row = beamData.getRow(i);
      const iNode = row.iNodeIndex;
      const jNode = row.jNodeIndex;

      if (iNode >= 0 && jNode >= 0 && nodeIdSet.has(iNode) && nodeIdSet.has(jNode)) {
        result.push({ nodeA: iNode, nodeB: jNode });
      }
    }

    return result;
  }, [nodeIds, animationData.beamData]);

  return (
    <group>
      {connections.map((conn, idx) => {
        const posA = animationData.initialPositions.at(conn.nodeA);
        const dispA = visualDisplacement.atFrame(frameIndex).at(conn.nodeA);
        const expandedA = getExpandedPosition(
          [posA[0], posA[1], posA[2]],
          [dispA[0], dispA[1], dispA[2]],
          offset,
          animationData.metadata
        );

        const posB = animationData.initialPositions.at(conn.nodeB);
        const dispB = visualDisplacement.atFrame(frameIndex).at(conn.nodeB);
        const expandedB = getExpandedPosition(
          [posB[0], posB[1], posB[2]],
          [dispB[0], dispB[1], dispB[2]],
          offset,
          animationData.metadata
        );

        const start = new THREE.Vector3(expandedA[0], expandedA[1], expandedA[2]);
        const end = new THREE.Vector3(expandedB[0], expandedB[1], expandedB[2]);

        const color = getVisualNodeColor(conn.nodeA, frameIndex, getRawNodeColor);

        const points = [start, end];

        return (
          <line key={idx}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color={color} opacity={lineOpacity} transparent linewidth={lineWidth} />
          </line>
        );
      })}
    </group>
  );
}
