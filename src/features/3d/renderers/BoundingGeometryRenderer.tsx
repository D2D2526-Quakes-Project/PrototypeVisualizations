import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMemo } from "react";
import * as THREE from "three";

interface BoundingGeometryRendererProps {
  axis: "x" | "y" | "z";
  opacity?: number;
  color?: THREE.Color;
}

export function BoundingGeometryRenderer({ axis, opacity = 0.1, color }: BoundingGeometryRendererProps) {
  const { animationData } = useAnimationData();
  const boundingGeometries = animationData.precomputed.boundingGeometries;

  const geometry = useMemo(() => {
    if (!boundingGeometries) return null;

    let bg;
    if (axis === "x") bg = boundingGeometries.xAxis;
    else if (axis === "y") bg = boundingGeometries.yAxis;
    else bg = boundingGeometries.zAxis;

    if (!bg || !bg.vertices || bg.vertices.length === 0 || !bg.triangleIndices || bg.triangleIndices.length === 0) {
      return null;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(bg.vertices, 3));
    geom.setIndex(new THREE.BufferAttribute(bg.triangleIndices, 1));

    return geom;
  }, [boundingGeometries, axis]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={color ?? 0x888888}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
