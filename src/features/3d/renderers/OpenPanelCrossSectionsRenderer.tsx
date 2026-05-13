import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useOpenPanels } from "@/features/dockview/useOpenPanels";
import { usePlayback } from "@/features/playback/usePlayback";
import { numberToColor } from "@/lib/utils";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";
import type { CrossSectionParams } from "../../panels/CrossSectionPanel";

function OpenCrossSectionRect({ params }: { params: CrossSectionParams }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftWallRef = useRef<THREE.Mesh>(null);
  const rightWallRef = useRef<THREE.Mesh>(null);
  const bottomWallRef = useRef<THREE.Mesh>(null);
  const topWallRef = useRef<THREE.Mesh>(null);

  const { animationData } = useAnimationData();
  const { getNodeVisualPosition } = useNodePositions();
  const { frameIndex } = usePlayback();
  const { crossSectionType, position: dataPosition } = params;

  const isX = crossSectionType === "X";
  const nodeIds = useMemo(() => {
    const data = isX ? animationData.metadata.crossSectionsX : animationData.metadata.crossSectionsY;
    return data[dataPosition] ?? [];
  }, [animationData.metadata, isX, dataPosition]);

  const color = numberToColor(dataPosition);

  const wallDepth = 100;

  const bottomRotation = useMemo(() => (isX ? [Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0]) as [number, number, number], [isX]);
  const topRotation = useMemo(() => (isX ? [-Math.PI / 2, 0, 0] : [0, -Math.PI / 2, 0]) as [number, number, number], [isX]);

  useFrame(() => {
    if (!groupRef.current || nodeIds.length === 0) return;

    let minA = Infinity, maxA = -Infinity;
    let minB = Infinity, maxB = -Infinity;
    let posConst = 0;

    for (const nodeId of nodeIds) {
      const pos = getNodeVisualPosition(nodeId, frameIndex);
      if (isX) {
        if (pos[1] < minA) minA = pos[1];
        if (pos[1] > maxA) maxA = pos[1];
        if (pos[2] < minB) minB = pos[2];
        if (pos[2] > maxB) maxB = pos[2];
        posConst = pos[0];
      } else {
        if (pos[0] < minA) minA = pos[0];
        if (pos[0] > maxA) maxA = pos[0];
        if (pos[2] < minB) minB = pos[2];
        if (pos[2] > maxB) maxB = pos[2];
        posConst = pos[1];
      }
    }

    const width = maxA - minA;
    const height = maxB - minB;
    if (width <= 0 || height <= 0) return;

    const centerA = (minA + maxA) / 2;
    const centerB = (minB + maxB) / 2;

    if (isX) {
      groupRef.current.position.set(posConst, centerA, centerB);
    } else {
      groupRef.current.position.set(centerA, posConst, centerB);
    }

    if (isX) {
      if (bottomWallRef.current) {
        bottomWallRef.current.scale.set(wallDepth, height, 1);
        bottomWallRef.current.position.set(0, -width / 2, 0);
      }
      if (topWallRef.current) {
        topWallRef.current.scale.set(wallDepth, height, 1);
        topWallRef.current.position.set(0, width / 2, 0);
      }
      if (leftWallRef.current) {
        leftWallRef.current.scale.set(wallDepth, width, 1);
        leftWallRef.current.position.set(0, 0, -height / 2);
      }
      if (rightWallRef.current) {
        rightWallRef.current.scale.set(wallDepth, width, 1);
        rightWallRef.current.position.set(0, 0, height / 2);
      }
    } else {
      if (bottomWallRef.current) {
        bottomWallRef.current.scale.set(height, wallDepth, 1);
        bottomWallRef.current.position.set(-width / 2, 0, 0);
      }
      if (topWallRef.current) {
        topWallRef.current.scale.set(height, wallDepth, 1);
        topWallRef.current.position.set(width / 2, 0, 0);
      }
      if (leftWallRef.current) {
        leftWallRef.current.scale.set(width, wallDepth, 1);
        leftWallRef.current.position.set(0, 0, -height / 2);
      }
      if (rightWallRef.current) {
        rightWallRef.current.scale.set(width, wallDepth, 1);
        rightWallRef.current.position.set(0, 0, height / 2);
      }
    }
  });

  if (nodeIds.length === 0) return null;

  return (
    <group ref={groupRef}>
      <mesh ref={bottomWallRef} rotation={bottomRotation} renderOrder={-5}>
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} side={THREE.BackSide} />
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={topWallRef} rotation={topRotation} renderOrder={-5}>
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} side={THREE.BackSide} />
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={leftWallRef} rotation={[0, Math.PI, 0]} renderOrder={-5}>
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} side={THREE.BackSide} />
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={rightWallRef} rotation={[0, 0, 0]} renderOrder={-5}>
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} side={THREE.BackSide} />
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

export function OpenPanelCrossSectionsRenderer() {
  const { crossSectionIds } = useOpenPanels();

  return (
    <group>
      {crossSectionIds.map((params) => (
        <OpenCrossSectionRect key={`${params.crossSectionType}-${params.position}`} params={params} />
      ))}
    </group>
  );
}
