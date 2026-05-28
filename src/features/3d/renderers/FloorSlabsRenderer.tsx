import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useOpenPanels } from "@/features/dockview/useOpenPanels";
import { useMetrics } from "@/features/metrics/useMetrics";
import { profileStoreStateForBuilding } from "@/state";
import type { HoverItem } from "@/state/liveState";
import { useFrame } from "@react-three/fiber";
import Delaunay from "delaunator";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFloorVisibility } from "../contexts/useFloorVisibility";
import { useNodePositions } from "../contexts/useNodePositions";
import { useNodeRendering } from "../contexts/useNodeRendering";
import { useHover } from "../lib/useHover";

export function FloorSlabsRenderer() {
  const { visibleFloors } = useFloorVisibility();
  const { hoveredFloor, setHoveredFloor } = useHover();

  return (
    <group>
      {visibleFloors.map((storyId) => (
        <FloorSlab
          key={storyId}
          storyId={storyId}
          isHovered={hoveredFloor?.storyId === storyId}
          setHoveredFloor={setHoveredFloor}
        />
      ))}
    </group>
  );
}

const FloorSlab = memo(function FloorSlab({
  storyId,
  isHovered,
  setHoveredFloor,
}: {
  storyId: string;
  isHovered: boolean;
  setHoveredFloor: (hoverItem: HoverItem | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const posAttrRef = useRef<THREE.BufferAttribute>(null);
  const colAttrRef = useRef<THREE.BufferAttribute>(null);

  const { animationData, currentBuilding } = useAnimationData();
  const { stories, displacementMissingNodeIndices } = animationData.metadata;

  const { getValueColorForCurrentMetric, getNodeColorForCurrentMetric, getNodeValueForCurrentMetric } = useMetrics();
  const { getNodeVisualPosition, visibleNodes } = useNodePositions();
  const { floorOpacity } = useNodeRendering();
  const { openFloorPanel } = useOpenPanels();

  const nodeIds = useMemo(() => stories[storyId], [storyId, stories]);
  const isHoveredRef = useRef(isHovered);
  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  const floorOpacityRef = useRef(floorOpacity);
  useEffect(() => {
    floorOpacityRef.current = floorOpacity;
  }, [floorOpacity]);

  const topology = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes);
    const floorNodes = nodeIds.filter((id) => visibleNodeIds.has(id));

    if (floorNodes.length < 3) return null;

    const points2D = floorNodes.map((nodeId) => {
      const pos = getNodeVisualPosition(nodeId, 0);
      return [pos[0], pos[1]] as [number, number];
    });

    const delaunay = Delaunay.from(points2D);
    const triangles = delaunay.triangles;

    return { floorNodes, triangles };
  }, [nodeIds, visibleNodes, getNodeVisualPosition]);

  const bufferArrays = useMemo(() => {
    if (!topology) return null;
    return {
      positions: new Float32Array(topology.triangles.length * 3),
      colors: new Float32Array(topology.triangles.length * 3),
    };
  }, [topology]);

  useFrame(() => {
    const posAttr = posAttrRef.current;
    const colAttr = colAttrRef.current;
    const mesh = meshRef.current;
    if (!posAttr || !colAttr || !mesh || !topology) return;

    const { floorNodes, triangles } = topology;
    const frameIndex = profileStoreStateForBuilding(currentBuilding.folder)?.frameIndex ?? 0;

    let total = 0;
    let count = 0;
    for (const nodeId of floorNodes) {
      const value = getNodeValueForCurrentMetric(nodeId, frameIndex);
      if (value == undefined || displacementMissingNodeIndices.includes(nodeId)) continue;
      total += value;
      count++;
    }
    const metricValueColor = getValueColorForCurrentMetric(total / count);
    const avgFloorColor = metricValueColor.color;

    for (let i = 0; i < triangles.length; i++) {
      const nodeIdx = triangles[i];
      const nodeId = floorNodes[nodeIdx];
      const baseIdx = i * 3;

      const pos = getNodeVisualPosition(nodeId, frameIndex);
      posAttr.array[baseIdx] = pos[0];
      posAttr.array[baseIdx + 1] = pos[1];
      posAttr.array[baseIdx + 2] = pos[2];

      const { noValue, color } = getNodeColorForCurrentMetric(nodeId, frameIndex);
      const nodeColor = noValue ? avgFloorColor : color;
      colAttr.array[baseIdx] = nodeColor.r;
      colAttr.array[baseIdx + 1] = nodeColor.g;
      colAttr.array[baseIdx + 2] = nodeColor.b;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    const mat = mesh.material as THREE.MeshBasicMaterial;
    const targetOpacity = isHoveredRef.current ? 1 : floorOpacityRef.current;
    if (mat.opacity !== targetOpacity) {
      mat.opacity = targetOpacity;
      mat.depthWrite = targetOpacity === 1;
    }
  });

  const handlePointerOver = useCallback(
    (e: PointerEvent) => {
      e.stopPropagation();
      setHoveredFloor({ type: "floor", storyId, screenPos: { x: e.offsetX, y: e.offsetY } });
    },
    [setHoveredFloor, storyId]
  );

  const handlePointerOut = useCallback(
    (e: PointerEvent) => {
      e.stopPropagation();
      setHoveredFloor(null);
    },
    [setHoveredFloor]
  );

  const handleClick = useCallback(
    (e: PointerEvent) => {
      e.stopPropagation();
      openFloorPanel(storyId);
    },
    [openFloorPanel, storyId]
  );

  if (!topology || !bufferArrays) return null;

  return (
    <mesh
      ref={meshRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          ref={posAttrRef}
          attach="attributes-position"
          args={[bufferArrays.positions, 3]}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          ref={colAttrRef}
          attach="attributes-color"
          args={[bufferArrays.colors, 3]}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={floorOpacity}
        depthWrite={floorOpacity === 1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});
