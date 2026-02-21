# TODO - Running Document

> **This is a living document. Please add new items as they are discovered and break down large tasks into smaller checkable items. Check off items as they are completed.**

---

## 1. Threshold Context Expansion

The threshold context currently only has displacement and interstory drift. It needs to support all key values with appropriate sliders in the UI.

### 1.1 Expand ThresholdContext

- [x] Add rotation thresholds (RX, RY, RZ, Magnitude)
- [x] Add velocity thresholds (X, Y, Z, Magnitude)
- [x] Add rotation velocity thresholds (RX, RY, RZ, Magnitude)
- [x] Add acceleration thresholds (X, Y, Z, Magnitude)
- [x] Add rotation acceleration thresholds (RX, RY, RZ, Magnitude)
- [x] Add interstory drift average threshold
- [x] Add appropriate units for each threshold type

### 1.2 Add Threshold Sliders to CanvasWithControls

- [x] Add rotation threshold slider(s)
- [x] Add velocity threshold sliders (X, Y, Z, Mag)
- [x] Add rotation velocity threshold slider(s)
- [x] Add acceleration threshold sliders (X, Y, Z, Mag)
- [x] Add rotation acceleration threshold slider(s)
- [x] Add interstory drift average threshold
- [x] Group sliders logically in the UI
- [x] Add tooltips explaining each threshold

### 1.3 Integrate Thresholds into Visualization

- [x] Use threshold values in 3D coloring logic
- [x] Add threshold-based highlighting in charts
- [x] Ensure threshold changes propagate to all views
- [x] Default thresholds should be 1/4 of the max value
- [x] Provide the `currentlyUsed` variable to the `ThresholdSlider` component by the metric

---

## 2. Color Metric Expansion

The color metric system needs to support all key values for 3D visualization.

### 2.1 Expand Available Metrics

For optional metrics, they should be conditionally shown based on if that data is available in the current simulation.

- [x] Add rotation metrics (RX, RY, RZ, Magnitude)
- [x] Add velocity metrics (X, Y, Z, Magnitude)
- [x] Add rotation velocity metrics (RX, RY, RZ, Magnitude)
- [x] Add acceleration metrics s(X, Y, Z, Magnitude)
- [x] Add rotation acceleration metrics (RX, RY, RZ, Magnitude)
- [x] Add interstory drift average metric
- [x] Add corner selector for Story Drift heat map to choose data from a specific corner (NW, NE, SE, SW) instead of only using the max across four

### 2.2 Update Color UI

- [x] Add metric selector dropdown options for new metrics
- [x] Add color bar legend to 3D view when metric is selected
- [x] Ensure color scale adapts to metric value ranges
- [x] ColorScaleBar doesn't show the max / min for that metric but the max / min of a general value. It should show the max / min of the metric value range
- [x] Colorize Interstory Drift chart to show distinct colors per data range instead of monotone styling
- [ ] Allow the user to change the color for each metric

---

## 3. Context Synchronization

Ensure all views and panels are properly synchronized through context.

### 3.1 Time Context Sync

- [x] Verify all charts sync to playback frame index
- [x] Verify all panels update on timeline scrub
- [ ] Add time range selection (start/end frames) for analysis

### 3.2 Selection Context Sync

- [x] Verify floor selection syncs across 3D view and panels
- [x] Verify node selection syncs across all views

### 3.3 Threshold Context Sync

- [x] Verify threshold changes reflect in 3D view immediately
- [x] Verify threshold changes reflect in all charts
- [x] Add threshold synchronization between DamageThresholdPanel and CanvasWithControls

---

## 4. Scientific Visualization Standards

Apply consistent scientific visualization standards across all charts and plots.

### 4.1 Chart Requirements

- [x] Add titles to all charts
- [x] Add axis labels with units to all charts
- [x] Add color scales to charts using the Metrics
- [ ] Add color bar legends on any chart that has a color scale
- [x] Add grid lines where appropriate
- [x] Ensure consistent font sizes and styling

### 4.2 Accessibility

- [x] Review color palettes for colorblind accessibility
- [x] Add patterns/textures for distinguishing data where needed

### 4.3 Consistency

- [x] Standardize units display across all views
- [x] Standardize color meanings across all visualizations
- [ ] Add informative tooltips to all interactive elements. Include all numbers and units.

---

## 5. Data Panel Enhancements

### 5.1 New Panels to Create

- [ ] Add small graphs for all metrics in the Node Panel
- [ ] Rotation Time Series Panel
- [ ] Velocity Distribution Panel
- [ ] Acceleration Distribution Panel
- [ ] Combined Metrics Panel (multiple metrics overlay)
- [ ] Time Range Analysis Panel

### 5.2 Existing Panel Improvements

- [ ] Add color bar legends to charts
- [x] Add threshold lines to time series charts
- [x] Scrap the correlation matrix
- [x] Statistics panel should clamp frame index to [0, lastFrame], defaulting to 0 when out of range

