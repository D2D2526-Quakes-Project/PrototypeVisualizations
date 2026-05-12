import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as THREE from "three";
import type { BoxSelection } from "@/state/liveState";
import type { RefObject } from "react";

// Converting data Inches to Meters
export const UNIT_SCALE = 0.0254;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, maxDecimals = 1): string {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return "0";

  const absValue = Math.abs(value);
  const normalizedMaxDecimals = Math.max(0, maxDecimals);
  const effectiveDecimals =
    absValue >= 100
      ? 0
      : absValue >= 10
        ? Math.min(normalizedMaxDecimals, 1)
        : absValue < 1
          ? Math.max(normalizedMaxDecimals, 2)
          : normalizedMaxDecimals;

  const fixed = value.toFixed(effectiveDecimals);
  return fixed.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
}

export const formatFixed3 = (n: number) => `${n >= 0 ? "+" : ""}${formatNumber(Math.abs(n), 2)}`;

function lexicographicOrder(a: number[], b: number[]) {
  return a[0] - b[0] || a[1] - b[1];
}

function cross(a: number[], b: number[], c: number[]) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

// Computes the upper convex hull per the monotone chain algorithm.
// Assumes points.length >= 3, is sorted by x, unique in y.
// Returns an array of indices into points in left-to-right order.
function computeUpperHullIndexes(points: number[][]) {
  const n = points.length,
    indexes = [0, 1];
  let size = 2,
    i;

  for (i = 2; i < n; ++i) {
    while (size > 1 && cross(points[indexes[size - 2]], points[indexes[size - 1]], points[i]) <= 0) --size;
    indexes[size++] = i;
  }

  return indexes.slice(0, size); // remove popped points
}

export function polygonHull(points: number[][]) {
  if (points.length < 3) return points;

  let i;
  const n = points.length;
  const sortedPoints = new Array(n);
  const flippedPoints = new Array(n);

  for (i = 0; i < n; ++i) sortedPoints[i] = [+points[i][0], +points[i][1], i];
  sortedPoints.sort(lexicographicOrder);
  for (i = 0; i < n; ++i) flippedPoints[i] = [sortedPoints[i][0], -sortedPoints[i][1]];

  const upperIndexes = computeUpperHullIndexes(sortedPoints);
  const lowerIndexes = computeUpperHullIndexes(flippedPoints);

  // Construct the hull polygon, removing possible duplicate endpoints.
  const skipLeft = lowerIndexes[0] === upperIndexes[0];
  const skipRight = lowerIndexes[lowerIndexes.length - 1] === upperIndexes[upperIndexes.length - 1] ? 1 : 0;
  const hull = [];

  // Add upper hull in right-to-l order.
  // Then add lower hull in left-to-right order.
  for (i = upperIndexes.length - 1; i >= 0; --i) hull.push(points[sortedPoints[upperIndexes[i]][2]]);
  for (i = +skipLeft; i < lowerIndexes.length - skipRight; ++i) hull.push(points[sortedPoints[lowerIndexes[i]][2]]);

  return hull;
}

export function stringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function getOrdinalSuffix(value: number): string {
  const absValue = Math.abs(value);
  const lastTwo = absValue % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return "th";
  }
  switch (absValue % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatStoryLabel(storyId: string, elevationIn: number): string {
  const trimmed = storyId.trim();
  const floorNumber = Number(trimmed);
  const isNumericInteger = Number.isInteger(floorNumber) && /^[-+]?\d+$/.test(trimmed);
  const storyLabel = isNumericInteger ? `${floorNumber}${getOrdinalSuffix(floorNumber)}` : storyId;
  const elevationFt = elevationIn / 12;
  return `${storyLabel} (${elevationFt.toFixed(0)} ft)`;
}

export const throttle = <T extends unknown[]>(callback: (...args: T) => void, delay: number) => {
  let isWaiting = false;

  return (...args: T) => {
    if (isWaiting) {
      return;
    }

    callback(...args);
    isWaiting = true;

    setTimeout(() => {
      isWaiting = false;
    }, delay);
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Procedure = (...args: any[]) => void;

export function debounce<T extends Procedure>(callback: T, delay: number): (...args: Parameters<T>) => void {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    if (timerId) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

export function slidingWindow3<T>(arr: T[]): [T | undefined, T, T | undefined][] {
  const result: [T | undefined, T, T | undefined][] = [];
  result.push([undefined, arr[0], arr[1]]);
  for (let i = 0; i < arr.length - 1; i++) {
    const window = arr.slice(i, i + 3);
    result.push(window as [T | undefined, T, T | undefined]);
  }
  return result;
}

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.getAttribute("role") === "textbox"
  );
};

export function numberToColor(nodeId: number): string {
  const hue = (nodeId * 137.508) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

export function numberToColorLight(nodeId: number): string {
  const hue = (nodeId * 137.508) % 360;
  return `hsl(${hue}, 70%, 90%)`;
}

export function assert(condition: boolean, message?: string) {
  if (!condition) throw new Error(message);
}

export function clampToViewport(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function performBoxSelection(
  camera: THREE.Camera,
  meshRef: RefObject<THREE.InstancedMesh | null>,
  box: BoxSelection
): number[] {
  const minX = Math.min(box.start.x, box.end.x);
  const maxX = Math.max(box.start.x, box.end.x);
  const minY = Math.min(box.start.y, box.end.y);
  const maxY = Math.max(box.start.y, box.end.y);

  const selectedNodes: number[] = [];
  const mesh = meshRef.current;
  if (!mesh) return selectedNodes;

  const instanceCount = mesh.count;

  for (let i = 0; i < instanceCount; i++) {
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(i, matrix);

    const worldPos = new THREE.Vector3().setFromMatrixPosition(matrix);
    worldPos.applyMatrix4(mesh.matrixWorld);
    worldPos.project(camera);

    const screenX = (worldPos.x + 1) / 2;
    const screenY = 1 - (worldPos.y + 1) / 2;

    if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
      selectedNodes.push(i);
    }
  }

  return selectedNodes;
}
