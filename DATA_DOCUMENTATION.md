# Data Processing and Handoff Guide

This guide describes the raw data folders, supported source formats, compiled `.bld` files, index generation, upload flow, and browser loading path for the Quakes visualization app.

The current data source root is `data/`, not `public/data/`. `public/data/` is generated only for local static serving when `scripts/generate_index.py --local` copies `data/binary` into `public/data`.

## Current Data Inventory

```
data/
├── csv/
│   ├── 15story/
│   │   ├── node_data.csv
│   │   ├── building_height.csv
│   │   ├── beam_data.csv
│   │   ├── corner_positions.csv
│   │   ├── hidden_floors.csv
│   │   ├── name.txt
│   │   ├── station3138/
│   │   └── station3139/
│   ├── 52story/
│   │   ├── node_data.csv
│   │   ├── building_height.csv
│   │   ├── beam_data.csv
│   │   ├── corner_positions.csv
│   │   ├── hidden_floors.csv
│   │   ├── name.txt
│   │   ├── station3138/
│   │   └── station3139/
│   └── 73story/
│       ├── node_data.csv
│       ├── building_height.csv
│       ├── name.txt
│       ├── station3138/
│       └── station3139/
├── binary/
│   ├── 15story/
│   ├── 52story/
│   └── 73story/
└── old15/
```

Current compiled coverage:

| Building  | Nodes | Stories | Building-level compiled files   | Simulation coverage                                                                                                 |
| :-------- | ----: | ------: | :------------------------------ | :------------------------------------------------------------------------------------------------------------------ |
| `15story` | 4,109 |      19 | `building.bld`, `beam_data.bld` | `station3138` and `station3139`: displacement, velocity, acceleration, rotations, ground motion, hinge, shear       |
| `52story` | 2,121 |      54 | `building.bld`, `beam_data.bld` | `station3138` and `station3139`: displacement, velocity, acceleration, rotations, ground motion, hinge, shear       |
| `73story` | 4,650 |      89 | `building.bld`                  | `station3138`: displacement linear/rotation and ground motion; `station3139`: displacement linear and ground motion |

The app catalog lives in `src/data/index.json`. Local path entries are relative to `/data/{building}` or `/data/{building}/{simulation}`. R2 entries are full public URLs. `src/data/index.local.json` is a local-reference variant.

## Raw Building Files

Every processable building folder in `data/csv/{building}` must contain:

| File                   | Required                             | Purpose                                       | Important columns                                                                       |
| :--------------------- | :----------------------------------- | :-------------------------------------------- | :-------------------------------------------------------------------------------------- |
| `node_data.csv`        | Yes                                  | Node IDs, coordinates, and restraint columns. | `Node ID`, `H1`, `H2`, `V`; restraint columns are preserved in source but not compiled. |
| `building_height.csv`  | Yes                                  | Story labels and per-story heights.           | `Story level`, `Story Height (ft)`                                                      |
| `name.txt`             | No                                   | Display name used by `generate_index.py`.     | Plain text, first/only line.                                                            |
| `beam_data.csv`        | No, required for hinge visualization | Member connectivity and group names.          | `Group Name`, `Group ID`, `Element ID`, `I-Node ID`, `J-Node ID`                        |
| `corner_positions.csv` | No                                   | Overrides auto-detected story corner nodes.   | `Corner`, `X Pos`, `Y Pos`, optional `Story`                                            |
| `hidden_floors.csv`    | No                                   | Floors hidden by default in the interface.    | `Story` or `Story level`                                                                |

`node_mapping.csv`, `building_center.csv`, and original `.xlsx` workbooks may exist as references, but the current compiler reads the CSV files listed above.

### Units

All compiled building geometry and metadata use inches.

| Source value                    | Source unit                    | Compiled unit      | Notes                                                                                        |
| :------------------------------ | :----------------------------- | :----------------- | :------------------------------------------------------------------------------------------- |
| `node_data.csv` `H1`, `H2`, `V` | Inches or feet                 | Inches             | The compiler auto-detects scale `1` or `12` by matching node elevations to story elevations. |
| `building_height.csv`           | Feet                           | Inches             | Stored as per-story heights in `building.bld`.                                               |
| Response translations           | Inches                         | Inches             | Linear displacement, velocity, and acceleration keep source units.                           |
| Response rotations              | Radians                        | Radians            | Rotation, rotation velocity, and rotation acceleration keep source units.                    |
| Ground motion                   | Source acceleration components | Same source values | Stored as three float components per frame.                                                  |
| Shear                           | Kip                            | Kip                | Stored after story alignment and cumulative top-down summing.                                |

