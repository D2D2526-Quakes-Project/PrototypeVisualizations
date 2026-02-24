# TODO - Running Document

> **This is a living document. Please add new items as they are discovered and break down large tasks into smaller checkable items. Check off items as they are completed.**

---

### 2.2 Update Color UI

- [ ] Allow the user to change the color for each metric

---

### 3.1 Time Context Sync

- [ ] Add time range selection (start/end frames) for analysis

---

## 5. Data Panel Enhancements

### 5.1 New Panels to Create

- [x] Rotation Time Series Panel
- [x] Velocity Distribution Panel
- [x] Acceleration Distribution Panel
- [x] Combined Metrics Panel (multiple metrics overlay)
- [ ] Time Range Analysis Panel

### 5.2 Existing Panel Improvements

- [ ] Add color bar legends to charts
- [x] Add `Floor Torsion Map` magic panel with per-story top-down SVG previews colored by rotation
- [x] Add floor torsion preview + rotation values to slice panel

- [x] Fix `Damage Thresholds` warning-crossing time computation
  - Current bug: crossing time stores `storyIndex` instead of `frameIndex`, then converts that value to seconds.
  - Also fix frame-0 behavior and use explicit `null` for "not crossed yet" so the UI can distinguish "0.00 s" from "never crossed".
  - Validate against `animationData.metadata.dt` and a few known stories/corners.
- [x] Fix `Damage Thresholds` summary corner ordering mismatch
  - Current bug: summary iterates corners as `NE, NW, SW, SE` but reads `storyDrift` values by array index as if the order matched.
  - Confirm the canonical corner order returned by `storyDrift.getStoryDrift(...)` and map values by corner name instead of implicit index.
  - Re-verify colors and values in both summary table and `ThresholdBuilding`.
- [x] Harden `Damage Thresholds` color normalization for zero-peak / near-zero stories
  - Avoid `drift / peak` division by zero in `ThresholdBuilding` when peak drift is zero/missing.
  - Define fallback color behavior for non-finite ratios (e.g. neutral color + tooltip note).
  - Confirm no `NaN` / `Infinity` reaches Culori color interpolation.
- [ ] Redesign `Damage Thresholds` summary layout for scanability and interpretation
  - Replace dense row grid with clearer per-story grouping (cards or compact subtable) that keeps all 4 corners visually aligned.
  - Add explicit legend/color scale explaining what slab/tile colors represent (signed ratio vs threshold state).
  - Make threshold-crossing status visually obvious: crossed/not crossed, crossing time (`s`), and current-vs-threshold context.
  - Keep unit labels/tooltips consistent (`%` for drift ratio, `s` for crossing time).
- [x] Rework legacy `Floor Torsion` page to use actual torsion rotation metrics (`buildFloorTorsionSnapshot`)
  - Current issue: page is labeled "torsion" but colors floors by average displacement magnitude, not plan rotation.
  - Reuse `features/view-3d/lib/floorTorsion.ts` (`buildFloorTorsionSnapshot`, peak helpers) so the page and dock panel use the same torsion definition (`rad`).
  - Update labels, captions, and tooltips to explicitly state rotation units (`rad`) and what positive/negative sign means.
- [x] Fix legacy `Floor Torsion` story SVG preview geometry generation
  - Bounds bug: `maxPoint` uses `Number.MIN_VALUE` (tiny positive number) instead of a negative sentinel; breaks viewBox sizing for negative coordinates.
  - Geometry bug: preview comments say "convex hull" but code uses raw node order, which can self-intersect / misrepresent floor shape.
  - Use stable polygon generation (actual hull or rectangle/reference polygon from torsion utilities) and verify all stories render.
- [x] Align floor torsion experiences (legacy page vs `Floor Torsion Map` panel)
  - Unify metric semantics, labels, color scale direction, and units so both views communicate the same quantity.
  - Prefer a single shared preview component / color-scale helper to avoid drift.
  - Decide whether legacy page should be upgraded, hidden, or replaced by the `Floor Torsion Map` panel.
- [x] Add required chart metadata across hinge/torsion plots (titles, axis labels, legends/color bars, tooltips)
  - Apply project standard to every chart/plot: title, axis labels, legend or color bar, and tooltip.
  - `Hinge Distribution`: add x-axis title with selected metric + units, better tooltip context, and visible legend/annotation.
  - `Hinge Hotspots`: add chart subtitle/axis labels, stronger tooltip formatting, and unit labels in table headers (e.g. `R3 (rad)`).
  - `Floor Torsion` views: ensure color bars are present and labeled with signed rotation range in `rad`.

---

## 6. Future Endeavors

### 6.1 Hinge/Beam Element Data

