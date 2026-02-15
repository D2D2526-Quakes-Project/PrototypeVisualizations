import { usePlayback } from "@/components/playback/PlaybackContext";
import { useColor, useExplodedView, useSliceSelection } from "@/contexts/visualization";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useMemo } from "react";
import * as THREE from "three";

interface FloorSlabsRendererProps {
  nodeIds: number[];
}

export function FloorSlabsRenderer({ nodeIds }: FloorSlabsRendererProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getExplodedPosition } = useExplodedView();

  const offsetX = -animationData.precomputed.boundingBox.center[0];
  const offsetY = -animationData.precomputed.boundingBox.center[1];
  const offsetZ = -animationData.precomputed.boundingBox.min[2];
  const offset: [number, number, number] = [offsetX, offsetY, offsetZ];

  const stories = useMemo(() => {
    const storyMap = new Map<string, number[]>();
    
    nodeIds.forEach(nodeId => {
      for (const [storyId, nodes] of Object.entries(animationData.metadata.stories)) {
        if (nodes.includes(nodeId)) {
          if (!storyMap.has(storyId)) {
            storyMap.set(storyId, []);
          }
          storyMap.get(storyId)!.push(nodeId);
          break;
        }
      }
    });

    return Array.from(storyMap.entries()).sort((a, b) => {
      return animationData.metadata.storyOrder.indexOf(a[0]) - animationData.metadata.storyOrder.indexOf(b[0]);
    });
  }, [nodeIds, animationData.metadata]);

  return (
    <group>
      {stories.map(([storyId, nodes]) => (
        <FloorSlab 
          key={storyId} 
          storyId={storyId} 
          nodeIds={nodes} 
          frameIndex={frameIndex}
          getExplodedPosition={getExplodedPosition}
          offset={offset}
        />
      ))}
    </group>
  );
}

interface FloorSlabProps {
  storyId: string;
  nodeIds: number[];
  frameIndex: number;
  getExplodedPosition: ReturnType<typeof useExplodedView>['getExplodedPosition'];
  offset: [number, number, number];
}

function FloorSlab({ storyId, nodeIds, frameIndex, getExplodedPosition, offset }: FloorSlabProps) {
  const { animationData } = useAnimationData();
  const { getNodeColor } = useColor();
  const { hoveredSlice, selectSlice, setHovered } = useSliceSelection();

  const isHovered = hoveredSlice?.storyId === storyId;

  const { geometry, color } = useMemo(() => {
    if (nodeIds.length < 3) {
      return { geometry: null, color: new THREE.Color(0.5, 0.5, 0.5) };
    }

    const positions = nodeIds.map(nodeId => {
      const pos = animationData.initialPositions.at(nodeId);
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      const exploded = getExplodedPosition(
        nodeId,
        [pos[0], pos[1], pos[2]],
        [disp[0], disp[1], disp[2]],
        offset,
        animationData.metadata
      );
      return new THREE.Vector3(exploded[0], exploded[1], exploded[2]);
    });

    // Find bounding box in 2D (X-Y plane)
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));

    // Create a simple quad for the floor
    const avgZ = positions.reduce((sum, p) => sum + p.z, 0) / positions.length;
    
    const shape = new THREE.Shape();
    shape.moveTo(minX, minY);
    shape.lineTo(maxX, minY);
    shape.lineTo(maxX, maxY);
    shape.lineTo(minX, maxY);
    shape.lineTo(minX, minY);

    const geom = new THREE.ShapeGeometry(shape);
    geom.translate(0, 0, avgZ);

    // Average color of all nodes
    const colors = nodeIds.map(nid => getNodeColor(nid));
    const avgColor = new THREE.Color(
      colors.reduce((s, c) => s + c.r, 0) / colors.length,
      colors.reduce((s, c) => s + c.g, 0) / colors.length,
      colors.reduce((s, c) => s + c.b, 0) / colors.length
    );

    return { geometry: geom, color: avgColor };
  }, [nodeIds, frameIndex, animationData, getNodeColor, getExplodedPosition, offset]);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered({
      id: `floor-${storyId}`,
      type: 'floor',
      value: storyId,
      nodeIds,
      label: `Floor ${storyId}`,
      storyId,
    });
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(null);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectSlice({
      id: `floor-${storyId}`,
      type: 'floor',
      value: storyId,
      nodeIds,
      label: `Floor ${storyId}`,
      storyId,
    });
  };

  if (!geometry) return null;

  return (
    <mesh 
      geometry={geometry}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={isHovered ? 0.9 : 0.6} 
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
