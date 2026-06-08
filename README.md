# Quakes

**Interactive seismic response visualization for tall building structural simulations**

Quakes is a research tool for exploring time-history structural response data from building simulations. It renders building models in an interactive 3D scene, animates node displacements frame-by-frame, and shows a variety of metrics including interstory drift, story shear, and hinge demand summaries, across and interactive interface.

![Quakes interface screenshot](./public/demo.png)

## Features

**3D animated building response**
A visualization of the building showing nodes, beam connections, floor slabs, and hinges. Moves in realtime to watch the simulation data. Toggleable floors and building slice visibility to narrow in on one part of the building. Scalable node displacement and positions to get better visibility on the motion. Quick camera presets and full orbit controls allow viewing the building from any angle. Visualize any metric across the entire building and set thresholds to highlight area of interest for values that get too high.

**Dockable analysis panels**
The interface uses a dockview layout that can be arranged freely. Available panels include:

- _Floor waveform_ — time-series waveforms showing the average value of each floor
- _Hinge distribution_ — histograms for showing peak hinge rotational distributions
- _Corner metric chart_ — showing the a metric value at each corner on every floor
- _Node/Floor/Cross Section Panels_ — view data and graphs for individual nodes, floors, and X/Y cross-sections of the building

**Export**
The interface supports exporting video of the 3D building playback and data graphs. Both DOM capture and canvas-native paths are supported.

**Data profiles**
Named profiles (Displacements, Hinges, Shear, Story Drifts) for easy switching between both panel layout and datasets. With on demand data loading, the browser loads only the three required startup files before the interface becomes usable. Optional datasets are fetched and parsed incrementally with a background worker.

## Data pipeline

Before the data is loaded into the viewer, it gets processed to remove uneccessary data and reduce file sizes. The processing pipeline converts raw structural analysis output (PERFORM-3D / LADWP text exports, hinge CSVs, data csvs) into compact gzip-compressed binary files (`.bld`) served from Cloudflare R2.

### Data Processing

```mermaid
flowchart LR
  subgraph SRC["Raw source data"]
    direction LR
    A1["node_data.csv<br>building_height.csv<br>beam_data.csv"]
    A2["D_*.txt / V_*.txt / A_*.txt<br>(Entire or Grid format)"]
    A3["ground_motion.txt"]
    A4["hinge_data.csv<br>Shears/*_H1M.txt<br>Shears/*_H2M.txt"]
  end

  subgraph COMP["Binary compiler"]
    direction TB
    B1["Parse nodes<br>unit detect & normalise"]
    B2["Parse beam connectivity"]
    B3["Merge Entire/Grid files<br>align to node index"]
    B4["Parse ground_motion.txt<br>store 3-component Float32 array"]
    B5["Filter Group 2 / Perf Level 1<br>resolve I/J beam ends"]
    B6["Align stories, top-down sum"]
  end

  subgraph OUT["Compiled output"]
    direction TB
    D1["building.bld"]
    D2["beam_data.bld"]
    D3["displacement_lin.bld<br>displacement_rot.bld"]
    D4["velocity_lin.bld<br>velocity_rot.bld"]
    D5["acceleration_lin.bld<br>acceleration_rot.bld"]
    D6["ground_motion.bld"]
    D7["hinge_data.bld"]
    D8["shear_data.bld"]
    D9(["index.json"])
  end

  B1-->|Compress| D1
  B2-->|Compress| D2
  B3-->|Compress| D3 & D4 & D5
  B4-->|Compress| D6
  B5-->|Compress| D7
  B6-->|Compress| D8

  A1 --> B1
  A1 --> B2
  A2 --> B3
  A3 --> B4
  A4 --> B5
  A4 --> B6

  classDef input fill:#E1F5EE,stroke:#0F6E56,color:#04342C
  classDef compiler fill:#E0EFF9,stroke:#4F7B6B,color:#1F3D3A
  classDef out fill:#F1EFE8,stroke:#5F5E5A,color:#2C2C2A

  class A1,A2,A3,A4 input
  class B1,B2,B3,B4,B5,B6,B7 compiler
  class D1,D2,D3,D4,D5,D6,D7,D8,D9 out
	style SRC fill:#FFFFFF,stroke-width:0px
	style OUT fill:#FFFFFF,stroke-width:0px
	style COMP fill:#FFFFFF,stroke-width:2px,stroke-dasharray:5 5
```

---

## Primary Technology

- _Rendering_ - Three.js, React Three Fiber, React Three Drei
- _Charts_ - Apache ECharts
- _UI framework_ - React 19, Tailwind CSS v4, shadcn/ui, Radix UI
- _Export_ - @ffmpeg/ffmpeg (WASM), MediaRecorder API, JSZip

---

## Building & Running

**Python pipeline** (data preparation only)

```
python >= 3.9
numpy
pandas
```

Install with `pip install -r scripts/requirements.txt`.

Run the build script: `python3 scripts/generate_binary_data.py`

**JavaScript / browser app**

Install dependencies: `pnpm install`

Run locally: `pnpm dev`

Build: `pnpm build`

---

<!--
## Citation

If you use this tool or the associated datasets in published research, please cite:

```

[Author(s)]. (Year). Quakes: Interactive seismic response visualization
for tall building structural simulations [Software].
[Institution/Repository URL]

```

---

## License

[Add license here]

---

## Contact

```
```
 -->

---

## Acknowledgments

This project was developed as part of the **JPL/Caltech/ArtCenter Data to Discovery Program**, in collaboration with **NASA JPL**.

- **Aidan Schmitigal** — Primary development
- **Esther Suh** — Design
- **Monica Kohler** & **Viviana Vela** — Research & data
