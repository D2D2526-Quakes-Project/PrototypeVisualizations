import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useOpenPanels } from "@/features/dockview/useOpenPanels";
import { usePlayback } from "@/features/playback/usePlayback";
import { numberToColor, stringToNumber } from "@/lib/utils";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";

function OpenFloorRect({ storyId }: { storyId: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { animationData } = useAnimationData();
  const { getNodeVisualPosition } = useNodePositions();
  const { frameIndex } = usePlayback();
  const nodeIds = animationData.metadata.stories[storyId] ?? [];
  const color = numberToColor(stringToNumber(storyId));

  useFrame(() => {
    if (!meshRef.current || nodeIds.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let z = 0;

    for (const nodeId of nodeIds) {
      const pos = getNodeVisualPosition(nodeId, frameIndex);
      if (pos[0] < minX) minX = pos[0];
      if (pos[0] > maxX) maxX = pos[0];
      if (pos[1] < minY) minY = pos[1];
      if (pos[1] > maxY) maxY = pos[1];
      z = pos[2];
    }

    const width = maxX - minX;
    const height = maxY - minY;
    if (width <= 0 || height <= 0) return;

    meshRef.current.position.set((minX + maxX) / 2, (minY + maxY) / 2, z);
    meshRef.current.scale.set(width, height, 1);
  });

  if (nodeIds.length === 0) return null;

  return (
    <mesh ref={meshRef} renderOrder={-5}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function OpenPanelFloorsRenderer() {
  const { floorIds } = useOpenPanels();

  return (
    <group>
      {floorIds.map((storyId) => (
        <OpenFloorRect key={storyId} storyId={storyId} />
      ))}
    </group>
  );
}
