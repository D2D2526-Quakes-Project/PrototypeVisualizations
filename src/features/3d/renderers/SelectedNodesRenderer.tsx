import { usePlayback } from "@/features/playback/usePlayback";
import { numberToColor } from "@/lib/utils";
import { useLiveStore } from "@/state";
import { Point, PointMaterial, Points } from "@react-three/drei";
import { useMemo } from "react";
import { useNodePositions } from "../contexts/useNodePositions";

// TODO: Rename to panel node hightlight or something and use the correct state not selected nodes
export function SelectedNodesRenderer() {
  const { frameIndex } = usePlayback();
  const { getNodeVisualPosition } = useNodePositions();
  const selectedNodeIds = useLiveStore((s) => s.selectedNodeIds);

  const selectedNodesData = useMemo(() => {
    return selectedNodeIds.map((nodeId) => {
      const pos = getNodeVisualPosition(nodeId, frameIndex);
      return {
        nodeId,
        position: pos,
        color: numberToColor(nodeId),
      };
    });
  }, [selectedNodeIds, frameIndex, getNodeVisualPosition]);

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
      {selectedNodesData.map(({ nodeId, position, color }) => (
        <Point key={nodeId} position={position} color={color}></Point>
      ))}
    </Points>
  );
}
