import { useMemo } from "react";
import { MiniTimeSeries } from "@/components/MiniTimeSeries";
import { AxisMetricRow } from "@/components/AxisMetricRow";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { usePlayback } from "@/features/playback/usePlayback";
import { useProfileStore, useGlobalStore } from "@/state";
import { getMetricKeyColor, type Metric, type Unit } from "@/features/metrics/metrics";
import type { TimeIndexAccessor } from "@/lib/types";

interface AveragedMetricSectionProps {
  title: string;
  unit: Unit;
  graphPrefix: string;
  nodeIds: number[];
  accessor: TimeIndexAccessor | undefined;
}

const AXES = ["X", "Y", "Z"] as const;

const GRAPH_PREFIX_TO_METRIC: Record<string, string> = {
  disp: "displacement",
  vel: "velocity",
  acc: "acceleration",
};

function peakAbsIndex(arr: number[]): number {
  let idx = 0;
  let best = 0;
  for (let i = 0; i < arr.length; i++) {
    const a = Math.abs(arr[i]);
    if (a > best) {
      best = a;
      idx = i;
    }
  }
  return idx;
}

function getByIndex<T>(arr: [T, T, T], i: number): T {
  return i === 0 ? arr[0] : i === 1 ? arr[1] : arr[2];
}

export function AveragedMetricSection({ title, unit, graphPrefix, nodeIds, accessor }: AveragedMetricSectionProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const nodePanelGraphVisibility = useProfileStore((s) => s.nodePanelGraphVisibility);
  const toggleNodePanelGraph = useProfileStore((s) => s.toggleNodePanelGraph);
  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);

  const metricPrefix = GRAPH_PREFIX_TO_METRIC[graphPrefix] ?? graphPrefix;
  const colors: [string, string, string] = useMemo(
    () => [
      getMetricKeyColor(`${metricPrefix}X` as Metric, metricPaletteOverrides),
      getMetricKeyColor(`${metricPrefix}Y` as Metric, metricPaletteOverrides),
      getMetricKeyColor(`${metricPrefix}Z` as Metric, metricPaletteOverrides),
    ],
    [metricPrefix, metricPaletteOverrides]
  );

  const { frameCount, dt } = animationData.metadata;

  // TIME SERIES — average across all nodeIds
  const timeSeries = useMemo(() => {
    if (!accessor || nodeIds.length === 0) return null;
    const nodeCount = nodeIds.length;

    const times = new Array<number>(frameCount);
    const xValues = new Array<number>(frameCount);
    const yValues = new Array<number>(frameCount);
    const zValues = new Array<number>(frameCount);
    const magnitudes = new Array<number>(frameCount);

    for (let f = 0; f < frameCount; f++) {
      times[f] = f * dt;
      let sx = 0,
        sy = 0,
        sz = 0;
      const frame = accessor.atFrame(f);
      for (const nodeId of nodeIds) {
        const d = frame.at(nodeId);
        sx += d[0];
        sy += d[1];
        sz += d[2];
      }
      xValues[f] = sx / nodeCount;
      yValues[f] = sy / nodeCount;
      zValues[f] = sz / nodeCount;
      magnitudes[f] = Math.hypot(sx / nodeCount, sy / nodeCount, sz / nodeCount);
    }

    return {
      times,
      xValues,
      yValues,
      zValues,
      magnitudes,
      peakTimes: {
        x: times[peakAbsIndex(xValues)],
        y: times[peakAbsIndex(yValues)],
        z: times[peakAbsIndex(zValues)],
      },
    };
  }, [accessor, nodeIds, frameCount, dt]);

  // CURRENT VALUES — average across nodeIds at current frame
  const currentValues = useMemo((): [number, number, number] => {
    if (!accessor || nodeIds.length === 0) return [0, 0, 0];
    const nodeCount = nodeIds.length;
    let sx = 0,
      sy = 0,
      sz = 0;
    const frame = accessor.atFrame(frameIndex);
    for (const nodeId of nodeIds) {
      const d = frame.at(nodeId);
      sx += d[0];
      sy += d[1];
      sz += d[2];
    }
    return [sx / nodeCount, sy / nodeCount, sz / nodeCount];
  }, [accessor, nodeIds, frameIndex]);

  // PEAK VALUES — from the time series
  const peakData = useMemo(() => {
    if (!timeSeries) {
      return { x: 0, y: 0, z: 0, xTime: 0, yTime: 0, zTime: 0 };
    }
    const { peakTimes, xValues, yValues, zValues } = timeSeries;
    const xi = peakAbsIndex(xValues);
    const yi = peakAbsIndex(yValues);
    const zi = peakAbsIndex(zValues);
    return {
      x: xValues[xi],
      xTime: peakTimes.x,
      y: yValues[yi],
      yTime: peakTimes.y,
      z: zValues[zi],
      zTime: peakTimes.z,
    };
  }, [timeSeries]);

  if (!accessor || nodeIds.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <div className="mt-2 space-y-1">
        {AXES.map((axis, i) => (
          <AxisMetricRow
            key={axis}
            axis={axis}
            currentValue={getByIndex(currentValues, i)}
            peakValue={i === 0 ? peakData.x : i === 1 ? peakData.y : peakData.z}
            peakTime={i === 0 ? peakData.xTime : i === 1 ? peakData.yTime : peakData.zTime}
            unit={unit}
            graphKey={`${graphPrefix}${axis.toLowerCase()}`}
            graphVisible={nodePanelGraphVisibility[`${graphPrefix}${axis.toLowerCase()}`] ?? false}
            onToggleGraph={toggleNodePanelGraph}
          />
        ))}
      </div>
      {timeSeries && (
        <div className="mt-3 space-y-2">
          {AXES.map((axis, i) => {
            const graphKey = `${graphPrefix}${axis.toLowerCase()}`;
            if (!nodePanelGraphVisibility[graphKey]) return null;

            const values = getByIndex(
              [timeSeries.xValues, timeSeries.yValues, timeSeries.zValues] as [number[], number[], number[]],
              i
            );

            const chartPeakTime = getByIndex(
              [timeSeries.peakTimes.x, timeSeries.peakTimes.y, timeSeries.peakTimes.z] as [number, number, number],
              i
            );

            return (
              <MiniTimeSeries
                key={graphKey}
                data={values}
                times={timeSeries.times}
                color={colors[i]}
                currentValue={getByIndex(currentValues, i)}
                unit={unit}
                label={`${title} ${axis}`}
                peakTime={chartPeakTime}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
