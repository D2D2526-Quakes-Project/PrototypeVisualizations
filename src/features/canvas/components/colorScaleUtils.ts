import { getMetricColorScale } from "@/features/metrics/metrics";

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function getScaleStopsAndLabels(
  colorScale: ReturnType<typeof getMetricColorScale>,
  maxValue: number,
  hasPositive: boolean,
  hasNegative: boolean,
  thresholdHighlighting: boolean,
  thresholdValue: number
) {
  const positiveStops = colorScale.positiveColorStops;
  const positiveTStops = colorScale.positiveThresholdColorStops;
  const negativeStops = colorScale.negativeColorStops;
  const negativeTStops = colorScale.negativeThresholdColorStops;
  const thresholdRatio = clamp01(maxValue > 0 ? thresholdValue / maxValue : 0);

  const relativeStops: [number, string][] = [];
  if (hasNegative) {
    const negThresholdPos = (1 - thresholdRatio) * 50;
    let negativeStopsReversed = negativeStops.toReversed();
    if (thresholdHighlighting) {
      relativeStops.push(
        ...negativeTStops
          .toReversed()
          .map((color, i) => [(i / (negativeTStops.length - 1)) * negThresholdPos, color] as [number, string])
      );
    } else {
      negativeStopsReversed = [...negativeTStops.toReversed(), ...negativeStopsReversed];
    }

    relativeStops.push(
      ...negativeStopsReversed.map(
        (color, i) =>
          [(i / (negativeStopsReversed.length - 1)) * (50 - negThresholdPos) + negThresholdPos, color] as [
            number,
            string,
          ]
      )
    );
  }

  if (hasPositive) {
    const posThresholdPos = thresholdRatio * 50 + 50;
    let positiveStopsComplete = positiveStops;
    if (!thresholdHighlighting) {
      positiveStopsComplete = [...positiveStops, ...positiveTStops];
    }

    relativeStops.push(
      ...positiveStopsComplete.map(
        (color, i) =>
          [(i / (positiveStopsComplete.length - 1)) * (posThresholdPos - 50) + 50, color] as [number, string]
      )
    );

    if (thresholdHighlighting) {
      relativeStops.push(
        ...positiveTStops.map(
          (color, i) =>
            [(i / (positiveTStops.length - 1)) * (100 - posThresholdPos) + posThresholdPos, color] as [number, string]
        )
      );
    }
  }

  let min = 100;
  let max = 0;
  relativeStops.forEach(([pos]) => {
    min = Math.min(min, pos);
    max = Math.max(max, pos);
  });
  const stops = relativeStops.map(([pos, color]) => `${color} ${((pos - min) / (max - min)) * 100}%`);
  return { stops, thresholdRatio };
}
