import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { useFloorVisibility } from "@/features/3d/contexts/useFloorVisibility";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { usePanelState } from "@/features/dockview/usePanelState";
import { getMetricConfig, isHingeMetric, isStaticMetric, type Metric } from "@/features/metrics/metrics";
import { useMetrics } from "@/features/metrics/useMetrics";
import { usePlayback } from "@/features/playback/usePlayback";
import { useProfileData } from "@/state";
import { formatNumber, getOrdinalSuffix } from "@/lib/utils";
import type { IDockviewPanelProps } from "dockview-react";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHover } from "../3d/lib/useHover";
import type { ECharts } from "echarts";
import { useTheme } from "@/components/ThemeProvider";

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
};

const DEFAULT_PANEL_STATE: FloorWaveformPanelState = {
  metric: "accelerationX",
  placementMode: "elevation",
  amplitudeScale: 2,
};

const PLOT_MARGINS = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
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
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const timeRange = useProfileData((s) => s.timeRange);
  const { visibleFloors } = useFloorVisibility();
  const { availableMetrics } = useMetrics();
  const { setHoveredFloor } = useHover();
  const { echartsTheme } = useTheme();

  const echartsRef = useRef<ReactECharts>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const hoverLineRef = useRef<HTMLDivElement>(null);

  const [hoverState, setHoverState] = useState<{
    frame: number;
    storyIndex: number;
    x: number;
    y: number;
    containerWidth: number;
    containerHeight: number;
  } | null>(null);

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

  const visibleStoryIds = useMemo(() => visibleFloors, [visibleFloors]);

  const storyOrder = animationData.metadata.storyOrder;

  const baseStorySeries = useMemo(() => {
    const frameCount = animationData.metadata.frameCount;
    const series: StorySeries[] = [];
    const getStoryValue = metricConfig.getStoryValue;

    if (!getStoryValue) return series;

    visibleStoryIds.forEach((storyId) => {
      const storyIndex = storyOrder.indexOf(storyId);
      if (storyIndex === -1) return;

      const values = new Float32Array(frameCount);
      let peakValue = 0;
      let peakAbsValue = 0;
      let peakFrame = 0;

      for (let frame = 0; frame < frameCount; frame++) {
        const value = getStoryValue(animationData, storyIndex, frame);
        if (value === undefined || !Number.isFinite(value)) continue;

        values[frame] = value;

        const candidatePeak = metricConfig.hasNegative ? Math.abs(value) : value;
        if (candidatePeak > peakAbsValue) {
          peakAbsValue = candidatePeak;
          peakValue = value;
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
      });
    });

    return series;
  }, [animationData, metricConfig, visibleStoryIds, storyOrder]);

  const storySeries: StorySeries[] = baseStorySeries;

  const frameCount = animationData.metadata.frameCount;
  const dt = animationData.metadata.dt;
  const totalDuration = Math.max(0, (frameCount - 1) * dt);
  const maxAbsValue = useMemo(() => {
    const peak = storySeries.reduce((max, story) => Math.max(max, story.peakAbsValue), 0);
    return Math.max(metricConfig.getPrecomputedMax(animationData), peak, 1e-6);
  }, [animationData, metricConfig, storySeries]);

  const amplitudeMultiplier = panelState.amplitudeScale ?? DEFAULT_PANEL_STATE.amplitudeScale;

  const option = useMemo(() => {
    if (storySeries.length === 0) return {};

    const elevationValues = storySeries.map((story) => story.elevationIn);
    const minElevation = elevationValues.length > 0 ? Math.min(...elevationValues) : 0;
    const maxElevation = elevationValues.length > 0 ? Math.max(...elevationValues) : 1;

    // Determine the average data gap so the amplitude slider scales intuitively
    const avgGap = storySeries.length > 1 ? (maxElevation - minElevation) / (storySeries.length - 1) : 10;
    const dataGap = panelState.placementMode === "elevation" ? avgGap : 10;
    const dataAmplitudeScale = maxAbsValue > 0 ? (dataGap * amplitudeMultiplier) / maxAbsValue : 1;

    const series = storySeries.map((story, index) => {
      const baselineY = panelState.placementMode === "elevation" ? story.elevationIn : index * 10;

      // Populate coordinate array mapping [time, computedY]
      const data = new Array(frameCount);
      for (let i = 0; i < frameCount; i++) {
        data[i] = [i * dt, baselineY + story.values[i] * dataAmplitudeScale];
      }

      return {
        type: "line",
        name: story.floorLabel,
        data: data,
        z: 2,
        showSymbol: false,
        sampling: "lttb",
        animation: false,
        clip: false,
        lineStyle: {
          color: echartsTheme == "my_dark_theme" ? "#ffffff" : "#000000",
          width: 1.5,
        },
        markLine: {
          z: 1,
          silent: true,
          symbol: ["none", "none"],
          animation: false,
          label: {
            position: "start",
            distance: 12,
            formatter:
              panelState.placementMode === "elevation" ? `${Math.round(story.elevationIn)} in` : story.floorLabel,
            color: echartsTheme == "my_dark_theme" ? "#A1A1A1" : "#737373",
            fontSize: 10,
          },
          lineStyle: {
            color: echartsTheme == "my_dark_theme" ? "#2E2E2E" : "#E5E5E5",
            width: 1,
            type: "solid",
          },
          data: [{ yAxis: baselineY }],
        },
      };
    });

    return {
      animation: false,
      grid: {
        top: PLOT_MARGINS.top,
        right: PLOT_MARGINS.right,
        bottom: PLOT_MARGINS.bottom,
        left: PLOT_MARGINS.left,
      },
      xAxis: {
        type: "value",
        name: "Time (s)",
        nameLocation: "middle",
        nameGap: 25,
        // nameTextStyle: {
        //   // color: "#374151",
        //   fontSize: 11,
        // },
        min: timeRange?.start ?? 0,
        max: timeRange?.end ?? (totalDuration > 0 ? totalDuration : 1),
        splitLine: { show: false },
        axisLabel: {
          formatter: (value: number) => `${value.toFixed(1)} s`,
          // color: "#6b7280",
          fontSize: 10,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        name: panelState.placementMode === "elevation" ? "Story Elevation (in)" : "Floor",
        nameLocation: "middle",
        nameGap: 50,
        // nameTextStyle: { color: "#374151", fontSize: 11 },
        min: "dataMin",
        max: "dataMax",
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      series: series,
      tooltip: { show: false },
    };
  }, [
    storySeries,
    panelState.placementMode,
    frameCount,
    dt,
    totalDuration,
    amplitudeMultiplier,
    maxAbsValue,
    timeRange,
    echartsTheme,
  ]);

  // Handle Playhead visually without React state cycles forcing heavy redraws
  useEffect(() => {
    if (!playheadRef.current || !echartsRef.current) return;
    const instance = echartsRef.current.getEchartsInstance();
    if (!instance || storySeries.length === 0) return;

    const currentOption = instance.getOption();
    if (
      !currentOption ||
      !currentOption.series ||
      (Array.isArray(currentOption.series) && currentOption.series.length === 0)
    ) {
      return;
    }

    const time = frameIndex * dt;
    const xPixel = instance.convertToPixel({ xAxisIndex: 0 }, time) as number | undefined;

    if (xPixel != null && !isNaN(xPixel)) {
      playheadRef.current.style.transform = `translateX(${xPixel.toFixed(2)}px)`;
      playheadRef.current.style.display = "block";
    } else {
      playheadRef.current.style.display = "none";
    }
  }, [frameIndex, dt, storySeries.length]);

  // Handle visual Hover Line positioning
  useEffect(() => {
    if (!hoverLineRef.current) return;
    if (!hoverState) {
      hoverLineRef.current.style.display = "none";
      return;
    }
    hoverLineRef.current.style.transform = `translateX(${hoverState.x}px)`;
    hoverLineRef.current.style.display = "block";
  }, [hoverState]);

  // Attach directly to ZRender events to map pixel coordinates to Data points
  const handleChartReady = (instance: ECharts) => {
    const zr = instance.getZr();

    zr.on("mousemove", (e) => {
      const pointInPixel = [e.offsetX, e.offsetY];

      if (!instance.containPixel("grid", pointInPixel)) {
        setHoverState(null);
        setHoveredFloor(null);
        return;
      }

      const pointInGrid = instance.convertFromPixel({ seriesIndex: 0 }, pointInPixel);
      const timeX = pointInGrid[0];
      const elevationY = pointInGrid[1];

      const frame = clamp(Math.round(timeX / dt), 0, frameCount - 1);

      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      storySeries.forEach((story, index) => {
        const baselineY = panelState.placementMode === "elevation" ? story.elevationIn : index * 10;
        const dist = Math.abs(elevationY - baselineY);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestIndex = index;
        }
      });

      const storyId = visibleFloors[nearestIndex];

      setHoverState({
        frame,
        storyIndex: nearestIndex,
        x: e.offsetX,
        y: e.offsetY,
        containerWidth: instance.getWidth(),
        containerHeight: instance.getHeight(),
      });
      setHoveredFloor({ type: "floor", storyId });
    });

    zr.on("mouseout", () => {
      setHoverState(null);
      setHoveredFloor(null);
    });
  };

  const hoveredStory = hoverState ? storySeries[hoverState.storyIndex] : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="border-border flex shrink-0 flex-wrap gap-1 border-b px-2 pb-1">
        {/* Metric select */}
        <label className="text-muted-foreground flex flex-col items-start text-[11px]">
          Metric
          <NativeSelect
            size="sm"
            value={selectedMetric}
            className="text-foreground"
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
        <label className="text-muted-foreground flex flex-col items-start text-[11px]">
          Spacing
          <NativeSelect
            size="sm"
            value={panelState.placementMode}
            className="text-foreground"
            onChange={(event) => setPanelState({ placementMode: event.target.value as PlacementMode })}>
            <NativeSelectOption value="elevation">By elevation</NativeSelectOption>
            <NativeSelectOption value="floor">Equal floors</NativeSelectOption>
          </NativeSelect>
        </label>

        {/* Amplitude scale slider */}
        <label className="text-muted-foreground flex flex-col items-start text-[11px]">
          Amplitude
          <div className="flex items-center gap-1">
            <Slider
              min={AMPLITUDE_SLIDER_MIN}
              max={AMPLITUDE_SLIDER_MAX}
              step={1}
              value={[amplitudeToSlider(amplitudeMultiplier)]}
              onValueChange={(value) => setPanelState({ amplitudeScale: sliderToAmplitude(value[0]) })}
              className="text-foreground h-1 w-20 cursor-pointer appearance-none rounded-full"
            />
            <span className="text-foreground w-8 font-mono text-[10px]">{amplitudeMultiplier.toFixed(1)}×</span>
          </div>
        </label>
      </div>

      <div className="relative min-h-90 flex-1">
        {storySeries.length > 0 ? (
          <div className="relative h-full w-full touch-none">
            <ReactECharts
              theme={echartsTheme}
              ref={echartsRef}
              option={option}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "canvas" }}
              onChartReady={handleChartReady}
              replaceMerge={["series"]}
            />

            <div
              ref={playheadRef}
              className="pointer-events-none absolute top-0 bottom-9 left-0 z-10 w-px bg-neutral-900/70"
              style={{ display: "none" }}
            />
            <div
              ref={hoverLineRef}
              className="pointer-events-none absolute top-0 bottom-9 left-0 z-10 w-px bg-neutral-400/70"
              style={{ display: "none" }}
            />

            {hoverState && hoveredStory ? (
              <div
                className="border-border bg-background text-foreground pointer-events-none absolute z-20 rounded-md border px-3 py-2 shadow-lg"
                style={{
                  left: clamp(hoverState.x + 12, 16, Math.max(16, hoverState.containerWidth - 220)),
                  top: clamp(hoverState.y - 12, 16, Math.max(16, hoverState.containerHeight - 140)),
                }}>
                <HoverTooltip story={hoveredStory} frame={hoverState.frame} dt={dt} unit={metricConfig.unit.abbr} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            No visible floors available for this panel
          </div>
        )}
      </div>
    </div>
  );
}
