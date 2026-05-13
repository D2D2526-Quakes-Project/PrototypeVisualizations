import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePlayback } from "@/features/playback/usePlayback";
import { usePanelState } from "@/features/dockview/usePanelState";
import { formatNumber, formatStoryLabel } from "@/lib/utils";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import type { DockviewPanelApi } from "dockview";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { getMetricConfig, isHingeMetric, type Metric } from "../metrics/metrics";
import { useFloorVisibility } from "../3d/contexts/useFloorVisibility";
import { useThresholds } from "../metrics/useThresholds";
import { useMetrics } from "../metrics/useMetrics";

interface CornerMetricChartProps {
  api: DockviewPanelApi;
}

const cornerColors = {
  NW: "#3b82f6",
  NE: "#ef4444",
  SW: "#10b981",
  SE: "#f59e0b",
} as const;

type CornerKey = keyof typeof cornerColors;
type CornerMetricChartPanelState = {
  visibleCorners: string[];
  metric: Metric;
  displayMode: "bar" | "line";
};

const DEFAULT_CORNER_METRIC_CHART_PANEL_STATE: CornerMetricChartPanelState = {
  visibleCorners: ["NW", "NE", "SW", "SE"],
  metric: "interstoryDrift",
  displayMode: "bar",
};

const corners: CornerKey[] = ["NW", "NE", "SW", "SE"];
const MIN_X_AXIS_MAX = 0.01;

