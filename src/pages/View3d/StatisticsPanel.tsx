/**
 * StatisticsPanel Component
 * =============================================================================
 *
 * PURPOSE:
 * Displays comprehensive statistics about the simulation and current frame
 * state. Aggregates both precomputed and real-time calculated values.
 *
 * WHAT IT SHOWS:
 * - Simulation metadata: node count, frame count, duration, time step
 * - Current frame info: frame number, time
 * - Current displacement statistics: range, min, max, average per axis
 * - Ground motion values for current frame
 * - Peak values (all-time): max displacement, velocity, acceleration
 *
 * DATA SOURCES:
 * - Metadata: animationData.metadata
 * - Displacement: animationData.displacementLin
 * - Ground motion: animationData.groundMotion
 * - Precomputed stats: animationData.precomputed
 *
 * UNITS:
 * - Displacement: inches
 * - Velocity: inches/second
 * - Acceleration: inches/second²
 * - Time: seconds
 *
 * IMPORTANCE:
 * Provides a quick overview of simulation state and key metrics.
 * Engineers use this to verify simulation parameters and track
 * current response levels relative to peak values.
 * =============================================================================
 */

import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useMemo } from "react";

function StatRow({ label, value, unit = "" }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-neutral-100">
      <span className="text-neutral-500 text-xs">{label}</span>
      <span className="font-mono text-xs">
        {value}
        {unit && <span className="text-neutral-400 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function StatGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-neutral-700 mb-1 uppercase tracking-wide">{title}</div>
      <div className="bg-neutral-50 rounded px-2 py-1">{children}</div>
    </div>
  );
}

export function StatisticsPanel() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const stats = useMemo(() => {
    const { nodeCount, frameCount, dt, storyOrder } = animationData.metadata;
    const { displacementLin, groundMotion, precomputed } = animationData;
    const frameData = displacementLin.atFrame(frameIndex);

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;
    let sumX = 0,
      sumY = 0,
      sumZ = 0;

    for (let i = 0; i < nodeCount; i++) {
      const pos = frameData.at(i);
      minX = Math.min(minX, pos[0]);
      maxX = Math.max(maxX, pos[0]);
      minY = Math.min(minY, pos[1]);
      maxY = Math.max(maxY, pos[1]);
      minZ = Math.min(minZ, pos[2]);
      maxZ = Math.max(maxZ, pos[2]);
      sumX += pos[0];
      sumY += pos[1];
      sumZ += pos[2];
    }

    const avgX = sumX / nodeCount;
    const avgY = sumY / nodeCount;
    const avgZ = sumZ / nodeCount;

    const gm = groundMotion.at(frameIndex) ?? 0;
    const gmMag = Math.sqrt(gm[0] ** 2 + gm[1] ** 2 + gm[2] ** 2);

    return {
      nodeCount,
      frameCount,
      duration: frameCount * dt,
      dt,
      storyCount: storyOrder.length - 1,
      currentFrame: frameIndex,
      currentTime: frameIndex * dt,
      displacement: {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        avg: { x: avgX, y: avgY, z: avgZ },
        range: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
      },
      groundMotion: {
        x: gm[0],
        y: gm[1],
        z: gm[2],
        magnitude: gmMag,
      },
      precomputed,
    };
  }, [animationData, frameIndex]);

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-auto">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Statistics</span>
          <span className="text-neutral-400 ml-2">- Frame {frameIndex + 1}</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        <StatGroup title="Simulation">
          <StatRow label="Nodes" value={stats.nodeCount} />
          <StatRow label="Frames" value={stats.frameCount} />
          <StatRow label="Duration" value={stats.duration.toFixed(2)} unit="s" />
          <StatRow label="Time Step" value={stats.dt.toFixed(4)} unit="s" />
          <StatRow label="Stories" value={stats.storyCount} />
        </StatGroup>

        <StatGroup title="Current Frame">
          <StatRow label="Frame" value={stats.currentFrame + 1} />
          <StatRow label="Time" value={stats.currentTime.toFixed(3)} unit="s" />
        </StatGroup>

        <StatGroup title="Displacement Range">
          <StatRow label="X Range" value={stats.displacement.range.x.toFixed(4)} unit="in" />
          <StatRow label="Y Range" value={stats.displacement.range.y.toFixed(4)} unit="in" />
          <StatRow label="Z Range" value={stats.displacement.range.z.toFixed(4)} unit="in" />
        </StatGroup>

        <StatGroup title="Displacement Min">
          <StatRow label="X Min" value={stats.displacement.min.x.toFixed(4)} unit="in" />
          <StatRow label="Y Min" value={stats.displacement.min.y.toFixed(4)} unit="in" />
          <StatRow label="Z Min" value={stats.displacement.min.z.toFixed(4)} unit="in" />
        </StatGroup>

        <StatGroup title="Displacement Max">
          <StatRow label="X Max" value={stats.displacement.max.x.toFixed(4)} unit="in" />
          <StatRow label="Y Max" value={stats.displacement.max.y.toFixed(4)} unit="in" />
          <StatRow label="Z Max" value={stats.displacement.max.z.toFixed(4)} unit="in" />
        </StatGroup>

        <StatGroup title="Average Displacement">
          <StatRow label="X Avg" value={stats.displacement.avg.x.toFixed(4)} unit="in" />
          <StatRow label="Y Avg" value={stats.displacement.avg.y.toFixed(4)} unit="in" />
          <StatRow label="Z Avg" value={stats.displacement.avg.z.toFixed(4)} unit="in" />
        </StatGroup>

        <StatGroup title="Ground Motion">
          <StatRow label="X" value={stats.groundMotion.x.toFixed(4)} unit="in" />
          <StatRow label="Y" value={stats.groundMotion.y.toFixed(4)} unit="in" />
          <StatRow label="Z" value={stats.groundMotion.z.toFixed(4)} unit="in" />
          <StatRow label="Magnitude" value={stats.groundMotion.magnitude.toFixed(4)} unit="in" />
        </StatGroup>

        <StatGroup title="Peak Values (All Time)">
          <StatRow label="Max Displacement" value={stats.precomputed.maxDisplacement.toFixed(4)} unit="in" />
          <StatRow label="Max GM Magnitude" value={stats.precomputed.groundMotion.maxMagnitude.toFixed(4)} unit="in" />
          {stats.precomputed.maxVelocity && (
            <StatRow label="Max Velocity" value={stats.precomputed.maxVelocity.toFixed(4)} unit="in/s" />
          )}
          {stats.precomputed.maxAcceleration && (
            <StatRow label="Max Acceleration" value={stats.precomputed.maxAcceleration.toFixed(4)} unit="in/s²" />
          )}
        </StatGroup>
      </div>
    </div>
  );
}
