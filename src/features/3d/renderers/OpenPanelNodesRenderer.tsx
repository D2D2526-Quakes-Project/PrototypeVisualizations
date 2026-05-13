import { useOpenPanels } from "@/features/dockview/useOpenPanels";
import { usePlayback } from "@/features/playback/usePlayback";
import { numberToColor } from "@/lib/utils";
import { Point, PointMaterial, Points } from "@react-three/drei";
import { useMemo } from "react";
import { useNodePositions } from "../contexts/useNodePositions";

export function OpenPanelNodesRenderer() {
  const { nodeIds } = useOpenPanels();
  const { frameIndex } = usePlayback();
  const { getNodeVisualPosition } = useNodePositions();

  const nodesData = useMemo(() => {
    return nodeIds.map((nodeId) => {
      const pos = getNodeVisualPosition(nodeId, frameIndex);
      return {
        nodeId,
        position: pos,
        color: numberToColor(nodeId),
      };
    });
  }, [nodeIds, frameIndex, getNodeVisualPosition]);

  return (
    <Points frustumCulled={false}>
      <PointMaterial
        transparent
        vertexColors
        size={8}
        sizeAttenuation={true}
        depthTest={true}
        depthWrite={true}
        opacity={1}
      />
      {nodesData.map(({ nodeId, position, color }) => (
        <Point key={nodeId} position={position} color={color}></Point>
      ))}
    </Points>
  );
}