---

## 6. Future Endeavors

### 6.1 Hinge/Beam Element Data

- [ ] Explore data folder for element data formats
- [ ] Write Python parsing scripts for binary element data
- [ ] Add JavaScript parsing for web consumption
- [ ] Create element visualization in 3D view
- [ ] Add hinge force/yielding visualization
- [ ] Add beam moment diagrams

### 6.2 Multi-Simulation Comparison

- [ ] Design data loading for multiple simulations
- [ ] Create side-by-side view layout
- [ ] Implement synchronized playback
- [ ] Add difference visualization
- [ ] Add simulation selector UI

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
- [x] Add color bar overlay in 3D view
- [ ] Add node labels (story/floor IDs)
- [ ] Add measurement tools (distance between nodes)
- [ ] Add marching cubes to create voxel grid volumes from nodes. Allow coloring and thresholding just like nodes, but toggle between hiding or showing values above the threshold

---

## 8. Performance Optimization

### 8.1 Rendering Performance

- [ ] Optimize large node count rendering
- [ ] Optimize rerenders

---

## 9. User Experience

### 9.1 UI Improvements

- [ ] Add keyboard shortcuts for common actions
- [ ] Add undo/redo for selections
- [ ] Add "reset to defaults" button
- [ ] Improve panel drag/resize handles
- [ ] When panels are tabbed, they should share the same tab bar buttons (e.g., close, maximize, etc.)
- [ ] Make the Magic Panel dropdown, just text if the tab is not focused. If it is the only tab, it should remain a dropdown.
- [x] Add color bar on the left side of the CanvasWithControls
- [x] Add view option for changing background color
- [ ] Change the views menu popover to be a sidebar that takes up space next to the canvas
- [x] Reorder the Thresholds sliders to be above Exploded View toggle

### 9.2 Help & Documentation

- [ ] Add tooltips to all controls
- [ ] Create in-app help overlay
- [x] Show keyboard and mouse shortcuts in the bottom left of the 3JS window
- [ ] Make the shown shortcuts not look like trash. Clean text and icons. Should be contextual to the view. (Like showing "esc to clear selection" while a selection is active)
- [ ] Add familiar file menu items (file, edit, view, help, etc.)
- [x] Add timeline keyboard shortcuts. Shift+Arrows to move by +100 frames (1s), Ctrl+Arrows to move to the max, min, start, or end of the timeline

---

## 10. Pre-compute All Key Values

The app currently re-computes values in many places. All max/min values should be pre-computed once during data loading.

### 10.1 Expand ComputedStats in types.ts

- [x] Add maxRotation (displacementRot max)
- [x] Add maxRotationX, maxRotationY, maxRotationZ
- [x] Add maxVelocityRot (rotation velocity max)
- [x] Add maxVelocityRotX, maxVelocityRotY, maxVelocityRotZ
- [x] Add maxAccelerationRot (rotation acceleration max)
- [x] Add maxAccelerationRotX, maxAccelerationRotY, maxAccelerationRotZ
- [x] Add maxStoryDrift (for avg calculation)
- [x] Add avgStoryDrift (mean across all stories/frames)
- [ ] Add peak values for each metric per node

### 10.2 Update parser.ts to compute all value

- [x] Pre-compute all rotation max values
- [x] Pre-compute all velocity rotation max values
- [x] Pre-compute all acceleration rotation max values
- [x] Pre-compute story drift averages

### 10.3 Remove redundant computations

- [x] Find and remove re-computed max values in ColorContext
- [x] Find and remove re-computed max values in other components (maxDisplacement already used)
- [x] Pre-compute per-frame aggregates (avg displacement/velocity per frame)
- [x] Pre-compute per-story aggregates (avg displacement per story)
- [x] Pre-compute velocity percentiles (90th percentile)
- [x] Pre-compute min values for all metrics
- [x] Pre-compute ground motion stats (already done)
- [x] Pre-compute story-level torsion/twist values (avg already covered by per-story aggregates)

---

## 11. Threshold-based Color Scales

Implement color scales with sharp discontinuities at threshold values.

### 11.1 Create threshold-aware color scales

- [x] Create color scale that accepts threshold parameter
- [x] Implement diverging scale: negative (blue) -> white at zero -> positive (red)
- [x] Add sharp discontinuity at threshold point (50% of scale)
- [x] Scale from 0 to maxValue, where threshold maps to 50%

### 11.2 Update ColorContext to use thresholds

- [x] Import threshold values into ColorContext
- [x] Create threshold-aware interpolator function
- [x] Pass threshold value to color scale creation

### 11.3 Create reusable color scale component

- [x] Add ColorScaleLegend component with threshold marker
- [x] Show color bar with threshold indicator
- [x] Display units and value ranges
- [x] Add color bar indicator in CanvasWithControls on the left side of the view

---

## 12. View Mode & Visualization System Cleanup

