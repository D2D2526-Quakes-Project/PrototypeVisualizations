# BLD Binary Format Specification

For reference the code is here:\
_Writer:_ `scripts/generate_binary_data.py` \
_CReader:_ `src/features/animation-data/data-loading/incrementalData.ts`

All `.bld` files are gzip-compressed binary containers with a JSON metadata header and a Float32 body.

## Container

After gzip decompression, every file has this layout:

| Offset         | Type                      | Description                                                               |
| :------------- | :------------------------ | :------------------------------------------------------------------------ |
| `0x00`         | `uint32` little-endian    | Header length `L`, in bytes.                                              |
| `0x04`         | UTF-8 JSON                | Metadata header with exactly `L` bytes.                                   |
| `0x04 + L`     | space padding             | 0-3 ASCII space bytes so the body starts on a 4-byte boundary.            |
| aligned offset | `float32[]` little-endian | Binary body. All offsets in code are relative to this aligned body start. |

Writer behavior:

```py
f.write(struct.pack("<I", len(header_bytes)))
f.write(header_bytes)
f.write(b" " * padding_len)
f.write(binary_data)
```

Reader behavior:

```ts
const headerLen = new Uint32Array(buffer, 0, 1)[0];
const metadata = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, headerLen)));
let bodyOffset = 4 + headerLen;
if (bodyOffset % 4 !== 0) bodyOffset += 4 - (bodyOffset % 4);
const bodyView = new Float32Array(buffer, bodyOffset);
```

## Building File

**Path:** `{building}/building.bld`

**Purpose:** Static node positions plus semantic metadata for floors, corners, interstory drift, cross sections, and default floor visibility.

### Header

```json
{
  "count_nodes": 4109,
  "stories": {
    "Ground": [0, 1, 2],
    "2": [10, 11, 12]
  },
  "corners": {
    "NW": [12, 48],
    "NE": [13, 49],
    "SW": [14, 50],
    "SE": [15, 51]
  },
  "story_heights": {
    "Ground": 0.0,
    "2": 336.0
  },
  "story_order": ["Ground", "2", "3"],
  "node_to_below": [-1, -1, 0, 1],
  "cross_sections_x": {
    "5000.0": [0, 3, 8]
  },
  "cross_sections_y": {
    "6000.0": [1, 4, 9]
  },
  "hidden_floors": ["Penthouse"]
}
```

`hidden_floors` is optional.

Header fields:

| Field              | Type     | Description                                                                                           |
| :----------------- | :------- | :---------------------------------------------------------------------------------------------------- |
| `count_nodes`      | number   | Dense node count.                                                                                     |
| `stories`          | object   | Story id to node indices assigned to that story.                                                      |
| `corners`          | object   | Corner name to one node index per detected story.                                                     |
| `story_heights`    | object   | Story id to individual story height in inches, not cumulative elevation.                              |
| `story_order`      | string[] | Bottom-to-top story order used throughout the UI.                                                     |
| `node_to_below`    | number[] | `nodeIdx -> belowNodeIdx`, with `-1` for ground/no match. Used to compute story drift in the browser. |
| `cross_sections_x` | object   | X-coordinate plane groups. Keys are coordinate labels in inches.                                      |
| `cross_sections_y` | object   | Y-coordinate plane groups. Keys are coordinate labels in inches.                                      |
| `hidden_floors`    | string[] | Optional story ids hidden by default.                                                                 |

### Body

Float32 array, stride 3:

```
[x0, y0, z0, x1, y1, z1, ...]
```

Units are inches.

## Beam Connectivity File

**Path:** `{building}/beam_data.bld`

**Purpose:** Building-level member connectivity. Hinge visualization depends on this file because `hinge_data.bld` references `beamIndex`.

### Header

```json
{
  "count_rows": 6866,
  "stride": 3,
  "groupNames": ["Columns", "Beams", "Braces"]
}
```

`groupNames` is indexed by the `groupIndex` stored in the body. The original numeric `Group ID` and `Element ID` are not stored in the compiled file.

### Body

Float32 array, stride 3:

```
[iNodeIndex, jNodeIndex, groupIndex]
```

The values are stored as floats but read as integer indices.

## Response Time-Series Files

**Paths:**

```
{building}/{simulation}/displacement_lin.bld
{building}/{simulation}/displacement_rot.bld
{building}/{simulation}/velocity_lin.bld
{building}/{simulation}/velocity_rot.bld
{building}/{simulation}/acceleration_lin.bld
{building}/{simulation}/acceleration_rot.bld
```

