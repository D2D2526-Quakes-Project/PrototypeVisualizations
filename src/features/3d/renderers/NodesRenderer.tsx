import { useMemo, useRef } from "react";
import * as THREE from "three";

export function NodesRenderer() {
  const nodesMeshRef = useRef<THREE.InstancedMesh>(null);

  // Filter by floor visibility
  const visibleNodes = useMemo(() => {
    return visibleNodesBasedOnMode.filter((nodeId) => {
      if (hiddenNodeIdSet.has(nodeId)) {
        return false;
      }
      // Check which floor this node belongs to
      for (const storyId of visibleFloors) {
        const storyNodes = animationData.metadata.stories[storyId];
        if (storyNodes && storyNodes.includes(nodeId)) {
          return true;
        }
      }
      // If node doesn't belong to any visible floor, hide it
      // But for nodes not in any story (like corner nodes), show them
      return false;
    });
  }, [visibleNodesBasedOnMode, visibleFloors, animationData.metadata.stories, hiddenNodeIdSet]);

  return (
    <instancedMesh
      ref={nodesMeshRef}
      // onPointerDown={handlePointerDown}
      // onPointerMove={(e) => handlePointerMove(e)}
      // onPointerOut={(e) => handlePointerOut(e)}
      // onClick={(e) => (e.stopPropagation(), handleNodeClick(e))}
      args={[undefined, undefined, visibleNodes.length]}
      frustumCulled={false}>
      <sphereGeometry args={[1, 4, 2]}>
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
