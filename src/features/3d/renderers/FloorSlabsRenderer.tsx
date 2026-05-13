import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useOpenPanels } from "@/features/dockview/useOpenPanels";
import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { useFrame } from "@react-three/fiber";
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
  const posAttrRef = useRef<THREE.BufferAttribute>(null);
  const colAttrRef = useRef<THREE.BufferAttribute>(null);

  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { stories } = animationData.metadata;

  const { getValueColorForCurrentMetric, getNodeColorForCurrentMetric, getNodeValueForCurrentMetric } = useMetrics();
  const { getNodeVisualPosition, visibleNodes } = useNodePositions();
  const { floorOpacity } = useNodeRendering();
  const { hoveredFloor, setHoveredFloor } = useHover();
  const { openFloorPanel } = useOpenPanels();

  const nodeIds = useMemo(() => stories[storyId], [storyId, stories]);

  const isHovered = useMemo(() => hoveredFloor?.storyId === storyId, [hoveredFloor?.storyId, storyId]);
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

  useFrame(() => {
    const posAttr = posAttrRef.current;
    const colAttr = colAttrRef.current;
    const mesh = meshRef.current;
    if (!posAttr || !colAttr || !mesh || !topology) return;

    const { floorNodes, triangles } = topology;

    let total = 0;
    let count = 0;
    for (const nodeId of floorNodes) {
      const value = getNodeValueForCurrentMetric(nodeId, frameIndex);
      if (value == undefined || !isFinite(value)) continue;
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
    openFloorPanel(storyId);
  };

  if (!topology) return null;

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
          args={[new Float32Array(topology.triangles.length * 3), 3]}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          ref={colAttrRef}
          attach="attributes-color"
          args={[new Float32Array(topology.triangles.length * 3), 3]}
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
}
