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
- [ ] Run view-3d panel consistency sweep and normalize chart metadata/state patterns
  - Audit all dock panels for required chart metadata (title, axis labels, legend/color bar, tooltip) and add missing pieces.
  - Standardize panel header layout/caption pattern (title + subtitle + controls) across charts/tables/analysis panels.
  - Standardize panel-local UI state persistence via `useViewStore` + `panelId` for panels with user selections (channel filters, axis selectors, sort state, pagination).
  - Recheck unit labels against `DATA_DOCUMENTATION.md` and project standard (`in`, `rad`, `s`) for all displayed values and axes.
- [x] Persist analysis-panel UI state for `Histogram`, `Data Table`, `Peak Values`, `Hinge Distribution`, and `Hinge Hotspots`
- [x] Add secondary metadata/status rows to older panels (`Data Table`, `Peak Values`, `Statistics`, `Floor Displacement`) for consistency with newer analysis panels
- [x] Introduce shared panel-header component and migrate common panel headers to reduce styling drift
- [x] Fix `Story Drift Heatmap` color bar labels double-scaling drift percent values (`%` formatter multiplies by 100 again)
- [x] Fix `Histogram Chart` position-axis tick unit mismatch (axis label shows feet while panel/tooltips/documentation otherwise use inches)
- [x] Fix `Statistics` panel ground motion units (source ground motion is `g`, not inches)
- [x] Fix `Damage Thresholds` visible summary denominator/count logic to exclude ground story (story drift array reserves a ground slot with no computed drift)
- [x] Align time-series panels (`Timeline`, `Velocity Time`, `Rotation Time`) on persisted channel selection + axis/unit labeling conventions
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
- [x] Redesign `Damage Thresholds` summary layout for scanability and interpretation
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

## 17. Node Selection & Floor Interaction Fixes

### 17.1 Floor Slab Hover Effect

- [ ] Change floor slab hover effect to use the same color highlighting as nodes
  - Currently floor slabs highlight in a different color than nodes when hovered
  - Should use the node highlighting color scheme (or configurable metric-based color)
  - Update hover state rendering in floor slab components to match node hover behavior

### 17.2 Floor Tab Highlighting

- [ ] Add floor highlighting when a floor tab is opened in the sidebar
  - When user clicks on a floor tab (e.g., in the slice panel), the corresponding floor slab in the 3D view should highlight
  - Should mirror the existing node highlighting behavior when nodes are selected
  - Add floor-to-slab mapping and highlight state management
  - Consider adding a toggle to enable/disable this auto-highlight behavior

### 17.3 Node Panel vs Node Selection Separation

- [ ] Refactor node click behavior: clicking a node should open the detail panel WITHOUT selecting the node
  - Currently clicking a node both opens the panel AND selects the node
  - These should be separate actions:
    - Click node → Open panel (view details without selection)
    - Explicit action (e.g., Ctrl+click, checkbox, or "Select" button) → Select node
  - Update click handlers in node components to decouple panel open from selection
  - Update panel state management to track "viewed node" separately from "selected nodes"

- [ ] Rename variables, functions, and UI labels to clearly distinguish between:
  - `selectedNodes`: Array of node IDs actively selected (for batch operations like hide/delete/export)
  - `viewedNode` / `inspectedNode`: The node currently showing details in the side panel
  - `highlightedNode`: Node under cursor (hover state)
- [ ] Update Zustand store to have separate state slices:
  - `selectedNodeIds: string[]` - for selection (batch operations)
  - `inspectedNodeId: string | null` - for panel display (read-only details)
  - Keep existing `hoveredNodeId` for hover effects
- [ ] Add documentation in code comments explaining the distinction
- [ ] Update UI labels:
  - "Selected Nodes" section in View Menu → clarify this is for batch operations
  - "Node Details" panel title → clarify this shows inspected node info
- [ ] Add tooltips explaining the difference between selection and inspection

### 17.4 Node Hide Functionality

- [ ] Fix hide selected nodes not working
  - When a node is selected and "Hide Selected" is triggered, the node remains visible
  - Investigate: Is the hide action being called? Is the visibility state being updated? Is the render reflecting the state?
  - Check if `hiddenNodeIds` in the store is being updated correctly
  - Verify that hidden nodes are filtered out in the 3D render loop
  - Add console logging or debug mode to trace hide action flow
  - Test with single node selection and bulk selection

---

## 18. Node Panel & Selection Issues

### 18.1 Fix Node Panel Problems

- [ ] Ensure selected nodes highlight correctly in all view modes

### 18.2 Selection System

- [x] Add visual feedback during box selection
- [x] Ensure selected nodes sync across all views
- [x] When there is a selection, these options should be available in both the View Menu and the Collapsed View Menu: Clear Selection, Hide Selected Nodes, Show All Nodes

---

## Known Bugs

- [x] When the view menu is docked, the ctrl+drag selection box is visually offset