function TooltipContent({
  storyId,
  elevationIn,
  corners,
  currentValues,
  peakValues,
  unitLabel,
}: {
  storyId: string;
  elevationIn: number;
  corners: CornerKey[];
  currentValues: Record<string, Record<CornerKey, number>>;
  peakValues: Record<string, Record<CornerKey, number>>;
  unitLabel: string;
}) {
  return (
    <div style={{ minWidth: "220px" }}>
      <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>
        {formatStoryLabel(storyId, elevationIn)}
      </div>
      {corners.map((corner) => {
        const current = currentValues[storyId]?.[corner] || 0;
        const peak = peakValues[storyId]?.[corner] || 0;

        return (
          <div
            key={corner}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              marginTop: "4px",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                  background: cornerColors[corner],
                }}
              />
              <span style={{ color: "#6b7280", fontSize: "11px" }}>{corner}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontWeight: 500 }}>
                {formatNumber(current, 3)} {unitLabel}
              </span>
              <span style={{ color: "#9ca3af", fontSize: "10px", marginLeft: "6px" }}>
                / {formatNumber(peak, 3)} {unitLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getPrecomputedPeakValue(
  metric: Metric,
  nodeId: number,
  animationData: ReturnType<typeof useAnimationData>["animationData"]
): number | null {
  switch (metric) {
    case "interstoryDrift":
      return animationData.precomputed.peakStoryDrift[nodeId] ?? 0;
    case "displacementMag":
      return animationData.precomputed.peakNodeDisplacement[nodeId] ?? 0;
    case "velocityMag":
      return animationData.precomputed.peakNodeVelocity
        ? (animationData.precomputed.peakNodeVelocity[nodeId] ?? 0)
        : null;
    case "accelerationMag":
      return animationData.precomputed.peakNodeAcceleration
        ? (animationData.precomputed.peakNodeAcceleration[nodeId] ?? 0)
        : null;
    default:
      return null;
  }
}

export function CornerMetricChart({ api }: CornerMetricChartProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { visibleFloors } = useFloorVisibility();
  const { thresholds } = useThresholds();
  const { availableMetrics } = useMetrics();
  const chartRef = useRef<ReactECharts>(null);
  const [chartReadyVersion, setChartReadyVersion] = useState(0);

  const defaultState = DEFAULT_CORNER_METRIC_CHART_PANEL_STATE;
  const { state: panelState, setState: setPanelState } = usePanelState<CornerMetricChartPanelState>({
    panelId: api.id,
    panelType: "Corner Metric Chart",
    defaultState,
  });

  const selectableMetrics = useMemo(() => {
    const supportedMetrics = availableMetrics.filter((metric) => !isHingeMetric(metric));
    return supportedMetrics.length > 0 ? supportedMetrics : [defaultState.metric];
  }, [availableMetrics, defaultState.metric]);

  const selectedMetric = selectableMetrics.includes(panelState.metric) ? panelState.metric : selectableMetrics[0];
  const displayMode = panelState.displayMode || "bar";

  useEffect(() => {
    if (panelState.metric === selectedMetric) return;

    setPanelState({
      visibleCorners: panelState.visibleCorners,
      metric: selectedMetric,
      displayMode: panelState.displayMode,
    });
  }, [panelState.displayMode, panelState.metric, panelState.visibleCorners, selectedMetric, setPanelState]);

  const metricConfig = useMemo(() => getMetricConfig(selectedMetric), [selectedMetric]);
  const thresholdValue = metricConfig.thresholdKey === "inf" ? 0 : (thresholds[metricConfig.thresholdKey] ?? 0);
  const storyIds = useMemo(() => Array.from(visibleFloors), [visibleFloors]);

  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    const handleLegendChange = () => {
      const option = chart.getOption() as { legend?: Array<{ selected?: Record<string, boolean> }> };
      if (!option.legend?.[0]?.selected) return;

      const selected = Object.entries(option.legend[0].selected)
        .filter(([, isVisible]) => isVisible)
        .map(([name]) => name);

      setPanelState({
        visibleCorners: selected,
        metric: selectedMetric,
        displayMode: panelState.displayMode,
      });
    };

    chart.on("legendselectchanged", handleLegendChange);
    return () => {
      chart.off("legendselectchanged", handleLegendChange);
    };
  }, [chartReadyVersion, api.id, panelState.displayMode, selectedMetric, setPanelState]);

  const yAxisData = useMemo(() => {
    return storyIds.map((storyId) => {
      const elevationIn =
        animationData.precomputed.storyElevations[storyId] ?? animationData.metadata.storyHeights[storyId] ?? 0;
      return formatStoryLabel(storyId, elevationIn);
    });
  }, [animationData.metadata.storyHeights, animationData.precomputed.storyElevations, storyIds]);

  const currentValues = useMemo(() => {
    const values: Record<string, Record<CornerKey, number>> = {};

    for (const storyId of storyIds) {
      const cornerNodes = animationData.metadata.cornerNodes[storyId];
      values[storyId] = {
        NW: metricConfig.getValue(animationData, frameIndex, cornerNodes.NW) ?? 0,
        NE: metricConfig.getValue(animationData, frameIndex, cornerNodes.NE) ?? 0,
        SW: metricConfig.getValue(animationData, frameIndex, cornerNodes.SW) ?? 0,
        SE: metricConfig.getValue(animationData, frameIndex, cornerNodes.SE) ?? 0,
      };
    }

    return values;
  }, [animationData, frameIndex, metricConfig, storyIds]);

  const peakValues = useMemo(() => {
    const values: Record<string, Record<CornerKey, number>> = {};
    const frameCount = animationData.metadata.frameCount;

    for (const storyId of storyIds) {
      const cornerNodes = animationData.metadata.cornerNodes[storyId];
      const storyPeakValues = {} as Record<CornerKey, number>;

      for (const corner of corners) {
        const nodeId = cornerNodes[corner];
        const precomputedPeak = getPrecomputedPeakValue(selectedMetric, nodeId, animationData);

        if (precomputedPeak !== null) {
          storyPeakValues[corner] = precomputedPeak;
          continue;
        }

        let peak = 0;
        for (let candidateFrame = 0; candidateFrame < frameCount; candidateFrame++) {
          const value = metricConfig.getValue(animationData, candidateFrame, nodeId) ?? 0;
          if (Math.abs(value) > Math.abs(peak)) {
            peak = value;
          }
        }
        storyPeakValues[corner] = peak;
      }

      values[storyId] = storyPeakValues;
    }

    return values;
  }, [animationData, metricConfig, selectedMetric, storyIds]);

  const baseOption = useMemo((): EChartsOption => {
    return {
      title: {
        text: `Corner ${metricConfig.label} by Story`,
        subtext:
          displayMode === "line"
            ? "Current & peak values per floor corner"
            : "Current frame vs. peak for each floor corner",
        left: 0,
        top: 0,
        itemGap: 3,
        textStyle: {
          fontSize: 13,
          fontWeight: 600,
          color: "#111827",
        },
        subtextStyle: {
          fontSize: 10,
          color: "#6b7280",
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(0,0,0,0.05)",
          },
        },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 12,
        textStyle: {
          color: "#374151",
          fontSize: 12,
        },
        transitionDuration: 0,
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";

          const storyIdx = params[0].dataIndex;
          const storyId = storyIds[storyIdx];
          const elevationIn =
            animationData.precomputed.storyElevations[storyId] ?? animationData.metadata.storyHeights[storyId] ?? 0;

          return renderToString(
            <TooltipContent
              storyId={storyId}
              elevationIn={elevationIn}
              corners={corners}
              currentValues={currentValues}
              peakValues={peakValues}
              unitLabel={metricConfig.unit.abbr}
            />
          );
        },
      },
      legend: {
        data: corners.flatMap((corner) =>
          displayMode === "line"
            ? [
                { name: corner, itemStyle: { color: cornerColors[corner] } },
                { name: `${corner} Peak`, itemStyle: { color: cornerColors[corner], opacity: 0.5 } },
              ]
            : [{ name: corner, itemStyle: { color: cornerColors[corner] } }]
        ),
        right: 0,
        top: 52,
        orient: "vertical",
        itemGap: 8,
        textStyle: {
          fontSize: 11,
          color: "#374151",
        },
        itemWidth: 14,
        itemHeight: 14,
      },
      grid: {
        left: 0,
        right: 0,
        bottom: 0,
        top: 52,
        containLabel: false,
      },
      yAxis: {
        type: "category",
        name: "Story",
        nameLocation: "end",
        nameGap: 4,
        nameTextStyle: {
          fontSize: 11,
          color: "#4b5563",
          fontWeight: 500,
        },
        data: yAxisData,
        axisLine: {
          lineStyle: {
            color: "#d1d5db",
          },
        },
        axisLabel: {
          color: "#374151",
          fontSize: 11,
          fontWeight: 500,
        },
        axisTick: {
          show: false,
        },
      },
      animation: false,
    };
  }, [
    animationData.metadata.storyHeights,
    animationData.precomputed.storyElevations,
    currentValues,
    displayMode,
    metricConfig.label,
    metricConfig.unit.abbr,
    peakValues,
    storyIds,
    yAxisData,
  ]);

  const seriesData = useMemo(() => {
    if (displayMode === "line") {
      const currentLineSeries = corners.map((corner, idx) => ({
        name: corner,
        type: "line" as const,
        data: storyIds.map((storyId) => currentValues[storyId]?.[corner] || 0),
        itemStyle: {
          color: cornerColors[corner],
        },
        lineStyle: {
          width: 2,
          color: cornerColors[corner],
        },
        symbol: "circle",
        symbolSize: 6,
        z: 2,
        markLine:
          idx === 0 && thresholdValue > 0
            ? {
                symbol: "none",
                data: [{ xAxis: thresholdValue, name: "Threshold" }],
                lineStyle: { color: "#ef4444", width: 1, type: "dashed" as const },
                label: { show: false },
                silent: true,
              }
            : undefined,
      }));

      const peakLineSeries = corners.map((corner) => ({
        name: `${corner} Peak`,
        type: "line" as const,
        data: storyIds.map((storyId) => peakValues[storyId]?.[corner] || 0),
        itemStyle: {
          color: cornerColors[corner],
          opacity: 0.5,
        },
        lineStyle: {
          width: 1,
          type: "dashed" as const,
          color: cornerColors[corner],
        },
        symbol: "emptyCircle",
        symbolSize: 5,
        z: 1,
        silent: true,
      }));

      return [...currentLineSeries, ...peakLineSeries];
    }

    const peakSeries = corners.map((corner) => ({
      name: corner,
      type: "bar" as const,
      stack: corner,
      data: storyIds.map((storyId) => {
        const peak = peakValues[storyId]?.[corner] || 0;
        const current = currentValues[storyId]?.[corner] || 0;
        if (peak >= 0) {
          return Math.max(peak - Math.max(0, current), 0);
        } else {
          return Math.min(peak - Math.min(0, current), 0);
        }
      }),
      itemStyle: {
        color: cornerColors[corner],
        opacity: 0.3,
        borderRadius: [0, 2, 2, 0] as [number, number, number, number],
      },
      barGap: "0%",
      barCategoryGap: "20%",
      silent: true,
      z: 1,
      legendHoverLink: false,
    }));

    const currentSeries = corners.map((corner, idx) => ({
      name: corner,
      type: "bar" as const,
      stack: corner,
      data: storyIds.map((storyId) => currentValues[storyId]?.[corner] || 0),
      itemStyle: {
        color: cornerColors[corner],
        borderRadius: [0, 2, 2, 0] as [number, number, number, number],
      },
      barGap: "0%",
      barCategoryGap: "20%",
      z: 2,
      markLine:
        idx === 0 && thresholdValue > 0
          ? {
              symbol: "none",
              data: [{ xAxis: thresholdValue, name: "Threshold" }],
              lineStyle: { color: "#ef4444", width: 1, type: "dashed" as const },
              label: { show: false },
              silent: true,
            }
          : undefined,
    }));

    return [...currentSeries, ...peakSeries];
  }, [currentValues, displayMode, peakValues, storyIds, thresholdValue]);

  const xAxisExtent = useMemo(() => {
    let maxValue = MIN_X_AXIS_MAX;
    let minValue = 0;

    for (const storyId of storyIds) {
      for (const corner of corners) {
        const val = currentValues[storyId]?.[corner] ?? 0;
        const peak = peakValues[storyId]?.[corner] ?? 0;
        maxValue = Math.max(maxValue, val, peak);
        minValue = Math.min(minValue, val, peak);
      }
    }

    if (metricConfig.hasNegative) {
      const absMax = Math.max(Math.abs(maxValue), Math.abs(minValue));
      const paddedMax = Math.max(absMax * 1.15, MIN_X_AXIS_MAX);
      return { min: -paddedMax, max: paddedMax };
    }

    return { min: 0, max: Math.max(maxValue * 1.15, MIN_X_AXIS_MAX) };
  }, [currentValues, metricConfig.hasNegative, peakValues, storyIds]);

  const option = useMemo(() => {
    const selected: Record<string, boolean> = {};
    corners.forEach((corner) => {
      selected[corner] = panelState.visibleCorners.includes(corner);
    });

    return {
      ...baseOption,
      legend: {
        ...baseOption.legend,
        selected,
      },
      xAxis: {
        type: "value",
        name: `${metricConfig.label} (${metricConfig.unit.abbr})`,
        nameLocation: "middle",
        nameGap: 28,
        nameTextStyle: {
          fontSize: 11,
          color: "#4b5563",
          fontWeight: 500,
        },
        min: xAxisExtent.min,
        max: xAxisExtent.max,
        axisLine: {
          lineStyle: {
            color: "#d1d5db",
          },
        },
        axisLabel: {
          formatter: (value: number) => formatNumber(value, 2),
          color: "#6b7280",
          fontSize: 10,
        },
        splitLine: {
          lineStyle: {
            color: "#e5e7eb",
            type: "dashed" as const,
          },
        },
      },
      series: seriesData,
    } satisfies EChartsOption;
  }, [
    baseOption,
    metricConfig.label,
    metricConfig.unit.abbr,
    panelState.visibleCorners,
    seriesData,
    xAxisExtent.min,
    xAxisExtent.max,
  ]);

  return (
    <div className="relative flex h-full w-full flex-col gap-2 bg-white">
      <div className="absolute right-0 z-10 flex items-center gap-2 px-1 pt-1">
        <Label htmlFor={`${api.id}-metric`} className="text-xs font-medium text-neutral-600">
          Metric
        </Label>
        <NativeSelect
          id={`${api.id}-metric`}
          value={selectedMetric}
          onChange={(event) =>
            setPanelState({
              visibleCorners: panelState.visibleCorners,
              metric: event.target.value as Metric,
              displayMode: panelState.displayMode,
            })
          }
          className="h-8 min-w-0 flex-1 text-xs">
          {selectableMetrics.map((metric) => (
            <NativeSelectOption key={metric} value={metric}>
              {getMetricConfig(metric).label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={displayMode}
          onValueChange={(value) => {
            if (!value) return;
            setPanelState({
              visibleCorners: panelState.visibleCorners,
              metric: panelState.metric,
              displayMode: value as "bar" | "line",
            });
          }}>
          <ToggleGroupItem value="bar">Bar</ToggleGroupItem>
          <ToggleGroupItem value="line">Line</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="min-h-0 flex-1">
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "svg" }}
          onChartReady={() => setChartReadyVersion((v) => v + 1)}
        />
      </div>
    </div>
  );
}