Only `displacement_lin.bld` is required by app startup. The other response files are optional and loaded on demand.

### Header

```json
{
  "type": "displacement_lin",
  "count_frames": 11251,
  "count_nodes": 4109,
  "dt": 0.01,
  "missing_node_indices": [12, 13]
}
```

`missing_node_indices` is optional. It appears when a source dataset covers only part of the building, especially merged Grid data.

Known `type` values:

```
displacement_lin
displacement_rot
velocity_lin
velocity_rot
acceleration_lin
acceleration_rot
```

### Body

Frame-major Float32 array, stride 3 per node:

```
Frame 0:
  Node 0: x, y, z
  Node 1: x, y, z
Frame 1:
  Node 0: x, y, z
  Node 1: x, y, z
```

Access formula:

```ts
const componentIndex = frameIndex * count_nodes * 3 + nodeIndex * 3 + component;
const value = bodyView[componentIndex];
```

Component order is `[H1, H2, V]`, represented as `[x, y, z]`.

Units:

| File family  | Linear units | Rotation units |
| :----------- | :----------- | :------------- |
| Displacement | inches       | radians        |
| Velocity     | inches/s     | radians/s      |
| Acceleration | inches/s^2   | radians/s^2    |

## Ground Motion File

**Path:** `{building}/{simulation}/ground_motion.bld`

**Required by app startup.**

### Header

```json
{
  "count_frames": 11251,
  "dt": 0.01
}
```

### Body

Float32 array, stride 3 per frame:

```
[x0, y0, z0, x1, y1, z1, ...]
```

The compiler reads columns 2-4 from `ground_motion.txt`; column 1 time values are not stored.

## Hinge Data File

**Path:** `{building}/{simulation}/hinge_data.bld`

**Purpose:** Non-time-series hinge demand summary by beam/member end. Requires `beam_data.bld` for interpretation.

### Header

```json
{
  "count_rows": 2776,
  "stride": 10,
  "fields": ["beamIndex", "endMask", "iM3Max", "iM3Min", "iR3Max", "iR3Min", "jM3Max", "jM3Min", "jR3Max", "jR3Min"]
}
```

### Body

Float32 array, stride 10:

```
[beamIndex, endMask, iM3Max, iM3Min, iR3Max, iR3Min, jM3Max, jM3Min, jR3Max, jR3Min]
```

`endMask` values:

| Value | Meaning                                                               |
| ----: | :-------------------------------------------------------------------- |
|   `0` | No I/J hinge data present. Rare; rows normally have at least one end. |
|   `1` | I end present.                                                        |
|   `2` | J end present.                                                        |
|   `3` | Both I and J ends present.                                            |

Missing values are encoded as `NaN`.

`M3` uses source model moment units. `R3` uses radians.

## Shear Data File

**Path:** `{building}/{simulation}/shear_data.bld`

**Purpose:** Static story-aligned shear envelopes after cumulative top-down summing.

### Header

```json
{
  "count_rows": 54,
  "stride": 4,
  "fields": ["h1Max", "h1Min", "h2Max", "h2Min"],
  "story_order": ["1", "2", "3", "Roof"],
  "units": "kip"
}
```

### Body

Float32 array, stride 4:

```
[h1Max, h1Min, h2Max, h2Min]
```

Rows follow header `story_order`. Missing source stories are stored as `NaN`.

The browser accessor exposes derived absolute envelopes:

```ts
xAbs = max(abs(h1Max), abs(h1Min));
yAbs = max(abs(h2Max), abs(h2Min));
```

## Dense Node Indexing

Compiled files use dense zero-based node indices. Original source `Node ID` values are not stored in `.bld` files.

The dense index is created from `node_data.csv` unique `Node ID` order during generation. All response, beam, story, corner, cross-section, hinge, and drift data must use this same index order.

## Browser Parsing and Caching

`ensureDecompressed` detects gzip by bytes `0x1f 0x8b` and uses `DecompressionStream`. `parseBlob` reads the header and body as described above.

Required core parse:

```
building.bld + displacement_lin.bld + ground_motion.bld
```

Optional parse:

```
beam_data.bld
hinge_data.bld
shear_data.bld
displacement_rot.bld
velocity_lin.bld
velocity_rot.bld
acceleration_lin.bld
acceleration_rot.bld
```

Raw files are cached in IndexedDB `QuakesCache/files`. Parsed/serialized core and optional payloads are cached in `QuakesCache/processed`, keyed by `PROCESSED_CACHE_VERSION`, selection, dataset key, source path, and file-size fingerprints.
