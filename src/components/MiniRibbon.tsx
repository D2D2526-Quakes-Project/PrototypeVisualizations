import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Vector3 } from "three";
import { usePlayback } from "./playback/PlaybackContext";

// Target maximum number of points to render for performance
const MAX_POINTS = 400;

// Helper to convert velocity magnitude to color
function velocityToColor(velocity: number, maxVelocity: number): string {
  const t = Math.min(velocity / maxVelocity, 1);

  // Blue (low) -> Green (medium) -> Red (high)
  let r: number, g: number, b: number;

  if (t < 0.5) {
    // Blue to green
    const localT = t * 2;
    r = Math.round(0 * (1 - localT) + 0 * localT);
    g = Math.round(100 * (1 - localT) + 200 * localT);
    b = Math.round(255 * (1 - localT) + 0 * localT);
  } else {
    // Green to red
    const localT = (t - 0.5) * 2;
    r = Math.round(0 * (1 - localT) + 255 * localT);
    g = Math.round(200 * (1 - localT) + 50 * localT);
    b = Math.round(0 * (1 - localT) + 50 * localT);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

export function MiniRibbon({ path, dt = 0.01 }: { path: Vector3[]; dt?: number }) {
  const { frameIndex } = usePlayback();
  const containerRef = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState(0.6);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      setAspectRatio(entry.contentRect.height / entry.contentRect.width);
    });

    resizeObserver.observe(containerRef.current);

    const rect = containerRef.current.getBoundingClientRect();
    setAspectRatio(rect.height / rect.width);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Step 1: Downsample path - only when path changes
  const downsampledPath = useMemo(() => {
    if (path.length <= MAX_POINTS) return path;

    const step = Math.ceil(path.length / MAX_POINTS);
    const result: Vector3[] = [];
    for (let i = 0; i < path.length; i += step) {
      result.push(path[i]);
    }
    // Always include the last point
    if (result[result.length - 1] !== path[path.length - 1]) {
      result.push(path[path.length - 1]);
    }
    return result;
  }, [path]);

  // Step 2: Calculate bounds - only when downsampledPath changes
  const bounds = useMemo(() => {
    const xCoords = downsampledPath.map((p) => p.x);
    const zCoords = downsampledPath.map((p) => p.z);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minZ = Math.min(...zCoords);
    const maxZ = Math.max(...zCoords);

    const xRange = maxX - minX || 1;
    const zRange = maxZ - minZ || 1;

    // Add small padding
    const padding = 0.1;
    return {
      minX: minX - xRange * padding,
      maxX: maxX + xRange * padding,
      minZ: minZ - zRange * padding,
      maxZ: maxZ + zRange * padding,
      xRange: xRange * (1 + 2 * padding),
      zRange: zRange * (1 + 2 * padding),
    };
  }, [downsampledPath]);

  // Step 3: Pre-normalize all coordinates - only when bounds change
  const normalizedPoints = useMemo(() => {
    const { minX, minZ, xRange, zRange } = bounds;
    return downsampledPath.map((p) => ({
      x: ((p.x - minX) / xRange) * 100,
      z: ((p.z - minZ) / zRange) * 100 * aspectRatio,
    }));
  }, [downsampledPath, bounds, aspectRatio]);

  // Step 4: Calculate segments with colors - only when normalizedPoints or dt changes
  const segments = useMemo(() => {
    if (normalizedPoints.length < 2) return [];

    const segmentData = [];
    let maxVelocity = 0;

    // First pass: calculate all velocities
    for (let i = 1; i < downsampledPath.length; i++) {
      const prev = downsampledPath[i - 1];
      const curr = downsampledPath[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dz = curr.z - prev.z;
      // Account for downsampling in velocity calculation
      const step = Math.ceil(path.length / MAX_POINTS);
      const actualDt = dt * step;
      const velocity = Math.sqrt(dx * dx + dy * dy + dz * dz) / actualDt;

      segmentData.push({
        x1: normalizedPoints[i - 1].x,
        z1: normalizedPoints[i - 1].z,
        x2: normalizedPoints[i].x,
        z2: normalizedPoints[i].z,
        velocity,
      });

      maxVelocity = Math.max(maxVelocity, velocity);
    }

    // Second pass: assign colors using 90th percentile
    const velocities = segmentData.map((s) => s.velocity).sort((a, b) => a - b);
    const percentile90 = velocities[Math.floor(velocities.length * 0.9)] || maxVelocity;
    const colorScaleMax = Math.max(percentile90 * 1.2, 0.1);

    return segmentData.map((seg) => ({
      ...seg,
      color: velocityToColor(seg.velocity, colorScaleMax),
    }));
  }, [downsampledPath, normalizedPoints, dt, path.length]);

  // Step 5: Calculate current position based on actual frame index
  const currentPos = useMemo(() => {
    if (frameIndex < 0 || frameIndex >= path.length) return null;

    const point = path[frameIndex];
    const { minX, minZ, xRange, zRange } = bounds;

    return {
      x: ((point.x - minX) / xRange) * 100,
      z: ((point.z - minZ) / zRange) * 100 * aspectRatio,
    };
  }, [frameIndex, path, bounds, aspectRatio]);

  const viewBoxHeight = aspectRatio * 100;

  return (
    <div ref={containerRef} className="w-full h-20">
      <svg className="w-full h-full border border-neutral-200 rounded" viewBox={`0 0 100 ${viewBoxHeight}`}>
        {/* Draw colored line segments as static elements */}
        <g>
          {segments.map((seg, idx) => (
            <line
              key={idx}
              x1={seg.x1}
              y1={seg.z1}
              x2={seg.x2}
              y2={seg.z2}
              stroke={seg.color}
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Current position circle - only this re-renders with motion */}
        {currentPos && (
          <motion.circle
            cx={currentPos.x}
            cy={currentPos.z}
            r="2"
            className="fill-amber-500 stroke-white"
            strokeWidth="0.5"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 1.2,
              duration: 0.3,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          />
        )}
      </svg>
    </div>
  );
}
