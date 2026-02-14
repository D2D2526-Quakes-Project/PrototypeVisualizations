import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayback } from "./playback/PlaybackContext";
import type { Vector3 } from "three";
import { InfoIcon } from "lucide-react";
import { motion } from "motion/react";

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

  // Downsample path for performance - limit to MAX_POINTS
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

  // Map original frame index to downsampled index for current position indicator
  const downsampledFrameIndex = useMemo(() => {
    if (path.length <= MAX_POINTS) return frameIndex;
    const step = Math.ceil(path.length / MAX_POINTS);
    return Math.floor(frameIndex / step);
  }, [frameIndex, path.length]);

  const viewBoxHeight = aspectRatio * 100;

  // Calculate bounds and normalization functions - memoized
  const { normalizeX, normalizeZ } = useMemo(() => {
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
    const xMin = minX - xRange * padding;
    const xMax = maxX + xRange * padding;
    const zMin = minZ - zRange * padding;
    const zMax = maxZ + zRange * padding;
    const xRangePadded = xMax - xMin;
    const zRangePadded = zMax - zMin;

    return {
      normalizeX: (x: number) => ((x - xMin) / xRangePadded) * 100,
      normalizeZ: (z: number) => ((z - zMin) / zRangePadded) * viewBoxHeight,
    };
  }, [downsampledPath, viewBoxHeight]);

  // Calculate velocities and segment data for colored ribbon
  const segments = useMemo(() => {
    if (downsampledPath.length < 2) return [];
    
    const segmentData = [];
    let maxVelocity = 0;
    
    // First pass: calculate all velocities and find max
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
        i,
        x1: normalizeX(prev.x),
        z1: normalizeZ(prev.z),
        x2: normalizeX(curr.x),
        z2: normalizeZ(curr.z),
        velocity,
      });
      
      maxVelocity = Math.max(maxVelocity, velocity);
    }
    
    // Second pass: assign colors
    // Use 90th percentile to avoid outliers skewing the colors
    const velocities = segmentData.map(s => s.velocity).sort((a, b) => a - b);
    const percentile90 = velocities[Math.floor(velocities.length * 0.9)] || maxVelocity;
    const colorScaleMax = Math.max(percentile90 * 1.2, 0.1); // Ensure we don't divide by zero
    
    return segmentData.map(seg => ({
      ...seg,
      color: velocityToColor(seg.velocity, colorScaleMax),
    }));
  }, [downsampledPath, normalizeX, normalizeZ, dt, path.length]);

  return (
    <div ref={containerRef} className="w-full h-20 mb-3">
      <svg className="w-full h-full border border-neutral-200 rounded" viewBox={`0 0 100 ${viewBoxHeight}`}>
        {/* Draw colored line segments */}
        <g>
          {segments.map((seg, idx) => (
            <motion.line
              key={idx}
              x1={seg.x1}
              y1={seg.z1}
              x2={seg.x2}
              y2={seg.z2}
              stroke={seg.color}
              strokeWidth="0.8"
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                opacity: { duration: 0.3, delay: 0.2 + idx * 0.003 },
              }}
            />
          ))}
        </g>

        {/* Current position circle */}
        {downsampledFrameIndex < downsampledPath.length && (
          <motion.circle
            cx={normalizeX(downsampledPath[downsampledFrameIndex].x)}
            cy={normalizeZ(downsampledPath[downsampledFrameIndex].z)}
            r="2"
            className="fill-amber-500 stroke-white"
            strokeWidth="0.5"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 1.2,
              duration: 0.3,
              ease: [0.34, 1.56, 0.64, 1], // Spring-like bounce
            }}
          />
        )}
      </svg>
      <div className="text-xs text-neutral-500 flex items-center gap-1 mb-1">
        <InfoIcon className="size-3" />
        <span className="text-xs font-medium ">Number of points reduced for performance</span>
      </div>
    </div>
  );
}
