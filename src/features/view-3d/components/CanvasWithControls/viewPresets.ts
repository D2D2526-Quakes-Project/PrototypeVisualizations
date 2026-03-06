export type ViewPresetMode =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "front"
  | "back"
  | "frontRight"
  | "frontLeft"
  | "backRight"
  | "backLeft";

export interface ViewPresetOption {
  view: ViewPresetMode;
  label: string;
}

export const VIEW_PRESET_OPTIONS: ViewPresetOption[] = [
  { view: "front", label: "+Y" },
  { view: "right", label: "+X" },
  { view: "back", label: "-Y" },
  { view: "left", label: "-X" },
  { view: "frontRight", label: "NE" },
  { view: "frontLeft", label: "NW" },
  { view: "backRight", label: "SE" },
  { view: "backLeft", label: "SW" },
  { view: "top", label: "Top" },
  { view: "bottom", label: "Bottom" },
];

export const COLLAPSED_VIEW_PRESET_OPTIONS: ViewPresetOption[] = VIEW_PRESET_OPTIONS.filter(({ view }) =>
  ["front", "right", "frontRight", "top"].includes(view)
);
