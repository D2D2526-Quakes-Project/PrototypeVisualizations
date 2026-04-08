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

import { usePlayback } from "@/features/playback/PlaybackContext";
import { useAnimationData } from "@/lib/useAnimationData";
import { useMemo } from "react";
import { UnitTooltip } from "@/components/ui/unit-tooltip";

type StatScope = "current" | "static";

function StatRow({
  label,
  value,
  unit = "",
  decimals = 2,
}: {
  label: string;
  value: string | number;
  unit?: string;
  decimals?: number;
}) {
  const { playing } = usePlayback();
  const numericValue = typeof value === "number" ? value : parseFloat(value as string);
  const isNumeric = typeof value === "number" || !isNaN(numericValue);

  if (isNumeric && unit) {
    const numVal = typeof value === "number" ? value : numericValue;
    return (
      <div className="flex justify-between border-b border-neutral-100 py-1">
        <span className="text-xs text-neutral-500">{label}</span>
        <span className="font-mono text-xs">
          <UnitTooltip
            value={numVal}
            unit={unit}
            decimals={decimals}
            showConversions={unit !== "s"}
            interactive={!playing}
          />
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-between border-b border-neutral-100 py-1">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="font-mono text-xs">
        {value}
        {unit && <span className="ml-1 text-neutral-400">{unit}</span>}
      </span>
    </div>
  );
}

function ScopeBadge({ scope }: { scope: StatScope }) {
  return (
    <span className={`text-[10px] font-medium ${scope === "current" ? "text-blue-700" : "text-neutral-600"}`}>
      {scope === "current" ? "Current frame" : "Static"}
    </span>
  );
}

function StatGroup({ title, scope, children }: { title: string; scope: StatScope; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">{title}</div>
        <ScopeBadge scope={scope} />
      </div>
      <div className="rounded bg-neutral-50 px-2 py-1">{children}</div>
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

    const gm = groundMotion.at(frameIndex) ?? ([0, 0, 0] as const);
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
      optionalPeaks: {
        maxRotation: precomputed.maxRotation ?? null,
        maxRotationVelocity: precomputed.maxRotationVelocity ?? null,
        maxRotationAcceleration: precomputed.maxRotationAcceleration ?? null,
      },
      precomputed,
    };
  }, [animationData, frameIndex]);

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-neutral-500">
        <span>Time: {(frameIndex * animationData.metadata.dt).toFixed(1).replace(/\.0$/u, "")} s</span>
        <span className="text-neutral-300">•</span>
        <span>Displacement/velocity/acceleration in in, in/s, in/s²</span>
        <span className="text-neutral-300">•</span>
        <span>Ground motion in g</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <StatGroup title="Simulation" scope="static">
          <StatRow label="Nodes" value={stats.nodeCount} />
          <StatRow label="Frames" value={stats.frameCount} />
          <StatRow label="Duration" value={stats.duration} unit="s" />
          <StatRow label="Time Step" value={stats.dt} unit="s" />
          <StatRow label="Stories" value={stats.storyCount} />
        </StatGroup>

        <StatGroup title="Current Frame" scope="current">
          <StatRow label="Frame" value={stats.currentFrame + 1} />
          <StatRow label="Time" value={stats.currentTime} unit="s" decimals={1} />
        </StatGroup>

        <StatGroup title="Displacement Range" scope="current">
          <StatRow label="X Range" value={stats.displacement.range.x} unit="in" />
          <StatRow label="Y Range" value={stats.displacement.range.y} unit="in" />
          <StatRow label="Z Range" value={stats.displacement.range.z} unit="in" />
        </StatGroup>

        <StatGroup title="Displacement Min" scope="current">
          <StatRow label="X Min" value={stats.displacement.min.x} unit="in" />
          <StatRow label="Y Min" value={stats.displacement.min.y} unit="in" />
          <StatRow label="Z Min" value={stats.displacement.min.z} unit="in" />
        </StatGroup>

        <StatGroup title="Displacement Max" scope="current">
          <StatRow label="X Max" value={stats.displacement.max.x} unit="in" />
          <StatRow label="Y Max" value={stats.displacement.max.y} unit="in" />
          <StatRow label="Z Max" value={stats.displacement.max.z} unit="in" />
        </StatGroup>

        <StatGroup title="Average Displacement" scope="current">
          <StatRow label="X Avg" value={stats.displacement.avg.x} unit="in" />
          <StatRow label="Y Avg" value={stats.displacement.avg.y} unit="in" />
          <StatRow label="Z Avg" value={stats.displacement.avg.z} unit="in" />
        </StatGroup>

        <StatGroup title="Ground Motion" scope="current">
          <StatRow label="X" value={stats.groundMotion.x} unit="g" />
          <StatRow label="Y" value={stats.groundMotion.y} unit="g" />
          <StatRow label="Z" value={stats.groundMotion.z} unit="g" />
          <StatRow label="Magnitude" value={stats.groundMotion.magnitude} unit="g" />
        </StatGroup>

        <StatGroup title="Precomputed Peaks" scope="static">
          <StatRow label="Max Displacement" value={stats.precomputed.maxDisplacement} unit="in" />
          <StatRow label="Max GM Magnitude" value={stats.precomputed.groundMotion.maxMagnitude} unit="g" />
          <StatRow label="Min GM Magnitude" value={stats.precomputed.groundMotion.minMagnitude} unit="g" />
          {stats.precomputed.maxVelocity && (
            <StatRow label="Max Velocity" value={stats.precomputed.maxVelocity} unit="in/s" />
          )}
          {stats.precomputed.maxAcceleration && (
            <StatRow label="Max Acceleration" value={stats.precomputed.maxAcceleration} unit="in/s²" />
          )}
          <StatRow label="Max Story Drift" value={stats.precomputed.maxStoryDrift} unit="%" />
          <StatRow label="Avg Story Drift" value={stats.precomputed.avgStoryDrift} unit="%" />
          {stats.optionalPeaks.maxRotation !== null && (
            <StatRow label="Max Rotation" value={stats.optionalPeaks.maxRotation} unit="rad" />
          )}
          {stats.optionalPeaks.maxRotationVelocity !== null && (
            <StatRow label="Max Rot. Velocity" value={stats.optionalPeaks.maxRotationVelocity} unit="rad/s" />
          )}
          {stats.optionalPeaks.maxRotationAcceleration !== null && (
            <StatRow label="Max Rot. Accel." value={stats.optionalPeaks.maxRotationAcceleration} unit="rad/s²" />
          )}
        </StatGroup>
      </div>
    </div>
  );
}