The view mode system has incompatibilities and incomplete features. Need to unify and fix.

### 12.1 Simplify View Modes

- [ ] Consolidate view modes to: All Nodes, Wireframe, Floor Slabs
- [ ] Remove redundant view modes (threshold should be a color mode, not view mode)
- [ ] Ensure view mode changes don't break 3D scene rendering

### 12.2 Node Selection & Highlighting

- [ ] Fix node highlighting not working in all view modes
- [ ] Make node hover work correctly for each view mode
- [ ] Fix node panel colors not matching actual node positions
- [ ] Fix node panel points not moving correctly with animation

### 12.3 Floor Selection & Panel

- [ ] In floor slab view, disable node selection (floors are selectable, not nodes)
- [ ] Expand floor sidebar to show corners and drift values
- [ ] Click on corners to open specific node details/reference graph

### 12.4 Color By Integration

- [ ] Color by should work consistently across all view modes
- [ ] Color by should use threshold values for coloring
- [ ] Ensure floor slabs and nodes use same color mapping

### 12.5 Tooltips & User Guidance

- [ ] Add tooltip/hint in bottom-left of 3D view explaining box selection (Ctrl+drag)
- [ ] Add tooltips for all control panel options
- [ ] Document keyboard shortcuts

---

## 13. Cross-Cutting Feature Integration

### 13.1 Threshold Integration

- [x] Implement threshold-based coloring in all charts
- [x] Add threshold lines to time series charts
- [x] Make thresholds affect all visualizations consistently

### 13.2 Floor Visibility

- [x] Implement floor hide/show in ALL graphs across the app
- [x] Sync floor visibility with 3D view
- [x] Add floor toggle to all relevant panels
- [x] Ensure floor toggling hides floors in the Building Scene

### 13.3 Slice & Exploded View

- [ ] Fix slice view working with node selection
- [ ] Fix exploded view working with node selection
- [ ] Fix displacement scale working with node selection
- [ ] Ensure box selection works correctly with all features

---

## 14. Deprecated Views Cleanup

### 14.1 Remove Deprecated Views

- [x] Remove hamburger view (/hamburger route)
- [x] Remove texture view (/texture route)

### 14.2 Replace with Main View Modes

- [ ] Add ribbons view mode to main 3D view (based on TemporalRibbons page)
- [ ] Move elevation slice features into main view as a mode

---

## 15. Unit Conversion Tooltips

Every number with a unit should be hoverable with conversions.

### 15.1 Create UnitTooltip Component

- [ ] Create reusable UnitTooltip component using shadcn Tooltip
- [ ] Support conversions: inches ↔ feet ↔ meters
- [ ] Show full unit name on hover (not just abbreviation)
- [ ] Click to copy numeric value

### 15.2 Integrate Across App

- [ ] Add UnitTooltip to all displacement values
- [ ] Add UnitTooltip to all velocity values
- [ ] Add UnitTooltip to all acceleration values
- [ ] Add UnitTooltip to all rotation values
- [ ] Add UnitTooltip to all time values

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

- [ ] Fix node coloring not matching actual node positions
- [ ] Fix node points not animating correctly with playback
- [ ] Ensure selected nodes highlight correctly in all view modes

### 16.2 Selection System

- [ ] Make box selection (Ctrl+drag) more discoverable
- [ ] Add visual feedback during box selection
- [ ] Ensure selected nodes sync across all views
- [ ] When there is a selection, these options should be available in both the View Menu and the Collapsed View Menu: Clear Selection, Side Selected Nodes, Show All Nodes

---

## 17. Saveable and Sharable UI & URLs

- [x] The UI panel state should be saved and restored
- [x] A share URL should be avilable that can be shared with others
- [x] Load the panel configuration from the share URL
- [x] Camera position and orientation should be saved and restored

---

## 18. Known Bugs

- [x] Intermittent failure when clicking or dragging the timeline scrubber; fixed by using ZRender events and refs to avoid race conditions during HMR (Hint: When the option checkbox changes, the mouse stuff starts working again)
- [x] Interstory Drift chart bars can excede their peak bars. This is a big red flag that something is wrong with the data reading / precomputation.
- [x] Floors in the Building Scene don't hide when floor is toggled off. (Fixed: Added floor visibility filtering in BuildingScene.tsx)
- [x] Color mapping doesn't update when slider changes, only when coloring is toggled or the color metric changes. (Fixed: Now uses threshold-aware coloring for magnitude metrics by default)
- [x] Story drift heatmap updates every frame and doesn't need to
- [x] Each color by needs its own threshold color maps (Fixed: Now magnitude metrics use diverging blue-white-red scale)
- [x] Threshold sliders don't use the max value for the slider range.
- [x] Floor Displacement graph is not showing negative values.
- [x] Floor slab renderer doesn't use the 'no lighting' 'no tone mapping' options
- [x] Camera position gets reset when switching between ortho and perspective

_Last Updated: February 2026_