The source coordinate system is H1/H2/V, mapped to X/Y/Z in compiled data. Three.js rendering uses a root rotation to display Z-up model data in a Y-up renderer.

## Raw Simulation Formats

Each simulation folder is discovered when it contains at least one recognized dataset under `Displacements`, `Velocities`, `Accelerations`, `Hinge results`, or `Shears`.

### Entire Response Files

The 15-story and 73-story source data use "Entire" files, one per component:

```
Displacements/D_H1T_Entire.txt
Displacements/D_H2T_Entire.txt
Displacements/D_VT_Entire.txt
Displacements/D_H1R_Entire.txt
Displacements/D_H2R_Entire.txt
Displacements/D_VR_Entire.txt

Velocities/V_H1T_Entire.txt
Velocities/V_H2T_Entire.txt
Velocities/V_VT_Entire.txt
Velocities/V_H1R_Entire.txt
Velocities/V_H2R_Entire.txt
Velocities/V_VR_Entire.txt

Accelerations/A_H1T_Entire.txt
Accelerations/A_H2T_Entire.txt
Accelerations/A_VT_Entire.txt
Accelerations/A_H1R_Entire.txt
Accelerations/A_H2R_Entire.txt
Accelerations/A_VR_Entire.txt
```

Only files for datasets present in the source folder are generated. For example, current 73-story simulations compile displacement and ground motion only because velocity, acceleration, hinge, shear, and beam inputs are not present.

The compiler reads PERFORM/LADWP text headers of the form `Column, N, = node, NODE_ID` and then reads comma-separated time-history rows. Max/min footer rows are dropped when present. Values are aligned into dense node-index order from `node_data.csv`; nodes not covered by any component are left as zero and listed in the binary metadata as `missing_node_indices`.

### Grid Response Files

The 52-story source data use "Grid" files split by grid label. The compiler supports both of these patterns:

```
D_H1T_Grid_6.txt
D_H1R_Grid_6.txt
D_H2T_Grid_F.txt
D_VT_Grid_G.txt
```

and older no-rotation grid names:

```
D_H1_Grid_11.txt
D_H2_Grid_36.txt
D_V_Grid_11.txt
```

For grid files, all matching grid fragments are loaded, sorted by grid identifier, and merged by node ID into one dense array. Partial coverage is preserved. Current 52-story compiled response files record `1903` missing node indices because only selected grid lines are represented in the raw files.

### Ground Motion

`ground_motion.txt` is whitespace-delimited with time in column 1 and three components in columns 2-4. The compiler stores only the three components as `ground_motion.bld` with `dt: 0.01`.

### Hinge Results

Current hinge parsing supports `Hinge results/hinge_data.csv`. `.xlsx` files may be present as source/reference exports, but `scripts/generate_binary_data.py` currently skips unsupported hinge formats unless a normalized CSV exists.

Required columns:

```
Group ID
Element ID
Step Type
Component No.
Performance Level
M3
R3
Max Pos Deform DCRatio
Max Neg Deform DCRatio
```

Compiler behavior:

- Keeps only `Group ID == 2`.
- Keeps only `Performance Level == 1`.
- Allows only `Step Type` values `Max` and `Min`.
- Requires unique rows by `Element ID`, `Component No.`, `Step Type`, `Performance Level`.
- Maps hinge `Element ID` to the corresponding `beam_data.bld` row.
- Resolves component side per beam. Singleton component `2` maps to the I end; singleton `3`, `4`, or `5` maps to the J end; multi-component beams use `2/3 -> I` and `4/5 -> J`.
- Stores one row per beam with I/J Max/Min values for `M3` and `R3`. DCR columns are validated and read but are not currently emitted into `hinge_data.bld`.

### Shear Results

Current shear parsing expects a pair of files in `Shears/`:

```
*_H1M.txt
*_H2M.txt
```

The parser reads `Column, N, = section ... name = Story <floor> Bottom - C` header mappings and the final `Maximum` and `Minimum` rows. It keeps only exact column-only `- C` sections and excludes wall, brace, and combined sections. Story labels are normalized, including `Int Mezz` and `Int Mezzanine` to `Mezzanine`.

