import { usePlayback } from "@/features/playback/PlaybackContext";
import { useColor, useExpandedScale } from "@/features/view-3d/contexts/visualization";
import type { BuildingAnimationData } from "@/lib/types";
import { useAnimationData } from "@/lib/useAnimationData";
import { converter, formatHex, interpolate } from "culori";
import Delaunay from "delaunator";
import { useMemo } from "react";
import * as THREE from "three";
import { useCrossSectionSelection } from "../../contexts/visualization/CrossSectionSelectionContext";

const blue900 = formatHex("oklch(37.9% 0.146 265.522)")!;
const blue600 = formatHex("oklch(54.6% 0.245 262.881)")!;
const blue400 = formatHex("oklch(70.7% 0.165 254.624)")!;
const white = formatHex("#fff")!;
const red400 = formatHex("oklch(70.4% 0.191 22.216)")!;
const red600 = formatHex("oklch(57.7% 0.245 27.325)")!;
const red900 = formatHex("oklch(39.6% 0.141 25.723)")!;
const driftColorMap = interpolate(
  [
    [blue900, -1],
    [blue600, -0.51],
    [blue400, -0.5],
    [white, 0],
    [red400, 0.5],
    [red600, 0.51],
    [red900, 1],
  ],
  "oklab"
);
const rgbConverter = converter("rgb");

interface FloorSlabsRendererProps {
  nodeIds: number[];
  cornersOnly?: boolean;
}

