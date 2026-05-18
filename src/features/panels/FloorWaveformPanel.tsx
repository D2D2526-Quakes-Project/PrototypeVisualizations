import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { useFloorVisibility } from "@/features/3d/contexts/useFloorVisibility";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { getScaleStopsAndLabels } from "@/features/canvas/components/colorScaleUtils";
import { usePanelState } from "@/features/dockview/usePanelState";
import {
  getMetricColorScale,
  getMetricConfig,
  isHingeMetric,
  isStaticMetric,
  type Metric,
} from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { useThresholds } from "@/features/metrics/useThresholds";
import { usePlayback } from "@/features/playback/usePlayback";
import { formatNumber, getOrdinalSuffix, threeColorToCSS } from "@/lib/utils";
import type { IDockviewPanelProps } from "dockview-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type PlacementMode = "elevation" | "floor";

type FloorWaveformPanelState = {
  metric: Metric;
  placementMode: PlacementMode;
  amplitudeScale: number;
};

type StorySeries = {
  storyId: string;
  floorLabel: string;
  elevationIn: number;
  values: Float32Array;
  peakValue: number;
  peakAbsValue: number;
  peakFrame: number;
  color: string;
};

const DEFAULT_PANEL_STATE: FloorWaveformPanelState = {
  metric: "accelerationX",
  placementMode: "elevation",
  amplitudeScale: 2,
};

const MIN_PLOT_HEIGHT = 360;
const PLOT_MARGINS = {
  top: 24,
  right: 24,
  bottom: 48,
  left: 84,
};

// Amplitude slider: maps 0–100 to a multiplier range of 0.25×–8×
// Using a log scale so small values are easy to dial in
const AMPLITUDE_SLIDER_MIN = 0;
const AMPLITUDE_SLIDER_MAX = 100;
function sliderToAmplitude(sliderValue: number): number {
  // log scale: 0 → 0.25, 50 → ~1.41, 100 → 8
  const minLog = Math.log(0.25);
  const maxLog = Math.log(8);
  return Math.exp(minLog + (sliderValue / AMPLITUDE_SLIDER_MAX) * (maxLog - minLog));
}
function amplitudeToSlider(amplitude: number): number {
  const minLog = Math.log(0.25);
  const maxLog = Math.log(8);
  return ((Math.log(amplitude) - minLog) / (maxLog - minLog)) * AMPLITUDE_SLIDER_MAX;
}

