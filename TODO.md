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
- [ ] Add tooltips explaining each threshold

### 1.3 Integrate Thresholds into Visualization

- [ ] Use threshold values in 3D coloring logic
- [ ] Add threshold-based highlighting in charts
- [ ] Ensure threshold changes propagate to all views

---

## 2. Color Metric Expansion

The color metric system needs to support all key values for 3D visualization.

### 2.1 Expand Available Metrics

- [ ] Add rotation metrics (RX, RY, RZ, Magnitude)
- [ ] Add velocity metrics (X, Y, Z, Magnitude)
- [ ] Add rotation velocity metrics (RX, RY, RZ, Magnitude)
- [ ] Add acceleration metrics (X, Y, Z, Magnitude)
- [ ] Add rotation acceleration metrics (RX, RY, RZ, Magnitude)
- [ ] Add interstory drift average metric

### 2.2 Update Color UI

- [ ] Add metric selector dropdown options for new metrics
- [ ] Add color bar legend to 3D view when metric is selected
- [ ] Ensure color scale adapts to metric value ranges

---

## 3. Context Synchronization

Ensure all views and panels are properly synchronized through context.

### 3.1 Time Context Sync

- [ ] Verify all charts sync to playback frame index
- [ ] Verify all panels update on timeline scrub
- [ ] Add time range selection (start/end frames) for analysis

### 3.2 Selection Context Sync

- [ ] Verify floor selection syncs across 3D view and panels
- [ ] Verify node selection syncs across all views
- [ ] Add cross-section (slice) selection to all relevant views

### 3.3 Threshold Context Sync

- [ ] Verify threshold changes reflect in 3D view immediately
- [ ] Verify threshold changes reflect in all charts
- [ ] Add threshold synchronization between DamageThresholdPanel and CanvasWithControls

---

## 4. Scientific Visualization Standards

Apply consistent scientific visualization standards across all charts and plots.

### 4.1 Chart Requirements

- [ ] Add titles to all charts
- [ ] Add axis labels with units to all charts
- [ ] Add color bar legends where applicable
- [ ] Add grid lines where appropriate
- [ ] Ensure consistent font sizes and styling

### 4.2 Accessibility

- [ ] Review color palettes for colorblind accessibility
- [ ] Add patterns/textures for distinguishing data where needed

### 4.3 Consistency

- [ ] Standardize units display across all views
- [ ] Standardize color meanings across all visualizations
- [ ] Add tooltips to all interactive elements

---

## 5. Data Panel Enhancements

### 5.1 New Panels to Create

- [ ] Rotation Time Series Panel
- [ ] Velocity Distribution Panel
- [ ] Acceleration Distribution Panel
- [ ] Combined Metrics Panel (multiple metrics overlay)
- [ ] Time Range Analysis Panel

### 5.2 Existing Panel Improvements

- [ ] Add color bar legends to heatmaps
- [ ] Add threshold lines to time series charts
- [ ] Add peak value annotations
- [ ] Add average value lines
- [ ] Improve axis labeling consistency

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

- [ ] Create "Velocity Vectors" view mode
- [ ] Create "Acceleration Vectors" view mode
- [ ] Create "Deformed Shape" view mode (animated)
- [ ] Create "Floor Plan" orthographic view
- [ ] Create "Elevation" orthographic view

### 7.2 Enhanced Rendering

- [ ] Add displacement vector arrows to nodes
- [ ] Add color bar overlay in 3D view
- [ ] Add node labels (story/floor IDs)
- [ ] Add measurement tools (distance between nodes)

---

## 8. Performance Optimization

### 8.1 Rendering Performance

- [ ] Optimize large node count rendering
- [ ] Add level-of-detail (LOD) for distant nodes
- [ ] Implement virtualization for long lists
- [ ] Add web worker for heavy computations

### 8.2 Data Loading

- [ ] Add progress indicator for data loading
- [ ] Implement data caching
- [ ] Add lazy loading for large datasets

---

## 9. User Experience

### 9.1 UI Improvements

- [ ] Add keyboard shortcuts for common actions
- [ ] Add undo/redo for selections
- [ ] Add "reset to defaults" button
- [ ] Improve panel drag/resize handles

### 9.2 Help & Documentation

- [ ] Add tooltips to all controls
- [ ] Create in-app help overlay
- [ ] Add tutorial/onboarding for new users

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

- [ ] Create color scale that accepts threshold parameter
- [ ] Implement diverging scale: negative (blue) -> white at zero -> positive (red)
- [ ] Add sharp discontinuity at threshold point (50% of scale)
- [ ] Scale from 0 to maxValue, where threshold maps to 50%

### 11.2 Update ColorContext to use thresholds

- [ ] Import threshold values into ColorContext
- [ ] Create threshold-aware interpolator function
- [ ] Pass threshold value to color scale creation

### 11.3 Create reusable color scale component

- [ ] Add ColorScaleLegend component with threshold marker
- [ ] Show color bar with threshold indicator
- [ ] Display units and value ranges

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

- [ ] Implement threshold-based coloring in all charts
- [ ] Add threshold lines to time series charts
- [ ] Make thresholds affect all visualizations consistently

### 13.2 Floor Visibility

- [ ] Implement floor hide/show in ALL graphs across the app
- [ ] Sync floor visibility with 3D view
- [ ] Add floor toggle to all relevant panels

### 13.3 Slice & Exploded View

- [ ] Fix slice view working with node selection
- [ ] Fix exploded view working with node selection
- [ ] Fix displacement scale working with node selection
- [ ] Ensure box selection works correctly with all features

---

## 14. Deprecated Views Cleanup

### 14.1 Remove Deprecated Views

- [ ] Remove hamburger view (/hamburger route)
- [ ] Remove texture view (/texture route)

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

---

## 17. Saveable and Sharable UI & URLs

- [ ] The UI panel state should be saved and restored
- [ ] A share URL should be avilable that can be shared with others
- [ ] Load the panel configuration from the share URL

_Last Updated: February 2026_
