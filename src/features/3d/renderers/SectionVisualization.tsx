import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { UNIT_SCALE } from "@/lib/utils";
import { useGlobalStore } from "@/state";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useNodePositions } from "../contexts/useNodePositions";
import { useNodeRendering } from "../contexts/useNodeRendering";
import { useRenderModes } from "../lib/useRenderModes";
import { BoundingGeometryRenderer } from "./BoundingGeometryRenderer";
import { HorizontalConnectionsRenderer } from "./HorizontalConnectionsRenderer";
import { VerticalConnectionsRenderer } from "./VerticalConnectionsRenderer";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export type ViewMode = "floor" | "x" | "y";

interface SectionVisualizationProps {
  nodeIds: number[];
  width: number;
  viewMode: ViewMode;
}

type Axis = "x" | "y" | "z";

const VIEW_MODE_TO_AXIS: Record<ViewMode, Axis> = {
  floor: "z",
  x: "x",
  y: "y",
};

function SectionScene({ nodeIds, axis }: { nodeIds: number[]; axis: Axis }) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const { getNodeColorForCurrentMetric, isCurrentMetricHinge: renderHingeNodes } = useMetrics();
  const { getNodeVisualPosition, buildingOffset } = useNodePositions();
  const { nodeScale, nodeOpacity, belowThresholdNodeScale, hingeNodeScale, belowThresholdHingeScale } =
    useNodeRendering();
  const { renderHorizontalConnections, renderVerticalConnections } = useRenderModes();

  const buildingHeightCenter = axis !== "z" ? animationData.precomputed.boundingBox.span[2] / 2 : 0;

  const hingeNodeGeometry = useMemo(() => {
    if (!animationData.hingeData || !animationData.beamData) return null;
    if (nodeIds.length === 0) return null;

    const visibleNodeSet = new Set(nodeIds);
    const visibleNodesWithHinges = [];
    for (let i = 0; i < animationData.hingeData.count; i++) {
      const row = animationData.hingeData.getRow(i);
      const beamIndex = row.beamIndex;

      const beam = animationData.beamData.getRow(beamIndex);
      const iNode = beam.iNodeIndex;
      const jNode = beam.jNodeIndex;

      if (visibleNodeSet.has(iNode) && visibleNodeSet.has(jNode)) {
        const iNodePos = getNodeVisualPosition(iNode, 0);
        const jNodePos = getNodeVisualPosition(jNode, 0);

        const normal = [jNodePos[0] - iNodePos[0], jNodePos[1] - iNodePos[1], jNodePos[2] - iNodePos[2]];
        const normalLength = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
        normal[0] /= normalLength;
        normal[1] /= normalLength;
        normal[2] /= normalLength;

        if (row.endMask & 0b01) {
          visibleNodesWithHinges.push({ hingeIdx: i, endCap: 1, pos: iNodePos, normal: normal });
        }
        if (row.endMask & 0b10) {
          visibleNodesWithHinges.push({
            hingeIdx: i,
            endCap: 2,
            pos: jNodePos,
            normal: [-normal[0], -normal[1], -normal[2]],
          });
        }
      }
    }

    return {
      count: visibleNodesWithHinges.length,
      visibleNodesWithHinges,
    };
  }, [animationData.hingeData, animationData.beamData, nodeIds, getNodeVisualPosition]);

  const nodesMeshRef = useRef<THREE.InstancedMesh>(null);
  const hingeNodesMeshRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    if (!nodesMeshRef.current || nodeIds.length === 0) return;

    const colorAttr = nodesMeshRef.current.geometry.attributes.color;
    if (!colorAttr) return;

    const currentFrame = frameIndex;

    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      const pos = getNodeVisualPosition(nodeId, currentFrame);
      tempObject.position.set(pos[0], pos[1], pos[2]);

      const { passesThreshold, color } = getNodeColorForCurrentMetric(nodeId, frameIndex);

      const scale = passesThreshold ? nodeScale : nodeScale * belowThresholdNodeScale;
      tempObject.scale.set(scale, scale, scale);

      tempObject.updateMatrix();
      nodesMeshRef.current.setMatrixAt(i, tempObject.matrix);

      tempColor.setRGB(color.r, color.g, color.b);
      tempColor.toArray(colorAttr.array, i * 3);
    }

    nodesMeshRef.current.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  useFrame(() => {
    if (!hingeNodesMeshRef.current) return;
    if (!hingeNodeGeometry) return;

    const { visibleNodesWithHinges } = hingeNodeGeometry;

    const geometry = hingeNodesMeshRef.current.geometry;
    const colorAttr = geometry.attributes.color;
    if (!colorAttr) return;

    for (let i = 0; i < visibleNodesWithHinges.length; i += 1) {
      const { hingeIdx, endCap, pos, normal } = visibleNodesWithHinges[i];
      const { passesThreshold, color } = getNodeColorForCurrentMetric(hingeIdx, endCap);

      const effectiveScale = passesThreshold ? hingeNodeScale : hingeNodeScale * belowThresholdHingeScale;

      const nudge = Math.max(
        nodeScale * 40 + hingeNodeScale * (passesThreshold ? 16 : belowThresholdHingeScale * 16),
        hingeNodeScale * (15 + (passesThreshold ? 16 : belowThresholdHingeScale * 16))
      );
      const nudgedPos = [pos[0] + normal[0] * nudge, pos[1] + normal[1] * nudge, pos[2] + normal[2] * nudge];

      tempObject.scale.set(effectiveScale, effectiveScale, effectiveScale);
      tempObject.rotation.set(0, 0, Math.atan2(normal[1], normal[0]) - Math.PI / 2);
      tempObject.position.set(nudgedPos[0], nudgedPos[1], nudgedPos[2]);

      tempObject.updateMatrix();
      hingeNodesMeshRef.current.setMatrixAt(i, tempObject.matrix);

      tempColor.setRGB(color.r, color.g, color.b);
      tempColor.toArray(colorAttr.array, i * 3);
    }
    hingeNodesMeshRef.current.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <group scale={UNIT_SCALE}>
      <group position={axis !== "z" ? [0, 0, -buildingHeightCenter] : [0, 0, 0]}>
        <group position={[buildingOffset[0], buildingOffset[1], buildingOffset[2]]}>
          <BoundingGeometryRenderer axis={axis} opacity={0.15} />
        </group>
        {renderVerticalConnections && <VerticalConnectionsRenderer nodeIds={nodeIds} />}
        {renderHorizontalConnections && <HorizontalConnectionsRenderer nodeIds={nodeIds} />}

        <instancedMesh ref={nodesMeshRef} args={[undefined, undefined, nodeIds.length]} frustumCulled={false}>
          <sphereGeometry args={[40, 4, 2]}>
            <instancedBufferAttribute
              attach="attributes-color"
              args={[new Float32Array(nodeIds.length * 3).fill(1), 3]}
              usage={THREE.DynamicDrawUsage}
            />
          </sphereGeometry>
          <meshBasicMaterial fog={false} vertexColors transparent opacity={nodeOpacity} />
        </instancedMesh>

        {renderHingeNodes && hingeNodeGeometry && (
          <instancedMesh
            ref={hingeNodesMeshRef}
            args={[undefined, undefined, hingeNodeGeometry.count]}
            frustumCulled={false}>
            <coneGeometry args={[16, 30, 4]}>
              <instancedBufferAttribute
                attach="attributes-color"
                args={[new Float32Array(hingeNodeGeometry.count * 3).fill(1), 3]}
                usage={THREE.DynamicDrawUsage}
              />
            </coneGeometry>
            <meshBasicMaterial fog={false} vertexColors transparent />
          </instancedMesh>
        )}
      </group>
    </group>
  );
}

