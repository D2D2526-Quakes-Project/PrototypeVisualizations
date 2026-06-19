"""
Shared configuration

Directory layout assumed
------------------------
<project_root>/
    scripts/          ← this file lives here
    data/
        csv/          ← source CSVs  (CSV_DIR)
        binary/       ← output .bld files  (BINARY_DIR)

Building CSV layout (under CSV_DIR/<building_folder>/)
------------------------------------------------------
Required:
    node_data.csv           - Node IDs with H1, H2, V coordinates
    building_height.csv     - Story levels and per-story heights (ft)

Optional:
    beam_data.csv           - Beam/member connectivity (enables hinge + BRB)
    corner_positions.csv    - Custom NW/NE/SW/SE corner XY positions per story
    hidden_floors.csv       - Story labels that should be hidden in the viewer
    BRB_properties.csv      - BRB member deformation capacities by property name

Simulation CSV layout (under CSV_DIR/<building_folder>/<simulation_name>/)
---------------------------------------------------------------------------
    Displacements/          - D_H1T_Entire.txt, D_H2T_Entire.txt, D_VT_Entire.txt
                              D_H1R_Entire.txt, D_H2R_Entire.txt, D_VR_Entire.txt
                              (or Grid variants: D_H1T_Grid_*.txt, etc.)
    Velocities/             - V_H1T_Entire.txt, V_H2T_Entire.txt, V_VT_Entire.txt
                              (or Grid variants)
    Accelerations/          - A_H1T_Entire.txt, A_H2T_Entire.txt, A_VT_Entire.txt
                              (or Grid variants)
    ground_motion.txt       - 4-column whitespace-separated: time, x, y, z
    Hinge results/
        hinge_data.csv      - Element hinge performance results
    Shears/
        *_H1M.txt           - PERFORM shear summary (H1 direction)
        *_H2M.txt           - PERFORM shear summary (H2 direction)
    BRB/
        BRB_data.csv        - BRB axial force/deformation results
"""

import os
from collections.abc import Mapping
from typing import NotRequired, Protocol, TypedDict

# ---------------------------------------------------------------------------
# Directory paths
# ---------------------------------------------------------------------------

# Resolve paths relative to this file so the scripts/ folder can live
# anywhere inside the project tree without hardcoding absolute paths.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # one level up from scripts/
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
CSV_DIR = os.path.join(DATA_DIR, "csv")
BINARY_DIR = os.path.join(DATA_DIR, "binary")

# ---------------------------------------------------------------------------
# Hinge CSV column specs
# ---------------------------------------------------------------------------

# All columns that must be present in hinge_data.csv
HINGE_REQUIRED_COLUMNS = [
    "Group ID",
    "Element ID",
    "Step Type",
    "Component No.",
    "Performance Level",
    "M3",
    "R3",
    "Max Pos Deform DCRatio",
    "Max Neg Deform DCRatio",
]

# Subset of HINGE_REQUIRED_COLUMNS that must be parseable as numbers
HINGE_NUMERIC_COLUMNS = [
    "Group ID",
    "Element ID",
    "Component No.",
    "Performance Level",
    "M3",
    "R3",
    "Max Pos Deform DCRatio",
    "Max Neg Deform DCRatio",
]

# Maps hinge Component No. → beam end side ("I" or "J").
# Components 2–3 are the I-end; 4–5 are the J-end.
HINGE_COMPONENT_TO_SIDE = {
    2: "I",
    3: "I",
    4: "J",
    5: "J",
}

# ---------------------------------------------------------------------------
# BRB CSV column specs
# ---------------------------------------------------------------------------

# All columns that must be present in BRB_data.csv
BRB_REQUIRED_COLUMNS = [
    "Group ID",
    "Element ID",
    "Step Type",
    "Component Type",
    "Axial Force",
    "Axial Deformation",
]

# Subset that must be parseable as numbers
BRB_NUMERIC_COLUMNS = ["Group ID", "Element ID", "Axial Force", "Axial Deformation"]

# Columns required in the building-level BRB_properties.csv
BRB_PROPERTIES_REQUIRED_COLUMNS = ["Name", "Tension Dy (in)", "Compression Dy (in)"]

# ---------------------------------------------------------------------------
# Shear story label aliases
# ---------------------------------------------------------------------------

# Maps non-standard story labels found in PERFORM shear files to the
# canonical labels used in building_height.csv.
SHEAR_STORY_ALIASES = {
    "Int Mezz": "Mezzanine",
    "Int Mezzanine": "Mezzanine",
}

# ---------------------------------------------------------------------------
# Type aliases and TypedDicts
# ---------------------------------------------------------------------------


class BuildingInfo(TypedDict):
    folder: str
    name: str
    node_data: str
    height: str
    beam_data: NotRequired[str]
    corner_positions: NotRequired[str]
    hidden_floors: NotRequired[str]


class SimulationInfo(TypedDict):
    name: str
    path: str
    has_displacement: bool
    has_velocity: bool
    has_acceleration: bool
    has_ground_motion: bool
    has_hinge_data: bool
    has_shear_data: bool
    has_brb_data: bool
    file_pattern: str | None
    ground_motion_file: NotRequired[str]
    hinge_file: NotRequired[str]
    shear_files: NotRequired[dict[str, str]]
    brb_file: NotRequired[str]


class BeamLookupMaps(TypedDict):
    hinge_by_group2_element_id: dict[int, int]
    by_group_id_element_id: dict[tuple[int, int], dict[str, object]]


class ComponentGridFiles(TypedDict):
    lin: list[list[str]] | list[str]
    rot: NotRequired[list[list[str] | None] | list[str] | None]


class GridFilesResult(TypedDict):
    lin: list[str]
    rot: list[str] | None


