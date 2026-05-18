import { useCanvasState } from "@/features/3d/contexts/CanvasContext";
import { GizmoHelper, useCursor, useGizmoContext } from "@react-three/drei";
import { type ThreeEvent } from "@react-three/fiber";
import * as React from "react";
import { CanvasTexture, Quaternion, Vector3 } from "three";

const DEFAULT_CAMERA_TARGET = new Vector3(0, 0, 0);

export function OrientationArrows() {
  const { orbitControlsRef } = useCanvasState();

  return (
    <GizmoHelper
      alignment="top-left"
      margin={[45, 45]}
      up={[0, 0, 1]}
      onTarget={() => orbitControlsRef.current?.target.clone() ?? DEFAULT_CAMERA_TARGET}
      onUpdate={() => orbitControlsRef.current?.update()}>
      <GizmoAxes />
    </GizmoHelper>
  );
}

// // Axis configurations using classic RGB colors
// const AXES = [
//   { label: "+X", dir: [1, 0, 0], color: "#ef4444", dashed: false },
//   { label: "-X", dir: [-1, 0, 0], color: "#ef4444", dashed: true },
//   { label: "+Y", dir: [0, 1, 0], color: "#22c55e", dashed: false },
//   { label: "-Y", dir: [0, -1, 0], color: "#22c55e", dashed: true },
//   { label: "+Z", dir: [0, 0, 1], color: "#3b82f6", dashed: false },
//   { label: "-Z", dir: [0, 0, -1], color: "#3b82f6", dashed: true },
// ] as const;

// Axis configurations using alternative grayscale colors
const AXES = [
  { label: "+X", dir: [1, 0, 0], color: "#111", dashed: false },
  { label: "-X", dir: [-1, 0, 0], color: "#111", dashed: true },
  { label: "+Y", dir: [0, 1, 0], color: "#555", dashed: false },
  { label: "-Y", dir: [0, -1, 0], color: "#555", dashed: true },
  { label: "+Z", dir: [0, 0, 1], color: "#999", dashed: false },
  { label: "-Z", dir: [0, 0, -1], color: "#999", dashed: true },
] as const;

// Sizing configuration relative to the [60, 60, 60] scale group
const CYLINDER_RADIUS = 0.012;
const AXIS_LENGTH = 0.45;
const LABEL_DISTANCE = 0.5;
const SPRITE_SCALE = 0.3;

/**
 * Draws the actual line. We use cylinders instead of standard WebGL lines
 * to guarantee line thickness works perfectly across all browsers.
 */
function AxisLine({ dir, color, dashed }: { dir: readonly [number, number, number]; color: string; dashed: boolean }) {
  const dirVector = React.useMemo(() => new Vector3(...dir), [dir]);
  const quaternion = React.useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dirVector),
    [dirVector]
  );

  // Solid line for positive axes
  if (!dashed) {
    const center = dirVector.clone().multiplyScalar(AXIS_LENGTH / 2);
    return (
      <mesh position={center} quaternion={quaternion}>
        <cylinderGeometry args={[CYLINDER_RADIUS, CYLINDER_RADIUS, AXIS_LENGTH, 8]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
    );
  }

  // Dotted line (multiple small cylinders) for negative axes
  const segments = 6;
  const segmentLength = AXIS_LENGTH / (segments * 2 - 1);
  return (
    <group>
      {Array.from({ length: segments }).map((_, i) => {
        const centerDistance = i * 2 * segmentLength + segmentLength / 2;
        const center = dirVector.clone().multiplyScalar(centerDistance);
        return (
          <mesh key={i} position={center} quaternion={quaternion}>
            <cylinderGeometry args={[CYLINDER_RADIUS, CYLINDER_RADIUS, segmentLength, 8]} />
            <meshBasicMaterial color={color} depthTest={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * An individual Axis (line + end label)
 */
function Axis({ label, dir, color, dashed }: (typeof AXES)[number]) {
  const { tweenCamera } = useGizmoContext();
  const [hovered, setHovered] = React.useState(false);

  useCursor(hovered);

  // Generates perfect 2D canvas circles that automatically face the camera
  const texture = React.useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const radius = 60;

    // Circle background
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.fillStyle = hovered ? color : "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.fill();

    // Hover border ring
    if (hovered) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = color;
      ctx.stroke();
    }

    // Bold text inside
    // ctx.font = "bold 75px ui-sans-serif, system-ui, -apple-system, sans-serif";
    // ctx.textAlign = "center";
    // ctx.textBaseline = "middle";
    // ctx.fillStyle = hovered ? color : "#ffffff";
    // ctx.fillText(label, center, center + 3);

    ctx.font = "bold 75px ui-sans-serif, system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = hovered ? "#ffffff" : color;
    ctx.fillText(label, center, center + 3);

    return new CanvasTexture(canvas);
  }, [label, color, hovered]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    tweenCamera(new Vector3(...dir));
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
  };

  return (
    <group>
      <AxisLine dir={dir} color={color} dashed={dashed} />
      <sprite
        position={new Vector3(...dir).multiplyScalar(LABEL_DISTANCE)}
        scale={[SPRITE_SCALE, SPRITE_SCALE, SPRITE_SCALE]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}>
        <spriteMaterial map={texture} depthTest={false} transparent />
      </sprite>
    </group>
  );
}

/**
 * Wraps the axes logic and scales them properly for the generic GizmoHelper context overlay.
 */
export const GizmoAxes = () => {
  return (
    <group scale={[60, 60, 60]}>
      {AXES.map((axis) => (
        <Axis key={axis.label} {...axis} />
      ))}
    </group>
  );
};
