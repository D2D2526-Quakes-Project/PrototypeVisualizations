import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useOpenPanels } from "@/features/dockview/useOpenPanels";
import { UNIT_SCALE } from "@/lib/utils";
import { useGlobalStore } from "@/state";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFloorVisibility } from "../contexts/useFloorVisibility";
import { useHover } from "../lib/useHover";

const TICK_LENGTH = 4;
const TICK_HIT_SIZE = 10;
const BOUNDS_PADDING = 8;

const HOVER_HIGHLIGHT = "#ffffff";

export function FloorTickMarks() {
  const { animationData } = useAnimationData();
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { visibleFloors } = useFloorVisibility();
  const tickMarksColor = useGlobalStore((s) => s.colorTheme.tickMarks);
  const { hoveredFloor, setHoveredFloor } = useHover();
  const { openFloorPanel } = useOpenPanels();

  useFrame(() => {
    if (!groupRef.current) return;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const facingX = Math.sign(direction.x) || 1;
    const facingY = Math.sign(direction.y) || 1;
    groupRef.current.scale.set(facingX, facingY, 1);
  });

  const { baseVertices, verticalVertices, floorData, extX, extY } = useMemo(() => {
    const { min, max } = animationData.precomputed.boundingBox;
    const storyElevations = animationData.precomputed.storyElevations;

    const extX = ((max[0] - min[0]) / 2) * UNIT_SCALE + BOUNDS_PADDING;
    const extY = ((max[1] - min[1]) / 2) * UNIT_SCALE + BOUNDS_PADDING;
    const buildingHeight = (max[2] - min[2]) * UNIT_SCALE;
    const maxZ = buildingHeight;

    const basePts = new Float32Array([-extX, -extY, 0, extX, -extY, 0, extX, extY, 0, -extX, extY, 0, -extX, -extY, 0]);

    const vertPts = new Float32Array([extX, -extY, 0, extX, -extY, maxZ, -extX, extY, 0, -extX, extY, maxZ]);

    const floorData: { storyId: string; elevation: number; tickLineVerts: Float32Array }[] = [];
    for (const [storyId, rawZ] of Object.entries(storyElevations)) {
      if (!visibleFloors.includes(storyId)) continue;
      const z = rawZ * UNIT_SCALE;
      const tickLineVerts = new Float32Array([
        extX, -extY, z, extX + TICK_LENGTH, -extY, z,
        -extX, extY, z, -extX, extY + TICK_LENGTH, z,
      ]);
      floorData.push({ storyId, elevation: z, tickLineVerts });
    }

    return {
      baseVertices: basePts,
      verticalVertices: vertPts,
      floorData,
      extX,
      extY,
    };
  }, [animationData.precomputed.boundingBox, animationData.precomputed.storyElevations, visibleFloors]);

  const handlePointerOver = useCallback(
    (e: PointerEvent, storyId: string) => {
      e.stopPropagation();
      setHoveredFloor({ type: "floor", storyId, screenPos: { x: e.offsetX, y: e.offsetY } });
    },
    [setHoveredFloor]
  );

  const handlePointerOut = useCallback(
    (e: PointerEvent) => {
      e.stopPropagation();
      setHoveredFloor(null);
    },
    [setHoveredFloor]
  );

  const handleClick = useCallback(
    (e: PointerEvent, storyId: string) => {
      e.stopPropagation();
      openFloorPanel(storyId);
    },
    [openFloorPanel]
  );

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
      {floorData.map(({ storyId, elevation, tickLineVerts }) => {
        const isHovered = hoveredFloor?.storyId === storyId;
        return (
          <group key={storyId}>
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[tickLineVerts, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color={isHovered ? HOVER_HIGHLIGHT : tickMarksColor} />
            </lineSegments>
            <mesh
              position={[extX + TICK_LENGTH / 2, -extY, elevation]}
              onPointerOver={(e) => handlePointerOver(e, storyId)}
              onPointerOut={handlePointerOut}
              onClick={(e) => handleClick(e, storyId)}
            >
              <planeGeometry args={[TICK_HIT_SIZE, TICK_HIT_SIZE]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh
              position={[-extX, extY + TICK_LENGTH / 2, elevation]}
              onPointerOver={(e) => handlePointerOver(e, storyId)}
              onPointerOut={handlePointerOut}
              onClick={(e) => handleClick(e, storyId)}
            >
              <planeGeometry args={[TICK_HIT_SIZE, TICK_HIT_SIZE]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