The compiler aligns shear rows to `building.bld` `story_order`, fills missing source stories with `NaN`, then performs a top-down cumulative sum for each of `h1Max`, `h1Min`, `h2Max`, and `h2Min`.

## Compiled Binary Files

All `.bld` files are gzip-compressed containers with a 4-byte little-endian JSON header length, UTF-8 JSON metadata, 0-3 space bytes of padding to align the body, and a little-endian Float32 body. See `binaryformat.md` for the byte-level specification.

Building-level files:

| File            | Required by app           | Body layout                                       | Notes                                                                                                                 |
| :-------------- | :------------------------ | :------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| `building.bld`  | Yes                       | `[x, y, z]` per node                              | Includes stories, corners, story heights, story order, node-to-below map, cross sections, and optional hidden floors. |
| `beam_data.bld` | No, required for hinge UI | `[iNodeIndex, jNodeIndex, groupIndex]` per member | `groupNames[groupIndex]` gives the source group name.                                                                 |

Simulation-level files:

| File                   | Required by app | Body layout                                                                            | Notes                                   |
| :--------------------- | :-------------- | :------------------------------------------------------------------------------------- | :-------------------------------------- |
| `displacement_lin.bld` | Yes             | Frame-major `[x, y, z]` per node                                                       | Main animation and core stats.          |
| `ground_motion.bld`    | Yes             | `[x, y, z]` per frame                                                                  | Ground motion charts and summary stats. |
| `displacement_rot.bld` | Optional        | Frame-major `[rx, ry, rz]` per node                                                    | Loaded on demand.                       |
| `velocity_lin.bld`     | Optional        | Frame-major `[x, y, z]` per node                                                       | Loaded on demand.                       |
| `velocity_rot.bld`     | Optional        | Frame-major `[rx, ry, rz]` per node                                                    | Loaded on demand.                       |
| `acceleration_lin.bld` | Optional        | Frame-major `[x, y, z]` per node                                                       | Loaded on demand.                       |
| `acceleration_rot.bld` | Optional        | Frame-major `[rx, ry, rz]` per node                                                    | Loaded on demand.                       |
| `hinge_data.bld`       | Optional        | `[beamIndex, endMask, iM3Max, iM3Min, iR3Max, iR3Min, jM3Max, jM3Min, jR3Max, jR3Min]` | Requires `beam_data.bld`.               |
| `shear_data.bld`       | Optional        | `[h1Max, h1Min, h2Max, h2Min]` per story                                               | Story order is in the file header.      |

Required app startup data is intentionally small enough to load first: `building.bld`, `displacement_lin.bld`, and `ground_motion.bld`. Other datasets are optional and can be queued by URL state, profiles, or the data loader UI.

## Generate or Update Data

Install Python dependencies if needed:

```bash
python3 -m pip install -r scripts/requirements.txt
```

Generate all binary data:

```bash
python3 scripts/generate_binary_data.py
```

Common targeted runs:

```bash
python3 scripts/generate_binary_data.py --dryrun
python3 scripts/generate_binary_data.py --building 52story
python3 scripts/generate_binary_data.py --building 52story --simulation station3139
python3 scripts/generate_binary_data.py --building 15story --simulation station3138 --metrics displacement velocity
python3 scripts/generate_binary_data.py --generate-missing-only
```

Supported `--metrics` values are:

```
all
building
displacement
velocity
acceleration
ground_motion
hinge
shear
```

The interactive wrapper is:

```bash
bash scripts/run-pipeline.sh
```

It uses `gum` to choose dry-run mode, buildings, simulations, metric type, upload mode, and index generation.

## Index and Upload

Generate an index from local compiled files and copy them into `public/data`:

```bash
python3 scripts/generate_index.py --local
```

Generate an index from R2 object listings:

```bash
python3 scripts/generate_index.py
```

R2 mode requires these environment variables in `.env` or `scripts/.env`:

```
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ENDPOINT
R2_BUCKET
R2_PUBLIC_ENDPOINT
```

Upload compiled binaries to R2:

```bash
bash scripts/upload-to-r2.sh all
```

Force re-upload by touching files first:

```bash
bash scripts/upload-to-r2.sh touch
```