class SimulationFilesConfig(TypedDict, total=False):
    displacement: ComponentGridFiles | None
    velocity: ComponentGridFiles | None
    acceleration: ComponentGridFiles | None
    ground_motion: str | None
    hinge: str | None
    shear: dict[str, str] | None
    brb: str | None


import json
import gzip
import re
import struct

import numpy as np
import pandas as pd


class Args(Protocol):
    dryrun: bool
    generate_missing_only: bool
    building: list[str] | None
    simulation: list[str] | None
    metrics: list[str]


# ---------------------------------------------------------------------------
# .bld file writer
# ---------------------------------------------------------------------------


def write_bld_file(filename: str, header: Mapping[str, object], binary_data: bytes, output_dir: str, dryrun: bool):
    """
    Write a JSON header + binary body to a gzip-compressed .bld file.

    File layout (inside the gzip stream)
    -------------------------------------
    Bytes 0–3          : uint32 LE — length of the JSON header in bytes
    Bytes 4 … 4+N-1   : UTF-8 JSON header string
    Bytes 4+N … pad   : space bytes so the binary body starts on a 4-byte boundary
    Remaining bytes    : raw binary payload (binary_data)

    Parameters
    ----------
    filename : str
        Output filename, e.g. "displacement_lin.bld".
    header : dict
        Metadata dict; will be JSON-serialised.
    binary_data : bytes
        Raw binary payload (typically a numpy array's tobytes()).
    output_dir : str
        Directory to write the file into.
    dryrun : bool
        If True, print what would be written without actually writing.
        If False, write the file.
    """

    header_str = json.dumps(header)
    header_bytes = header_str.encode("utf-8")

    current_pos = 4 + len(header_bytes)
    padding_len = (4 - (current_pos % 4)) % 4
    padding_bytes = b" " * padding_len

    out_path = os.path.join(output_dir, filename)

    if dryrun:
        print(f"[DRYRUN] Would write {out_path} (Header: {len(header_bytes)}b, Pad: {padding_len}b)...")
        return

    print(f"Writing {out_path} (Header: {len(header_bytes)}b, Pad: {padding_len}b)...")

    with gzip.open(out_path, "wb") as f:
        f.write(struct.pack("<I", len(header_bytes)))  # type: ignore
        f.write(header_bytes)  # type: ignore
        f.write(padding_bytes)  # type: ignore
        f.write(binary_data)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"-> Saved. Size: {size_kb:.2f} KB")


# ---------------------------------------------------------------------------
# LADWP text-file parsers
# ---------------------------------------------------------------------------


def parse_ladwp_header(filepath: str) -> tuple[dict[int, int], int]:
    """
    Extract the column→node ID mapping from a LADWP response text file.

    LADWP files embed lines like:
        Column, 2, = node, 1

    This function parses those lines to build a zero-based column-index →
    node-ID dictionary, and also returns the first data row index so the
    caller can skip the header when loading the CSV body.

    Parameters
    ----------
    filepath : str
        Path to the LADWP text file.

    Returns
    -------
    col_map : dict[int, int]
        Zero-based CSV column index → node ID.
    start_row : int
        Row index of the first numeric data line (for use with pd.read_csv
        ``skiprows``).
    """
    col_map: dict[int, int] = {}  # CSV Column Index (0-based) -> Node ID
    start_row = 0
    with open(filepath, "r") as f:
        for i, line in enumerate(f):
            if "Column" in line and "= node" in line:
                m = re.search(r"Column,\s*(\d+),\s*=\s*node,\s*(\d+)", line)
                if m:
                    col_map[int(m.group(1)) - 1] = int(m.group(2))
            if re.match(r"^\s*[\d.-]+,", line):
                start_row = i
                break
    return col_map, start_row


def load_ladwp_data(filepath: str, col_map: dict[int, int], num_frames_expected: int | None = None) -> tuple[np.ndarray, dict[int, int]]:
    """
    Load a single LADWP component file into a float32 numpy array.

    Reads the CSV body (skipping the header block), strips any trailing
    Min/Max footer rows, and returns a (frames × columns) float32 array.

    Parameters
    ----------
    filepath : str
        Path to the LADWP text file.
    col_map : dict
        Column mapping returned by ``parse_ladwp_header`` (used for the
        frame-count warning only; alignment is done by the caller).
    num_frames_expected : int or None
        If provided, a warning is printed when the actual frame count differs.

    Returns
    -------
    vals : np.ndarray, shape (frames, columns), dtype float32
    col_map : dict
        The same col_map that was passed in (returned for convenience).
    """
    _, start_row = parse_ladwp_header(filepath)
    df = pd.read_csv(filepath, skiprows=start_row, header=None)

    # Remove trailing Min/Max summary rows if present
    if isinstance(df.iloc[-1, 0], str):
        df = df.iloc[:-2]

    vals = df.values.astype(np.float32)

    if num_frames_expected and len(vals) != num_frames_expected:
        print(f"Warning: Frame count mismatch in {filepath}")

    return vals, col_map


# ---------------------------------------------------------------------------
# Grid-file merger
# ---------------------------------------------------------------------------


