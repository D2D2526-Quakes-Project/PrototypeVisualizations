export const MATPLOTLIB_PALETTES: Record<
  | "viridis"
  | "plasma"
  | "inferno"
  | "magma"
  | "cividis"
  | "viridisInverted"
  | "plasmaInverted"
  | "infernoInverted"
  | "magmaInverted"
  | "cividisInverted",
  [string, string, string, string, string]
> = {
  viridis: ["#fde725", "#5ec962", "#21918c", "#3b528b", "#440154"],
  plasma: ["#f0f921", "#f89540", "#cc4778", "#7e03a8", "#0d0887"],
  inferno: ["#fcffa4", "#f98e09", "#bc3754", "#57106e", "#000004"],
  magma: ["#fcfdbf", "#fc8961", "#b73779", "#51127c", "#000004"],
  cividis: ["#fee838", "#bcae6c", "#7d7c78", "#434e6c", "#00224e"],
  viridisInverted: ["#BBFEAB", "#C4AD74", "#DE6E73", "#A1369D", "#0218DA"],
  plasmaInverted: ["#F2F778", "#81FC57", "#33B887", "#076ABF", "#0F06DE"],
  infernoInverted: ["#FFFFFB", "#A8EF91", "#43C8AB", "#0671F6", "#03005B"],
  magmaInverted: ["#FFFFFB", "#AEED83", "#48C886", "#03769E", "#030240"],
  cividisInverted: ["#FFDDB1", "#BCB193", "#828387", "#435193", "#0117C7"],
} as const;

export type MatplotlibPaletteKey = "viridis" | "plasma" | "inferno" | "magma" | "cividis";
