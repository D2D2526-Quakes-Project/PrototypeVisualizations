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
- [ ] Add distance / metric markers numbers on the grid in the building scene.
- [ ] Show the slice view cutting planes as planes in the building scene. Also show per axis a line filling with the visible area along that axis.
- [ ] Add node labels (story/floor IDs)
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
- [x] Add "reset to defaults" button
- [ ] Improve panel drag/resize handles

- [x] Change the views menu popover to be a sidebar that takes up space next to the canvas

- [ ] Update teh Damage Threshold panel to have a better layout and information. Remove the checkboxes and add a slider to set the threshold.

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

- [ ] Fix node highlighting not working in all view modes

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

- [ ] Add visual feedback during box selection
- [ ] Ensure selected nodes sync across all views
- [x] When there is a selection, these options should be available in both the View Menu and the Collapsed View Menu: Clear Selection, Hide Selected Nodes, Show All Nodes

---

### 17.14 Zustand Architecture Follow-ups

- [ ] Introduce workspace-scoped state shape (`workspaces[workspaceId]`) for split-view support
- [ ] Separate persisted state from transient runtime state (`fps`, drag state, hover state)

---

## Known Bugs

- [x] When the view menu is docked, the ctrl+drag selection box is visually offset

_Last Updated: February 2026_
