import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { UNIT_SCALE } from "@/lib/utils";
import { useGlobalStore } from "@/state";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFloorVisibility } from "../contexts/useFloorVisibility";

const TICK_LENGTH = 4;
const BOUNDS_PADDING = 8;

export function FloorTickMarks() {
  const { animationData } = useAnimationData();
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { visibleFloors } = useFloorVisibility();
  const tickMarksColor = useGlobalStore((s) => s.colorTheme.tickMarks);

  useFrame(() => {
    if (!groupRef.current) return;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const facingX = Math.sign(direction.x) || 1;
    const facingY = Math.sign(direction.y) || 1;
    groupRef.current.scale.set(facingX, facingY, 1);
  });

  const { baseVertices, verticalVertices, tickVertices } = useMemo(() => {
    const { min, max } = animationData.precomputed.boundingBox;
    const storyElevations = animationData.precomputed.storyElevations;

    const extX = ((max[0] - min[0]) / 2) * UNIT_SCALE + BOUNDS_PADDING;
    const extY = ((max[1] - min[1]) / 2) * UNIT_SCALE + BOUNDS_PADDING;
    const buildingHeight = (max[2] - min[2]) * UNIT_SCALE;
    const maxZ = buildingHeight;

    const floorElevations: number[] = [];
    for (const [key, value] of Object.entries(storyElevations)) {
      if (visibleFloors.includes(key)) {
        floorElevations.push(value * UNIT_SCALE);
      }
    }

    const basePts = new Float32Array([-extX, -extY, 0, extX, -extY, 0, extX, extY, 0, -extX, extY, 0, -extX, -extY, 0]);

    const vertPts = new Float32Array([extX, -extY, 0, extX, -extY, maxZ, -extX, extY, 0, -extX, extY, maxZ]);

    const tickPts: number[] = [];
    for (const z of floorElevations) {
      tickPts.push(extX, -extY, z);
      tickPts.push(extX + TICK_LENGTH, -extY, z);

      tickPts.push(-extX, extY, z);
      tickPts.push(-extX, extY + TICK_LENGTH, z);
    }

    return {
      baseVertices: basePts,
      verticalVertices: vertPts,
      tickVertices: new Float32Array(tickPts),
    };
  }, [animationData.precomputed.boundingBox, animationData.precomputed.storyElevations, visibleFloors]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[baseVertices, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={tickMarksColor} />
      </line>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[verticalVertices, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={tickMarksColor} />
      </lineSegments>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[tickVertices, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={tickMarksColor} />
      </lineSegments>
    </group>
  );
}
