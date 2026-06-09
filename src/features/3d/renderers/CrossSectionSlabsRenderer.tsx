import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useOpenPanels } from "@/features/dockview/useOpenPanels";
import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { useFrame } from "@react-three/fiber";
import Delaunay from "delaunator";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";
import { useNodeRendering } from "../contexts/useNodeRendering";
import { useHover } from "../lib/useHover";
import { useCanvasState } from "../contexts/CanvasContext";

export function XCrossSectionSlabsRenderer() {
  return <CrossSectionSlabsRendererImpl crossSectionType="x" />;
}

export function YCrossSectionSlabsRenderer() {
  return <CrossSectionSlabsRendererImpl crossSectionType="y" />;
}

function CrossSectionSlabsRendererImpl({ crossSectionType }: { crossSectionType: "x" | "y" }) {
  const { animationData } = useAnimationData();
  const { visibleNodes } = useNodePositions();

  const crossSections = useMemo(() => {
    const metadata = animationData.metadata;
    const crossSectionData = crossSectionType === "x" ? metadata.crossSectionsX : metadata.crossSectionsY;

    const result: [string, number[]][] = [];
    const visibleNodeIds = new Set(visibleNodes);

    for (const [crossSectionPos, nodes] of Object.entries(crossSectionData)) {
      if (nodes.length === 0) continue;

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
  crossSectionPos,
}: {
  crossSectionPos: string;
  nodeIds: number[];
  crossSectionType: "x" | "y";
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { getNodeVisualPosition } = useNodePositions();
  const { frameIndex } = usePlayback();
  const { getNodeColorForCurrentMetric } = useMetrics();
  const { floorOpacity } = useNodeRendering();
  const { hoveredCrossSection, setHoveredCrossSection } = useHover();
  const { openCrossSectionPanel } = useOpenPanels();
  const { panelId } = useCanvasState();

  const topology = useMemo(() => {
    if (nodeIds.length < 3) return null;

    const points2D = nodeIds.map((nodeId) => {
      const pos = getNodeVisualPosition(nodeId, 0);
      return crossSectionType === "x" ? ([pos[1], pos[2]] as [number, number]) : ([pos[0], pos[2]] as [number, number]);
    });

    const delaunay = Delaunay.from(points2D);
    const triangles = delaunay.triangles;

    const positions = new Float32Array(triangles.length * 3);
    const colors = new Float32Array(triangles.length * 3);

    return { nodeIds, triangles, positions, colors };
  }, [nodeIds, crossSectionType, getNodeVisualPosition]);

  useFrame(() => {
    if (!meshRef.current || !topology) return;

    const { triangles, nodeIds: topologyNodes } = topology;
    const geometry = meshRef.current.geometry;
    const posAttr = geometry.attributes.position;
    const colAttr = geometry.attributes.color;

    for (let i = 0; i < triangles.length; i++) {
      const nodeIdx = triangles[i];
      const nodeId = topologyNodes[nodeIdx];

      const pos = getNodeVisualPosition(nodeId, frameIndex);

      const baseIdx = i * 3;

      posAttr.array[baseIdx] = pos[0];
      posAttr.array[baseIdx + 1] = pos[1];
      posAttr.array[baseIdx + 2] = pos[2];

      // Update Color
      const { color } = getNodeColorForCurrentMetric(nodeId, frameIndex);

      colAttr.array[baseIdx] = color.r;
      colAttr.array[baseIdx + 1] = color.g;
      colAttr.array[baseIdx + 2] = color.b;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  const handlePointerOver = (e: PointerEvent) => {
    e.stopPropagation();
    setHoveredCrossSection({
      type: "crossSection",
      crossSectionId: `${crossSectionType}-${crossSectionPos}`,
      screenPos: { x: e.offsetX, y: e.offsetY },
      source: panelId,
    });
  };

  const handlePointerOut = (e: PointerEvent) => {
    e.stopPropagation();
    setHoveredCrossSection(null);
  };

  const handleClick = (e: PointerEvent) => {
    e.stopPropagation();
    openCrossSectionPanel({
      crossSectionType: crossSectionType === "x" ? "X" : "Y",
      position: crossSectionPos,
    });
  };

  if (!topology) return null;

  const opacity = hoveredCrossSection?.crossSectionId === `${crossSectionType}-${crossSectionPos}` ? 1 : floorOpacity;

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
