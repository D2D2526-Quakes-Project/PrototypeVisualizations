import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useOpenPanels } from "@/features/dockview/useOpenPanels";
import { usePlayback } from "@/features/playback/usePlayback";
import { numberToColor, stringToNumber } from "@/lib/utils";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";

function OpenFloorRect({ storyId }: { storyId: string }) {
  const groupRef = useRef<THREE.Group>(null);

  const leftWallRef = useRef<THREE.Mesh>(null);
  const rightWallRef = useRef<THREE.Mesh>(null);
  const bottomWallRef = useRef<THREE.Mesh>(null);
  const topWallRef = useRef<THREE.Mesh>(null);

  const { animationData } = useAnimationData();
  const { getNodeVisualPosition } = useNodePositions();
  const { frameIndex } = usePlayback();
  const nodeIds = animationData.metadata.stories[storyId] ?? [];
  const color = numberToColor(stringToNumber(storyId));

  const wallDepth = 100;

  useFrame(() => {
    if (!groupRef.current || nodeIds.length === 0) return;

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
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

    groupRef.current.position.set((minX + maxX) / 2, (minY + maxY) / 2, z);

    if (leftWallRef.current) {
      leftWallRef.current.scale.set(wallDepth, height, 1);
      leftWallRef.current.position.set(-width / 2, 0, 0);
    }
    if (rightWallRef.current) {
      rightWallRef.current.scale.set(wallDepth, height, 1);
      rightWallRef.current.position.set(width / 2, 0, 0);
    }
    if (bottomWallRef.current) {
      bottomWallRef.current.scale.set(width, wallDepth, 1);
      bottomWallRef.current.position.set(0, -height / 2, 0);
    }
    if (topWallRef.current) {
      topWallRef.current.scale.set(width, wallDepth, 1);
      topWallRef.current.position.set(0, height / 2, 0);
    }
  });

  if (nodeIds.length === 0) return null;

  return (
    <group ref={groupRef}>
      {/* Left Wall */}
      <mesh ref={leftWallRef} renderOrder={-5} rotation={[0, -Math.PI / 2, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} side={THREE.BackSide} />
        <planeGeometry args={[1, 1]} />
      </mesh>

      {/* Right Wall */}
      <mesh ref={rightWallRef} renderOrder={-5} rotation={[0, Math.PI / 2, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} side={THREE.BackSide} />
        <planeGeometry args={[1, 1]} />
      </mesh>

      {/* Bottom Wall */}
      <mesh ref={bottomWallRef} renderOrder={-5} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} side={THREE.BackSide} />
        <planeGeometry args={[1, 1]} />
      </mesh>

      {/* Top Wall */}
      <mesh ref={topWallRef} renderOrder={-5} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} side={THREE.BackSide} />
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
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
