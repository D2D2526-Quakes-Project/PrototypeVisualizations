/**
 * EndCapPanel Component
 * =============================================================================
 *
 * PURPOSE:
 * Shows a flat 2D view of all nodes on the most positive X slice (end cap).
 * Nodes are arranged in a grid layout and colored by the current metric.
 *
 * WHAT IT SHOWS:
 * - Grid view of end-cap nodes (max X coordinate)
 * - Nodes colored by current metric (same as 3D view)
 * - Vertical connections between floors (using node_to_below)
 * - Statistics: total nodes, nodes exceeding threshold
 *
 * DATA SOURCES:
 * - Node positions: animationData.initialPositions + displacementLin
 * - Max X from bounding box: animationData.precomputed.boundingBox.max[0]
 * - Node-to-below mapping: animationData.metadata.node_to_below
 * - Current metric: useViewStore.currentMetric
 *
 * UNITS:
 * - Positions: inches (in)
 * =============================================================================
 */

import { useAnimationData } from "@/lib/useAnimationData";
import { useViewStore } from "@/state";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IDockviewPanelProps } from "dockview";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { useColor } from "@/features/view-3d/contexts/visualization/ColorContext";
import { useVisualDisplacement } from "@/features/view-3d/lib/visualDisplacement";

interface EndCapNode {
  nodeId: number;
  initialY: number;
  initialZ: number;
}

