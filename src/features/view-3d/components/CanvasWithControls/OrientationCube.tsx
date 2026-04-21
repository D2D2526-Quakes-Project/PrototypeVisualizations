import { GizmoHelper } from "@react-three/drei";
import * as React from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useGizmoContext } from "@react-three/drei";
import { CanvasTexture, Vector3 } from "three";
import { useCamera } from "@/features/view-3d/contexts/CameraContext";

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
      <GizmoViewcube
        faces={ORIENTATION_CUBE_FACES}
        color="#f5f3ee"
        hoverColor="#d7c8a4"
        strokeColor="#6d5f45"
        textColor="#2f2618"
      />
    </GizmoHelper>
  );
}

type XYZ = [number, number, number];
type GenericProps = {
  font?: string;
  opacity?: number;
  color?: string;
  hoverColor?: string;
  textColor?: string;
  strokeColor?: string;
  onClick?: (e: ThreeEvent<MouseEvent>) => null;
  faces?: string[];
};
type FaceTypeProps = { hover: boolean; index: number } & GenericProps;
type EdgeCubeProps = { dimensions: XYZ; position: Vector3 } & Omit<GenericProps, "font" & "color">;

const colors = { bg: "#f0f0f0", hover: "#999", text: "black", stroke: "black" };
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

const FaceMaterial = ({
  hover,
  index,
  font = "20px Inter var, Arial, sans-serif",
  faces = defaultFaces,
  color = colors.bg,
  hoverColor = colors.hover,
  textColor = colors.text,
  strokeColor = colors.stroke,
  opacity = 1,
}: FaceTypeProps) => {
  const gl = useThree((state) => state.gl);
  const texture = React.useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = strokeColor;
    context.strokeRect(0, 0, canvas.width, canvas.height);
    context.font = font;
    context.textAlign = "center";
    context.fillStyle = textColor;
    const needsRotation = [-Math.PI / 2, Math.PI / 2, Math.PI, 0, -Math.PI / 2, -Math.PI / 2][index];
    if (needsRotation) {
      context.translate(64, 64);
      context.rotate(needsRotation);
      context.translate(-64, -64);
    }

    context.fillText(faces[index].toUpperCase(), 64, 76);
    return new CanvasTexture(canvas);
  }, [index, faces, font, color, textColor, strokeColor]);
  return (
    <meshBasicMaterial
      map={texture}
      map-anisotropy={gl.capabilities.getMaxAnisotropy() || 1}
      attach={`material-${index}`}
      color={hover ? hoverColor : "white"}
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

const EdgeCube = ({ onClick, dimensions, position, hoverColor = colors.hover }: EdgeCubeProps): React.JSX.Element => {
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
      <meshBasicMaterial color={hover ? hoverColor : "white"} transparent opacity={0.6} visible={hover} />
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
