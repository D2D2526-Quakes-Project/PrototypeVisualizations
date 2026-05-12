// import type { IndexAccessor, TimeIndexAccessor } from "@/lib/types";
// import { useAnimationData } from "@/features/animation-data/useAnimationData";

// import { useCallback, useMemo } from "react";
// import * as THREE from "three";

// const GRAY_COLOR = new THREE.Color(0.5, 0.5, 0.5);

// function makeAccessor(data: Float32Array, stride: number): IndexAccessor {
//   return {
//     data,
//     stride,
//     at(idx: number) {
//       return data.subarray(idx * stride, (idx + 1) * stride);
//     },
//     xAt(idx: number) {
//       return data[idx * stride] ?? 0;
//     },
//     yAt(idx: number) {
//       return data[idx * stride + 1] ?? 0;
//     },
//     zAt(idx: number) {
//       return data[idx * stride + 2] ?? 0;
//     },
//   };
// }

// // export function useVisualDisplacement() {
// //   const { animationData } = useAnimationData();
// //   const visualInterpolationEnabled = useViewStore((s) => s.visualInterpolationEnabled);

// //   const missingNodeIndices = animationData.metadata.displacementMissingNodeIndices;

// //   const missingNodeSet = useMemo(() => new Set(missingNodeIndices), [missingNodeIndices]);

// //   const interpolationActive = visualInterpolationEnabled && missingNodeSet.size > 0;

// //   const isNodeInterpolated = useCallback((nodeId: number) => missingNodeSet.has(nodeId), [missingNodeSet]);

// //   const getNodeColor = useCallback(
// //     (nodeId: number, frameIndex: number, fallback: (nodeId: number, frameIndex: number) => THREE.Color) => {
// //       if (isNodeInterpolated(nodeId)) return GRAY_COLOR;
// //       return fallback(nodeId, frameIndex);
// //     },
// //     [isNodeInterpolated]
// //   );

// //   return {
// //     displacement,
// //     interpolationActive,
// //     isNodeInterpolated,
// //     getNodeColor,
// //   };
// // }
