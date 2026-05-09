import { useAnimationData } from "@/lib/animation-data/useAnimationData";
import { UNIT_SCALE } from "@/lib/utils";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFloorVisibility } from "../contexts/visualization";

const TICK_LENGTH = 4;
const TICK_THICKNESS = 0.4;
const TICK_PADDING = 8;

export function FloorTickMarks() {
  const { animationData } = useAnimationData();
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { visibleFloors } = useFloorVisibility();
  const tickMarksColor = useViewStore((s) => s.colorTheme.tickMarks);

  const { offset, xPositions, yPositions, zPositions } = useMemo(() => {
    const metadata = animationData.metadata;
    const storyElevations = animationData.precomputed.storyElevations;
    const { center, min, max } = animationData.precomputed.boundingBox;

    const xPosSet = new Set<number>();
    const yPosSet = new Set<number>();
    const zPosSet = new Set<number>();

    for (const key of Object.keys(metadata.crossSectionsX)) {
      const pos = parseFloat(key);
      if (!isNaN(pos)) xPosSet.add((pos - center[0]) * UNIT_SCALE);
    }

    for (const key of Object.keys(metadata.crossSectionsY)) {
      const pos = parseFloat(key);
      if (!isNaN(pos)) yPosSet.add((pos - center[1]) * UNIT_SCALE);
    }

    for (const [key, value] of Object.entries(storyElevations)) {
      if (visibleFloors.has(key)) zPosSet.add(value * UNIT_SCALE);
    }

    const offset: [number, number] = [
      -((max[1] - min[1]) / 2) * UNIT_SCALE - TICK_PADDING,
      -((max[0] - min[0]) / 2) * UNIT_SCALE - TICK_PADDING,
    ];

    return {
      offset,
      xPositions: Array.from(xPosSet),
      yPositions: Array.from(yPosSet),
      zPositions: Array.from(zPosSet),
    };
  }, [
    animationData.metadata,
    animationData.precomputed.boundingBox,
    animationData.precomputed.storyElevations,
    visibleFloors,
  ]);

  useFrame(() => {
    if (!groupRef.current) return;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const facingX = Math.sign(direction.x) || 1;
    const facingY = Math.sign(direction.y) || 1;
    groupRef.current.scale.set(facingX, facingY, 1);
  });

  const xTicks = useMemo(
    () =>
      xPositions.map((xPos) => {
        return (
          <mesh key={`x-${xPos}`} position={[xPos, offset[0], 0]}>
            <planeGeometry args={[TICK_THICKNESS, TICK_LENGTH]} />
            <meshBasicMaterial color={tickMarksColor} side={THREE.DoubleSide} />
          </mesh>
        );
      }),
    [xPositions, offset, tickMarksColor]
  );

  const yTicks = useMemo(
    () =>
      yPositions.map((yPos) => {
        return (
          <mesh key={`y-${yPos}`} position={[offset[1], yPos, 0]}>
            <planeGeometry args={[TICK_LENGTH, TICK_THICKNESS]} />
            <meshBasicMaterial color={tickMarksColor} side={THREE.DoubleSide} />
          </mesh>
        );
      }),
    [yPositions, offset, tickMarksColor]
  );

  const zTicks = useMemo(
    () =>
      zPositions.map((zPos) => {
        return (
          <React.Fragment key={`z-${zPos}`}>
            <mesh position={[-offset[1], offset[0], zPos]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
              <planeGeometry args={[TICK_LENGTH, TICK_THICKNESS]} />
              <meshBasicMaterial color={tickMarksColor} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[offset[1], -offset[0], zPos]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[TICK_LENGTH, TICK_THICKNESS]} />
              <meshBasicMaterial color={tickMarksColor} side={THREE.DoubleSide} />
            </mesh>
          </React.Fragment>
        );
      }),
    [zPositions, offset, tickMarksColor]
  );

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {xTicks}
      {yTicks}
      {zTicks}
    </group>
  );
}