def merge_grid_data(file_list: list[str], id_to_index: dict[int, int]) -> tuple[np.ndarray | None, dict[int, int], set[int]]:
    """
    Merge data from multiple grid-fragment files into a single node-aligned array.

    Grid files each contain a subset of the full node set. This function
    loads all fragment files, aligns each fragment to the global node index
    (using ``id_to_index``), and returns the merged result.

    Parameters
    ----------
    file_list : list[str]
        Ordered list of grid file paths for one component (e.g., all H1 grids).
    id_to_index : dict[int, int]
        Node ID → zero-based node index (from the building processor).

    Returns
    -------
    merged_data : np.ndarray, shape (frames, num_nodes), dtype float32
        Zeros for nodes not covered by any grid file.
    merged_col_map : dict[int, int]
        Combined column→node mapping across all grid files.
    covered_node_ids : set[int]
        Node IDs that appear in at least one grid file.
    """
    if not file_list:
        return None, {}, set()

    print(f"    Merging {len(file_list)} grid file(s)...")

    all_col_maps: list[dict[int, int]] = []
    all_data: list[np.ndarray] = []
    num_frames: int | None = None

    for i, filepath in enumerate(file_list):
        print(f"      Loading grid file {i+1}/{len(file_list)}: {os.path.basename(filepath)}")
        col_map, start_row = parse_ladwp_header(filepath)

        df = pd.read_csv(filepath, skiprows=start_row, header=None)

        if isinstance(df.iloc[-1, 0], str):
            df = df.iloc[:-2]

        data = df.values.astype(np.float32)

        if num_frames is None:
            num_frames = len(data)
        elif len(data) != num_frames:
            print(f"      ⚠ Warning: Frame count mismatch in {filepath}")

        all_col_maps.append(col_map)
        all_data.append(data)
        print(f"        - Nodes: {len(col_map)}, Frames: {len(data)}")

    # Merge column maps
    merged_col_map: dict[int, int] = {}
    covered_node_ids: set[int] = set()
    for col_map in all_col_maps:
        merged_col_map.update(col_map)
        covered_node_ids.update(col_map.values())

    print(f"    Total unique nodes across all grids: {len(covered_node_ids)}")

    num_nodes = len(id_to_index)
    if num_frames is None:
        num_frames = 0
    merged_data = np.zeros((num_frames, num_nodes), dtype=np.float32)

    for col_map, data in zip(all_col_maps, all_data):
        for col_idx, node_id in col_map.items():
            if node_id in id_to_index:
                node_idx = id_to_index[node_id]
                merged_data[:, node_idx] = data[:, col_idx]

    return merged_data, merged_col_map, covered_node_ids


# ---------------------------------------------------------------------------
# Missing-node helper
# ---------------------------------------------------------------------------


def compute_missing_node_indices(num_nodes: int, id_to_index: dict[int, int], *coverage_sources: dict[int, int] | set[int]) -> list[int]:
    """
    Return node indices that have no coverage in any provided source map.

    A node is "missing" only when it does not appear in *any* component
    header for this dataset. Partial coverage (e.g., present in H1 but not
    H2) is intentionally preserved in the binary arrays and is not flagged.

    Parameters
    ----------
    num_nodes : int
        Total number of nodes in the building.
    id_to_index : dict[int, int]
        Node ID → node index.
    *coverage_sources : dict or iterable
        Each source is either a dict (values are node IDs) or an iterable
        of node IDs.

    Returns
    -------
    list[int]
        Zero-based node indices with no coverage in any source.
    """
    covered_node_indices: set[int] = set()

    for source in coverage_sources:
        if not source:
            continue
        if isinstance(source, dict):
            node_ids = source.values()
        else:
            node_ids = source
        for node_id in node_ids:
            node_index = id_to_index.get(node_id)
            if node_index is not None:
                covered_node_indices.add(node_index)

    return [node_index for node_index in range(num_nodes) if node_index not in covered_node_indices]


"""
discovery.py
============
Building and simulation discovery for the binary data generation pipeline.

This module scans the CSV directory tree to find buildings and simulations
that have the required source files, and returns structured metadata dicts
that the rest of the pipeline consumes.

Functions
---------
discover_buildings()
    Scan CSV_DIR for valid building folders (must have node_data.csv and
    building_height.csv).  Returns a list of building-info dicts.

discover_simulations(building_folder)
    Scan a building folder for simulation sub-directories and detect which
    data types each one contains (displacement, velocity, acceleration,
    ground motion, hinge, shear, BRB).

discover_hinge_file(simulation_path)
    Locate the hinge_data.csv inside a simulation's "Hinge results/" folder.

discover_shear_files(simulation_path)
    Locate the paired H1M / H2M shear summary files inside "Shears/".

discover_brb_file(simulation_path)
    Locate BRB_data.csv inside a simulation's "BRB/" folder.

discover_grid_files(directory, prefix, has_rotation)
    Find all grid-fragment files for a given component prefix.

detect_grid_rotation_pattern(directory, file_type)
    Return True when grid files use the T/R rotation-suffix naming convention.

get_simulation_files(building_folder, simulation)
    Resolve all concrete file paths for a simulation based on its detected
    pattern ("Entire" or "Grid").

Expected file layout
--------------------
CSV_DIR/
    <building_folder>/
        node_data.csv                    ← required
        building_height.csv             ← required
        beam_data.csv                   ← optional (enables hinge + BRB)
        corner_positions.csv            ← optional
        hidden_floors.csv               ← optional
        BRB_properties.csv              ← optional (needed for BRB processing)
        <simulation_name>/
            Displacements/
                D_H1T_Entire.txt        ← "Entire" pattern
                D_H2T_Entire.txt
                D_VT_Entire.txt
                D_H1R_Entire.txt
                D_H2R_Entire.txt
                D_VR_Entire.txt
                -- OR --
                D_H1T_Grid_<id>.txt     ← "Grid" pattern (one file per grid)
                D_H1R_Grid_<id>.txt     ← (rotation files optional)
                ...
            Velocities/                 ← same structure as Displacements (V_ prefix)
            Accelerations/              ← same structure as Displacements (A_ prefix)
            ground_motion.txt
            Hinge results/
                hinge_data.csv
            Shears/
                <name>_H1M.txt
                <name>_H2M.txt
            BRB/
                BRB_data.csv
"""

# ---------------------------------------------------------------------------
# Building discovery
# ---------------------------------------------------------------------------


