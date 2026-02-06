import { useEffect, useRef, useState } from "react";
import { usePlayback } from "./playback/PlaybackContext";
import type { Vector3 } from "three";
import type { TimeIndexAccessor } from "../lib/types";

export function MiniRibbon({ path, velocity }: { path: Vector3[]; velocity?: TimeIndexAccessor }) {
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

  const viewBoxHeight = aspectRatio * 100;

  // Calculate bounds for top-down projection (XZ plane)
  const xCoords = path.map((p) => p.x);
  const zCoords = path.map((p) => p.z);
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

  // Normalize to SVG coordinates
  const normalizeX = (x: number) => ((x - xMin) / xRangePadded) * 100;
  const normalizeZ = (z: number) => ((z - zMin) / zRangePadded) * viewBoxHeight;

  return (
    <div ref={containerRef} className="w-full h-20 mb-3">
      <svg className="w-full h-full border border-neutral-200 rounded" viewBox={`0 0 100 ${viewBoxHeight}`}>
        {/* Draw ribbon segments with velocity colors */}
        {path.slice(1).map((point, i) => {
          const prevPoint = path[i];
          const x1 = normalizeX(prevPoint.x);
          const z1 = normalizeZ(prevPoint.z);
          const x2 = normalizeX(point.x);
          const z2 = normalizeZ(point.z);

          // Calculate velocity-based color
          let color;
          if (velocity) {
            // Get velocity magnitude for this segment at current frame
            const frameData = velocity.atFrame(frameIndex);
            const vx = frameData.xAt(i);
            const vy = frameData.yAt(i);
            const vz = frameData.zAt(i);
            const velocityMagnitude = Math.sqrt(vx * vx + vy * vy + vz * vz);

            // Normalize velocity to 0-1 range (adjust maxVelocity as needed)
            const maxVelocity = 10; // Adjust based on your data range
            const normalizedVelocity = Math.min(velocityMagnitude / maxVelocity, 1);

            // Color gradient from blue (low) to green (medium) to red (high)
            if (normalizedVelocity < 0.5) {
              // Blue to green
              const t = normalizedVelocity * 2;
              color = {
                r: 0,
                g: t,
                b: 1 - t,
              };
            } else {
              // Green to red
              const t = (normalizedVelocity - 0.5) * 2;
              color = {
                r: t,
                g: 1 - t,
                b: 0,
              };
            }
          } else {
            // Fallback color when no velocity data
            color = {
              r: 0.2,
              g: 0.5,
              b: 0.8,
            };
          }

          return (
            <line
              key={i}
              x1={x1}
              y1={z1}
              x2={x2}
              y2={z2}
              stroke={`rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`}
              strokeWidth="0.8"
            />
          );
        })}

        {/* Current position circle */}
        {frameIndex < path.length && (
          <circle
            cx={normalizeX(path[frameIndex].x)}
            cy={normalizeZ(path[frameIndex].z)}
            r="2"
            className="fill-amber-500 stroke-white"
            strokeWidth="0.5"
          />
        )}
      </svg>
    </div>
  );
}
