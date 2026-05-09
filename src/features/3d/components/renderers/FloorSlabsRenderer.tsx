import { useColor, useExpandedScale, useFloorVisibility } from "@/features/3d/contexts/visualization";
import { useVisualDisplacement } from "@/features/3d/lib/visualDisplacement";
import { getMetricConfig } from "@/lib/metrics";
import { useAnimationData } from "@/lib/animation-data/useAnimationData";

import Delaunay from "delaunator";
import { useMemo } from "react";
import * as THREE from "three";
import { useCrossSectionSelection } from "../../contexts/visualization/CrossSectionSelectionContext";
import { usePlayback } from "@/features/playback/usePlayback";

interface FloorSlabsRendererProps {
  nodeIds: number[];
  cornersOnly?: boolean;
  floorOpacity?: number;
}

export function FloorSlabsRenderer({ nodeIds, cornersOnly = false, floorOpacity = 0.2 }: FloorSlabsRendererProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getExpandedPosition } = useExpandedScale();
  const { visibleFloors } = useFloorVisibility();

  const offset = useMemo(
    (): [number, number, number] => [
      -animationData.precomputed.boundingBox.center[0],
      -animationData.precomputed.boundingBox.center[1],
      -animationData.precomputed.boundingBox.min[2],
    ],
    [animationData.precomputed.boundingBox]
  );

  const stories: [string, number[]][] = useMemo(() => {
    const visibles = Object.entries(animationData.metadata.stories).filter(([storyId]) => visibleFloors.has(storyId));
    const allNodes = new Set(nodeIds);
    return visibles.map(([storyId, nodes]) => {
      const thisFloor = new Set(nodes);
      const intersection = thisFloor.intersection(allNodes);
      return [storyId, Array.from(intersection)];
    });
  }, [animationData.metadata, visibleFloors, nodeIds]);

  return (
    <group>
      {stories.map(([storyId, nodes]) => (
        <FloorSlab
          key={storyId}
          storyId={storyId}
          nodeIds={nodes}
          frameIndex={frameIndex}
          getExpandedPosition={getExpandedPosition}
          offset={offset}
          cornersOnly={cornersOnly}
          floorOpacity={floorOpacity}
        />
      ))}
    </group>
  );
}

interface FloorSlabProps {
  storyId: string;
  nodeIds: number[];
  frameIndex: number;
  getExpandedPosition: ReturnType<typeof useExpandedScale>["getExpandedPosition"];
  offset: [number, number, number];
  cornersOnly?: boolean;
  floorOpacity?: number;
}

function FloorSlab({
  storyId,
  nodeIds,
  frameIndex,
  getExpandedPosition,
  offset,
  cornersOnly = false,
  floorOpacity = 0.2,
}: FloorSlabProps) {
  const { animationData } = useAnimationData();
  const { getNodeColor: getRawNodeColor } = useColor();
  const { getColorFromValue } = useColor();
  const { hoveredCrossSection, selectCrossSection, setHovered } = useCrossSectionSelection();
  const {
    displacement: visualDisplacement,
    isNodeInterpolated,
    getNodeColor: getVisualNodeColor,
  } = useVisualDisplacement();

  const currentMetric_ = useViewStore((s) => s.currentMetric);
  const metricConfig = useMemo(() => getMetricConfig(currentMetric_), [currentMetric_]);
  const maxValue = useMemo(() => metricConfig.getPrecomputedMax(animationData), [animationData, metricConfig]);

  const avgFloorColor = useMemo((): THREE.Color => {
    if (nodeIds.length === 0 || maxValue === 0) return new THREE.Color(0.5, 0.5, 0.5);

    let sum = 0;
    let count = 0;

    for (const nodeId of nodeIds) {
      const isNodeMissing = isNodeInterpolated(nodeId);
      if (isNodeMissing) continue;
      const value = metricConfig.getValue(animationData, frameIndex, nodeId)!;
      sum += value;
      count += 1;
    }

    if (count === 0) return new THREE.Color(0.5, 0.5, 0.5);

    const avgValue = sum / count;
    return getColorFromValue(avgValue);
  }, [animationData, frameIndex, maxValue, metricConfig, nodeIds, getColorFromValue, isNodeInterpolated]);

  const isHovered = hoveredCrossSection?.storyId === storyId;

  const geometry = useMemo(() => {
    if (nodeIds.length < 3) {
      return null;
    }

    let floorNodes;

    if (cornersOnly) {
      const corners = animationData.metadata.cornerNodes[storyId];
      if (!corners) {
        return null;
      }

      floorNodes = [corners.NE, corners.NW, corners.SE, corners.SW];
    } else {
      floorNodes = nodeIds;
    }

    const nodePositions = floorNodes.map((nodeId) => {
      const pos = animationData.initialPositions.at(nodeId);
      const disp = visualDisplacement.atFrame(frameIndex).at(nodeId);
      const expandedPosition = getExpandedPosition(
        [pos[0], pos[1], pos[2]],
        [disp[0], disp[1], disp[2]],
        offset,
        animationData.metadata
      );
      return { nodeId, position: new THREE.Vector3(expandedPosition[0], expandedPosition[1], expandedPosition[2]) };
    });

    const points2D = nodePositions.map((p) => [p.position.x, p.position.y] as [number, number]);
    const delaunay = Delaunay.from(points2D);
    const triangles = delaunay.triangles;

    const positions = new Float32Array(triangles.length * 3);
    const colors = new Float32Array(triangles.length * 3);

    for (let i = 0; i < triangles.length; i++) {
      const nodeIdx = triangles[i];
      const nodeId = nodePositions[nodeIdx].nodeId;
      const nodePos = nodePositions[nodeIdx].position;

      positions[i * 3] = nodePos.x;
      positions[i * 3 + 1] = nodePos.y;
      positions[i * 3 + 2] = nodePos.z;

      const nodeColor = isNodeInterpolated(nodeId)
        ? avgFloorColor
        : getVisualNodeColor(nodeId, frameIndex, getRawNodeColor);

      colors[i * 3] = nodeColor.r;
      colors[i * 3 + 1] = nodeColor.g;
      colors[i * 3 + 2] = nodeColor.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return new THREE.Mesh(
      geom,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: floorOpacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
  }, [
    nodeIds,
    frameIndex,
    animationData,
    getRawNodeColor,
    getVisualNodeColor,
    getExpandedPosition,
    offset,
    cornersOnly,
    storyId,
    floorOpacity,
    visualDisplacement,
    avgFloorColor,
    isNodeInterpolated,
  ]);

  const handlePointerOver = (e: PointerEvent) => {
    e.stopPropagation();
    setHovered({
      id: `floor-${storyId}`,
      type: "Z",
      value: storyId,
      nodeIds,
      label: `Floor ${storyId}`,
      storyId,
      screenPos: { x: e.offsetX, y: e.offsetY },
    });
  };

  const handlePointerOut = (e: PointerEvent) => {
    e.stopPropagation();
    setHovered(null);
  };

  const handleClick = (e: PointerEvent) => {
    e.stopPropagation();
    selectCrossSection({
      id: `floor-${storyId}`,
      type: "Z",
      value: storyId,
      nodeIds,
      label: `Floor ${storyId}`,
      storyId,
    });
  };

  if (!geometry) return null;

  const opacity = isHovered ? 0.9 : floorOpacity;

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
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