`upload-to-r2.sh` uses `rclone copy data/binary r2:quakes-binaries/` and includes only `*.bld` files.

After upload, regenerate `src/data/index.json` from R2 so the app points at public URLs. For local handoff/testing, regenerate with `--local` so the app points at `/data/...`.

## Adding a New Building

1. Create `data/csv/{buildingSlug}/`.
2. Add `node_data.csv` and `building_height.csv`.
3. Add `name.txt` if the display name should differ from the folder slug.
4. Add `beam_data.csv` if hinge data or member overlays should be available.
5. Add `corner_positions.csv` if automatic floor-corner detection is not correct.
6. Add `hidden_floors.csv` if some floors should be hidden by default.
7. Add one or more simulation folders under the building folder.
8. Run `python3 scripts/generate_binary_data.py --building {buildingSlug} --dryrun`.
9. Run the same command without `--dryrun`.
10. Generate/upload the index as needed.
11. Run `pnpm lint` before committing.

## Adding a New Simulation

1. Create `data/csv/{buildingSlug}/{simulationSlug}/`.
2. Add `name.txt` for the simulation display name.
3. Add `ground_motion.txt`.
4. Add `Displacements/` with either Entire files or Grid files. `displacement_lin.bld` is required by the app.
5. Add optional `Velocities/`, `Accelerations/`, `Hinge results/hinge_data.csv`, and `Shears/*_H1M.txt` plus `*_H2M.txt`.
6. Run:

```bash
python3 scripts/generate_binary_data.py --building {buildingSlug} --simulation {simulationSlug} --dryrun
python3 scripts/generate_binary_data.py --building {buildingSlug} --simulation {simulationSlug}
```

7. Regenerate the index and verify the simulation appears in the picker.
8. Run `pnpm lint` before committing.

## Browser Loading Path

The app imports `src/data/index.json` through `src/data/index.ts`. `AnimationDataProvider` owns selection, URL state, fetching, parsing, caching, and optional dataset loading.

Startup flow:

1. The selected building/simulation comes from `?building=...&simulation=...&optionalLoads=...` or from the picker.
2. The provider creates dataset states for all required, optional, and internal datasets.
3. Required files load first: `building.bld`, `displacement_lin.bld`, and `ground_motion.bld`.
4. Raw fetched files are cached in IndexedDB database `QuakesCache`, object store `files`.
5. Required data is decompressed, parsed, and converted into serialized animation data. The app computes story drift, bounding boxes, per-frame/per-story averages, peak node displacement, ground-motion ranges, and bounding geometries.
6. Processed core data is cached in IndexedDB object store `processed` using a key based on `PROCESSED_CACHE_VERSION`, building, simulation, source paths, and file sizes.
7. The interface becomes usable once the required core is ready.
8. Optional datasets load after core data. `beamData` is internal and is automatically queued when `hingeData` is selected.
9. Optional parsing runs in `optionalDataWorker.ts`, one queued job at a time, then merges into `BuildingAnimationData`.

Default optional load settings are defined in `src/features/animation-data/data-loading/util.ts`:

| Dataset           | Default                                                     |
| :---------------- | :---------------------------------------------------------- |
| `hingeData`       | On, only when both `hingeData` and `beamData` are available |
| `shearData`       | Off                                                         |
| `displacementRot` | Off                                                         |
| `velocityLin`     | Off                                                         |
| `velocityRot`     | Off                                                         |
| `accelerationLin` | Off                                                         |
| `accelerationRot` | Off                                                         |

The `optionalLoads` URL parameter is a bitstring in `OPTIONAL_DATASET_KEYS` order:

```
hingeData, shearData, displacementRot, velocityLin, velocityRot, accelerationLin, accelerationRot
```

For example, `1000000` requests hinge data only.

## Validation Checklist

Before handoff or commit:

```bash
pnpm lint
```

That runs `eslint .` and `tsc --noEmit`; both must pass.

For a data handoff, also verify:

- `data/csv/{building}` has required building files.
- Every new simulation has `ground_motion.txt` and displacement files.
- `scripts/generate_binary_data.py --dryrun` accepts the new building/simulation.
- Generated `data/binary/{building}` contains `building.bld`, required simulation files, and optional files expected by the UI.
- `src/data/index.json` points to the intended local or R2 locations.
- The app can load the selection from URL and from the picker.
