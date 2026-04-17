export const MATPLOTLIB_PALETTES: Record<string, [string, string, string, string, string]> = {
  viridis: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"],
  plasma: ["#0d0887", "#7e03a8", "#cc4778", "#f89540", "#f0f921"],
  inferno: ["#000004", "#57106e", "#bc3754", "#f98e09", "#fcffa4"],
  magma: ["#000004", "#51127c", "#b73779", "#fc8961", "#fcfdbf"],
  cividis: ["#00224e", "#434e6c", "#7d7c78", "#bcae6c", "#fee838"],
} as const;

export type MatplotlibPaletteKey = keyof typeof MATPLOTLIB_PALETTES;