export function SectionVisualization({ nodeIds, width, viewMode }: SectionVisualizationProps) {
  const { animationData } = useAnimationData();
  const colorTheme = useGlobalStore((s) => s.colorTheme);
  const boundingBox = useMemo(() => animationData.precomputed.boundingBox, [animationData.precomputed.boundingBox]);

  const axis = VIEW_MODE_TO_AXIS[viewMode];

  const widthSpan = useMemo(() => {
    switch (viewMode) {
      case "floor":
        return boundingBox.span[0];
      case "x":
        return boundingBox.span[1];
      case "y":
        return boundingBox.span[0];
    }
  }, [viewMode, boundingBox]);

  const verticalSpan = useMemo(() => {
    switch (viewMode) {
      case "floor":
        return boundingBox.span[1];
      case "x":
      case "y":
        return boundingBox.span[2];
    }
  }, [viewMode, boundingBox]);

  const aspect = verticalSpan / widthSpan;
  const height = width * aspect;

  const cameraProps = useMemo(() => {
    const baseCamera = {
      zoom: 0.9,
      left: (-widthSpan / 2) * UNIT_SCALE,
      right: (widthSpan / 2) * UNIT_SCALE,
      top: (verticalSpan / 2) * UNIT_SCALE,
      bottom: (-verticalSpan / 2) * UNIT_SCALE,
      near: -10000,
      far: 10000,
    };

    switch (viewMode) {
      case "floor":
        return {
          ...baseCamera,
          position: [0, 0, 1000] as const,
          up: [0, 1, 0] as const,
        };
      case "x":
        return {
          ...baseCamera,
          position: [-1000, 0, 0] as const,
          up: [0, 0, 1] as const,
        };
      case "y":
        return {
          ...baseCamera,
          position: [0, -1000, 0] as const,
          up: [0, 0, 1] as const,
        };
    }
  }, [viewMode, widthSpan, verticalSpan]);

  return (
    <div
      style={{ width: width, height: height }}
      className="overflow-hidden rounded border border-neutral-300 bg-neutral-900">
      <Canvas
        frameloop="demand"
        orthographic
        linear
        flat
        camera={cameraProps}
        onCreated={({ scene }) => {
          scene.fog = null;
        }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ width: width, height: height }}>
        <color attach="background" args={[colorTheme.background]} />
        <ambientLight intensity={2} />
        <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />
        <SectionScene nodeIds={nodeIds} axis={axis} />
        {/* <OrbitControls />
        <Box /> */}
      </Canvas>
    </div>
  );
}
