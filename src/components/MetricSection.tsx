import { useMemo } from "react";
import { MiniTimeSeries } from "@/components/MiniTimeSeries";
import { AxisMetricRow } from "@/components/AxisMetricRow";
import { useNodeTimeSeries } from "@/hooks/useNodeTimeSeries";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { usePlayback } from "@/features/playback/usePlayback";
import { useProfileStore, useGlobalStore } from "@/state";
import { getMetricKeyColor, type Metric, type Unit } from "@/features/metrics/metrics";
import type { TimeIndexAccessor } from "@/lib/types";

interface MetricSectionProps {
  title: string;
  unit: Unit;
  graphPrefix: string;
  nodeId: number;
  accessor: TimeIndexAccessor | undefined;
  peakComponentValues?: [number, number, number];
}

const AXES = ["X", "Y", "Z"] as const;

const GRAPH_PREFIX_TO_METRIC: Record<string, string> = {
  disp: "displacement",
  vel: "velocity",
  acc: "acceleration",
  rot: "rotation",
};

function getByIndex<T>(arr: [T, T, T], i: number): T {
  return i === 0 ? arr[0] : i === 1 ? arr[1] : arr[2];
}

export function MetricSection({ title, unit, graphPrefix, nodeId, accessor, peakComponentValues }: MetricSectionProps) {
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

  const timeSeries = useNodeTimeSeries(accessor, nodeId, frameCount, dt);

  const currentValues = useMemo((): [number, number, number] => {
    if (!accessor) return [0, 0, 0];
    const v = accessor.atFrame(frameIndex).at(nodeId);
    return [v[0], v[1], v[2]];
  }, [accessor, frameIndex, nodeId]);

  const peakData = useMemo(() => {
    if (!timeSeries) {
      return { x: 0, y: 0, z: 0, xTime: 0, yTime: 0, zTime: 0 };
    }
    const values = peakComponentValues
      ? { x: peakComponentValues[0], y: peakComponentValues[1], z: peakComponentValues[2] }
      : { x: timeSeries.peakValues.x, y: timeSeries.peakValues.y, z: timeSeries.peakValues.z };
    return {
      ...values,
      xTime: timeSeries.componentPeakTimes.x,
      yTime: timeSeries.componentPeakTimes.y,
      zTime: timeSeries.componentPeakTimes.z,
    };
  }, [timeSeries, peakComponentValues]);

  if (!accessor) return null;

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
            const peakTime = getByIndex(
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
                peakTime={peakTime}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
