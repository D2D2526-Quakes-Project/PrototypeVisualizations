import { useMemo } from "react";
import type { TimeIndexAccessor } from "@/lib/types";

export interface TimeSeriesData {
  times: number[];
  magnitudes: number[];
  xValues: number[];
  yValues: number[];
  zValues: number[];
  peakValues: {
    x: number;
    y: number;
    z: number;
  };
  peakTimes: {
    magnitude: number;
    x: number;
    y: number;
    z: number;
  };
  componentPeakTimes: {
    x: number;
    y: number;
    z: number;
  };
}

function getPeakTime(values: number[], times: number[]): number {
  if (values.length === 0) return 0;
  const maxIdx = values.reduce(
    (maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx),
    0,
  );
  return times[maxIdx];
}

export function useNodeTimeSeries(
  accessor: TimeIndexAccessor | undefined,
  nodeId: number,
  frameCount: number,
  dt: number,
): TimeSeriesData | null {
  return useMemo(() => {
    if (!accessor) return null;

    const times = new Array<number>(frameCount);
    const magnitudes = new Array<number>(frameCount);
    const xValues = new Array<number>(frameCount);
    const yValues = new Array<number>(frameCount);
    const zValues = new Array<number>(frameCount);

    let maxAbsXFrame = 0;
    let maxAbsYFrame = 0;
    let maxAbsZFrame = 0;
    let maxAbsX = 0;
    let maxAbsY = 0;
    let maxAbsZ = 0;
    let peakMag = 0;
    let peakFrameValues: [number, number, number] = [0, 0, 0];

    for (let i = 0; i < frameCount; i++) {
      const t = i * dt;
      times[i] = t;
      const v = accessor.atFrame(i).at(nodeId);
      xValues[i] = v[0];
      yValues[i] = v[1];
      zValues[i] = v[2];
      const mag = Math.hypot(v[0], v[1], v[2]);
      magnitudes[i] = mag;
      if (mag > peakMag) {
        peakMag = mag;
        peakFrameValues = [v[0], v[1], v[2]];
      }

      const absX = Math.abs(v[0]);
      const absY = Math.abs(v[1]);
      const absZ = Math.abs(v[2]);
      if (absX > maxAbsX) {
        maxAbsX = absX;
        maxAbsXFrame = i;
      }
      if (absY > maxAbsY) {
        maxAbsY = absY;
        maxAbsYFrame = i;
      }
      if (absZ > maxAbsZ) {
        maxAbsZ = absZ;
        maxAbsZFrame = i;
      }
    }

    return {
      times,
      magnitudes,
      xValues,
      yValues,
      zValues,
      peakValues: {
        x: peakFrameValues[0],
        y: peakFrameValues[1],
        z: peakFrameValues[2],
      },
      peakTimes: {
        magnitude: getPeakTime(magnitudes, times),
        x: getPeakTime(xValues, times),
        y: getPeakTime(yValues, times),
        z: getPeakTime(zValues, times),
      },
      componentPeakTimes: {
        x: maxAbsXFrame * dt,
        y: maxAbsYFrame * dt,
        z: maxAbsZFrame * dt,
      },
    };
  }, [accessor, nodeId, frameCount, dt]);
}
