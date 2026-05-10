import { GizmoHelper } from "@react-three/drei";
import * as React from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useGizmoContext } from "@react-three/drei";
import { CanvasTexture, Vector3 } from "three";
import { useCamera } from "@/features/3d/contexts/CanvasContext";

const ORIENTATION_CUBE_FACES = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"];
const DEFAULT_CAMERA_TARGET = new Vector3(0, 0, 0);

export function OrientationCube() {
  const { orbitControlsRef } = useCamera();

  return (
    <GizmoHelper
      alignment="top-left"
      margin={[64, 56]}
      up={[0, 0, 1]}
      onTarget={() => orbitControlsRef.current?.target.clone() ?? DEFAULT_CAMERA_TARGET}
      onUpdate={() => orbitControlsRef.current?.update()}>
      <GizmoViewcube faces={ORIENTATION_CUBE_FACES} />
    </GizmoHelper>
  );
}

type XYZ = [number, number, number];
type GenericProps = {
  font?: string;
  opacity?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => null;
  faces?: string[];
};
type FaceTypeProps = { hover: boolean; index: number } & GenericProps;
type EdgeCubeProps = { dimensions: XYZ; position: Vector3 } & Omit<GenericProps, "font" & "color">;

// ShadCN-inspired palette
const colors = {
  bg: "#ffffff",
  hover: "#f4f4f5",
  text: "#18181b",
  stroke: "#e4e4e7",
  accent: "#3f3f46",
};

const defaultFaces = ["Front", "Back", "Right", "Left", "Top", "Bottom"];
const makePositionVector = (xyz: number[]) => new Vector3(...xyz).multiplyScalar(0.38);

const corners: Vector3[] = /* @__PURE__ */ [
  [1, 1, 1],
  [1, 1, -1],
  [1, -1, 1],
  [1, -1, -1],
  [-1, 1, 1],
  [-1, 1, -1],
  [-1, -1, 1],
  [-1, -1, -1],
].map(makePositionVector);

const cornerDimensions: XYZ = [0.25, 0.25, 0.25];

const edges: Vector3[] = /* @__PURE__ */ [
  [1, 1, 0],
  [1, 0, 1],
  [1, 0, -1],
  [1, -1, 0],
  [0, 1, 1],
  [0, 1, -1],
  [0, -1, 1],
  [0, -1, -1],
  [-1, 1, 0],
  [-1, 0, 1],
  [-1, 0, -1],
  [-1, -1, 0],
].map(makePositionVector);

const edgeDimensions = /* @__PURE__ */ edges.map(
  (edge) => edge.toArray().map((axis: number): number => (axis == 0 ? 0.5 : 0.25)) as XYZ
);

/**
 * Draws a face texture with ShadCN-style aesthetics:
 * - White background
 * - Rounded corners (via arc)
 * - Bold, large sans-serif label
 * - Subtle zinc border
 * - Smooth hover tint using interpolation
 */
const FaceMaterial = ({
  hover,
  index,
  font = "56px ui-sans-serif, system-ui, -apple-system, sans-serif",
  faces = defaultFaces,
  opacity = 1,
}: FaceTypeProps) => {
  const gl = useThree((state) => state.gl);

  const texture = React.useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const radius = 32;
    const pad = 4;

    // Rounded-rect clip path helper
    const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    };

    // Fill background (transparent outer, white card)
    ctx.clearRect(0, 0, size, size);

    // Card fill — white or hover tint
    roundedRect(pad, pad, size - pad * 2, size - pad * 2, radius);
    ctx.fillStyle = colors.hover;
    ctx.fill();

    // Subtle border
    // roundedRect(pad, pad, size - pad * 2, size - pad * 2, radius);
    // ctx.strokeStyle = strokeColor;
    // ctx.lineWidth = hover ? 2.5 : 1.5;
    // ctx.stroke();

    // Inner accent line at bottom for depth (ShadCN card footer vibe)
    if (hover) {
      const lineY = size - pad - 10;
      ctx.beginPath();
      ctx.moveTo(pad + radius, lineY);
      ctx.lineTo(size - pad - radius, lineY);
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.15;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Apply rotation for faces that need it
    const rotations = [-Math.PI / 2, Math.PI / 2, Math.PI, 0, -Math.PI / 2, -Math.PI / 2];
    const needsRotation = rotations[index];
    if (needsRotation) {
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(needsRotation);
      ctx.translate(-size / 2, -size / 2);
    }

    // Large bold label
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colors.accent;
    ctx.fillText(faces[index].toUpperCase(), size / 2, size / 2 + 2);

    if (needsRotation) {
      ctx.restore();
    }

    return new CanvasTexture(canvas);
  }, [index, faces, font, hover]);

  return (
    <meshBasicMaterial
      map={texture}
      map-anisotropy={gl.capabilities.getMaxAnisotropy() || 1}
      attach={`material-${index}`}
      color="white"
      transparent
      opacity={opacity}
    />
  );
};

const FaceCube = (props: GenericProps) => {
  const { tweenCamera } = useGizmoContext();
  const [hover, setHover] = React.useState<number | null>(null);

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(null);
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    tweenCamera(e.face!.normal);
  };
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(Math.floor(e.faceIndex! / 2));
  };

  return (
    <mesh onPointerOut={handlePointerOut} onPointerMove={handlePointerMove} onClick={props.onClick || handleClick}>
      {[...Array(6)].map((_, index) => (
        <FaceMaterial key={index} index={index} hover={hover === index} {...props} />
      ))}
      <boxGeometry />
    </mesh>
  );
};

const EdgeCube = ({ onClick, dimensions, position }: EdgeCubeProps): React.JSX.Element => {
  const { tweenCamera } = useGizmoContext();
  const [hover, setHover] = React.useState<boolean>(false);

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(false);
  };
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(true);
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    tweenCamera(position);
  };

  return (
    <mesh
      scale={1.01}
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={onClick || handleClick}>
      <meshBasicMaterial color={colors.hover} transparent opacity={hover ? 0.45 : 0} visible={hover} />
      <boxGeometry args={dimensions} />
    </mesh>
  );
};

export const GizmoViewcube = (props: GenericProps) => {
  return (
    <group scale={[60, 60, 60]}>
      <FaceCube {...props} />
      {edges.map((edge, index) => (
        <EdgeCube key={index} position={edge} dimensions={edgeDimensions[index]} {...props} />
      ))}
      {corners.map((corner, index) => (
        <EdgeCube key={index} position={corner} dimensions={cornerDimensions} {...props} />
      ))}
    </group>
  );
};
