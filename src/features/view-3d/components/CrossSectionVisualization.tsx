import { usePlayback } from "@/features/playback/PlaybackContext";
import { useColor, useExpandedScale, useThresholds } from "@/features/view-3d/contexts/visualization";
import { getMetricConfig } from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";
import { UNIT_SCALE } from "@/lib/utils";
import { useViewStore } from "@/state";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { HorizontalConnectionsRenderer } from "./renderers/HorizontalConnectionsRenderer";
import { VerticalConnectionsRenderer } from "./renderers/VerticalConnectionsRenderer";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

interface CrossSectionVisualizationProps {
  nodeIds: number[];
  crossSectionType: "X" | "Y";
  width: number;
}

function CrossSectionScene({ nodeIds }: { nodeIds: number[] }) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { getExpandedPosition } = useExpandedScale();
  const { getNodeColor, currentMetric } = useColor();
  const { thresholds } = useThresholds();
  const nodeScale = useViewStore((s) => s.nodeScale);
  const belowThresholdNodeScale = useViewStore((s) => s.belowThresholdNodeScale);
  const renderVerticalConnections = useViewStore((s) => s.renderVerticalConnections);
  const renderHorizontalConnections = useViewStore((s) => s.renderHorizontalConnections);
  const connectionLineWidth = useViewStore((s) => s.connectionLineWidth);
  const connectionLineOpacity = useViewStore((s) => s.connectionLineOpacity);

  const offsets = useMemo(
    () => ({
      x: -animationData.precomputed.boundingBox.center[0],
      y: -animationData.precomputed.boundingBox.center[1],
      z: -animationData.precomputed.boundingBox.center[2],
    }),
    [animationData.precomputed.boundingBox]
  );

  const basePositions = useMemo(() => {
    const positions = new Float32Array(nodeIds.length * 3);
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      const initialPos = animationData.initialPositions.at(nodeId);
      positions[i * 3 + 0] = initialPos[0];
      positions[i * 3 + 1] = initialPos[1];
      positions[i * 3 + 2] = initialPos[2];
    }
    return positions;
  }, [nodeIds, animationData.initialPositions]);

  const meshRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    if (!meshRef.current || nodeIds.length === 0) return;

    const colorAttr = meshRef.current.geometry.attributes.color;
    if (!colorAttr) return;

    const currentFrame = frameIndex;

    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];

      // Compute displaced position directly
      const initX = basePositions[i * 3 + 0];
      const initY = basePositions[i * 3 + 1];
      const initZ = basePositions[i * 3 + 2];
      const displacement = animationData.displacementLin.atFrame(currentFrame).at(nodeId);
      const expandedPosition = getExpandedPosition(
        nodeId,
        [initX, initY, initZ],
        [displacement[0], displacement[1], displacement[2]],
        [offsets.x, offsets.y, offsets.z],
        animationData.metadata
      );

      tempObject.position.set(expandedPosition[0], expandedPosition[1], expandedPosition[2]);

      const metricConfig = getMetricConfig(currentMetric);
      const thresholdValue = thresholds[metricConfig.thresholdKey] ?? 0;
      const maxValue = metricConfig.getPrecomputedMax(animationData);
      const normalizedThreshold = maxValue > 0 ? thresholdValue / maxValue : 0;
      const nodeValue = metricConfig.getValue(animationData, currentFrame, nodeId);
      const normalizedValue = nodeValue !== undefined && maxValue > 0 ? Math.abs(nodeValue) / maxValue : 0;

      const baseNodeScale = (1 / UNIT_SCALE) * nodeScale;
      const passesThreshold = normalizedValue >= normalizedThreshold && thresholdValue > 0;
      const effectiveScale = passesThreshold ? baseNodeScale : baseNodeScale * belowThresholdNodeScale;
      const scale = effectiveScale;
      tempObject.scale.set(scale, scale, scale);

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      // Compute color directly in the loop
      const color = getNodeColor(nodeId, currentFrame);
      tempColor.setRGB(color.r, color.g, color.b);
      tempColor.toArray(colorAttr.array, i * 3);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <group scale={UNIT_SCALE}>
      <group position={[offsets.x, offsets.y, offsets.z]}>
        {renderVerticalConnections && (
          <VerticalConnectionsRenderer
            nodeIds={nodeIds}
            lineWidth={connectionLineWidth}
            lineOpacity={connectionLineOpacity}
          />
        )}

        {renderHorizontalConnections && (
          <HorizontalConnectionsRenderer
            nodeIds={nodeIds}
            lineWidth={connectionLineWidth}
            lineOpacity={connectionLineOpacity}
          />
        )}

        <instancedMesh ref={meshRef} args={[undefined, undefined, nodeIds.length]} frustumCulled={false}>
          <sphereGeometry args={[1, 4, 2]}>
            <instancedBufferAttribute
              attach="attributes-color"
              args={[new Float32Array(nodeIds.length * 3).fill(1), 3]}
              usage={THREE.DynamicDrawUsage}
            />
          </sphereGeometry>
          <meshBasicMaterial fog={false} vertexColors />
        </instancedMesh>
      </group>
    </group>
  );
}

export function CrossSectionVisualization({ nodeIds, crossSectionType, width }: CrossSectionVisualizationProps) {
  const { animationData } = useAnimationData();
  const backgroundColor = useViewStore((s) => s.backgroundColor);
  const boundingBox = useMemo(() => animationData.precomputed.boundingBox, [animationData.precomputed.boundingBox]);
  const widthSpan = crossSectionType == "X" ? boundingBox.span[1] : boundingBox.span[0];
  const aspect = boundingBox.span[2] / widthSpan;
  const height = width * aspect;
  return (
    <div
      style={{ width: width, height: height }}
      className="overflow-hidden rounded border border-neutral-300 bg-neutral-900">
      <Canvas
        frameloop="demand"
        orthographic
        linear
        flat
        camera={{
          zoom: 0.9,
          position: crossSectionType == "X" ? [-100, 0, 0] : [0, -100, 0],
          up: [0, 0, 1],
          // near: -1000,
          // far: 1000,
          left: (-widthSpan / 2) * UNIT_SCALE,
          right: (widthSpan / 2) * UNIT_SCALE,
          top: (boundingBox.span[2] / 2) * UNIT_SCALE,
          bottom: (-boundingBox.span[2] / 2) * UNIT_SCALE,
        }}
        onCreated={({ scene }) => {
          scene.fog = null;
        }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ width: width, height: height }}>
        <color attach="background" args={[backgroundColor]} />
        <ambientLight intensity={2} />
        <hemisphereLight intensity={0.5} groundColor="#1a1a1a" position={[0, 0, 100]} />
        <CrossSectionScene nodeIds={nodeIds} />
      </Canvas>
    </div>
  );
}
