import { useAnimationData } from "@/features/animation-data/useAnimationData";

import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { assert } from "@/lib/utils";
import Delaunay from "delaunator";
import { useMemo } from "react";
import * as THREE from "three";
import { useFloorVisibility } from "../contexts/useFloorVisibility";
import { useNodePositions } from "../contexts/useNodePositions";
import { useNodeRendering } from "../contexts/useNodeRendering";

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
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { storyOrder, stories } = animationData.metadata;
  const { avgDisplacementPerStory } = animationData.precomputed;
  const { getValueColorForCurrentMetric, getNodeColorForCurrentMetric } = useMetrics();
  const { getNodeVisualPosition, visibleNodes } = useNodePositions();
  const { floorOpacity } = useNodeRendering();

  const storyCount = storyOrder.length;
  const nodeIds = useMemo(() => stories[storyId], [storyId, stories]);

  const avgFloorColor = useMemo((): THREE.Color => {
    const storyIndex = storyOrder.indexOf(storyId);
    assert(storyIndex >= 0, "Story index not found");
    const avg = avgDisplacementPerStory[frameIndex * storyCount + storyIndex];
    return getValueColorForCurrentMetric(avg === 0 ? undefined : avg).color;
  }, [frameIndex, getValueColorForCurrentMetric, avgDisplacementPerStory, storyCount, storyOrder, storyId]);

  // const isHovered = hoveredCrossSection?.storyId === storyId; //TODO: Hovering

  const geometry = useMemo(() => {
    if (nodeIds.length < 3) return null;

    const visibleNodeIds = new Set(visibleNodes);
    const floorNodes = nodeIds.filter((id) => visibleNodeIds.has(id));

    const nodePositions = floorNodes.map((nodeId) => {
      const pos = getNodeVisualPosition(nodeId, frameIndex);
      return { nodeId, pos };
    });

    const points2D = nodePositions.map((p) => [p.pos[0], p.pos[1]] as [number, number]);
    const delaunay = Delaunay.from(points2D);
    const triangles = delaunay.triangles;

    const positions = new Float32Array(triangles.length * 3);
    const colors = new Float32Array(triangles.length * 3);

    for (let i = 0; i < triangles.length; i++) {
      const nodeIdx = triangles[i];
      const nodeId = nodePositions[nodeIdx].nodeId;
      const nodePos = nodePositions[nodeIdx].pos;

      positions[i * 3] = nodePos[0];
      positions[i * 3 + 1] = nodePos[1];
      positions[i * 3 + 2] = nodePos[2];

      const { noValue, color } = getNodeColorForCurrentMetric(frameIndex, nodeId);
      const nodeColor = noValue ? avgFloorColor : color;

      colors[i * 3] = nodeColor.r;
      colors[i * 3 + 1] = nodeColor.g;
      colors[i * 3 + 2] = nodeColor.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return new THREE.Mesh(geom);
  }, [nodeIds, frameIndex, visibleNodes, getNodeColorForCurrentMetric, getNodeVisualPosition, avgFloorColor]);

  const handlePointerOver = (e: PointerEvent) => {
    e.stopPropagation();
    // setHovered({
    //   id: `floor-${storyId}`,
    //   type: "Z",
    //   value: storyId,
    //   nodeIds,
    //   label: `Floor ${storyId}`,
    //   storyId,
    //   screenPos: { x: e.offsetX, y: e.offsetY },
    // });
  };

  const handlePointerOut = (e: PointerEvent) => {
    e.stopPropagation();
    // setHovered(null);
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
  };

  if (!geometry) return null;

  // const opacity = isHovered ? 0.9 : floorOpacity;
  const opacity = floorOpacity;

  const meshes = geometry instanceof THREE.Group ? geometry.children : [geometry];

  return (
    <group onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} onClick={handleClick}>
      {meshes.map((mesh, i) => {
        const child = mesh as THREE.Mesh;
        return (
          <mesh key={i} geometry={child.geometry}>
            <meshBasicMaterial
              attach="material"
              vertexColors
              transparent
              opacity={opacity}
              depthWrite={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
