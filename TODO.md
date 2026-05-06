# TODO - Running Document

> **This is a living document. Please add new items as they are discovered and break down large tasks into smaller checkable items. Check off items as they are completed.**

---

- [x] Update unit labels that use absolute values to include “(maximum absolute value)” or “(absolute maximum)”
  - Ensures consistency and clarity in how peak values are presented across views

- [ ] Create presets for different visualization modes (hinges, displacement, story drift, shears)
  - Allows quick switching between common analysis views without reconfiguring settings each time

- [x] Add an auto-orbiting camera/view mode
  - Enables continuous rotation of the canvas for passive viewing or presentations

- [x] Improve non-threshold color bar gradients to include darker tones smoothly
  - Produces a more continuous and visually accurate gradient across the full value range

- [ ] Rename “15Story” and “52Story” to “15-story” and “52-storys”
  - Aligns naming with desired formatting conventions for identifiers

- [x] Fix floor slab interpolation when nodes have no assigned color/value
  - Use averaged values instead of default gray to avoid misleading visual output

- [x] Adjust connection line colors (vertical and horizontal) based on background
  - Default to black, but switch to white automatically on dark/black backgrounds for visibility

- [ ] Add adaptive coloring for UI elements based on background (tick marks, floor grid, direction labels)
  - Ensures readability and contrast regardless of theme or background color settings

### 3.1 Time Context Sync

- [ ] Add time range selection (start/end frames) for analysis

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
- [ ] Add panel-only and comparison export modes to the new export workflow
  - Reuse the isolated preview/export session model instead of building a second export path.
  - Split/comparison export should wait on the broader multi-simulation workspace architecture.

---

## 7. View Modes & Visualization

- [ ] Add distance / metric markers numbers on the grid in the building scene.
- [ ] Show the slice view cutting planes as planes in the building scene. Also show per axis a line filling with the visible area along that axis.
- [ ] Add node labels (story/floor IDs)

## 8. Performance Optimization

- [ ] Optimize large node count rendering
- [ ] Optimize rerenders

---

- [ ] Add tooltips to all controls
- [ ] Link the main evidence views more tightly so a finding in one panel drives the others
  - Selecting a story/corner/time range in the heatmap or threshold panel should focus the 3D view, floor panel, and hinge summaries on the same target.
  - Reduce the need for manual cross-referencing between separate panels.

- Currently floor slabs highlight in a different color than nodes when hovered

- [ ] Add floor highlighting when a floor tab is opened in the sidebar
  - When user clicks on a floor tab (e.g., in the slice panel), the corresponding floor slab in the 3D view should highlight
  - Should mirror the existing node highlighting behavior when nodes are selected
  - Add floor-to-slab mapping and highlight state management
  - Consider adding a toggle to enable/disable this auto-highlight behavior

- [ ] Ensure selected nodes highlight correctly in all view modes

- [ ] Remove magnitude metrics (hide by default, add "Show Magnitude Metrics" setting)

- [ ] Add displacement scale option for pinning one corner to see rotation without displacement

- [ ] Fix rotation panel and all rotation displays

- Remove `Floor` prefix
- Render numeric floor names as ordinals (e.g., `1st`, `5th`, `11th`) and preserve existing non-numeric floor labels

- [ ] Add sort features to all panels with tables (sort by floor, peak, max current)

- [ ] Preserve and expose hinge Performance Level from source data
- [ ] Reduce precision on all numbers - keep at 1 or 2 decimal places instead of 4
- [ ] Building should come with default floor hiding settings
- [ ] Create dedicated settings menu
- [ ] Make default view simpler with fewer tabs and panels
- [ ] Add charts showing all floors with line chart per floor for same metrics like ISD

- [ ] Multiple places define an order for the optional data (NavigationBar, Main Menu, optionalLoads query param). This should be centralized and made consistent.

## Unsorted Things:

- [ ] Data Explorer should be virtualized list so there are no pages, just infinite scroll
- [ ] Add the NW, NE, SW, SE, N, E, S, W directions colors to the metrics.ts so their colors are constant for use in graphs and in the 3d scene
- [ ] Clicking the colorbar box in the collapsed view menu should open the view menu to the colorbar option dropdown
- [ ] Clicking floors in ISD chart or other charts / panels should open that floor
- [ ] Clicking reference nodes in any panels (corners included) should open that node panel
- [ ] Node panel should link / reference have buttons for the 3 cross sections its in (floor, x, y)
- [ ] Inset numbers mode for color bar to put the number inside the color bar
- [ ] FFTs on the motion, maybe
- [ ] Laplace transforms on the motion, maybe
- [ ] Make cursor + on timeline

## 25. Known Issues

- [ ] When the view menu is docked, the ctrl+drag selection box is visually offset
- [ ] While in Floor Slabs view mode with Story Drift color by, the floors look gray because its the values include the nodes with no data
- [ ] When loading the app and the previously selected color by metric was from optional data and that data is no longer loaded, then it doesn't default back to ISD instead its in a weird broken state.
- [ ] Elevation is off by one story I think. Ground is 0 and 2nd is 0.
- [ ] Hinge to assignment allocation is wrong
- [ ] The topdown motion graph of per-node motion is offset or wrong or not centered or bounds are wrong.

_Last Updated: May 2026_
