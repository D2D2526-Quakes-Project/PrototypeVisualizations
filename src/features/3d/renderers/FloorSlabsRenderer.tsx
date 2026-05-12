import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { assert } from "@/lib/utils";
import { useFrame, useThree } from "@react-three/fiber";
import Delaunay from "delaunator";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFloorVisibility } from "../contexts/useFloorVisibility";
import { useNodePositions } from "../contexts/useNodePositions";
import { useNodeRendering } from "../contexts/useNodeRendering";
import { useHover } from "../lib/useHover";

export function FloorSlabsRenderer() {
  const { visibleFloors } = useFloorVisibility();

  return (
    <group>
      {visibleFloors.map((storyId) => (
        <FloorSlab key={storyId} storyId={storyId} />
      ))}
    </group>
  );
}

function FloorSlab({ storyId }: { storyId: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();

  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { storyOrder, stories } = animationData.metadata;
  const { avgDisplacementPerStory } = animationData.precomputed;

  const { getValueColorForCurrentMetric, getNodeColorForCurrentMetric } = useMetrics();
  const { getNodeVisualPosition, visibleNodes } = useNodePositions();
  const { floorOpacity } = useNodeRendering();
  const { hoveredFloor, setHoveredFloor } = useHover();

  const storyCount = storyOrder.length;
  const nodeIds = useMemo(() => stories[storyId], [storyId, stories]);
  const storyIndex = useMemo(() => storyOrder.indexOf(storyId), [storyOrder, storyId]);

  useEffect(() => {
    invalidate();
  }, [invalidate, floorOpacity]);

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

    const positions = new Float32Array(triangles.length * 3);
    const colors = new Float32Array(triangles.length * 3);

    return { floorNodes, triangles, positions, colors };
  }, [nodeIds, visibleNodes, getNodeVisualPosition]);

  useFrame(() => {
    if (!meshRef.current || !topology) return;

    const { floorNodes, triangles } = topology;
    const geometry = meshRef.current.geometry;
    const posAttr = geometry.attributes.position;
    const colAttr = geometry.attributes.color;

    assert(storyIndex >= 0, "Story index not found");
    const avg = avgDisplacementPerStory[frameIndex * storyCount + storyIndex];
    const avgFloorColor = getValueColorForCurrentMetric(avg === 0 ? undefined : avg).color;

    for (let i = 0; i < triangles.length; i++) {
      const nodeIdx = triangles[i];
      const nodeId = floorNodes[nodeIdx];

      const pos = getNodeVisualPosition(nodeId, frameIndex);
      const baseIdx = i * 3;

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
  });

  const handlePointerOver = (e: PointerEvent) => {
    e.stopPropagation();
    setHoveredFloor({ type: "floor", storyId, screenPos: { x: e.offsetX, y: e.offsetY } });
  };

  const handlePointerOut = (e: PointerEvent) => {
    e.stopPropagation();
    setHoveredFloor(null);
  };

  const handleClick = (e: PointerEvent) => {
    e.stopPropagation();
    // selectCrossSection({
    //   id: `floor-${storyId}`,
    //   type: "Z",
    //   value: storyId,
    //   nodeIds,
    //   label: `Floor ${storyId}`,
    //   storyId,
    // });
    // TODO: Open floor panel
  };

  if (!topology) return null;

  const opacity = hoveredFloor?.storyId === storyId ? 1 : floorOpacity;

  return (
    <mesh
      ref={meshRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[topology.positions, 3]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-color" args={[topology.colors, 3]} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <meshBasicMaterial vertexColors transparent opacity={opacity} depthWrite={opacity == 1} side={THREE.DoubleSide} />
    </mesh>
  );
}
