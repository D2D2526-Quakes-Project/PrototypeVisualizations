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
  viridis: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"],
  plasma: ["#0d0887", "#7e03a8", "#cc4778", "#f89540", "#f0f921"],
  inferno: ["#000004", "#57106e", "#bc3754", "#f98e09", "#fcffa4"],
  magma: ["#000004", "#51127c", "#b73779", "#fc8961", "#fcfdbf"],
  cividis: ["#00224e", "#434e6c", "#7d7c78", "#bcae6c", "#fee838"],
  viridisInverted: ["#0218DA", "#A1369D", "#DE6E73", "#C4AD74", "#BBFEAB"],
  plasmaInverted: ["#0F06DE", "#076ABF", "#33B887", "#81FC57", "#F2F778"],
  infernoInverted: ["#03005B", "#0671F6", "#43C8AB", "#A8EF91", "#FFFFFB"],
  magmaInverted: ["#030240", "#03769E", "#48C886", "#AEED83", "#FFFFFB"],
  cividisInverted: ["#0117C7", "#435193", "#828387", "#BCB193", "#FFDDB1"],
} as const;

export type MatplotlibPaletteKey = "viridis" | "plasma" | "inferno" | "magma" | "cividis";