export function EndCapPanel(_props: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const currentMetric = useViewStore((s) => s.currentMetric);
  const { getNodeColor: getRawNodeColor } = useColor();
  const { displacement: visualDisplacement, getNodeColor: getVisualNodeColor } = useVisualDisplacement();

  const initialPositions = animationData.initialPositions.data;
  const stride = animationData.initialPositions.stride;
  const nodeCount = animationData.metadata.nodeCount;
  const nodeToBelow = animationData.metadata.nodeToBelow;

  const boundingBox = animationData.precomputed.boundingBox;

  const maxX = boundingBox.max[0];
  const minZOrigin = boundingBox.min[2]; // Could be 0 or negative
  const maxZOrigin = boundingBox.max[2];

  const endCapNodes = useMemo(() => {
    const nodes: EndCapNode[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const base = i * stride;
      const x = initialPositions[base];
      if (Math.abs(x - maxX) < 0.1) {
        nodes.push({
          nodeId: i,
          initialY: initialPositions[base + 1],
          initialZ: initialPositions[base + 2],
        });
      }
    }
    return nodes;
  }, [initialPositions, stride, nodeCount, maxX]);

  const getCurrentPosition = useCallback(
    (node: EndCapNode) => {
      const displacement = visualDisplacement.atFrame(frameIndex).at(node.nodeId);
      return {
        y: node.initialY + (displacement[1] ?? 0),
        z: node.initialZ + (displacement[2] ?? 0),
      };
    },
    [frameIndex, visualDisplacement]
  );

  const projectedNodes = useMemo(() => {
    return endCapNodes.map((node) => {
      const pos = getCurrentPosition(node);
      const threeColor = getVisualNodeColor(node.nodeId, frameIndex, getRawNodeColor);
      return {
        ...node,
        y: pos.y,
        z: pos.z,
        color: `rgb(${Math.round(threeColor.r * 255)}, ${Math.round(threeColor.g * 255)}, ${Math.round(threeColor.b * 255)})`,
      };
    });
  }, [endCapNodes, getCurrentPosition, getRawNodeColor, getVisualNodeColor, frameIndex]);

  const nodeMap = useMemo(() => {
    const map: Record<number, (typeof projectedNodes)[0]> = {};
    for (const node of projectedNodes) {
      map[node.nodeId] = node;
    }
    return map;
  }, [projectedNodes]);

  const connections = useMemo(() => {
    const conns: { y1: number; z1: number; y2: number; z2: number }[] = [];
    const endCapNodeIds = new Set(projectedNodes.map((n) => n.nodeId));

    for (const node of projectedNodes) {
      const belowId = nodeToBelow[node.nodeId];
      if (belowId >= 0 && endCapNodeIds.has(belowId)) {
        const belowNode = nodeMap[belowId];
        if (belowNode) {
          conns.push({
            y1: node.y,
            z1: node.z,
            y2: belowNode.y,
            z2: belowNode.z,
          });
        }
      }
    }

    return conns;
  }, [projectedNodes, nodeToBelow, nodeMap]);

  const exceedingCount = useMemo(() => {
    let count = 0;
    for (const node of projectedNodes) {
      const threeColor = getVisualNodeColor(node.nodeId, frameIndex, getRawNodeColor);
      const brightness = (threeColor.r + threeColor.g + threeColor.b) / 3;
      if (brightness > 0.8) {
        count++;
      }
    }
    return count;
  }, [projectedNodes, getRawNodeColor, getVisualNodeColor, frameIndex]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 350 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width: width || 400, height: height || 350 });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const bounds = useMemo(() => {
    if (projectedNodes.length === 0) return null;
    return {
      minY: boundingBox.min[1],
      maxY: boundingBox.max[1],
      maxZ: maxZOrigin,
    };
  }, [projectedNodes, boundingBox, maxZOrigin]);

  if (!bounds) {
    return (
      <div className="flex h-full flex-col gap-2 p-3">
        <div className="text-sm font-medium">End Cap View</div>
        <div className="text-muted-foreground flex flex-1 items-center justify-center">No end cap nodes found</div>
      </div>
    );
  }

  const rangeY = bounds.maxY - bounds.minY || 1;
  const rangeZ = bounds.maxZ - minZOrigin || 1;

  const viewWidth = containerSize.width;
  const viewHeight = containerSize.height;
  const padding = 40;
  const drawWidth = viewWidth - padding * 2;
  const drawHeight = viewHeight - padding * 2;

  const scale = Math.min(drawWidth / rangeY, drawHeight / rangeZ);

  const offsetY = (drawWidth - rangeY * scale) / 2 + padding;
  const offsetZ = padding;

  const project = (y: number, z: number) => ({
    left: (((y - bounds.minY) * scale + offsetY) / viewWidth) * 100,
    top: (((bounds.maxZ - z) * scale + offsetZ) / viewHeight) * 100,
  });

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">End Cap View (Max X = {maxX.toFixed(0)}")</div>
        <div className="text-muted-foreground text-xs">
          Metric: <span className="font-medium">{currentMetric}</span>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">Total Nodes:</span>{" "}
          <span className="font-medium">{projectedNodes.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">High Values:</span>{" "}
          <span className={`font-medium ${exceedingCount > 0 ? "text-amber-600" : ""}`}>
            {exceedingCount} (
            {projectedNodes.length > 0 ? ((exceedingCount / projectedNodes.length) * 100).toFixed(1) : 0}%)
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Connections:</span>{" "}
          <span className="font-medium">{connections.length}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden rounded border"
        style={{ minHeight: "200px", backgroundColor: "#bbb" }}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {connections.map((conn, idx) => {
            const start = project(conn.y1, conn.z1);
            const end = project(conn.y2, conn.z2);
            return (
              <line
                key={idx}
                x1={`${start.left}%`}
                y1={`${start.top}%`}
                x2={`${end.left}%`}
                y2={`${end.top}%`}
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
        {projectedNodes.map((node) => {
          const pos = project(node.y, node.z);

          return (
            <div
              key={node.nodeId}
              className="pointer-events-none absolute transition-all"
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                width: "12px",
                height: "12px",
                transform: "translate(-50%, -50%) rotate(45deg)",
                backgroundColor: node.color,
              }}
              title={`Node ${node.nodeId}`}
            />
          );
        })}
      </div>

      <div className="text-muted-foreground text-xs">
        <span className="font-medium">Y axis:</span> horizontal (building depth),{" "}
        <span className="font-medium">Z axis:</span> vertical (height, from ground up).
      </div>
    </div>
  );
}
