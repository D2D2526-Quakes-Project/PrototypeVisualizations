# TODO - Running Document

> **This is a living document. Please add new items as they are discovered and break down large tasks into smaller checkable items. Check off items as they are completed.**

---

### 2.2 Update Color UI

- [ ] Allow the user to change the color for each metric

---

### 3.1 Time Context Sync

- [ ] Add time range selection (start/end frames) for analysis

---

### 4.3 Consistency

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

- [ ] Change the views menu popover to be a sidebar that takes up space next to the canvas

### 9.2 Help & Documentation

- [ ] Add tooltips to all controls
- [ ] Create in-app help overlay

- [ ] Add familiar file menu items (file, edit, view, help, etc.)

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

- [ ] Per panel configuration saved and in the share URL
- [ ] Camera position and orientation should be saved and restored

---

## 18. Known Bugs

- [ ] When letting go of ctrl before releasing the mouse button, the box selection is not cleared

_Last Updated: February 2026_
