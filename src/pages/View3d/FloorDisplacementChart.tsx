import { usePlayback } from "@/components/playback/PlaybackContext";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useAnimationData } from "@/hooks/nodeDataHook";

export function FloorDisplacementChart() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const chartData = useMemo(() => {
    const { storyOrder, stories, storyHeights } = animationData.metadata;
    const { displacementLin } = animationData;
    const frameData = displacementLin.atFrame(frameIndex);

    const storyData: Array<{
      story: string;
      elevation: number;
      avgX: number;
      avgY: number;
      avgZ: number;
      avgMag: number;
    }> = [];

    const storyOrderWithoutGround = storyOrder.slice(1);

    storyOrderWithoutGround.forEach((storyId) => {
      const nodes = stories[storyId] || [];
      const heightIn = storyHeights[storyId] || 0;
      const heightFt = heightIn / 12;

      let sumX = 0,
        sumY = 0,
        sumZ = 0;
      nodes.forEach((nodeIdx) => {
        const pos = frameData.at(nodeIdx);
        sumX += pos[0];
        sumY += pos[1];
        sumZ += pos[2];
      });
      const count = nodes.length || 1;
      const avgX = sumX / count;
      const avgY = sumY / count;
      const avgZ = sumZ / count;
      const avgMag = Math.sqrt(avgX ** 2 + avgY ** 2 + avgZ ** 2);

      storyData.push({
        story: storyId,
        elevation: heightFt,
        avgX,
        avgY,
        avgZ,
        avgMag,
      });
    });

    return storyData;
  }, [animationData, frameIndex]);

  const option = useMemo(() => {
    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 10,
        textStyle: { color: "#374151", fontSize: 11 },
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";
          const data = chartData[params[0].dataIndex];
          return `
            <div style="font-weight: 600; margin-bottom: 6px;">Story ${data.story} (${data.elevation.toFixed(0)}ft)</div>
            <div>X: ${data.avgX.toFixed(4)}</div>
            <div>Y: ${data.avgY.toFixed(4)}</div>
            <div>Z: ${data.avgZ.toFixed(4)}</div>
            <div>Mag: ${data.avgMag.toFixed(4)}</div>
          `;
        },
      },
      legend: {
        data: ["X", "Y", "Z", "Magnitude"],
        right: 10,
        top: 0,
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: 60,
        right: 20,
        top: 30,
        bottom: 30,
      },
      xAxis: {
        type: "value",
        name: "Displacement (in)",
        nameLocation: "middle",
        nameGap: 25,
        nameTextStyle: { fontSize: 11, color: "#4b5563" },
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#6b7280", fontSize: 10, formatter: (v: number) => v.toFixed(2) },
        splitLine: { lineStyle: { color: "#e5e7eb", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: chartData.map((d) => `${d.story} (${d.elevation.toFixed(0)}ft)`),
        axisLine: { lineStyle: { color: "#d1d5db" } },
        axisLabel: { color: "#374151", fontSize: 10, fontWeight: 500 },
        axisTick: { show: false },
      },
      series: [
        {
          name: "X",
          type: "bar",
          data: chartData.map((d) => d.avgX),
          itemStyle: { color: "#ef4444", opacity: 0.8 },
          barGap: "0%",
          barCategoryGap: "20%",
        },
        {
          name: "Y",
          type: "bar",
          data: chartData.map((d) => d.avgY),
          itemStyle: { color: "#22c55e", opacity: 0.8 },
          barGap: "0%",
          barCategoryGap: "20%",
        },
        {
          name: "Z",
          type: "bar",
          data: chartData.map((d) => d.avgZ),
          itemStyle: { color: "#3b82f6", opacity: 0.8 },
          barGap: "0%",
          barCategoryGap: "20%",
        },
        {
          name: "Magnitude",
          type: "line",
          data: chartData.map((d) => d.avgMag),
          lineStyle: { color: "#f59e0b", width: 2 },
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "#f59e0b" },
        },
      ],
      animation: false,
    };
  }, [chartData]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Floor Displacement</span>
          <span className="text-neutral-400 ml-2">- Average displacement per story</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
      </div>
    </div>
  );
}