def discover_buildings() -> list[BuildingInfo]:
    """
    Scan CSV_DIR for building folders that have the minimum required files.

    A folder is accepted when both ``node_data.csv`` and
    ``building_height.csv`` are present.  The optional files
    ``beam_data.csv``, ``corner_positions.csv``, and ``hidden_floors.csv``
    are included in the result dict when found.

    Returns
    -------
    list[dict]
        Each dict has at minimum the keys:
          - "folder"      : str  — folder name under CSV_DIR
          - "name"        : str  — display name (capitalised if all-lowercase)
          - "node_data"   : str  — absolute path to node_data.csv
          - "height"      : str  — absolute path to building_height.csv
        Optional keys (present only when the file exists):
          - "beam_data"       : str
          - "corner_positions": str
          - "hidden_floors"   : str
    """
    buildings: list[BuildingInfo] = []
    print(f"\n{'='*70}")
    print(f"DISCOVERING BUILDINGS")
    print(f"{'='*70}")
    print(f"Looking in: {CSV_DIR}")

    if not os.path.exists(CSV_DIR):
        print(f"❌ CSV directory does not exist: {CSV_DIR}")
        return buildings

    print(f"✓ CSV directory exists")

    items = os.listdir(CSV_DIR)
    print(f"Found {len(items)} items in CSV directory")

    for building_folder in items:
        building_path = os.path.join(CSV_DIR, building_folder)
        if os.path.isdir(building_path):
            print(f"\n  Checking folder: {building_folder}")
            node_data_file = os.path.join(building_path, "node_data.csv")
            height_file = os.path.join(building_path, "building_height.csv")
            beam_data_file = os.path.join(building_path, "beam_data.csv")
            corner_positions_file = os.path.join(building_path, "corner_positions.csv")
            hidden_floors_file = os.path.join(building_path, "hidden_floors.csv")

            has_node = os.path.exists(node_data_file)
            has_height = os.path.exists(height_file)
            has_beam = os.path.exists(beam_data_file)
            has_corner_positions = os.path.exists(corner_positions_file)
            has_hidden_floors = os.path.exists(hidden_floors_file)

            print(f"    node_data.csv: {'✓' if has_node else '✗'} ({node_data_file})")
            print(f"    building_height.csv: {'✓' if has_height else '✗'} ({height_file})")
            print(f"    beam_data.csv: {'✓' if has_beam else '✗'} ({beam_data_file})")
            print(f"    corner_positions.csv: {'✓' if has_corner_positions else '✗'} ({corner_positions_file})")
            print(f"    hidden_floors.csv: {'✓' if has_hidden_floors else '✗'} ({hidden_floors_file})")

            if has_node and has_height:
                building_info: BuildingInfo = {
                    "folder": building_folder,
                    "name": building_folder.capitalize() if building_folder.islower() else building_folder,
                    "node_data": node_data_file,
                    "height": height_file,
                }
                if has_beam:
                    building_info["beam_data"] = beam_data_file
                    print(f"    → Beam data: WILL USE beam_data.csv")
                if has_corner_positions:
                    building_info["corner_positions"] = corner_positions_file
                    print(f"    → Corner positions: WILL USE CUSTOM XY COORDINATES")
                if has_hidden_floors:
                    building_info["hidden_floors"] = hidden_floors_file
                    print(f"    → Hidden floors: WILL USE CUSTOM HIDDEN FLOORS")
                buildings.append(building_info)
                print(f"    → Building ACCEPTED: {building_info['name']}")
            else:
                missing: list[str] = []
                if not has_node:
                    missing.append("node_data.csv")
                if not has_height:
                    missing.append("building_height.csv")
                print(f"    → Building REJECTED: missing {', '.join(missing)}")

    print(f"\n{'='*70}")
    print(f"DISCOVERY COMPLETE: Found {len(buildings)} building(s)")
    if buildings:
        print(f"Buildings: {[b['name'] for b in buildings]}")
    print(f"{'='*70}\n")

    return buildings


# ---------------------------------------------------------------------------
# Simulation-level file finders
# ---------------------------------------------------------------------------


def discover_hinge_file(simulation_path: str) -> str | None:
    """
    Locate a hinge results file in the simulation folder.

    Looks for ``Hinge results/hinge_data.csv`` only.

    Parameters
    ----------
    simulation_path : str
        Absolute path to the simulation sub-directory.

    Returns
    -------
    str or None
        Absolute path to the hinge CSV, or None if not found.
    """
    hinge_dir = os.path.join(simulation_path, "Hinge results")
    if not os.path.exists(hinge_dir):
        return None

    preferred_csv = os.path.join(hinge_dir, "hinge_data.csv")
    if os.path.exists(preferred_csv):
        return preferred_csv

    return None


def discover_shear_files(simulation_path: str) -> dict[str, str] | None:
    """
    Locate the paired H1 / H2 shear summary files in a simulation folder.

    Searches the ``Shears/`` sub-directory for files whose names end in
    ``_H1M.txt`` and ``_H2M.txt``.  Only one file per direction is expected.

    Parameters
    ----------
    simulation_path : str
        Absolute path to the simulation sub-directory.

    Returns
    -------
    dict or None
        ``{"h1": <path>, "h2": <path>}`` when both are found, else None.
    """
    shear_dir = os.path.join(simulation_path, "Shears")
    if not os.path.exists(shear_dir):
        return None

    txt_files = [f for f in os.listdir(shear_dir) if f.endswith(".txt")]
    h1_files = sorted(f for f in txt_files if re.search(r"_H1M\.txt$", f))
    h2_files = sorted(f for f in txt_files if re.search(r"_H2M\.txt$", f))
    if not h1_files or not h2_files:
        return None

    return {
        "h1": os.path.join(shear_dir, h1_files[0]),
        "h2": os.path.join(shear_dir, h2_files[0]),
    }