- [ ] Timeline current values list doesn't show units
- [ ] Show warning / tooltip in header if some data isn't loaded with buttons to load it
- [ ] Add small colored bar (border-l-2) for the color of each metric
- [ ] Add return to home camera position button
- [ ] View menu north, east, south ... buttons should be 3 columns and full width
- [ ] Ortho and smooth toggles should be in the same row
- [ ] Quick buttons in the !isExpanded view menu should still be visible
- [ ] SlicePanel should be renamed to floor panel & tab header is not consitent with other tabs
- [ ] Hitting the back button in browser doesn't navigate back correctly (just changes the URL)
- [ ] Node hover effects should be more visible
- [ ] Playback controls should also be in the timeline panel
- [ ] Keyboard shortcuts bar is too wide and has too much text
- [ ] View menu is behind the keyboard shortcuts bar
- [ ] Floors toggle should be a single vertical column with extra details per floor on the right
- [ ] Floors toggle should allow you to click and drag to toggle all floors dragged over
- [ ] Keyboard shortcuts bar doesn't show mouse controls like panning with right click
- [ ] The peak Values table is pointless and completely useless
- [ ] Peak response time panel is awful and completely disgusting

_Last Updated: February 2026_

---

## 19. Data & Loading Improvements

- [ ] Fix "52Story" building data being really small and incorrectly scaled
- [ ] Main menu: don't show available data for each station, show groundmotion location map instead
- [ ] Main menu: show small preview of building shape
- [ ] Main menu: clearer explanations of what is here and what optional data means
- [ ] Data generation: rename "Lin" to "Translational"
- [ ] Remove magnitude metrics (hide by default, add "Show Magnitude Metrics" setting)
- [ ] In header show name of building and simulation currently loaded
- [ ] Loading: load until mandatory data (building, ground, simulation, displacementTranslational) is ready before opening app
- [ ] Loading: show loading progress in header with popover containing all progress bars
- [ ] Loading: load and parse data in background, add to animation data when ready

---

## 20. UI/UX Improvements

### 20.1 Main Menu

- [ ] Panel picker: use opacity/border color for loadable vs not loadable, move details to tooltip
- [ ] Panel picker: too large, goes off screen - needs redesign

### 20.2 Header & Navigation

- [ ] Header: show name of building and simulation currently loaded
- [ ] Header: show loading progress with popover containing progress bars

### 20.3 Keyboard Shortcuts & Help

- [ ] Keyboard shortcuts helper: add mouse controls on second row
- [ ] Keyboard shortcuts helper: make smaller, show fewer icons

### 20.4 Visualization

- [ ] Add rotatable cube in top showing view orientation
- [ ] Change grid floor N, E, S, W labels to "+X", "+Y", "-X", "-Y"
- [ ] Add more default view options for building (corners)
- [ ] Add displacement scale option for pinning one corner to see rotation without displacement
- [ ] Remove "Smooth" view option
- [ ] Fix zoom level of 3D scene not saving
- [ ] Fix camera position and target not saving sometimes

### 20.5 Color Bars & Labels

- [ ] Colorbar overlay: show metric name and min/threshold/max numbers
- [ ] Colorbar in view menu: fix incorrect min numbers when metric can be negative
- [ ] Colorbar: center number should show 0 when metric can be negative, show threshold midway between 0 and pos
- [ ] Change green color bars to show red

### 20.6 Rotation Units

- [ ] Fix rotation units bug showing numbers larger than 145,000 rad/s
- [ ] Fix rotation panel and all rotation displays

### 20.7 ISD Graph

- [ ] Change Y axis labels to show floor elevation not story height (e.g., "Floor 6 (85ft)" instead of "6 (13ft)")

### 20.8 Node Interaction

- [ ] Make hovering a node more apparent
- [ ] Clicking a node to open panel should NOT select the node

### 20.9 Panels & Tabs

- [ ] Remove header text at top of panels (redundant with tab names)
- [ ] Rename "Damage Threshold" panel to "ISD Threshold"
- [ ] Rename "Damage" to "ISD" across the app
- [ ] Create panel for hinges called "Hinge Performance"
- [ ] Change tab color to be more distinct for currently selected tab
- [ ] Move panel/tab type dropdown picker from tab name to three dots menu

### 20.10 Tables & Sorting

- [ ] Add sort features to all panels with tables (sort by floor, peak, max current)
- [ ] Fix sort functions sorting floor name strings (leads to "10" before "1")

### 20.11 Performance Level

- [ ] Remove "performance level" in hinges
- [ ] Preserve and expose hinge Performance Level from source data

### 20.12 Precision & Display

- [ ] Reduce precision on all numbers - keep at 1 or 2 decimal places instead of 4
- [ ] Fix histograms not showing values that cross negative threshold
- [ ] Histograms: use color to differentiate

### 20.13 Floor Settings

- [ ] Building should come with default floor hiding settings
- [ ] Rename floor data from "Internal Mezzanine" to just "Mezzanine"

### 20.14 Settings Menu

- [ ] Create dedicated settings menu

### 20.15 Default View

- [ ] Make default view simpler with fewer tabs and panels

### 20.16 Heatmap & Charts

- [ ] Improve heatmap communication (users think it's "spatial")
- [ ] Consider continuous time instead of discrete grid for heatmap
- [ ] Add charts showing all floors with line chart per floor for same metrics like ISD

### 20.17 Floor Wide Values

- [ ] Option to pick how "floor wide" values are calculated: one corner, average of all corners, or average of all nodes

---

## 21. Data Computation & Caching

- [ ] Cache calculated data in store to avoid recomputing metrics
- [ ] Compute ISD for every node that has a node on the floor below (precomputation, not just corners)

---

## 22. Station/Simulation Information

- [ ] Add more data about each "station"/"simulation" including where groundmotion is from
