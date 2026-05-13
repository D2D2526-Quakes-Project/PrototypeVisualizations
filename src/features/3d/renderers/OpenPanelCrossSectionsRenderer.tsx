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
  const meshRef = useRef<THREE.Mesh>(null);
  const { animationData } = useAnimationData();
  const { getNodeVisualPosition } = useNodePositions();
  const { frameIndex } = usePlayback();
  const { crossSectionType, position: dataPosition } = params;

  const isX = crossSectionType === "X";
  const nodeIds = useMemo(() => {
    const data = isX ? animationData.metadata.crossSectionsX : animationData.metadata.crossSectionsY;
    return data[dataPosition] ?? [];
  }, [animationData.metadata, isX, dataPosition]);

  const rotation = useMemo(() => {
    return isX ? [0, Math.PI / 2, 0] : [Math.PI / 2, 0, 0];
  }, [isX]);

  const color = numberToColor(dataPosition);

  useFrame(() => {
    if (!meshRef.current || nodeIds.length === 0) return;

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
      meshRef.current.position.set(posConst, centerA, centerB);
    } else {
      meshRef.current.position.set(centerA, posConst, centerB);
    }
    meshRef.current.scale.set(width, height, 1);
  });

  if (nodeIds.length === 0) return null;

  return (
    <mesh ref={meshRef} rotation={rotation as [number, number, number]} renderOrder={-5}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
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