def discover_brb_file(simulation_path: str) -> str | None:
    """
    Locate a BRB result file in the simulation folder.

    Looks for ``BRB/BRB_data.csv`` only.

    Parameters
    ----------
    simulation_path : str
        Absolute path to the simulation sub-directory.

    Returns
    -------
    str or None
        Absolute path to the BRB CSV, or None if not found.
    """
    brb_dir = os.path.join(simulation_path, "BRB")
    if not os.path.exists(brb_dir):
        return None

    preferred_csv = os.path.join(brb_dir, "BRB_data.csv")
    if os.path.exists(preferred_csv):
        return preferred_csv

    return None


def discover_simulations(building_folder: str) -> list[SimulationInfo]:
    """
    Discover all simulations for a building.

    Iterates over sub-directories of the building folder and checks each one
    for the presence of at least one recognised data type (displacement,
    velocity, acceleration, hinge, shear, BRB).

    Parameters
    ----------
    building_folder : str
        Folder name under CSV_DIR (not a full path).

    Returns
    -------
    list[dict]
        One dict per accepted simulation sub-directory.  Keys include:
          - "name"               : str
          - "path"               : str  — absolute path
          - "has_displacement"   : bool
          - "has_velocity"       : bool
          - "has_acceleration"   : bool
          - "has_ground_motion"  : bool
          - "has_hinge_data"     : bool
          - "has_shear_data"     : bool
          - "has_brb_data"       : bool
          - "file_pattern"       : "Entire" | "Grid" | None
        Conditionally set when the file exists:
          - "ground_motion_file" : str
          - "hinge_file"         : str
          - "shear_files"        : dict {"h1": str, "h2": str}
          - "brb_file"           : str
    """
    simulations: list[SimulationInfo] = []
    building_path = os.path.join(CSV_DIR, building_folder)

    print(f"\n  DISCOVERING SIMULATIONS for: {building_folder}")
    print(f"  Building path: {building_path}")

    if not os.path.exists(building_path):
        print(f"  ❌ Building path does not exist: {building_path}")
        return simulations

    print(f"  ✓ Building path exists")

    items = os.listdir(building_path)
    print(f"  Found {len(items)} items in building folder")

    for item in items:
        item_path = os.path.join(building_path, item)
        if os.path.isdir(item_path):
            print(f"\n    Checking simulation folder: {item}")
            sim_data: SimulationInfo = {
                "name": item,
                "path": item_path,
                "has_displacement": False,
                "has_velocity": False,
                "has_acceleration": False,
                "has_ground_motion": False,
                "has_hinge_data": False,
                "has_shear_data": False,
                "has_brb_data": False,
                "file_pattern": None,  # "Entire" or "Grid"
            }

            # --- Displacement ---
            disp_path = os.path.join(item_path, "Displacements")
            print(f"      Displacements folder: {'✓ exists' if os.path.exists(disp_path) else '✗ not found'}")
            if os.path.exists(disp_path):
                txt_files = [f for f in os.listdir(disp_path) if f.endswith(".txt")]
                print(f"      .txt files in Displacements: {len(txt_files)}")
                if txt_files:
                    print(f"      First displacement file: {txt_files[0]}")
                    sim_data["has_displacement"] = True
                    if "Entire" in txt_files[0]:
                        sim_data["file_pattern"] = "Entire"
                        print(f"      → Pattern detected: Entire")
                    elif "Grid" in txt_files[0]:
                        sim_data["file_pattern"] = "Grid"
                        print(f"      → Pattern detected: Grid")
                    else:
                        print(f"      ⚠ Unknown file pattern (expected 'Entire' or 'Grid' in filename)")

            # --- Velocity ---
            vel_path = os.path.join(item_path, "Velocities")
            print(f"      Velocities folder: {'✓ exists' if os.path.exists(vel_path) else '✗ not found'}")
            if os.path.exists(vel_path):
                txt_files = [f for f in os.listdir(vel_path) if f.endswith(".txt")]
                print(f"      .txt files in Velocities: {len(txt_files)}")
                if txt_files:
                    sim_data["has_velocity"] = True
                    print(f"      First velocity file: {txt_files[0]}")

            # --- Acceleration ---
            acc_path = os.path.join(item_path, "Accelerations")
            print(f"      Accelerations folder: {'✓ exists' if os.path.exists(acc_path) else '✗ not found'}")
            if os.path.exists(acc_path):
                txt_files = [f for f in os.listdir(acc_path) if f.endswith(".txt")]
                print(f"      .txt files in Accelerations: {len(txt_files)}")
                if txt_files:
                    sim_data["has_acceleration"] = True
                    print(f"      First acceleration file: {txt_files[0]}")

            # --- Ground motion ---
            gm_file = os.path.join(item_path, "ground_motion.txt")
            print(f"      ground_motion.txt: {'✓' if os.path.exists(gm_file) else '✗ not found'}")
            if os.path.exists(gm_file):
                sim_data["has_ground_motion"] = True
                sim_data["ground_motion_file"] = gm_file

            # --- Hinge results ---
            hinge_file = discover_hinge_file(item_path)
            print(f"      hinge results: {'✓' if hinge_file else '✗ not found'}")
            if hinge_file:
                sim_data["has_hinge_data"] = True
                sim_data["hinge_file"] = hinge_file
                print(f"      hinge file: {hinge_file}")

            # --- Shear summaries ---
            shear_files = discover_shear_files(item_path)
            print(f"      shear summaries: {'✓' if shear_files else '✗ not found'}")
            if shear_files:
                sim_data["has_shear_data"] = True
                sim_data["shear_files"] = shear_files
                print(f"      shear H1 file: {shear_files['h1']}")
                print(f"      shear H2 file: {shear_files['h2']}")

            # --- BRB demand summaries ---
            brb_file = discover_brb_file(item_path)
            print(f"      BRB results: {'✓' if brb_file else '✗ not found'}")
            if brb_file:
                sim_data["has_brb_data"] = True
                sim_data["brb_file"] = brb_file
                print(f"      BRB file: {brb_file}")

            if sim_data["has_displacement"] or sim_data["has_velocity"] or sim_data["has_acceleration"] or sim_data["has_hinge_data"] or sim_data["has_shear_data"] or sim_data["has_brb_data"]:
                simulations.append(sim_data)
                print(f"    → Simulation ACCEPTED: {item}")
                print(
                    f"      Displacement: {sim_data['has_displacement']}, Velocity: {sim_data['has_velocity']}, "
                    + f"Acceleration: {sim_data['has_acceleration']}, Ground Motion: {sim_data['has_ground_motion']}, "
                    + f"Hinge: {sim_data['has_hinge_data']}, Shear: {sim_data['has_shear_data']}, BRB: {sim_data['has_brb_data']}"
                )
            else:
                print(f"    → Simulation REJECTED: {item} " + "(no displacement, velocity, acceleration, hinge, shear, or BRB data found)")

    print(f"\n  Found {len(simulations)} simulation(s) for {building_folder}")
    return simulations