- [ ] Explore data folder for element data formats
- [ ] Write Python parsing scripts for binary element data
- [ ] Add JavaScript parsing for web consumption
- [ ] Create element visualization in 3D view
- [ ] Add hinge force/yielding visualization
- [ ] Add beam moment diagrams

### 6.1.1 Hinge Data Pipeline Integration (Current Sprint)

- [x] Document hinge source formats (CSV/XLSX) and required fields
- [x] Add Python hinge file discovery per simulation
- [x] Add Python hinge normalization/validation (required columns, numeric coercion, key uniqueness)
- [x] Generate `hinge_data.bld` with compact typed-array layout and metadata dictionaries
- [x] Add hinge summary stats (min/max + distributions) into hinge metadata header
- [x] Extend index typing/schema for simulation-level `hingeData` URL
- [x] Add TypeScript hinge types and accessors
- [x] Load optional `hingeData` from Cloudflare URLs in `useAnimationData`
- [x] Parse and validate hinge binary payload in TypeScript parser
- [x] Expose hinge data through `BuildingAnimationData` for threshold/distribution usage
- [x] Update data documentation with hinge binary contract
- [x] Run lint/typecheck validation for the integration

### 6.1.2 Hinge Visualization UI Integration (Current Sprint)

- [x] Add static hinge analysis helpers for filtering/aggregation
- [x] Add dock panel: hinge distribution histogram (non-time-series)
- [x] Add dock panel: hinge hotspot ranking + performance breakdown
- [x] Redesign `Hinge Hotspots` panel into explanatory analysis view (summary cards, severity mix, spotlights, reliable panel scrolling)
- [x] Register hinge panels in panel picker/catalog
- [x] Surface static hinge summary in slice panels (clearly marked non-time-series)
- [x] Add beam connectivity mapping (`beam_data.bld`) and hinge beam-index pairing for localized rendering groundwork
- [ ] Use `beam_data.bld` + story node membership to localize hinge rows to floors/slices in UI
- [ ] Add hinge/beam mapping diagnostics (missing joins, duplicate side rows, missing Max/Min side entries) to generation summary
- [ ] Preserve and expose hinge `Performance Level` from source data instead of hardcoding PL1 in analysis helpers/panels
  - Current behavior hardcodes `performanceLevel: 1` in `buildHingeEnrichedRows`, so filters/labels imply more fidelity than the data model currently carries.
  - Extend parser + hinge metadata/accessor to retain source performance level(s) when available.
  - Update panel filter options and breakdown labels to reflect real available values (and gracefully degrade if absent).
- [x] Add unit labels/tooltips for hinge metrics (`R3` in rad, `M3` unit provenance/label) in charts and tables
  - Use `HINGE_METRIC_UNITS` consistently in chart axis names, tooltips, summary cards, and table headers.
  - Clarify `M3` unit source/provenance from hinge exports before exposing unit text in UI (avoid incorrect units).
  - Add `UnitTooltip` where values have known units and keep static/dimensionless metrics explicitly labeled as such.

### 6.1.3 Hinge Analysis Panels (Next Candidates)

- [ ] Add `Hinge Floor Heatmap` panel (rows aggregated by story/floor after beam-to-story mapping)
- [ ] Add `Hinge Component Type Breakdown` panel (stacked bars by component type / property family)
- [ ] Add `Hinge Load Case Compare` panel (side-by-side distributions when multiple load cases exist)
- [ ] Add `Hinge D/C CDF` panel (cumulative distribution for quick threshold percentile reading)
- [ ] Add `Hinge Scatter` panel (e.g. `|R3|` vs critical D/C, colored by performance level)
- [ ] Add `Hinge Outlier Inspector` panel (sortable table with filters + quick copy/export)
- [ ] Add `Hinge Threshold Summary` panel (counts above user-defined D/C thresholds by step/perf level)
- [ ] Add `Hinge Spatial Overlay Legend/Controls` panel for future on-structure rendering modes
- [ ] Add `Story/Slice Hinge Summary` dock panel (same concepts as slice block but globally browsable by floor)
- [ ] Add `Beam/Hinge Mapping Diagnostics` panel (unmapped elements, mapping coverage, data quality checks)

### 6.2 Multi-Simulation Comparison

- [ ] Design data loading for multiple simulations
- [ ] Create side-by-side view layout
- [ ] Implement synchronized playback
- [ ] Add difference visualization
- [ ] Add simulation selector UI
- [ ] Upgrade main menu simulation picker from single-select staged open to true multi-select split-view launch flow

### 6.3 Export Functionality

- [ ] Add canvas image export (PNG, high-res)
- [ ] Add chart image export
- [ ] Add GIF recording for playback
- [ ] Add video export (MP4/WebM)
- [ ] Add data table CSV export

