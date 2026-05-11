import { useAnimationData } from "@/features/animation-data/useAnimationData";

interface IsometricBoundingBoxProps {
  dimX: number;
  dimY: number;
  dimZ: number;
  fill?: string;
  stroke?: string;
  opacity?: number;
  size?: number;
  highlightSliceX?: number;
  highlightSliceY?: number;
  highlightSliceZ?: number;
}

export function IsometricBoundingBox({
  dimX,
  dimY,
  dimZ,
  fill = "#888888",
  stroke = "#666666",
  opacity = 0.3,
  highlightSliceX,
  highlightSliceY,
  highlightSliceZ,
}: IsometricBoundingBoxProps) {
  const sin30 = 0.5;
  const cos30 = Math.sqrt(3) / 2;

  const project = (x: number, y: number, z: number): [number, number] => {
    const isoX = (x - y) * cos30;
    const isoY = -z + (x + y) * sin30;
    return [isoX * 50, isoY * 50];
  };
  const maxSide = Math.max(dimX, dimY, dimZ);

  const hx = dimX / maxSide;
  const hy = dimY / maxSide;
  const hz = dimZ / maxSide;

  const sx = highlightSliceX == undefined ? 0 : (highlightSliceX / maxSide) * 2;
  const sy = highlightSliceY == undefined ? 0 : (highlightSliceY / maxSide) * 2;
  const sz = highlightSliceZ == undefined ? 0 : (highlightSliceZ / maxSide) * 2 - hz;

  const corners: [number, number, number][] = [
    [-hx, -hy, -hz], // 0
    [hx, -hy, -hz], // 1
    [hx, -hy, hz], // 2
    [-hx, -hy, hz], // 3
    [-hx, hy, -hz], // 4
    [hx, hy, -hz], // 5
    [hx, hy, hz], // 6
    [-hx, hy, hz], // 7
  ];

  corners.push([sx, -hy, -hz], [sx, hy, -hz], [sx, hy, hz], [sx, -hy, hz]); // 8,9,10,11
  corners.push([-hx, sy, -hz], [hx, sy, -hz], [hx, sy, hz], [-hx, sy, hz]); // 12,13,14,15
  corners.push([-hx, -hy, sz], [hx, -hy, sz], [hx, hy, sz], [-hx, hy, sz]); // 16,17,18,19

  const projected = corners.map((c) => project(c[0], c[1], c[2]));

  const minX = Math.min(...projected.map((p) => p[0]));
  const maxX = Math.max(...projected.map((p) => p[0]));
  const minY = Math.min(...projected.map((p) => p[1]));
  const maxY = Math.max(...projected.map((p) => p[1]));

  const toSvg = (pt: [number, number]): string => {
    const x = pt[0];
    const y = pt[1];
    return `${x},${y}`;
  };

  type FaceData = { corners: [number, number, number, number]; fill: string; stroke: string };

  const faces: FaceData[] = [
    { corners: [0, 1, 2, 3], fill, stroke },
    { corners: [4, 5, 6, 7], fill, stroke },
    { corners: [0, 1, 5, 4], fill, stroke },
    { corners: [2, 3, 7, 6], fill, stroke },
    { corners: [0, 3, 7, 4], fill, stroke },
    { corners: [1, 2, 6, 5], fill, stroke },
  ];
  if (highlightSliceX != undefined) faces.push({ corners: [8, 9, 10, 11], fill: "#ff0000", stroke: "#ff8844" });
  if (highlightSliceY != undefined) faces.push({ corners: [12, 13, 14, 15], fill: "#ff0000", stroke: "#ff8844" });
  if (highlightSliceZ != undefined) faces.push({ corners: [16, 17, 18, 19], fill: "#ff0000", stroke: "#ff8844" });

  const renderFace = (face: FaceData, idx: number) => {
    const points = face.corners.map((i) => toSvg(projected[i])).join(" ");
    return (
      <polygon key={idx} points={points} fill={face.fill} stroke={face.stroke} strokeWidth={1} opacity={opacity} />
    );
  };

  const viewBox = `${minX - 2} ${minY - 2} ${maxX - minX + 4} ${maxY - minY + 4}`;

  return (
    <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
      <g>{faces.map((face, idx) => renderFace(face, idx))}</g>
    </svg>
  );
}

export function IsometricBuilding({
  highlightSliceX,
  highlightSliceY,
  highlightSliceZ,
}: {
  highlightSliceX?: number;
  highlightSliceY?: number;
  highlightSliceZ?: number;
}) {
  const { animationData } = useAnimationData();
  const boundingBox = animationData.precomputed.boundingBox;

  return (
    <IsometricBoundingBox
      dimX={boundingBox.span[0]}
      dimY={boundingBox.span[1]}
      dimZ={boundingBox.span[2]}
      highlightSliceX={highlightSliceX}
      highlightSliceY={highlightSliceY}
      highlightSliceZ={highlightSliceZ}
    />
  );
}