# ---------------------------------------------------------------------------
# Grid-file helpers
# ---------------------------------------------------------------------------


def discover_grid_files(directory: str, prefix: str, has_rotation: bool) -> GridFilesResult:
    """
    Discover all grid-fragment files in a directory for a given component prefix.

    Grid files are named either:
    - ``<prefix>T_Grid_<id>.txt`` / ``<prefix>R_Grid_<id>.txt`` (rotation pattern)
    - ``<prefix>_Grid_<id>.txt`` (no-rotation pattern)

    Files are sorted by the ``<id>`` segment to ensure consistent ordering
    across calls.

    Parameters
    ----------
    directory : str
        Directory to search (e.g., the "Displacements/" folder).
    prefix : str
        Component prefix such as ``"D_H1"``, ``"V_H2"``, or ``"A_V"``.
    has_rotation : bool
        When True, expects the T/R suffix pattern and populates both
        ``"lin"`` and ``"rot"`` lists.  When False, only ``"lin"`` is
        populated and ``"rot"`` is None.

    Returns
    -------
    dict
        ``{"lin": [<path>, ...], "rot": [<path>, ...] or None}``
    """
    if not os.path.exists(directory):
        return {"lin": [], "rot": []}

    all_files = os.listdir(directory)

    if has_rotation:
        lin_pattern = re.compile(rf"^{re.escape(prefix)}T_Grid_(.+)\.txt$")
        rot_pattern = re.compile(rf"^{re.escape(prefix)}R_Grid_(.+)\.txt$")

        lin_files: list[tuple[str, str]] = []
        rot_files: list[tuple[str, str]] = []

        for f in all_files:
            lin_match = lin_pattern.match(f)
            if lin_match:
                lin_files.append((lin_match.group(1), os.path.join(directory, f)))

            rot_match = rot_pattern.match(f)
            if rot_match:
                rot_files.append((rot_match.group(1), os.path.join(directory, f)))

        lin_files.sort(key=lambda x: x[0])
        rot_files.sort(key=lambda x: x[0])

        return {"lin": [f[1] for f in lin_files], "rot": [f[1] for f in rot_files] if rot_files else None}
    else:
        pattern = re.compile(rf"^{re.escape(prefix)}_Grid_(.+)\.txt$")
        files: list[tuple[str, str]] = []

        for f in all_files:
            match = pattern.match(f)
            if match:
                files.append((match.group(1), os.path.join(directory, f)))

        files.sort(key=lambda x: x[0])

        return {"lin": [f[1] for f in files], "rot": None}


def detect_grid_rotation_pattern(directory: str, file_type: str = "D") -> bool:
    """
    Detect whether grid files in a directory use the rotation-suffix pattern.

    Looks for any file matching ``<file_type>_*T_Grid_*.txt``.  If one is
    found the files use the ``T``/``R`` suffix convention (translational /
    rotational); otherwise they use the plain ``_Grid_`` convention.

    Parameters
    ----------
    directory : str
        Path to the component sub-directory (e.g., "Displacements/").
    file_type : str
        Single-letter prefix character: ``"D"``, ``"V"``, or ``"A"``.

    Returns
    -------
    bool
        True when the rotation-suffix pattern is detected.
    """
    if not os.path.exists(directory):
        return False

    all_files = os.listdir(directory)
    rot_pattern = re.compile(rf"^{file_type}_.*T_Grid_.+\.txt$")

    for f in all_files:
        if rot_pattern.match(f):
            return True

    return False


# ---------------------------------------------------------------------------
# Simulation file resolver
# ---------------------------------------------------------------------------


