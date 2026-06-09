import { useTheme } from "@/components/ThemeProvider";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { usePanelState } from "@/features/dockview/usePanelState";
import { usePlayback } from "@/features/playback/usePlayback";
import { formatNumber, formatStoryLabel, tooltipPositionFunction } from "@/lib/utils";
import { useLiveStore } from "@/state";
import type { DockviewPanelApi } from "dockview-react";
import type { EChartsOption, LegendComponentOption } from "echarts";
import ReactECharts from "echarts-for-react";
import React, { useEffect, useMemo, useRef } from "react";
import { renderToString } from "react-dom/server";
import { useFloorVisibility } from "../3d/contexts/useFloorVisibility";
import { useExportVideo } from "../export/ExportProvider";
import { getMetricConfig, isHingeMetric, type Metric } from "../metrics/metrics";
import { useMetrics } from "../metrics/useMetrics";
import { useThresholds } from "../metrics/useThresholds";

interface CornerMetricChartProps {
  api: DockviewPanelApi;
}

const cornerColors = {
  NW: "#F59E0B",
  NE: "#E2575A",
  SW: "#AAAAAA",
  SE: "#4E79A7",
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
    <div className="text-foreground grid min-w-40 grid-cols-[1fr_auto_auto] items-baseline gap-1">
      <div className="col-span-3 mb-1 text-sm font-bold">{formatStoryLabel(storyId, elevationIn)}</div>
      {corners.map((corner) => {
        const current = currentValues[storyId]?.[corner] || 0;
        const peak = peakValues[storyId]?.[corner] || 0;

        return (
          <React.Fragment key={corner}>
            <div className="flex min-w-12 items-center gap-1">
              <div
                style={{
                  background: cornerColors[corner],
                }}
                className="h-2.5 w-2.5 rounded-full"
              />
              <span className="text-muted-foreground text-xs">{corner}</span>
            </div>

            <span className="text-right text-sm">
              {formatNumber(current, 1, 1)} {unitLabel}
            </span>
            <span className="text-muted-foreground text-xs">
              / {formatNumber(peak, 1, 1)} {unitLabel}
            </span>
          </React.Fragment>
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
  const { availableMetrics, thresholdHighlighting } = useMetrics();
  const chartRef = useRef<ReactECharts>(null);
  const { echartsTheme } = useTheme();
  const exportRenderMode = useExportVideo();

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

  const setHoveredItem = useLiveStore((s) => s.setHoveredItem);
  const hoveredItem = useLiveStore((s) => {
    if (s.hoveredItem?.source !== api.id && s.hoveredItem?.type === "floor") return s.hoveredItem;
    return null;
  });
  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    if (hoveredItem) {
      const dataIndex = visibleFloors.indexOf(hoveredItem.storyId);

      if (dataIndex !== -1) {
        chart.dispatchAction({
          type: "showTip",
          seriesIndex: 0,
          dataIndex: dataIndex,
        });
        chart.dispatchAction({
          type: "highlight",
          seriesIndex: corners.map((_, i) => i),
          dataIndex: dataIndex,
        });
      }
    } else {
      chart.dispatchAction({
        type: "hideTip",
      });
      chart.dispatchAction({
        type: "downplay",
      });
    }
  }, [hoveredItem, visibleFloors, api.id]);

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
  }, [api.id, panelState.displayMode, selectedMetric, setPanelState]);

  const yAxisData = useMemo(() => {
    return visibleFloors.map((storyId) => {
      const elevationIn =
        animationData.precomputed.storyElevations[storyId] ?? animationData.metadata.storyHeights[storyId] ?? 0;
      return formatStoryLabel(storyId, elevationIn);
    });
  }, [animationData.metadata.storyHeights, animationData.precomputed.storyElevations, visibleFloors]);

  const currentValues = useMemo(() => {
    const values: Record<string, Record<CornerKey, number>> = {};

    for (const storyId of visibleFloors) {
      const cornerNodes = animationData.metadata.cornerNodes[storyId];
      values[storyId] = {
        NW: metricConfig.getValue(animationData, frameIndex, cornerNodes.NW) ?? 0,
        NE: metricConfig.getValue(animationData, frameIndex, cornerNodes.NE) ?? 0,
        SW: metricConfig.getValue(animationData, frameIndex, cornerNodes.SW) ?? 0,
        SE: metricConfig.getValue(animationData, frameIndex, cornerNodes.SE) ?? 0,
      };
    }

    return values;
  }, [animationData, frameIndex, metricConfig, visibleFloors]);

  const peakValues = useMemo(() => {
    const values: Record<string, Record<CornerKey, number>> = {};
    const frameCount = animationData.metadata.frameCount;

    for (const storyId of visibleFloors) {
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
  }, [animationData, metricConfig, selectedMetric, visibleFloors]);

  const baseOption = useMemo((): EChartsOption => {
    return {
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";

          const storyIdx = params[0].dataIndex;
          const storyId = visibleFloors[storyIdx];
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
        position: tooltipPositionFunction({ right: 0, bottom: 12 }),
      },
      legend: [
        {
          data: corners.map((corner) =>
            displayMode === "line"
              ? { name: corner, itemStyle: { color: cornerColors[corner] } }
              : { name: corner, itemStyle: { color: cornerColors[corner] } }
          ),
          right: displayMode === "line" ? 12 : 0,
          top: -5,
          orient: "horizontal",
          itemWidth: 14,
          itemHeight: 14,
          itemGap: displayMode === "line" ? 16.5 : 8,
        },
        ...(displayMode === "line"
          ? [
              {
                data: corners.map((corner) => ({
                  name: `${corner} Peak`,
                  itemStyle: { color: cornerColors[corner], opacity: 0.5 },
                })),
                formatter: () => "Peak",
                right: 0,
                top: 8,
                orient: "horizontal",
                itemWidth: 14,
                itemHeight: 14,
              } as LegendComponentOption,
            ]
          : []),
      ],
      grid: {
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
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
    metricConfig.unit.abbr,
    peakValues,
    visibleFloors,
    yAxisData,
  ]);

  const seriesData = useMemo(() => {
    if (displayMode === "line") {
      const currentLineSeries = corners.map((corner, idx) => ({
        name: corner,
        type: "line" as const,
        data: visibleFloors.map((storyId) => currentValues[storyId]?.[corner] || 0),
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
          idx === 0 && thresholdValue > 0 && thresholdHighlighting
            ? {
                symbol: "none",
                data: [{ xAxis: thresholdValue, name: "Threshold" }],
                lineStyle: { color: "#000000", width: 1, type: "dashed" as const },
                label: { show: false },
                silent: true,
              }
            : undefined,
      }));

      const peakLineSeries = corners.map((corner) => ({
        name: `${corner} Peak`,
        type: "line" as const,
        data: visibleFloors.map((storyId) => peakValues[storyId]?.[corner] || 0),
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
      data: visibleFloors.map((storyId) => {
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
      data: visibleFloors.map((storyId) => currentValues[storyId]?.[corner] || 0),
      itemStyle: {
        color: cornerColors[corner],
        borderRadius: [0, 2, 2, 0] as [number, number, number, number],
      },
      barGap: "0%",
      barCategoryGap: "20%",
      z: 2,
      markLine:
        idx === 0 && thresholdValue > 0 && thresholdHighlighting
          ? {
              symbol: "none",
              data: [{ xAxis: thresholdValue, name: "Threshold" }],
              lineStyle: { color: "#000000", width: 1, type: "dashed" as const },
              label: { show: false },
              silent: true,
            }
          : undefined,
    }));

    return [...currentSeries, ...peakSeries];
  }, [currentValues, displayMode, peakValues, visibleFloors, thresholdHighlighting, thresholdValue]);

  const xAxisExtent = useMemo(() => {
    let maxValue = MIN_X_AXIS_MAX;
    let minValue = 0;

    for (const storyId of visibleFloors) {
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
  }, [currentValues, metricConfig.hasNegative, peakValues, visibleFloors]);

  const option = useMemo(() => {
    const selected: Record<string, boolean> = {};
    corners.forEach((corner) => {
      selected[corner] = panelState.visibleCorners.includes(corner);
    });

    return {
      ...baseOption,
      legend: (baseOption.legend as Array<LegendComponentOption>).map((leg) => ({
        ...leg,
        selected,
      })),
      xAxis: {
        type: "value",
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
  }, [baseOption, panelState.visibleCorners, seriesData, xAxisExtent.min, xAxisExtent.max]);

  useEffect(() => {
    if (!chartRef.current) return;
    const instance = chartRef.current.getEchartsInstance();
    instance.on("click", (params) => {
      console.log(params); // contains echarts usual params
    });
  }, []);

  return (
    <div className="bg-background relative flex h-full w-full flex-col gap-2">
      <div className="min-h-0 flex-1">
        <ReactECharts
          theme={echartsTheme}
          ref={chartRef}
          option={option}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
          onChartReady={(echartsInstance) => {
            echartsInstance.getZr().on("mousemove", (params) => {
              const pointInPixel = [params.offsetX, params.offsetY];
              if (echartsInstance.containPixel("grid", pointInPixel)) {
                const pointInGrid = echartsInstance.convertFromPixel("grid", pointInPixel);
                const categoryIndex = pointInGrid[1];
                const storyId = visibleFloors[categoryIndex];
                if (storyId) {
                  setHoveredItem({ type: "floor", storyId, source: api.id });
                }
              }
            });
            echartsInstance.getZr().on("mouseout", () => {
              setHoveredItem(null);
            });
          }}
        />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] justify-items-end gap-2 px-1 pb-1">
        <div></div>
        <NativeSelect
          id={`${api.id}-metric`}
          size="sm"
          value={selectedMetric}
          onChange={(event) =>
            setPanelState({
              visibleCorners: panelState.visibleCorners,
              metric: event.target.value as Metric,
              displayMode: panelState.displayMode,
            })
          }>
          {selectableMetrics.map((metric) => {
            const thisMetricConfig = getMetricConfig(metric);
            return (
              <NativeSelectOption key={metric} value={metric} className="text-center">
                {thisMetricConfig.label} {thisMetricConfig.unit.abbr}
              </NativeSelectOption>
            );
          })}
        </NativeSelect>
        {exportRenderMode.showTransientUi && (
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
        )}
      </div>
    </div>
  );
}
