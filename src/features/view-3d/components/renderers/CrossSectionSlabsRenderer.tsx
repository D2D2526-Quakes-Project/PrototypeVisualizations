import { usePlayback } from "@/features/playback/PlaybackContext";
import { useColor, useExpandedScale } from "@/features/view-3d/contexts/visualization";
import { useAnimationData } from "@/lib/useAnimationData";
import Delaunay from "delaunator";
import { useMemo } from "react";
import * as THREE from "three";
import { useCrossSectionSelection } from "../../contexts/visualization/CrossSectionSelectionContext";

interface CrossSectionSlabsRendererProps {
  nodeIds: number[];
  cornersOnly?: boolean;
}

export function XCrossSectionSlabsRenderer({ nodeIds, cornersOnly = false }: CrossSectionSlabsRendererProps) {
  return <CrossSectionSlabsRendererImpl nodeIds={nodeIds} cornersOnly={cornersOnly} crossSectionType="x" />;
}

export function YCrossSectionSlabsRenderer({ nodeIds, cornersOnly = false }: CrossSectionSlabsRendererProps) {
  return <CrossSectionSlabsRendererImpl nodeIds={nodeIds} cornersOnly={cornersOnly} crossSectionType="y" />;
}

function CrossSectionSlabsRendererImpl({
  nodeIds,
  cornersOnly = false,
  crossSectionType,
}: CrossSectionSlabsRendererProps & { crossSectionType: "x" | "y" }) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getExpandedPosition } = useExpandedScale();

  const offset = useMemo(
    (): [number, number, number] => [
      -animationData.precomputed.boundingBox.center[0],
      -animationData.precomputed.boundingBox.center[1],
      -animationData.precomputed.boundingBox.min[2],
    ],
    [animationData.precomputed.boundingBox]
  );

  const crossSections = useMemo(() => {
    const metadata = animationData.metadata;
    const crossSectionKey = crossSectionType === "x" ? ("crossSectionsX" as const) : ("crossSectionsY" as const);
    const crossSectionData = metadata[crossSectionKey] as Record<string, number[]> | undefined;

    if (!crossSectionData) {
      return [];
    }

    const result: [string, number[]][] = [];
    for (const [crossSectionPos, nodes] of Object.entries(crossSectionData)) {
      if (nodes.length === 0) continue;

      if (cornersOnly) {
        const cornerSet = new Set<number>();
        const cornerNodes = metadata.corners;
        if (cornerNodes) {
          for (const cornerNodeList of Object.values(cornerNodes)) {
            cornerNodeList.forEach((id) => cornerSet.add(id));
          }
        }
        const filteredNodes = nodes.filter((id) => cornerSet.has(id));
        if (filteredNodes.length > 0) {
          result.push([crossSectionPos, filteredNodes]);
        }
      } else {
        const nodeSet = new Set(nodeIds);
        const filteredNodes = nodes.filter((id) => nodeSet.has(id));
        if (filteredNodes.length > 0) {
          result.push([crossSectionPos, filteredNodes]);
        }
      }
    }

    return result.sort((a, b) => a[0].localeCompare(b[0]));
  }, [nodeIds, animationData.metadata, cornersOnly, crossSectionType]);

  return (
    <group>
      {crossSections.map(([crossSectionPos, nodes]) => (
        <CrossSectionSlab
          key={crossSectionPos}
          crossSectionPos={crossSectionPos}
          nodeIds={nodes}
          frameIndex={frameIndex}
          getExpandedPosition={getExpandedPosition}
          offset={offset}
          cornersOnly={cornersOnly}
          crossSectionType={crossSectionType}
        />
      ))}
    </group>
  );
}

interface CrossSectionSlabProps {
  crossSectionPos: string;
  nodeIds: number[];
  frameIndex: number;
  getExpandedPosition: ReturnType<typeof useExpandedScale>["getExpandedPosition"];
  offset: [number, number, number];
  cornersOnly?: boolean;
  crossSectionType: "x" | "y";
}

function CrossSectionSlab({
  crossSectionPos,
  nodeIds,
  frameIndex,
  getExpandedPosition,
  offset,
  crossSectionType,
}: CrossSectionSlabProps) {
  const { animationData } = useAnimationData();
  const { getNodeColor } = useColor();
  const { hoveredCrossSection, selectCrossSection, setHovered } = useCrossSectionSelection();

  const crossSectionId = `cross-section-${crossSectionType}-${crossSectionPos}`;
  const isHovered = hoveredCrossSection?.id === crossSectionId;

  const geometry = useMemo(() => {
    if (nodeIds.length < 3) {
      return null;
    }

    const nodePositions = nodeIds.map((nodeId) => {
      const pos = animationData.initialPositions.at(nodeId);
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      const expandedPosition = getExpandedPosition(
        [pos[0], pos[1], pos[2]],
        [disp[0], disp[1], disp[2]],
        offset,
        animationData.metadata
      );
      return { nodeId, position: new THREE.Vector3(expandedPosition[0], expandedPosition[1], expandedPosition[2]) };
    });

    let points2D: [number, number][];
    if (crossSectionType === "x") {
      points2D = nodePositions.map((p) => [p.position.y, p.position.z] as [number, number]);
    } else {
      points2D = nodePositions.map((p) => [p.position.x, p.position.z] as [number, number]);
    }

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

      const nodeColor = getNodeColor(nodeId, frameIndex);
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
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
  }, [nodeIds, frameIndex, animationData, getNodeColor, getExpandedPosition, offset, crossSectionType]);

  const handlePointerOver = (e: PointerEvent) => {
    e.stopPropagation();
    setHovered({
      id: crossSectionId,
      type: crossSectionType === "x" ? "X" : "Y",
      value: crossSectionPos,
      nodeIds,
      label: `${crossSectionType.toUpperCase()} Section ${crossSectionPos}`,
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
      id: crossSectionId,
      type: crossSectionType === "x" ? "X" : "Y",
      value: crossSectionPos,
      nodeIds,
      label: `${crossSectionType.toUpperCase()} Section ${crossSectionPos}`,
    });
  };

  if (!geometry) return null;

  const opacity = isHovered ? 0.9 : 0.1;

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