export function FloorSlabsRenderer({ nodeIds, cornersOnly = false }: FloorSlabsRendererProps) {
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

  const stories = useMemo(() => {
    if (cornersOnly) {
      return animationData.metadata.storyOrder.map((storyId) => {
        const corners = animationData.metadata.cornerNodes[storyId];
        const nodeIds = corners
          ? Object.values(corners).filter((id): id is number => typeof id === "number" && id >= 0)
          : [];
        return [storyId, nodeIds] as [string, number[]];
      });
    }

    const storyMap = new Map<string, number[]>();

    nodeIds.forEach((nodeId) => {
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
  }, [nodeIds, animationData.metadata, cornersOnly]);

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
}

function FloorSlab({ storyId, nodeIds, frameIndex, getExpandedPosition, offset, cornersOnly = false }: FloorSlabProps) {
  const { animationData } = useAnimationData();
  const { getNodeColor } = useColor();
  const { hoveredCrossSection, selectCrossSection, setHovered } = useCrossSectionSelection();

  const isHovered = hoveredCrossSection?.storyId === storyId;

  const geometry = useMemo(() => {
    if (nodeIds.length < 3) {
      return null;
    }

    if (cornersOnly) {
      const corners = animationData.metadata.cornerNodes[storyId];
      if (!corners) {
        return null;
      }

      const storyIndex = animationData.metadata.storyOrder.indexOf(storyId);
      const precomputed = animationData.precomputed as BuildingAnimationData["precomputed"];
      const drifts = precomputed.storyDrift.getStoryDrift(storyIndex, frameIndex);
      const peaks = precomputed.peakStoryDrift[storyId] ?? { NW: 0, NE: 0, SW: 0, SE: 0 };

      const cornerData: { corner: string; position: THREE.Vector3; color: THREE.Color }[] = [];
      const cornerOrder = ["NW", "NE", "SW", "SE"] as const;

      cornerOrder.forEach((corner, idx) => {
        const nodeId = corners[corner];
        if (typeof nodeId !== "number" || nodeId < 0) return;

        const pos = animationData.initialPositions.at(nodeId);
        const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
        const expandedPosition = getExpandedPosition(
          nodeId,
          [pos[0], pos[1], pos[2]],
          [disp[0], disp[1], disp[2]],
          offset,
          animationData.metadata
        );
        const position = new THREE.Vector3(expandedPosition[0], expandedPosition[1], expandedPosition[2]);

        const drift = drifts[idx];
        const peak = peaks[corner];
        const ratio = drift / (peak || 0.0001);
        const colorHex = formatHex(driftColorMap(ratio));
        const rgb = rgbConverter(colorHex);
        const color = rgb ? new THREE.Color(rgb.r, rgb.g, rgb.b) : new THREE.Color(1, 1, 1);

        cornerData.push({ corner, position, color });
      });

      if (cornerData.length < 4) {
        return null;
      }

      const center = new THREE.Vector3(0, 0, 0);
      cornerData.forEach((c) => center.add(c.position));
      center.divideScalar(cornerData.length);

      const geometryGroup = new THREE.Group();

      const quadDefinitions = [
        { corner: "NW", xEdge: center.x, yEdge: center.y },
        { corner: "NE", xEdge: center.x, yEdge: center.y },
        { corner: "SW", xEdge: center.x, yEdge: center.y },
        { corner: "SE", xEdge: center.x, yEdge: center.y },
      ];

      quadDefinitions.forEach((quadDef) => {
        const cornerPos = cornerData.find((c) => c.corner === quadDef.corner)?.position;
        const cornerColor = cornerData.find((c) => c.corner === quadDef.corner)?.color;
        if (!cornerPos || !cornerColor) return;

        const z = cornerPos.z;

        const pCorner = cornerPos;
        const pXEdge = new THREE.Vector3(quadDef.xEdge, cornerPos.y, z);
        const pYEdge = new THREE.Vector3(cornerPos.x, quadDef.yEdge, z);
        const pCenter = center;

        const positions = new Float32Array([
          pCorner.x,
          pCorner.y,
          pCorner.z,
          pXEdge.x,
          pXEdge.y,
          pXEdge.z,
          pCenter.x,
          pCenter.y,
          pCenter.z,
          pCorner.x,
          pCorner.y,
          pCorner.z,
          pYEdge.x,
          pYEdge.y,
          pYEdge.z,
          pCenter.x,
          pCenter.y,
          pCenter.z,
        ]);

        const colors = new Float32Array(18);
        for (let i = 0; i < 6; i++) {
          colors[i * 3] = cornerColor.r;
          colors[i * 3 + 1] = cornerColor.g;
          colors[i * 3 + 2] = cornerColor.b;
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mesh = new THREE.Mesh(
          geom,
          new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );

        geometryGroup.add(mesh);
      });

      return geometryGroup;
    }

    const nodePositions = nodeIds.map((nodeId) => {
      const pos = animationData.initialPositions.at(nodeId);
      const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
      const expandedPosition = getExpandedPosition(
        nodeId,
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

    const avgZ = nodePositions.reduce((sum, p) => sum + p.position.z, 0) / nodePositions.length;

    for (let i = 0; i < triangles.length; i++) {
      const nodeIdx = triangles[i];
      const nodeId = nodePositions[nodeIdx].nodeId;
      const nodePos = nodePositions[nodeIdx].position;

      positions[i * 3] = nodePos.x;
      positions[i * 3 + 1] = nodePos.y;
      positions[i * 3 + 2] = avgZ;

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
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
  }, [nodeIds, frameIndex, animationData, getNodeColor, getExpandedPosition, offset, cornersOnly, storyId]);

  const handlePointerOver = (e: PointerEvent) => {
    e.stopPropagation();
    setHovered({
      id: `floor-${storyId}`,
      type: "floor",
      value: storyId,
      nodeIds,
      label: `Floor ${storyId}`,
      storyId,
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
      type: "floor",
      value: storyId,
      nodeIds,
      label: `Floor ${storyId}`,
      storyId,
    });
  };

  if (!geometry) return null;

  const opacity = isHovered ? 0.9 : 0.6;

  return (
    <group onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} onClick={handleClick}>
      {geometry instanceof THREE.Group ? (
        geometry.children.map((mesh, i) => {
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
        })
      ) : (
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
      )}
    </group>
  );
}