def get_simulation_files(_building_folder: str, simulation: SimulationInfo) -> SimulationFilesConfig:
    """
    Resolve all concrete file paths for a simulation based on its detected pattern.

    Reads ``simulation["file_pattern"]`` ("Entire" or "Grid") and builds the
    appropriate path structures for displacement, velocity, acceleration,
    ground motion, hinge, shear, and BRB.

    For "Entire" files, each component key holds::

        {"lin": [h1_path, h2_path, v_path], "rot": [h1r_path, h2r_path, vr_path]}

    For "Grid" files, each component key holds::

        {"lin": [[h1_grid_files…], [h2_grid_files…], [v_grid_files…]],
         "rot": [[h1r_grid_files…], …] or None}

    Parameters
    ----------
    building_folder : str
        Folder name of the building under CSV_DIR.
    simulation : dict
        Simulation metadata dict as returned by ``discover_simulations``.

    Returns
    -------
    dict
        Keys: "displacement", "velocity", "acceleration", "ground_motion",
        "hinge", "shear", "brb".  Each value is either a path / dict of
        paths, or None when that type is not available.
    """
    files: SimulationFilesConfig = {
        "displacement": None,
        "velocity": None,
        "acceleration": None,
        "ground_motion": None,
        "hinge": None,
        "shear": None,
        "brb": None,
    }

    sim_path = simulation["path"]
    pattern = simulation.get("file_pattern", "Entire")

    print(f"\n    GETTING SIMULATION FILES for: {simulation['name']}")
    print(f"    Pattern: {pattern}")
    print(f"    Simulation path: {sim_path}")

    # --- Displacement ---
    if simulation["has_displacement"]:
        print(f"\n    Processing Displacement files:")
        disp_path = os.path.join(sim_path, "Displacements")
        if pattern == "Entire":
            print(f"    Using 'Entire' pattern")
            files["displacement"] = {
                "lin": [
                    os.path.join(disp_path, "D_H1T_Entire.txt"),
                    os.path.join(disp_path, "D_H2T_Entire.txt"),
                    os.path.join(disp_path, "D_VT_Entire.txt"),
                ],
                "rot": [
                    os.path.join(disp_path, "D_H1R_Entire.txt"),
                    os.path.join(disp_path, "D_H2R_Entire.txt"),
                    os.path.join(disp_path, "D_VR_Entire.txt"),
                ],
            }
            print(f"    Expected linear displacement files:")
            disp_files = files["displacement"]
            if disp_files and disp_files.get("lin"):
                for f in disp_files["lin"]:
                    exists = "✓" if isinstance(f, str) and os.path.exists(f) else "✗"
                    print(f"      {exists} {f}")
            print(f"    Expected rotation displacement files:")
            if disp_files:
                rot_files_local = disp_files.get("rot")
                if rot_files_local:
                    for f in rot_files_local:
                        exists = "✓" if isinstance(f, str) and os.path.exists(f) else "✗"
                        print(f"      {exists} {f}")
        elif pattern == "Grid":
            has_rotation = detect_grid_rotation_pattern(disp_path, "D")
            print(f"    Grid rotation pattern detected: {has_rotation}")

            if has_rotation:
                h1_files = discover_grid_files(disp_path, "D_H1", has_rotation=True)
                h2_files = discover_grid_files(disp_path, "D_H2", has_rotation=True)
                v_files = discover_grid_files(disp_path, "D_V", has_rotation=True)

                h1_rot = h1_files["rot"]
                h2_rot = h2_files["rot"]
                v_rot = v_files["rot"]
                files["displacement"] = {
                    "lin": [h1_files["lin"], h2_files["lin"], v_files["lin"]],
                    "rot": [h1_rot, h2_rot, v_rot],
                }

                print(f"    Discovered grid files:")
                print(f"      H1 linear: {len(h1_files['lin'])} file(s)")
                print(f"      H2 linear: {len(h2_files['lin'])} file(s)")
                print(f"      V linear: {len(v_files['lin'])} file(s)")
                if h1_rot and h2_rot and v_rot:
                    print(f"      H1 rotation: {len(h1_rot)} file(s)")
                    print(f"      H2 rotation: {len(h2_rot)} file(s)")
                    print(f"      V rotation: {len(v_rot)} file(s)")
            else:
                h1_files = discover_grid_files(disp_path, "D_H1", has_rotation=False)
                h2_files = discover_grid_files(disp_path, "D_H2", has_rotation=False)
                v_files = discover_grid_files(disp_path, "D_V", has_rotation=False)

                files["displacement"] = {
                    "lin": [h1_files["lin"], h2_files["lin"], v_files["lin"]],
                    "rot": None,
                }

                print(f"    Discovered grid files:")
                print(f"      H1: {len(h1_files['lin'])} file(s)")
                print(f"      H2: {len(h2_files['lin'])} file(s)")
                print(f"      V: {len(v_files['lin'])} file(s)")
                print(f"    Rotation files: None (Grid pattern has no rotation components)")

    # --- Velocity ---
    if simulation["has_velocity"]:
        print(f"\n    Processing Velocity files:")
        vel_path = os.path.join(sim_path, "Velocities")
        if pattern == "Entire":
            files["velocity"] = {
                "lin": [
                    os.path.join(vel_path, "V_H1T_Entire.txt"),
                    os.path.join(vel_path, "V_H2T_Entire.txt"),
                    os.path.join(vel_path, "V_VT_Entire.txt"),
                ],
                "rot": [
                    os.path.join(vel_path, "V_H1R_Entire.txt"),
                    os.path.join(vel_path, "V_H2R_Entire.txt"),
                    os.path.join(vel_path, "V_VR_Entire.txt"),
                ],
            }
            print(f"    Expected linear velocity files:")
            vel_files = files["velocity"]
            if vel_files and vel_files.get("lin"):
                for f in vel_files["lin"]:
                    exists = "✓" if isinstance(f, str) and os.path.exists(f) else "✗"
                    print(f"      {exists} {f}")
            print(f"    Expected rotation velocity files:")
            if vel_files:
                rot_files_local = vel_files.get("rot")
                if rot_files_local:
                    for f in rot_files_local:
                        exists = "✓" if isinstance(f, str) and os.path.exists(f) else "✗"
                        print(f"      {exists} {f}")
        elif pattern == "Grid":
            has_rotation = detect_grid_rotation_pattern(vel_path, "V")
            print(f"    Grid rotation pattern detected: {has_rotation}")

            if has_rotation:
                h1_files = discover_grid_files(vel_path, "V_H1", has_rotation=True)
                h2_files = discover_grid_files(vel_path, "V_H2", has_rotation=True)
                v_files = discover_grid_files(vel_path, "V_V", has_rotation=True)

                h1_rot = h1_files["rot"]
                h2_rot = h2_files["rot"]
                v_rot = v_files["rot"]
                files["velocity"] = {
                    "lin": [h1_files["lin"], h2_files["lin"], v_files["lin"]],
                    "rot": [h1_rot, h2_rot, v_rot],
                }

                print(f"    Discovered grid files:")
                print(f"      H1 linear: {len(h1_files['lin'])} file(s)")
                print(f"      H2 linear: {len(h2_files['lin'])} file(s)")
                print(f"      V linear: {len(v_files['lin'])} file(s)")
            else:
                h1_files = discover_grid_files(vel_path, "V_H1", has_rotation=False)
                h2_files = discover_grid_files(vel_path, "V_H2", has_rotation=False)
                v_files = discover_grid_files(vel_path, "V_V", has_rotation=False)

                files["velocity"] = {
                    "lin": [h1_files["lin"], h2_files["lin"], v_files["lin"]],
                    "rot": None,
                }

                print(f"    Discovered grid files:")
                print(f"      H1: {len(h1_files['lin'])} file(s)")
                print(f"      H2: {len(h2_files['lin'])} file(s)")
                print(f"      V: {len(v_files['lin'])} file(s)")

    # --- Acceleration ---
    if simulation["has_acceleration"]:
        print(f"\n    Processing Acceleration files:")
        acc_path = os.path.join(sim_path, "Accelerations")
        if pattern == "Entire":
            files["acceleration"] = {
                "lin": [
                    os.path.join(acc_path, "A_H1T_Entire.txt"),
                    os.path.join(acc_path, "A_H2T_Entire.txt"),
                    os.path.join(acc_path, "A_VT_Entire.txt"),
                ],
                "rot": [
                    os.path.join(acc_path, "A_H1R_Entire.txt"),
                    os.path.join(acc_path, "A_H2R_Entire.txt"),
                    os.path.join(acc_path, "A_VR_Entire.txt"),
                ],
            }
            print(f"    Expected linear acceleration files:")
            acc_files = files["acceleration"]
            if acc_files and acc_files.get("lin"):
                for f in acc_files["lin"]:
                    exists = "✓" if isinstance(f, str) and os.path.exists(f) else "✗"
                    print(f"      {exists} {f}")
            print(f"    Expected rotation acceleration files:")
            if acc_files:
                rot_files_local = acc_files.get("rot")
                if rot_files_local:
                    for f in rot_files_local:
                        exists = "✓" if isinstance(f, str) and os.path.exists(f) else "✗"
                        print(f"      {exists} {f}")
        elif pattern == "Grid":
            has_rotation = detect_grid_rotation_pattern(acc_path, "A")
            print(f"    Grid rotation pattern detected: {has_rotation}")

            if has_rotation:
                h1_files = discover_grid_files(acc_path, "A_H1", has_rotation=True)
                h2_files = discover_grid_files(acc_path, "A_H2", has_rotation=True)
                v_files = discover_grid_files(acc_path, "A_V", has_rotation=True)

                h1_rot = h1_files["rot"]
                h2_rot = h2_files["rot"]
                v_rot = v_files["rot"]

                files["acceleration"] = {
                    "lin": [h1_files["lin"], h2_files["lin"], v_files["lin"]],
                    "rot": [h1_rot, h2_rot, v_rot],
                }

                print(f"    Discovered grid files:")
                print(f"      H1 linear: {len(h1_files['lin'])} file(s)")
                print(f"      H2 linear: {len(h2_files['lin'])} file(s)")
                print(f"      V linear: {len(v_files['lin'])} file(s)")
            else:
                h1_files = discover_grid_files(acc_path, "A_H1", has_rotation=False)
                h2_files = discover_grid_files(acc_path, "A_H2", has_rotation=False)
                v_files = discover_grid_files(acc_path, "A_V", has_rotation=False)

                files["acceleration"] = {
                    "lin": [h1_files["lin"], h2_files["lin"], v_files["lin"]],
                    "rot": None,
                }

                print(f"    Discovered grid files:")
                print(f"      H1: {len(h1_files['lin'])} file(s)")
                print(f"      H2: {len(h2_files['lin'])} file(s)")
                print(f"      V: {len(v_files['lin'])} file(s)")

    # --- Ground motion ---
    if simulation["has_ground_motion"]:
        print(f"\n    Ground motion file:")
        gm_file = simulation.get("ground_motion_file")
        files["ground_motion"] = gm_file
        exists = "✓" if gm_file and os.path.exists(gm_file) else "✗"
        print(f"      {exists} {gm_file}")

    # --- Hinge ---
    if simulation.get("has_hinge_data"):
        print(f"\n    Hinge results file:")
        hinge_file = simulation.get("hinge_file")
        files["hinge"] = hinge_file
        exists = "✓" if hinge_file and os.path.exists(hinge_file) else "✗"
        print(f"      {exists} {hinge_file}")

    # --- Shear ---
    if simulation.get("has_shear_data"):
        print(f"\n    Shear summary files:")
        shear_files = simulation.get("shear_files")
        files["shear"] = shear_files
        if shear_files:
            for axis, path in shear_files.items():
                exists = "✓" if path and os.path.exists(path) else "✗"
                print(f"      {axis.upper()}: {exists} {path}")

    # --- BRB ---
    if simulation.get("has_brb_data"):
        print(f"\n    BRB results file:")
        brb_file = simulation.get("brb_file")
        files["brb"] = brb_file
        exists = "✓" if brb_file and os.path.exists(brb_file) else "✗"
        print(f"      {exists} {brb_file}")

    return files
