import { usePlayback } from "@/components/playback/PlaybackContext";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useAnimationData } from "@/hooks/nodeDataHook";

export function StoryDriftHeatmap() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const heatmapData = useMemo(() => {
    const { storyOrder } = animationData.metadata;
    const { storyDrift, peakStoryDrift } = animationData.precomputed;
    const storyOrderWithoutGround = storyOrder.slice(1);

    const timeStep = Math.max(1, Math.floor(animationData.metadata.frameCount / 200));

    const data: Array<[number, number, number]> = [];

    storyOrderWithoutGround.forEach((_storyId, storyIdx) => {
      for (let frame = 0; frame < animationData.metadata.frameCount; frame += timeStep) {
        const drifts = storyDrift.getStoryDrift(storyIdx + 1, frame);
        const maxDrift = Math.max(...drifts);
        data.push([Math.floor(frame / timeStep), storyIdx, maxDrift]);
      }
    });

    const maxValue = Math.max(...Object.values(peakStoryDrift).flatMap((s) => Object.values(s)));

    return {
      data,
      stories: storyOrderWithoutGround,
      maxValue,
      timeStep,
      frameCount: Math.ceil(animationData.metadata.frameCount / timeStep),
    };
  }, [animationData]);

  const option = useMemo(() => {
    const { data, stories, maxValue, frameCount } = heatmapData;

    const currentTimeIndex = Math.floor(frameIndex / heatmapData.timeStep);

    return {
      tooltip: {
        position: "top",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 10,
        formatter: (params: any) => {
          const [timeIdx, storyIdx, value] = params.data;
          const actualFrame = timeIdx * heatmapData.timeStep;
          const time = actualFrame * animationData.metadata.dt;
          return `
            <div style="font-weight: 600;">Story ${stories[storyIdx]}</div>
            <div>Frame: ${actualFrame + 1}</div>
            <div>Time: ${time.toFixed(3)}s</div>
            <div>Max Drift: ${value.toFixed(4)}%</div>
          `;
        },
      },
      grid: {
        left: 50,
        right: 40,
        top: 10,
        bottom: 40,
      },
      xAxis: {
        type: "category",
        data: Array.from({ length: frameCount }, (_, i) => (i * heatmapData.timeStep * animationData.metadata.dt).toFixed(1)),
        axisLabel: {
          color: "#6b7280",
          fontSize: 9,
          interval: Math.floor(frameCount / 10),
          formatter: (v: string) => `${v}s`,
        },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        data: stories,
        axisLabel: { color: "#374151", fontSize: 10 },
        splitArea: { show: false },
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: "vertical",
        right: 5,
        top: "center",
        inRange: {
          color: ["#f0fdf4", "#86efac", "#22c55e", "#15803d", "#166534"],
        },
        textStyle: { fontSize: 10 },
        formatter: (v: number) => `${(v * 100).toFixed(2)}%`,
      },
      series: [
        {
          type: "heatmap",
          data: data,
          label: { show: false },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
        {
          type: "line",
          markLine: {
            symbol: "none",
            data: [{ xAxis: currentTimeIndex }],
            lineStyle: { color: "#ef4444", width: 2, type: "solid" },
            label: { show: false },
          },
        },
      ],
      animation: false,
    };
  }, [heatmapData, frameIndex, animationData.metadata.dt]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Story Drift Heatmap</span>
          <span className="text-neutral-400 ml-2">- Max corner drift over time</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} />
      </div>
    </div>
  );
}
