import { registerTheme } from "echarts";

const lightAxis = {
  nameTextStyle: {
    color: "#0A0A0A",
  },
  axisLine: {
    show: true,
    lineStyle: {
      color: "#E5E5E5",
    },
  },
  axisTick: {
    show: true,
    lineStyle: {
      color: "#E5E5E5",
    },
  },
  axisLabel: {
    show: true,
    color: "#737373",
  },
  splitLine: {
    show: true,
    lineStyle: {
      color: ["#E5E5E5"],
    },
  },
  splitArea: {
    show: false,
    areaStyle: {
      color: ["#E5E5E5"],
    },
  },
};

registerTheme("my_light_theme", {
  backgroundColor: "transparent",
  textStyle: {},
  title: {
    textStyle: {
      color: "#0A0A0A",
    },
    subtextStyle: {
      color: "#737373",
    },
  },
  categoryAxis: lightAxis,
  valueAxis: lightAxis,
  logAxis: lightAxis,
  timeAxis: lightAxis,
  tooltip: {
    axisPointer: {
      lineStyle: {
        color: "#E5E5E5",
        width: "1",
      },
      crossStyle: {
        color: "#E5E5E5",
        width: "1",
      },
    },
  },
});

const darkAxis = {
  nameTextStyle: {
    color: "#E5E5E5",
  },
  axisLine: {
    show: true,
    lineStyle: {
      color: "#2E2E2E",
    },
  },
  axisTick: {
    show: true,
    lineStyle: {
      color: "#2E2E2E",
    },
  },
  axisLabel: {
    show: true,
    color: "#A1A1A1",
  },
  splitLine: {
    show: true,
    lineStyle: {
      color: ["#2E2E2E"],
    },
  },
  splitArea: {
    show: false,
    areaStyle: {
      color: ["#2E2E2E"],
    },
  },
};
registerTheme("my_dark_theme", {
  backgroundColor: "transparent",
  textStyle: {},
  title: {
    textStyle: {
      color: "#E5E5E5",
    },
    subtextStyle: {
      color: "#A1A1A1",
    },
  },
  categoryAxis: darkAxis,
  valueAxis: darkAxis,
  logAxis: darkAxis,
  timeAxis: darkAxis,
  tooltip: {
    axisPointer: {
      lineStyle: {
        color: "#2E2E2E",
        width: "1",
      },
      crossStyle: {
        color: "#2E2E2E",
        width: "1",
      },
    },
  },
});
