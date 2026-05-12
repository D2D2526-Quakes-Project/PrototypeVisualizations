import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import Delaunay from "delaunator";
import { useMemo } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";
import { useNodeRendering } from "../contexts/useNodeRendering";

export function XCrossSectionSlabsRenderer() {
  return <CrossSectionSlabsRendererImpl crossSectionType="x" />;
}

export function YCrossSectionSlabsRenderer() {
  return <CrossSectionSlabsRendererImpl crossSectionType="y" />;
}

function CrossSectionSlabsRendererImpl({ crossSectionType }: { crossSectionType: "x" | "y" }) {
  const { animationData } = useAnimationData();
  const { visibleNodes } = useNodePositions();
  // const { getExpandedPosition } = useExpandedScale();

  const crossSections = useMemo(() => {
    const metadata = animationData.metadata;
    const crossSectionData = crossSectionType === "x" ? metadata.crossSectionsX : metadata.crossSectionsY;

    const result: [string, number[]][] = [];
    for (const [crossSectionPos, nodes] of Object.entries(crossSectionData)) {
      if (nodes.length === 0) continue;

      const visibleNodeIds = new Set(visibleNodes);
      const filteredNodes = nodes.filter((id) => visibleNodeIds.has(id));
      if (filteredNodes.length > 0) result.push([crossSectionPos, filteredNodes]);
    }

    return result;
  }, [animationData.metadata, crossSectionType, visibleNodes]);

  return (
    <group>
      {crossSections.map(([crossSectionPos, nodes]) => (
        <CrossSectionSlab
          crossSectionType={crossSectionType}
          key={crossSectionPos}
          crossSectionPos={crossSectionPos}
          nodeIds={nodes}
        />
      ))}
    </group>
  );
}

function CrossSectionSlab({
  nodeIds,
  crossSectionType,
}: {
  crossSectionPos: string;
  nodeIds: number[];
  crossSectionType: "x" | "y";
}) {
  const { getNodeVisualPosition } = useNodePositions();
  const { frameIndex } = usePlayback();
  const { getNodeColorForCurrentMetric } = useMetrics();
  const { floorOpacity } = useNodeRendering();

  // const crossSectionId = `cross-section-${crossSectionType}-${crossSectionPos}`;
  // const isHovered = hoveredCrossSection?.id === crossSectionId; // TODO: Hovering

  const geometry = useMemo(() => {
    if (nodeIds.length < 3) return null;

    const nodePositions = nodeIds.map((nodeId) => {
      const pos = getNodeVisualPosition(nodeId, frameIndex);
      return { nodeId, pos };
    });

    let points2D: [number, number][];
    if (crossSectionType === "x") {
      points2D = nodePositions.map((p) => [p.pos[1], p.pos[2]] as [number, number]);
    } else {
      points2D = nodePositions.map((p) => [p.pos[0], p.pos[2]] as [number, number]);
    }

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

      const { color } = getNodeColorForCurrentMetric(frameIndex, nodeId);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return new THREE.Mesh(
      geom,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
  }, [nodeIds, frameIndex, getNodeVisualPosition, getNodeColorForCurrentMetric, crossSectionType]);

  const handlePointerOver = (e: PointerEvent) => {
    e.stopPropagation();
    // setHovered({
    //   id: crossSectionId,
    //   type: crossSectionType === "x" ? "X" : "Y",
    //   value: crossSectionPos,
    //   nodeIds,
    //   label: `${crossSectionType.toUpperCase()} Section ${crossSectionPos}`,
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
    //   id: crossSectionId,
    //   type: crossSectionType === "x" ? "X" : "Y",
    //   value: crossSectionPos,
    //   nodeIds,
    //   label: `${crossSectionType.toUpperCase()} Section ${crossSectionPos}`,
    // });
  };

  if (!geometry) return null;

  // const opacity = isHovered ? 0.9 : 0.1;
  const opacity = floorOpacity;

  return (
    <group onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} onClick={handleClick}>
      <mesh geometry={geometry.geometry}>
        <meshBasicMaterial
          attach="material"
          vertexColors
          transparent
          opacity={opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
