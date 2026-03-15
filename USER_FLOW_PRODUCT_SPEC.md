# User Flow Product Spec

## Product Intent

This application is not a general earthquake visualization playground.

Its primary job is to help researchers and engineers identify where seismic demand concentrates in a building, understand whether those concentrations indicate meaningful damage mechanisms, compare those patterns across simulations, and capture evidence that can support later engineering or research conclusions.

The product should help answer questions like:

- Where are the most critical regions in the building?
- Which floors, corners, or components exceed meaningful thresholds?
- When do those exceedances happen, and in what order?
- Do drift, torsion, and hinge signals support the same interpretation or reveal different mechanisms?
- How does one simulation differ from another in a way that matters?

## Primary Users

### Researcher / Engineer

Primary user. Needs to interpret the simulation, find anomalies, compare evidence, and decide whether a pattern is important.

### Presenter / Stakeholder

Secondary user. Needs to consume or share findings that were already identified by the primary user.

This means export and presentation features matter, but they should support the analysis workflow rather than drive it.

## Core User Needs

The primary user needs to:

1. Load the right simulation context quickly.
2. See where structural demand concentrates.
3. Detect threshold exceedance in a way that is spatially and temporally meaningful.
4. Inspect the evidence at the floor, corner, node, or hinge level.
5. Compare one simulation against another when needed.
6. Save, share, or export a finding after it has been identified.

Anything outside this chain is secondary or experimental.

## Core Signals

These are the highest-value signals currently supported by the data and application:

- Interstory drift concentration by story/corner
- Threshold crossing time and order
- Peak response by story or local region
- Hinge hotspot concentration
- Torsional asymmetry by floor
- Agreement or disagreement between drift-based and hinge-based evidence

## Primary Workflow

### Workflow A: Triage A Single Simulation

Goal: identify where the building appears most vulnerable and why.

1. Load a building and simulation.
2. Review a default analysis layout centered on the 3D view, timeline, story drift heatmap, ISD threshold summary, and hinge hotspot evidence.
3. Scrub or play through the event while watching where drift concentrates.
4. Identify floors/corners that cross thresholds or show unusual concentration.
5. Click into the relevant story, corner, floor, or node to inspect more detail.
6. Check whether hinge evidence reinforces or complicates the drift interpretation.
7. Save/share/export the finding if it is worth discussing.

Questions this workflow should answer:

- Where is the anomalous region?
- How severe is it?
- When does it happen?
- Is it localized, torsional, vertical, or building-wide?
- What evidence supports that interpretation?

### Workflow B: Compare Two Simulations

Goal: determine whether two simulations show materially different damage-relevant patterns.

1. Load two simulations in a side-by-side comparison mode.
2. Optionally sync camera, time, and investigation target.
3. Compare threshold crossing patterns, hotspots, and evidence concentration.
4. Determine whether one simulation reduces, shifts, or intensifies demand.
5. Capture the comparison with a shareable state or export.

Questions this workflow should answer:

- Which simulation performs better, and in what way?
- Did the vulnerable region move, shrink, or intensify?
- Are the differences visible in both global and local evidence?

### Workflow C: Communicate A Finding

Goal: package an already-identified pattern for another audience.

1. Start from a saved or shared investigation state.
2. Clean the layout to show only the relevant evidence.
3. Export a figure, panel, or video that preserves the narrative.

This workflow is secondary. It should not dominate the product roadmap before the scientific workflow is clear.

## Core Product Surfaces

These surfaces directly support the primary workflow:

- Main 3D view
- Timeline with ground motion context
- Story drift heatmap
- ISD threshold summary
- Floor/story detail inspection
- Hinge hotspot analysis
- Torsion summary where it clarifies asymmetry
- Saved/shared state
- Comparison view

## Secondary Product Surfaces

These can be useful, but should not define the roadmap:

- Export controls
- Profile/layout persistence
- Stakeholder-facing cleaned layouts
- Supporting time-series charts when tied to a selected target

## Experimental / Deprioritized Surfaces

These should only stay in the main experience if they clearly help answer the primary questions:

- Standalone novelty routes
- Surface/ribbon/texture-style alternative encodings
- Views that duplicate existing evidence without improving interpretation
- Feature-demo flows built around showing an interaction rather than learning something from the data

## Product Principles

- Favor interpretation over exploration breadth.
- Favor linked evidence over disconnected panels.
- Favor default workflows over empty flexibility.
- Favor a few strong views over many competing views.
- Treat exports as the end of the workflow, not the center.
- Every new feature should answer: what decision does this help the user make?

## What To Ask Science Partners

- What decision would this evidence support?
- What pattern here actually matters?
- What would count as convincing evidence?
- What would surprise you in this view?
- What is missing for this to be scientifically useful?
- Which metric is essential, and which ones are distraction?

## Near-Term Product Direction

Before adding more breadth, prioritize:

1. Tighten the single-simulation triage workflow.
2. Clarify the meaning of thresholds and hotspot evidence.
3. Improve linking between story/corner/floor/hinge evidence.
4. Curate the main experience so it feels like one tool.
5. Add comparison and export only in ways that support clear findings.
