# TODO - Running Document

> **This is a living document. Please add new items as they are discovered and break down large tasks into smaller checkable items. Check off items as they are completed.**

---

- [ ] Move some panel information into the panel tab when not in a tab group

- [ ] Floor panels story drift section should use the metric row graph vis component. Same for the node panel and cross section panels.

- [ ] The camera default position is different from the "home position" from the Home button.

- [ ] Floor panels / Cross section panels visualizations should zoom on hover or click to open popup enlarged

- [ ] Using the precomputed data, show the hovered floor's average value for the current metric in the scene tooltip

- [ ] Individual panel export button for quick access to export single panel image and video

- [ ] Add filled regions to the floor waveform chart for areas above the current threshold (check image in the archive page)

- [ ] Make the hinges section on the side panels have grayscale min and max bars and split the legend so that min is on the left and max is on the right

- [ ] Setting for using SI units instead of ft.

---

### 5.2 Existing Panel Improvements

- [ ] Add color bar legends to charts
- [ ] Run view-3d panel consistency sweep and normalize chart metadata/state patterns
  - Audit all dock panels for required chart metadata (title, axis labels, legend/color bar, tooltip) and add missing pieces.
  - Standardize panel header layout/caption pattern (title + subtitle + controls) across charts/tables/analysis panels.
  - Standardize panel-local UI state persistence via `useViewStore` + `panelId` for panels with user selections (channel filters, axis selectors, sort state, pagination).
  - Recheck unit labels against `DATA_DOCUMENTATION.md` and project standard (`in`, `rad`, `s`) for all displayed values and axes.
  - Enforce spacing in all number-unit strings (e.g., `12 in`, `2.5 rad`, `3.0 s`) across labels, tooltips, and chart text.

  - Current bug: crossing time stores `storyIndex` instead of `frameIndex`, then converts that value to seconds.
  - Also fix frame-0 behavior and use explicit `null` for "not crossed yet" so the UI can distinguish "0.00 s" from "never crossed".
  - Validate against `animationData.metadata.dt` and a few known stories/corners.
  - Current bug: summary iterates corners as `NE, NW, SW, SE` but reads `storyDrift` values by array index as if the order matched.
  - Confirm the canonical corner order returned by `storyDrift.getStoryDrift(...)` and map values by corner name instead of implicit index.
  - Re-verify colors and values in both summary table and `ThresholdBuilding`.
  - Avoid `drift / peak` division by zero in `ThresholdBuilding` when peak drift is zero/missing.
  - Define fallback color behavior for non-finite ratios (e.g. neutral color + tooltip note).
  - Confirm no `NaN` / `Infinity` reaches Culori color interpolation.
  - Replace dense row grid with clearer per-story grouping (cards or compact subtable) that keeps all 4 corners visually aligned.
  - Add explicit legend/color scale explaining what slab/tile colors represent (signed ratio vs threshold state).
  - Make threshold-crossing status visually obvious: crossed/not crossed, crossing time (`s`), and current-vs-threshold context.
  - Keep unit labels/tooltips consistent (`%` for drift ratio, `s` for crossing time).
  - Current issue: page is labeled "torsion" but colors floors by average displacement magnitude, not plan rotation.
  - Reuse `features/view-3d/lib/floorTorsion.ts` (`buildFloorTorsionSnapshot`, peak helpers) so the page and dock panel use the same torsion definition (`rad`).
  - Update labels, captions, and tooltips to explicitly state rotation units (`rad`) and what positive/negative sign means.
  - Bounds bug: `maxPoint` uses `Number.MIN_VALUE` (tiny positive number) instead of a negative sentinel; breaks viewBox sizing for negative coordinates.
  - Geometry bug: preview comments say "convex hull" but code uses raw node order, which can self-intersect / misrepresent floor shape.
  - Use stable polygon generation (actual hull or rectangle/reference polygon from torsion utilities) and verify all stories render.
  - Unify metric semantics, labels, color scale direction, and units so both views communicate the same quantity.
  - Prefer a single shared preview component / color-scale helper to avoid drift.
  - Decide whether legacy page should be upgraded, hidden, or replaced by the `Floor Torsion Map` panel.
  - Apply project standard to every chart/plot: title, axis labels, legend or color bar, and tooltip.
  - `Hinge Distribution`: add x-axis title with selected metric + units, better tooltip context, and visible legend/annotation.
  - `Hinge Hotspots`: add chart subtitle/axis labels, stronger tooltip formatting, and unit labels in table headers (e.g. `R3 (rad)`).
  - `Floor Torsion` views: ensure color bars are present and labeled with signed rotation range in `rad`.

---

### 6.3 Export Functionality

- [ ] Add canvas image export (PNG, high-res)
- [ ] Add chart image export
- [ ] Add GIF recording for playback
- [x] Add video export (MP4/WebM)
  - Initial slice shipped as browser-native WebM workspace export with an isolated preview, frame-range controls, and quality presets.
  - Added lazy-loaded ffmpeg export, split FPS/scale controls, ETA, stage-sized preview, auto-download, and separate-panel batch export.
  - Follow up with panel-only export and comparison/split-view export once the ffmpeg-based MP4/WebM path is validated in use.
- [ ] Add data table CSV export
- [x] Prioritize exports that preserve analytical context over exhaustive export permutations
  - First-class need: export the exact finding state with the relevant panels and comparison context.
  - Lower priority: every possible panel-format-resolution combination.
- [ ] Improve export capture robustness for mixed DOM + Three.js + ECharts workspaces
  - Validate the current DOM-to-canvas rasterization path against more panel combinations and larger layouts.
  - Add targeted fallbacks only where a specific panel type renders incorrectly in export.
  - Confirm ffmpeg.wasm performance/compatibility across Chrome, Safari, and lower-memory machines.
- [ ] Investigate WebCodecs + MP4 muxing for fast MP4 export without ffmpeg.wasm
  - Current fast path uses browser WebM recording; MP4 remains the slower compatibility path.
  - Compare output support across Chrome, Safari, and Firefox before adding another encoder dependency.
- [ ] Add panel-only and comparison export modes to the new export workflow
  - Reuse the isolated preview/export session model instead of building a second export path.
  - Split/comparison export should wait on the broader multi-simulation workspace architecture.

---

## 7. View Modes & Visualization

- [ ] Add distance / metric markers numbers on the grid in the building scene.

---

- [ ] Add tooltips to all controls
- [ ] Ensure selected nodes highlight correctly in all view modes

- [ ] Remove magnitude metrics (hide by default, add "Show Magnitude Metrics" setting)

- [ ] Fix rotation panel and all rotation displays
- [ ] Reduce precision on all numbers - keep at 1 or 2 decimal places instead of 4
- [ ] Create dedicated settings menu

- [ ] Multiple places define an order for the optional data (NavigationBar, Main Menu, optionalLoads query param). This should be centralized and made consistent.

## Unsorted Things:

- [ ] Clicking floors in ISD chart or other charts / panels should open that floor
- [ ] Clicking reference nodes in any panels (corners included) should open that node panel
- [ ] Node panel should link / reference have buttons for the 3 cross sections its in (floor, x, y)

## 25. Known Issues

- [ ] When loading the app and the previously selected color by metric was from optional data and that data is no longer loaded, then it doesn't default back to ISD instead its in a weird broken state.

_Last Updated: May 2026_