---

## 7. View Modes & Visualization

### 7.1 New View Modes

- [ ] Add a way to view the ground motion either in the scene or in a separate panel
- [ ] Create "Velocity Vectors" view mode
- [ ] Create "Acceleration Vectors" view mode

### 7.2 Enhanced Rendering

- [ ] Add displacement vector arrows to nodes (view toggle)
- [ ] Add distance / metric markers numbers on the grid in the building scene.
- [ ] Show the slice view cutting planes as planes in the building scene. Also show per axis a line filling with the visible area along that axis.
- [ ] Add node labels (story/floor IDs)
- [ ] Add marching squares (2D) / marching cubes (3D) to create voxel grid volumes from nodes. Allow threshold-based surface rendering where the surface is drawn based on thresholded nodes - either showing nodes that pass the threshold or toggling to show nodes below the threshold. Allow coloring and thresholding just like nodes.

---

## 8. Performance Optimization

### 8.1 Rendering Performance

- [ ] Optimize large node count rendering
- [ ] Optimize rerenders

---

## 9. User Experience

### 9.1 UI Improvements

- [x] Add keyboard shortcuts for common actions
- [ ] Add undo/redo for selections
- [x] Add "reset to defaults" button
- [x] Improve panel drag/resize handles

- [x] Change the views menu popover to be a sidebar that takes up space next to the canvas

- [x] Update the Damage Threshold panel to have a better layout and information. Remove the checkboxes and add a slider to set the threshold.
- [ ] Fix `Hide All` floor visibility action being overridden by empty-visible-floors fallback in floor visibility context

### 9.2 Help & Documentation

- [ ] Add tooltips to all controls
- [ ] Create in-app help overlay

- [ ] Switch save-profile changes without requiring full page reload

---

### 10.1 Expand ComputedStats in types.ts

- [ ] Add peak values for each metric per node

---

## 12. View Mode & Visualization System Cleanup

The view mode system has incompatibilities and incomplete features. Need to unify and fix.

### 12.1 Simplify View Modes

- [ ] Consolidate view modes to: All Nodes, Wireframe, Floor Slabs
- [ ] Remove redundant view modes (threshold should be a color mode, not view mode)
- [ ] Ensure view mode changes don't break 3D scene rendering

### 12.2 Node Selection & Highlighting

- [x] Fix node highlighting not working in all view modes

### 12.3 Floor Selection & Panel

- [ ] Expand floor sidebar to show corners and drift values
- [ ] Click on corners to open specific node details/reference graph

### 12.4 Color By Integration

- [ ] Color by should work consistently across all view modes
- [ ] Color by should use threshold values for coloring
- [ ] Ensure floor slabs and nodes use same color mapping

---

### 13.3 Slice & Exploded View

- [ ] Fix slice view working with node selection
- [ ] Fix exploded view working with node selection
- [ ] Fix displacement scale working with node selection
- [ ] Ensure box selection works correctly with all features

---

### 14.2 Replace with Main View Modes

- [ ] Add ribbons view mode to main 3D view (based on TemporalRibbons page)
- [ ] Move elevation slice features into main view as a mode

---

## 15. Unit Conversion Tooltips

Every number with a unit should be hoverable with conversions.

### 15.3 Unit Conversion Reference

| Symbol | Full Name       | Conversions                 |
| ------ | --------------- | --------------------------- |
| in     | inches          | 1 in = 0.0254 m = 0.0833 ft |
| in/s   | inches/second   | 1 in/s = 0.0254 m/s         |
| in/s²  | inches/second²  | 1 in/s² = 0.0254 m/s²       |
| rad    | radians         | 1 rad = 57.2958°            |
| rad/s  | radians/second  | 1 rad/s = 57.2958°/s        |
| rad/s² | radians/second² | 1 rad/s² = 57.2958°/s²      |
| %      | percent         | 1% = 0.01 ratio             |
| s      | seconds         | -                           |

---

## 16. Node Panel & Selection Issues

### 16.1 Fix Node Panel Problems

- [ ] Ensure selected nodes highlight correctly in all view modes

### 16.2 Selection System

- [x] Add visual feedback during box selection
- [x] Ensure selected nodes sync across all views
- [x] When there is a selection, these options should be available in both the View Menu and the Collapsed View Menu: Clear Selection, Hide Selected Nodes, Show All Nodes

---

### 17.14 Zustand Architecture Follow-ups

- [ ] Introduce workspace-scoped state shape (`workspaces[workspaceId]`) for split-view support
- [ ] Separate persisted state from transient runtime state (`fps`, drag state, hover state)

---

## Known Bugs

- [x] When the view menu is docked, the ctrl+drag selection box is visually offset

_Last Updated: February 2026_
