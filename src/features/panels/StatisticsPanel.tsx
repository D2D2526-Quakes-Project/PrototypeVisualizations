import { usePlayback } from "@/features/playback/usePlayback";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMemo } from "react";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import type { Unit } from "../metrics/metrics";

type StatScope = "current" | "static";

function StatRow({
  label,
  value,
  unit,
  decimals = 2,
}: {
  label: string;
  value: string | number;
  unit?: Unit;
  decimals?: number;
}) {
  const numericValue = typeof value === "number" ? value : parseFloat(value as string);
  const isNumeric = typeof value === "number" || isFinite(numericValue);

  if (isNumeric && unit) {
    const numVal = typeof value === "number" ? value : numericValue;
    return (
      <div className="flex justify-between py-1">
        <span className="text-foreground text-xs">{label}</span>
        <span className="font-mono text-xs">
          <UnitTooltip side="left" value={numVal} unit={unit} decimals={decimals} />
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-between py-1">
      <span className="text-foreground text-xs">{label}</span>
      <span className="font-mono text-xs">
        {value}
        {unit && <span className="text-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function ScopeBadge({ scope }: { scope: StatScope }) {
  return (
    <span className={`text-muted-foreground text-[10px] font-medium`}>{scope === "current" ? "Frame" : "Static"}</span>
  );
}

function StatGroup({ title, scope, children }: { title: string; scope: StatScope; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{title}</div>
        <ScopeBadge scope={scope} />
      </div>
      <div className="bg-muted divide-border divide-y rounded px-2 py-1">{children}</div>
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
      // hingeSummary: getGlobalHingeSummary(animationData),
    };
  }, [animationData, frameIndex]);

  return (
    <div className="flex h-full w-full flex-col overflow-auto">
      <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 overflow-auto p-3">
        <StatGroup title="Simulation" scope="static">
          <StatRow label="Nodes" value={stats.nodeCount} />
          <StatRow label="Frames" value={stats.frameCount} />
          <StatRow label="Duration" value={stats.duration} unit="seconds" />
          <StatRow label="Time Step" value={stats.dt} unit="seconds" />
          <StatRow label="Stories" value={stats.storyCount} />
        </StatGroup>

        <StatGroup title="Current Frame" scope="current">
          <StatRow label="Frame" value={stats.currentFrame + 1} />
          <StatRow label="Time" value={stats.currentTime} unit="seconds" decimals={1} />
        </StatGroup>

        <StatGroup title="Ground Motion Peaks" scope="static">
          <StatRow label="Max X" value={stats.precomputed.groundMotion.max[0]} unit="g" />
          <StatRow label="Max Y" value={stats.precomputed.groundMotion.max[1]} unit="g" />
          <StatRow label="Max Z" value={stats.precomputed.groundMotion.max[2]} unit="g" />
          <StatRow label="Min X" value={stats.precomputed.groundMotion.min[0]} unit="g" />
          <StatRow label="Min Y" value={stats.precomputed.groundMotion.min[1]} unit="g" />
          <StatRow label="Min Z" value={stats.precomputed.groundMotion.min[2]} unit="g" />
          <StatRow label="Max Magnitude" value={stats.precomputed.groundMotion.maxMagnitude} unit="g" />
          <StatRow label="Min Magnitude" value={stats.precomputed.groundMotion.minMagnitude} unit="g" />
        </StatGroup>

        {stats.precomputed.maxVelocity && (
          <StatGroup title="Velocity Peaks" scope="static">
            <>
              <StatRow label="Magnitude" value={stats.precomputed.maxVelocity} unit="inches/second" />
              {stats.precomputed.maxVelocityX !== undefined && (
                <StatRow label="X Component" value={stats.precomputed.maxVelocityX} unit="inches/second" />
              )}
              {stats.precomputed.maxVelocityY !== undefined && (
                <StatRow label="Y Component" value={stats.precomputed.maxVelocityY} unit="inches/second" />
              )}
              {stats.precomputed.maxVelocityZ !== undefined && (
                <StatRow label="Z Component" value={stats.precomputed.maxVelocityZ} unit="inches/second" />
              )}
            </>
          </StatGroup>
        )}

        {stats.precomputed.maxAcceleration && (
          <StatGroup title="Acceleration Peaks" scope="static">
            <>
              <StatRow label="Magnitude" value={stats.precomputed.maxAcceleration} unit="inches/second²" />
              {stats.precomputed.maxAccelerationX !== undefined && (
                <StatRow label="X Component" value={stats.precomputed.maxAccelerationX} unit="inches/second²" />
              )}
              {stats.precomputed.maxAccelerationY !== undefined && (
                <StatRow label="Y Component" value={stats.precomputed.maxAccelerationY} unit="inches/second²" />
              )}
              {stats.precomputed.maxAccelerationZ !== undefined && (
                <StatRow label="Z Component" value={stats.precomputed.maxAccelerationZ} unit="inches/second²" />
              )}
            </>
          </StatGroup>
        )}

        <StatGroup title="Story Drift" scope="static">
          <StatRow label="Max Drift" value={stats.precomputed.maxStoryDrift} unit="percent" />
        </StatGroup>

        {/* // {stats.hingeSummary && (
        //   <StatGroup title="Static Hinge Rotation" scope="static">
        //     <StatRow
        //       label="Hinge Nodes"
        //       value={`${stats.hingeSummary.hingeNodes} (${stats.hingeSummary.coveragePct.toFixed(1)}%)`}
        //     />
        //     <StatRow label="Hinge Ends" value={stats.hingeSummary.totalHingeEnds} />
        //     {stats.hingeSummary.governingMaxNode?.maxRotation !== undefined && (
        //       <StatRow label="Governing Max" value={stats.hingeSummary.governingMaxNode.maxRotation} unit="radians" />
        //     )}
        //     {stats.hingeSummary.governingMinNode?.minRotation !== undefined && (
        //       <StatRow label="Governing Min" value={stats.hingeSummary.governingMinNode.minRotation} unit="radians" />
        //     )}
        //   </StatGroup>
        // )} */}

        {(stats.optionalPeaks.maxRotation !== null ||
          stats.optionalPeaks.maxRotationVelocity !== null ||
          stats.optionalPeaks.maxRotationAcceleration !== null) && (
          <StatGroup title="Rotation Peaks" scope="static">
            {stats.optionalPeaks.maxRotation !== null && (
              <StatRow label="Magnitude" value={stats.optionalPeaks.maxRotation} unit="radians" />
            )}
            {stats.precomputed.maxRotationX !== undefined && (
              <StatRow label="X" value={stats.precomputed.maxRotationX} unit="radians" />
            )}
            {stats.precomputed.maxRotationY !== undefined && (
              <StatRow label="Y" value={stats.precomputed.maxRotationY} unit="radians" />
            )}
            {stats.precomputed.maxRotationZ !== undefined && (
              <StatRow label="Z" value={stats.precomputed.maxRotationZ} unit="radians" />
            )}

            {stats.optionalPeaks.maxRotationVelocity !== null && (
              <StatRow label="Velocity" value={stats.optionalPeaks.maxRotationVelocity} unit="radians/second" />
            )}
            {stats.precomputed.maxRotationVelocityX !== undefined && (
              <StatRow label="Velocity X" value={stats.precomputed.maxRotationVelocityX} unit="radians/second" />
            )}
            {stats.precomputed.maxRotationVelocityY !== undefined && (
              <StatRow label="Velocity Y" value={stats.precomputed.maxRotationVelocityY} unit="radians/second" />
            )}
            {stats.precomputed.maxRotationVelocityZ !== undefined && (
              <StatRow label="Velocity Z" value={stats.precomputed.maxRotationVelocityZ} unit="radians/second" />
            )}

            {stats.optionalPeaks.maxRotationAcceleration !== null && (
              <StatRow
                label="Acceleration"
                value={stats.optionalPeaks.maxRotationAcceleration}
                unit="radians/second²"
              />
            )}
            {stats.precomputed.maxRotationAccelerationX !== undefined && (
              <StatRow label="Accel X" value={stats.precomputed.maxRotationAccelerationX} unit="radians/second²" />
            )}
            {stats.precomputed.maxRotationAccelerationY !== undefined && (
              <StatRow label="Accel Y" value={stats.precomputed.maxRotationAccelerationY} unit="radians/second²" />
            )}
            {stats.precomputed.maxRotationAccelerationZ !== undefined && (
              <StatRow label="Accel Z" value={stats.precomputed.maxRotationAccelerationZ} unit="radians/second²" />
            )}
          </StatGroup>
        )}

        <StatGroup title="Displacement Range" scope="current">
          <StatRow label="X Range" value={stats.displacement.range.x} unit="inches" />
          <StatRow label="Y Range" value={stats.displacement.range.y} unit="inches" />
          <StatRow label="Z Range" value={stats.displacement.range.z} unit="inches" />
        </StatGroup>

        <StatGroup title="Displacement Min" scope="current">
          <StatRow label="X Min" value={stats.displacement.min.x} unit="inches" />
          <StatRow label="Y Min" value={stats.displacement.min.y} unit="inches" />
          <StatRow label="Z Min" value={stats.displacement.min.z} unit="inches" />
        </StatGroup>

        <StatGroup title="Displacement Max" scope="current">
          <StatRow label="X Max" value={stats.displacement.max.x} unit="inches" />
          <StatRow label="Y Max" value={stats.displacement.max.y} unit="inches" />
          <StatRow label="Z Max" value={stats.displacement.max.z} unit="inches" />
        </StatGroup>

        <StatGroup title="Average Displacement" scope="current">
          <StatRow label="X Avg" value={stats.displacement.avg.x} unit="inches" />
          <StatRow label="Y Avg" value={stats.displacement.avg.y} unit="inches" />
          <StatRow label="Z Avg" value={stats.displacement.avg.z} unit="inches" />
        </StatGroup>

        <StatGroup title="Ground Motion" scope="current">
          <StatRow label="X" value={stats.groundMotion.x} unit="g" />
          <StatRow label="Y" value={stats.groundMotion.y} unit="g" />
          <StatRow label="Z" value={stats.groundMotion.z} unit="g" />
          <StatRow label="Magnitude" value={stats.groundMotion.magnitude} unit="g" />
        </StatGroup>

        <StatGroup title="Bounding Box" scope="static">
          <StatRow label="Span X" value={stats.precomputed.boundingBox.span[0] / 12} unit="feet" />
          <StatRow label="Span Y" value={stats.precomputed.boundingBox.span[1] / 12} unit="feet" />
          <StatRow label="Span Z" value={stats.precomputed.boundingBox.span[2] / 12} unit="feet" />
          <StatRow label="Center X" value={stats.precomputed.boundingBox.center[0] / 12} unit="feet" />
          <StatRow label="Center Y" value={stats.precomputed.boundingBox.center[1] / 12} unit="feet" />
          <StatRow label="Center Z" value={stats.precomputed.boundingBox.center[2] / 12} unit="feet" />
        </StatGroup>

        <StatGroup title="Maximum Displacement" scope="static">
          <StatRow label="Magnitude" value={stats.precomputed.maxDisplacement} unit="inches" />
          <StatRow label="X Component" value={stats.precomputed.maxDisplacementX} unit="inches" />
          <StatRow label="Y Component" value={stats.precomputed.maxDisplacementY} unit="inches" />
          <StatRow label="Z Component" value={stats.precomputed.maxDisplacementZ} unit="inches" />
        </StatGroup>

        <StatGroup title="Cross Sections" scope="static">
          <StatRow label="X Count" value={stats.precomputed.numCrossSectionsX} />
          <StatRow label="Y Count" value={stats.precomputed.numCrossSectionsY} />
        </StatGroup>
      </div>
    </div>
  );
}