function formatFloorOnly(storyId: string) {
  const trimmed = storyId.trim();
  const floorNumber = Number(trimmed);
  const isNumericInteger = Number.isInteger(floorNumber) && /^[-+]?\d+$/u.test(trimmed);
  return isNumericInteger ? `${floorNumber}${getOrdinalSuffix(floorNumber)}` : storyId;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function MetricLegend({
  metric,
  maxValue,
  thresholdValue,
  thresholdHighlighting,
  metricColorScale,
}: {
  metric: Metric;
  maxValue: number;
  thresholdValue: number;
  thresholdHighlighting: boolean;
  metricColorScale: ReturnType<typeof getMetricColorScale>;
}) {
  const config = getMetricConfig(metric);
  const safeMax = maxValue > 0 ? maxValue : 1;
  const { stops } = getScaleStopsAndLabels(
    metricColorScale,
    safeMax,
    config.hasPositive,
    config.hasNegative,
    thresholdHighlighting,
    thresholdValue
  );

  const minLabel = `${formatNumber(config.hasNegative ? -safeMax : 0, 2)} ${config.unit.abbr}`;
  const maxLabel = `${formatNumber(config.hasPositive ? safeMax : 0, 2)} ${config.unit.abbr}`;
  const midLabel = `${formatNumber(0, 2)} ${config.unit.abbr}`;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-500">
        {thresholdHighlighting && thresholdValue > 0 ? (
          <span>Threshold highlight on</span>
        ) : (
          <span>Threshold highlight off</span>
        )}
      </div>
      <div
        className="h-3 rounded border border-neutral-200"
        style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}
      />
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-neutral-500">
        <span>{minLabel}</span>
        {config.hasPositive && config.hasNegative ? <span>{midLabel}</span> : <span />}
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function HoverTooltip({ story, frame, dt, unit }: { story: StorySeries; frame: number; dt: number; unit: string }) {
  const currentValue = story.values[frame] ?? 0;
  const currentTime = frame * dt;
  const peakTime = story.peakFrame * dt;

  return (
    <div className="min-w-44">
      <div className="mb-2 border-b border-neutral-200 pb-1 text-xs font-semibold text-neutral-900">
        {story.floorLabel}
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        <span className="text-neutral-500">Time</span>
        <span className="font-mono text-neutral-800">{formatNumber(currentTime, 2)} s</span>
        <span className="text-neutral-500">Current</span>
        <span className="font-mono text-neutral-800">
          {formatNumber(currentValue, 3)} {unit}
        </span>
        <span className="text-neutral-500">Peak</span>
        <span className="font-mono text-neutral-800">
          {formatNumber(story.peakValue, 3)} {unit}
        </span>
        <span className="text-neutral-500">Peak time</span>
        <span className="font-mono text-neutral-800">{formatNumber(peakTime, 2)} s</span>
        <span className="text-neutral-500">Elevation</span>
        <span className="font-mono text-neutral-800">{formatNumber(story.elevationIn, 1)} in</span>
      </div>
    </div>
  );
}

export function FloorWaveformPanel({ api }: IDockviewPanelProps) {
  return null;
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { visibleFloors } = useFloorVisibility();
  const { availableMetrics, thresholdHighlighting, getValueColorForMetric, metricPaletteOverrides } = useMetrics();
  const { getThreshold } = useThresholds();
  const playheadRef = useRef<HTMLDivElement>(null);
  const hoverLineRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotSize, setPlotSize] = useState({ width: 0, height: 0 });
  const [hoverState, setHoverState] = useState<{ frame: number; storyIndex: number; x: number; y: number } | null>(
    null
  );

  const { state: panelState, setState: setPanelState } = usePanelState<FloorWaveformPanelState>({
    panelId: api.id,
    panelType: "Floor Waveforms",
    defaultState: DEFAULT_PANEL_STATE,
  });

  const selectableMetrics = useMemo<Metric[]>(() => {
    const supported = availableMetrics.filter((metric) => !isHingeMetric(metric) && !isStaticMetric(metric));
    if (supported.length > 0) return supported;
    return ["displacementX"];
  }, [availableMetrics]);

  const selectedMetric: Metric = selectableMetrics.includes(panelState.metric)
    ? panelState.metric
    : selectableMetrics.includes(DEFAULT_PANEL_STATE.metric)
      ? DEFAULT_PANEL_STATE.metric
      : selectableMetrics[0];

  useEffect(() => {
    if (panelState.metric === selectedMetric) return;
    setPanelState({ metric: selectedMetric });
  }, [panelState.metric, selectedMetric, setPanelState]);

  const metricConfig = useMemo(() => getMetricConfig(selectedMetric), [selectedMetric]);
  const metricColorScale = useMemo(
    () => getMetricColorScale(selectedMetric, metricPaletteOverrides),
    [metricPaletteOverrides, selectedMetric]
  );
  const thresholdValue = metricConfig.thresholdKey === "inf" ? 0 : getThreshold(selectedMetric);

  const visibleStoryIds = useMemo(() => visibleFloors, [visibleFloors]);

  useLayoutEffect(() => {
    const updateSize = () => {
      if (!plotRef.current) return;
      const rect = plotRef.current.getBoundingClientRect();
      setPlotSize({
        width: Math.max(0, rect.width),
        height: Math.max(MIN_PLOT_HEIGHT, rect.height),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (plotRef.current) {
      observer.observe(plotRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const storySeries = useMemo<StorySeries[]>(() => {
    const frameCount = animationData.metadata.frameCount;

    const series: StorySeries[] = [];

    visibleStoryIds.forEach((storyId) => {
      const nodeIds = animationData.metadata.stories[storyId] ?? [];
      if (nodeIds.length === 0) return;

      const values = new Float32Array(frameCount);
      let peakValue = 0;
      let peakAbsValue = 0;
      let peakFrame = 0;

      for (let frame = 0; frame < frameCount; frame++) {
        let sum = 0;
        let count = 0;

        for (const nodeId of nodeIds) {
          const value = metricConfig.getValue(animationData, frame, nodeId);
          if (value === undefined || !Number.isFinite(value)) continue;
          sum += value;
          count += 1;
        }

        const averageValue = count > 0 ? sum / count : 0;
        values[frame] = averageValue;

        const candidatePeak = metricConfig.hasNegative ? Math.abs(averageValue) : averageValue;
        if (candidatePeak > peakAbsValue) {
          peakAbsValue = candidatePeak;
          peakValue = averageValue;
          peakFrame = frame;
        }
      }

      series.push({
        storyId,
        floorLabel: formatFloorOnly(storyId),
        elevationIn: animationData.precomputed.storyElevations[storyId] ?? 0,
        values,
        peakValue,
        peakAbsValue,
        peakFrame,
        color: threeColorToCSS(getValueColorForMetric(selectedMetric, peakValue).color),
      });
    });

    return series;
  }, [animationData, getValueColorForMetric, metricConfig, selectedMetric, visibleStoryIds]);

  const frameCount = animationData.metadata.frameCount;
  const dt = animationData.metadata.dt;
  const totalDuration = Math.max(0, (frameCount - 1) * dt);
  const maxAbsValue = useMemo(() => {
    const peak = storySeries.reduce((max, story) => Math.max(max, story.peakAbsValue), 0);
    return Math.max(metricConfig.getPrecomputedMax(animationData), peak, 1e-6);
  }, [animationData, metricConfig, storySeries]);

  // The user-controlled amplitude multiplier (persisted in panel state, default 2)
  const amplitudeMultiplier = panelState.amplitudeScale ?? DEFAULT_PANEL_STATE.amplitudeScale;

  const plotGeometry = useMemo(() => {
    const width = Math.max(plotSize.width, 320);
    const height = Math.max(plotSize.height, MIN_PLOT_HEIGHT);
    const innerWidth = Math.max(1, width - PLOT_MARGINS.left - PLOT_MARGINS.right);
    const innerHeight = Math.max(1, height - PLOT_MARGINS.top - PLOT_MARGINS.bottom);
    const elevationValues = storySeries.map((story) => story.elevationIn);
    const minElevation = elevationValues.length > 0 ? Math.min(...elevationValues) : 0;
    const maxElevation = elevationValues.length > 0 ? Math.max(...elevationValues) : 1;
    const step = storySeries.length > 1 ? innerHeight / (storySeries.length - 1) : innerHeight / 2;
    // Use amplitudeMultiplier instead of the hardcoded 2
    const amplitudeScale = (step * amplitudeMultiplier) / maxAbsValue;

    const baselines = storySeries.map((story, index) => {
      if (panelState.placementMode === "floor") {
        return PLOT_MARGINS.top + innerHeight - index * step;
      }

      if (maxElevation === minElevation) {
        return PLOT_MARGINS.top + innerHeight / 2;
      }

      const normalized = (story.elevationIn - minElevation) / (maxElevation - minElevation);
      return PLOT_MARGINS.top + innerHeight - normalized * innerHeight;
    });

    return {
      width,
      height,
      innerWidth,
      innerHeight,
      baselines,
      amplitudeScale,
      maxFrameIndex: Math.max(0, frameCount - 1),
    };
  }, [
    amplitudeMultiplier,
    frameCount,
    maxAbsValue,
    panelState.placementMode,
    plotSize.height,
    plotSize.width,
    storySeries,
  ]);

  const xTickTimes = useMemo(() => {
    const tickCount = Math.min(6, Math.max(2, Math.round(plotGeometry.innerWidth / 140)));
    if (tickCount <= 1 || totalDuration <= 0) return [0];
    return Array.from({ length: tickCount }, (_, index) => (index / (tickCount - 1)) * totalDuration);
  }, [plotGeometry.innerWidth, totalDuration]);

  const storyPaths = useMemo(() => {
    const sampleStep = Math.max(1, Math.ceil(frameCount / Math.max(400, Math.round(plotGeometry.innerWidth * 1.5))));
    const maxFrameIndex = Math.max(0, frameCount - 1);

    return storySeries.map((story, storyIndex) => {
      const baselineY = plotGeometry.baselines[storyIndex] ?? 0;
      let path = "";

      for (let frame = 0; frame <= maxFrameIndex; frame += sampleStep) {
        const x = PLOT_MARGINS.left + (maxFrameIndex === 0 ? 0 : (frame / maxFrameIndex) * plotGeometry.innerWidth);
        const y = baselineY - story.values[frame] * plotGeometry.amplitudeScale;
        path += `${frame === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      }

      if (maxFrameIndex > 0 && maxFrameIndex % sampleStep !== 0) {
        const x = PLOT_MARGINS.left + plotGeometry.innerWidth;
        const y = baselineY - story.values[maxFrameIndex] * plotGeometry.amplitudeScale;
        path += `L${x.toFixed(2)},${y.toFixed(2)}`;
      }

      return {
        story,
        storyIndex,
        path,
        baselineY,
      };
    });
  }, [frameCount, plotGeometry.amplitudeScale, plotGeometry.baselines, plotGeometry.innerWidth, storySeries]);

  useEffect(() => {
    if (!playheadRef.current) return;
    const x =
      PLOT_MARGINS.left +
      (plotGeometry.maxFrameIndex === 0 ? 0 : (frameIndex / plotGeometry.maxFrameIndex) * plotGeometry.innerWidth);
    playheadRef.current.style.transform = `translateX(${x}px)`;
    playheadRef.current.style.display = storySeries.length > 0 ? "block" : "none";
  }, [frameIndex, plotGeometry.innerWidth, plotGeometry.maxFrameIndex, storySeries.length]);

  useEffect(() => {
    if (!hoverLineRef.current) return;
    if (!hoverState) {
      hoverLineRef.current.style.display = "none";
      return;
    }
    hoverLineRef.current.style.transform = `translateX(${hoverState.x}px)`;
    hoverLineRef.current.style.display = "block";
  }, [hoverState]);

  const hoveredStory = hoverState ? storySeries[hoverState.storyIndex] : null;

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    const clampedX = clamp(localX, PLOT_MARGINS.left, PLOT_MARGINS.left + plotGeometry.innerWidth);
    const normalizedX = plotGeometry.innerWidth <= 0 ? 0 : (clampedX - PLOT_MARGINS.left) / plotGeometry.innerWidth;
    const frame = Math.round(normalizedX * plotGeometry.maxFrameIndex);

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    plotGeometry.baselines.forEach((baselineY, index) => {
      const distance = Math.abs(localY - baselineY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setHoverState({
      frame,
      storyIndex: nearestIndex,
      x: clampedX,
      y: localY,
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className="shrink-0 border-b border-neutral-200 px-3 py-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-neutral-900">Floor Waveforms</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* Metric select */}
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            Metric
            <NativeSelect
              size="sm"
              value={selectedMetric}
              onChange={(event) => setPanelState({ metric: event.target.value as Metric })}>
              {selectableMetrics.map((metric) => {
                const config = getMetricConfig(metric);
                return (
                  <NativeSelectOption key={metric} value={metric}>
                    {config.label}
                  </NativeSelectOption>
                );
              })}
            </NativeSelect>
          </label>

          {/* Placement mode select */}
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            Spacing
            <NativeSelect
              size="sm"
              value={panelState.placementMode}
              onChange={(event) => setPanelState({ placementMode: event.target.value as PlacementMode })}>
              <NativeSelectOption value="elevation">By elevation</NativeSelectOption>
              <NativeSelectOption value="floor">Equal floors</NativeSelectOption>
            </NativeSelect>
          </label>

          {/* Amplitude scale slider */}
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            Amplitude
            <Slider
              min={AMPLITUDE_SLIDER_MIN}
              max={AMPLITUDE_SLIDER_MAX}
              step={1}
              value={[amplitudeToSlider(amplitudeMultiplier)]}
              onValueChange={(value) => setPanelState({ amplitudeScale: sliderToAmplitude(value[0]) })}
              className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-neutral-700"
            />
            <span className="w-8 font-mono text-[10px] text-neutral-400">{amplitudeMultiplier.toFixed(1)}×</span>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <MetricLegend
            metric={selectedMetric}
            maxValue={maxAbsValue}
            thresholdValue={thresholdValue}
            thresholdHighlighting={thresholdHighlighting}
            metricColorScale={metricColorScale}
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {storySeries.length > 0 ? (
          <div
            ref={plotRef}
            className="relative h-full w-full touch-none"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverState(null)}>
            <svg
              viewBox={`0 0 ${plotGeometry.width} ${plotGeometry.height}`}
              className="h-full w-full"
              role="img"
              aria-label={`Floor waveform chart for ${metricConfig.label}`}>
              <rect x="0" y="0" width={plotGeometry.width} height={plotGeometry.height} fill="white" />

              <line
                x1={PLOT_MARGINS.left}
                y1={PLOT_MARGINS.top}
                x2={PLOT_MARGINS.left}
                y2={PLOT_MARGINS.top + plotGeometry.innerHeight}
                stroke="#d1d5db"
                strokeWidth="1"
              />
              <line
                x1={PLOT_MARGINS.left}
                y1={PLOT_MARGINS.top + plotGeometry.innerHeight}
                x2={PLOT_MARGINS.left + plotGeometry.innerWidth}
                y2={PLOT_MARGINS.top + plotGeometry.innerHeight}
                stroke="#d1d5db"
                strokeWidth="1"
              />

              {xTickTimes.map((tickTime) => {
                const x =
                  PLOT_MARGINS.left + (totalDuration <= 0 ? 0 : (tickTime / totalDuration) * plotGeometry.innerWidth);
                return (
                  <g key={tickTime}>
                    <line
                      x1={x}
                      y1={PLOT_MARGINS.top}
                      x2={x}
                      y2={PLOT_MARGINS.top + plotGeometry.innerHeight}
                      stroke="#f3f4f6"
                      strokeWidth="1"
                    />
                    <text x={x} y={plotGeometry.height - 16} textAnchor="middle" fontSize="10" fill="#6b7280">
                      {formatNumber(tickTime, 1)} s
                    </text>
                  </g>
                );
              })}

              {storyPaths.map(({ story, path, baselineY }) => (
                <g key={story.storyId}>
                  <line
                    x1={PLOT_MARGINS.left}
                    y1={baselineY}
                    x2={PLOT_MARGINS.left + plotGeometry.innerWidth}
                    y2={baselineY}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <path d={path} fill="none" stroke={story.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </g>
              ))}

              {storyPaths.map(({ story, baselineY }) => (
                <g key={`${story.storyId}-label`}>
                  <line
                    x1={PLOT_MARGINS.left - 5}
                    y1={baselineY}
                    x2={PLOT_MARGINS.left}
                    y2={baselineY}
                    stroke="#9ca3af"
                    strokeWidth="1"
                  />
                  <text x={PLOT_MARGINS.left - 8} y={baselineY + 3} textAnchor="end" fontSize="10" fill="#374151">
                    {panelState.placementMode === "elevation"
                      ? `${formatNumber(story.elevationIn, 0)} in`
                      : story.floorLabel}
                  </text>
                </g>
              ))}

              <text
                x={plotGeometry.width / 2}
                y={plotGeometry.height - 4}
                textAnchor="middle"
                fontSize="11"
                fill="#374151">
                Time (s)
              </text>
              <text
                x={18}
                y={plotGeometry.height / 2}
                transform={`rotate(-90 18 ${plotGeometry.height / 2})`}
                textAnchor="middle"
                fontSize="11"
                fill="#374151">
                {panelState.placementMode === "elevation" ? "Story Elevation (in)" : "Floor"}
              </text>
            </svg>

            <div
              ref={playheadRef}
              className="pointer-events-none absolute top-6 bottom-12 left-0 z-10 w-px bg-neutral-900/70"
              style={{ display: "none" }}
            />
            <div
              ref={hoverLineRef}
              className="pointer-events-none absolute top-6 bottom-12 left-0 z-10 w-px bg-neutral-400/70"
              style={{ display: "none" }}
            />
            {hoverState && hoveredStory ? (
              <div
                className="pointer-events-none absolute z-20 rounded-md border border-neutral-200 bg-white px-3 py-2 text-neutral-900 shadow-lg"
                style={{
                  left: clamp(hoverState.x + 12, 16, Math.max(16, plotGeometry.width - 220)),
                  top: clamp(hoverState.y - 12, 16, Math.max(16, plotGeometry.height - 140)),
                }}>
                <HoverTooltip story={hoveredStory} frame={hoverState.frame} dt={dt} unit={metricConfig.unit.abbr} />
              </div>
            ) : null}
          </div>
        ) : (
          <div ref={plotRef} className="flex h-full items-center justify-center text-sm text-neutral-400">
            No visible floors available for this panel
          </div>
        )}
      </div>
    </div>
  );
}
