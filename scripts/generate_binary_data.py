import pandas as pd
import numpy as np
import json
import struct
import gzip
import re
import os
from pathlib import Path
from multiprocessing import Pool, cpu_count
from functools import partial
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- CONFIGURATION ---
# Get the directory where this script is located, then go up one level to project root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # Go up from scripts/ to project root
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
CSV_DIR = os.path.join(DATA_DIR, "csv")
BINARY_DIR = os.path.join(DATA_DIR, "binary")


def discover_buildings():
    """Discover all buildings that have node_data.csv"""
    buildings = []
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

            has_node = os.path.exists(node_data_file)
            has_height = os.path.exists(height_file)

            print(f"    node_data.csv: {'✓' if has_node else '✗'} ({node_data_file})")
            print(f"    building_height.csv: {'✓' if has_height else '✗'} ({height_file})")

            if has_node and has_height:
                # Convert folder name to proper case for output (e.g., "15story" -> "15Story")
                building_name = building_folder.capitalize() if building_folder.islower() else building_folder
                buildings.append({"folder": building_folder, "name": building_name, "node_data": node_data_file, "height": height_file})
                print(f"    → Building ACCEPTED: {building_name}")
            else:
                missing = []
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


def discover_simulations(building_folder):
    """Discover all simulations for a building (subdirectories with data files)"""
    simulations = []
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
            # Check if this is a simulation folder (has data files)
            sim_data = {
                "name": item,
                "path": item_path,
                "has_displacement": False,
                "has_velocity": False,
                "has_acceleration": False,
                "has_ground_motion": False,
                "file_pattern": None,  # "Entire" or "Grid"
            }

            # Check for displacement files
            disp_path = os.path.join(item_path, "Displacements")
            print(f"      Displacements folder: {'✓ exists' if os.path.exists(disp_path) else '✗ not found'}")
            if os.path.exists(disp_path):
                txt_files = [f for f in os.listdir(disp_path) if f.endswith(".txt")]
                print(f"      .txt files in Displacements: {len(txt_files)}")
                if txt_files:
                    print(f"      First displacement file: {txt_files[0]}")
                    sim_data["has_displacement"] = True
                    # Detect file pattern from first file
                    if "Entire" in txt_files[0]:
                        sim_data["file_pattern"] = "Entire"
                        print(f"      → Pattern detected: Entire")
                    elif "Grid" in txt_files[0]:
                        sim_data["file_pattern"] = "Grid"
                        print(f"      → Pattern detected: Grid")
                    else:
                        print(f"      ⚠ Unknown file pattern (expected 'Entire' or 'Grid' in filename)")

            # Check for velocity files
            vel_path = os.path.join(item_path, "Velocities")
            print(f"      Velocities folder: {'✓ exists' if os.path.exists(vel_path) else '✗ not found'}")
            if os.path.exists(vel_path):
                txt_files = [f for f in os.listdir(vel_path) if f.endswith(".txt")]
                print(f"      .txt files in Velocities: {len(txt_files)}")
                if txt_files:
                    sim_data["has_velocity"] = True
                    print(f"      First velocity file: {txt_files[0]}")

            # Check for acceleration files
            acc_path = os.path.join(item_path, "Accelerations")
            print(f"      Accelerations folder: {'✓ exists' if os.path.exists(acc_path) else '✗ not found'}")
            if os.path.exists(acc_path):
                txt_files = [f for f in os.listdir(acc_path) if f.endswith(".txt")]
                print(f"      .txt files in Accelerations: {len(txt_files)}")
                if txt_files:
                    sim_data["has_acceleration"] = True
                    print(f"      First acceleration file: {txt_files[0]}")

            # Check for ground motion
            gm_file = os.path.join(item_path, "ground_motion.txt")
            print(f"      ground_motion.txt: {'✓' if os.path.exists(gm_file) else '✗ not found'}")
            if os.path.exists(gm_file):
                sim_data["has_ground_motion"] = True
                sim_data["ground_motion_file"] = gm_file

            # Only add if it has at least some data
            if sim_data["has_displacement"] or sim_data["has_velocity"] or sim_data["has_acceleration"]:
                simulations.append(sim_data)
                print(f"    → Simulation ACCEPTED: {item}")
                print(
                    f"      Displacement: {sim_data['has_displacement']}, Velocity: {sim_data['has_velocity']}, Acceleration: {sim_data['has_acceleration']}, Ground Motion: {sim_data['has_ground_motion']}"
                )
            else:
                print(f"    → Simulation REJECTED: {item} (no displacement, velocity, or acceleration data found)")

    print(f"\n  Found {len(simulations)} simulation(s) for {building_folder}")
    return simulations


def discover_grid_files(directory, prefix, has_rotation):
    """
    Discover all grid files in a directory for a given prefix.

    Args:
        directory: Path to search for files
        prefix: File prefix (e.g., "D_H1", "V_H2", "A_V")
        has_rotation: Whether rotation files exist (T/R suffix pattern)

    Returns:
        Dictionary with 'lin' and 'rot' keys containing lists of file paths
    """
    if not os.path.exists(directory):
        return {"lin": [], "rot": []}

    all_files = os.listdir(directory)

    if has_rotation:
        # Pattern: prefixT_Grid_*.txt (linear) or prefixR_Grid_*.txt (rotation)
        lin_pattern = re.compile(rf"^{re.escape(prefix)}T_Grid_(.+)\.txt$")
        rot_pattern = re.compile(rf"^{re.escape(prefix)}R_Grid_(.+)\.txt$")

        lin_files = []
        rot_files = []

        for f in all_files:
            lin_match = lin_pattern.match(f)
            if lin_match:
                lin_files.append((lin_match.group(1), os.path.join(directory, f)))

            rot_match = rot_pattern.match(f)
            if rot_match:
                rot_files.append((rot_match.group(1), os.path.join(directory, f)))

        # Sort by grid identifier to ensure consistent ordering
        lin_files.sort(key=lambda x: x[0])
        rot_files.sort(key=lambda x: x[0])

        return {"lin": [f[1] for f in lin_files], "rot": [f[1] for f in rot_files] if rot_files else None}
    else:
        # Pattern: prefix_Grid_*.txt (no rotation)
        pattern = re.compile(rf"^{re.escape(prefix)}_Grid_(.+)\.txt$")
        files = []

        for f in all_files:
            match = pattern.match(f)
            if match:
                files.append((match.group(1), os.path.join(directory, f)))

        # Sort by grid identifier
        files.sort(key=lambda x: x[0])

        return {"lin": [f[1] for f in files], "rot": None}


def detect_grid_rotation_pattern(directory, file_type="D"):
    """
    Detect if grid files in directory use rotation suffix pattern (T/R).

    Args:
        directory: Path to check
        file_type: Type prefix (D, V, or A)

    Returns:
        True if rotation pattern detected (e.g., D_H1T_Grid_6.txt), False otherwise
    """
    if not os.path.exists(directory):
        return False

    all_files = os.listdir(directory)

    # Check for pattern with T/R suffix: D_H1T_Grid_*.txt
    rot_pattern = re.compile(rf"^{file_type}_.*T_Grid_.+\.txt$")

    for f in all_files:
        if rot_pattern.match(f):
            return True

    return False


def merge_grid_data(file_list, id_to_index):
    """
    Merge data from multiple grid files into a single unified array.

    Grid files contain fragments of the full node set. This function loads
    all grid files and merges them into a single array aligned by node index.

    Args:
        file_list: List of file paths to grid files
        id_to_index: Mapping from node ID to node index

    Returns:
        Tuple of (merged_data_array, merged_column_map)
    """
    if not file_list:
        return None, {}

    print(f"    Merging {len(file_list)} grid file(s)...")

    # Load all grid files and collect their column mappings
    all_col_maps = []
    all_data = []
    num_frames = None

    for i, filepath in enumerate(file_list):
        print(f"      Loading grid file {i+1}/{len(file_list)}: {os.path.basename(filepath)}")
        col_map, start_row = parse_ladwp_header(filepath)

        # Load data
        df = pd.read_csv(filepath, skiprows=start_row, header=None)

        # Remove footer rows if present
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
    merged_col_map = {}
    for col_map in all_col_maps:
        merged_col_map.update(col_map)

    print(f"    Total unique nodes across all grids: {len(merged_col_map)}")

    # Create merged data array
    num_nodes = len(id_to_index)
    if num_frames is None:
        num_frames = 0
    merged_data = np.zeros((num_frames, num_nodes), dtype=np.float32)

    # Fill in data from each grid file
    for col_map, data in zip(all_col_maps, all_data):
        for col_idx, node_id in col_map.items():
            if node_id in id_to_index:
                node_idx = id_to_index[node_id]
                merged_data[:, node_idx] = data[:, col_idx]

    return merged_data, merged_col_map


def get_simulation_files(building_folder, simulation):
    """Get file paths for a simulation based on detected pattern"""
    files: dict = {"displacement": None, "velocity": None, "acceleration": None, "ground_motion": None}

    sim_path = simulation["path"]
    pattern = simulation.get("file_pattern", "Entire")

    print(f"\n    GETTING SIMULATION FILES for: {simulation['name']}")
    print(f"    Pattern: {pattern}")
    print(f"    Simulation path: {sim_path}")

    # Displacement files
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
            # Log expected files
            print(f"    Expected linear displacement files:")
            if files["displacement"] and files["displacement"].get("lin"):
                for f in files["displacement"]["lin"]:
                    exists = "✓" if os.path.exists(f) else "✗"
                    print(f"      {exists} {f}")
            print(f"    Expected rotation displacement files:")
            if files["displacement"] and files["displacement"].get("rot"):
                for f in files["displacement"]["rot"]:
                    exists = "✓" if os.path.exists(f) else "✗"
                    print(f"      {exists} {f}")
        elif pattern == "Grid":
            # Detect rotation pattern (with T/R suffixes)
            has_rotation = detect_grid_rotation_pattern(disp_path, "D")
            print(f"    Grid rotation pattern detected: {has_rotation}")

            if has_rotation:
                # Pattern: D_H1T_Grid_*.txt, D_H1R_Grid_*.txt, etc.
                h1_files = discover_grid_files(disp_path, "D_H1", has_rotation=True)
                h2_files = discover_grid_files(disp_path, "D_H2", has_rotation=True)
                v_files = discover_grid_files(disp_path, "D_V", has_rotation=True)

                files["displacement"] = {
                    "lin": [h1_files["lin"], h2_files["lin"], v_files["lin"]],
                    "rot": [h1_files["rot"], h2_files["rot"], v_files["rot"]],
                }

                print(f"    Discovered grid files:")
                print(f"      H1 linear: {len(h1_files['lin'])} file(s)")
                print(f"      H2 linear: {len(h2_files['lin'])} file(s)")
                print(f"      V linear: {len(v_files['lin'])} file(s)")
                if h1_files["rot"]:
                    print(f"      H1 rotation: {len(h1_files['rot'])} file(s)")
                    print(f"      H2 rotation: {len(h2_files['rot'])} file(s)")
                    print(f"      V rotation: {len(v_files['rot'])} file(s)")
            else:
                # Pattern: D_H1_Grid_*.txt, D_H2_Grid_*.txt, etc. (no rotation)
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

    # Velocity files
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
            if files["velocity"] and files["velocity"].get("lin"):
                for f in files["velocity"]["lin"]:
                    exists = "✓" if os.path.exists(f) else "✗"
                    print(f"      {exists} {f}")
            print(f"    Expected rotation velocity files:")
            if files["velocity"] and files["velocity"].get("rot"):
                for f in files["velocity"]["rot"]:
                    exists = "✓" if os.path.exists(f) else "✗"
                    print(f"      {exists} {f}")
        elif pattern == "Grid":
            # Detect rotation pattern
            has_rotation = detect_grid_rotation_pattern(vel_path, "V")
            print(f"    Grid rotation pattern detected: {has_rotation}")

            if has_rotation:
                h1_files = discover_grid_files(vel_path, "V_H1", has_rotation=True)
                h2_files = discover_grid_files(vel_path, "V_H2", has_rotation=True)
                v_files = discover_grid_files(vel_path, "V_V", has_rotation=True)

                files["velocity"] = {
                    "lin": [h1_files["lin"], h2_files["lin"], v_files["lin"]],
                    "rot": [h1_files["rot"], h2_files["rot"], v_files["rot"]],
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

    # Acceleration files
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
            if files["acceleration"] and files["acceleration"].get("lin"):
                for f in files["acceleration"]["lin"]:
                    exists = "✓" if os.path.exists(f) else "✗"
                    print(f"      {exists} {f}")
            print(f"    Expected rotation acceleration files:")
            if files["acceleration"] and files["acceleration"].get("rot"):
                for f in files["acceleration"]["rot"]:
                    exists = "✓" if os.path.exists(f) else "✗"
                    print(f"      {exists} {f}")
        elif pattern == "Grid":
            # Detect rotation pattern
            has_rotation = detect_grid_rotation_pattern(acc_path, "A")
            print(f"    Grid rotation pattern detected: {has_rotation}")

            if has_rotation:
                h1_files = discover_grid_files(acc_path, "A_H1", has_rotation=True)
                h2_files = discover_grid_files(acc_path, "A_H2", has_rotation=True)
                v_files = discover_grid_files(acc_path, "A_V", has_rotation=True)

                files["acceleration"] = {
                    "lin": [h1_files["lin"], h2_files["lin"], v_files["lin"]],
                    "rot": [h1_files["rot"], h2_files["rot"], v_files["rot"]],
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

    # Ground motion
    if simulation["has_ground_motion"]:
        print(f"\n    Ground motion file:")
        gm_file = simulation.get("ground_motion_file")
        files["ground_motion"] = gm_file
        exists = "✓" if os.path.exists(gm_file) else "✗"
        print(f"      {exists} {gm_file}")

    return files


# --- HELPERS ---


def write_bld_file(filename, header, binary_data, output_dir):
    """Writes JSON Header + Binary Body to GZIP."""
    header_str = json.dumps(header)
    header_bytes = header_str.encode("utf-8")

    # Calculate current position after writing 4-byte length + header bytes
    current_pos = 4 + len(header_bytes)

    padding_len = (4 - (current_pos % 4)) % 4
    padding_bytes = b" " * padding_len

    out_path = os.path.join(output_dir, filename)
    print(f"Writing {out_path} (Header: {len(header_bytes)}b, Pad: {padding_len}b)...")

    with gzip.open(out_path, "wb") as f:
        # 1. Header Length (4 bytes)
        f.write(struct.pack("<I", len(header_bytes)))  # type: ignore
        # 2. JSON Header
        f.write(header_bytes)  # type: ignore
        # 3. Padding (Alignment)
        f.write(padding_bytes)  # type: ignore
        # 4. Binary Body
        f.write(binary_data)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"-> Saved. Size: {size_kb:.2f} KB")


def parse_ladwp_header(filepath):
    """Extracts column-to-node mapping from LADWP text files."""
    col_map = {}  # CSV Column Index -> Node ID
    start_row = 0
    with open(filepath, "r") as f:
        for i, line in enumerate(f):
            if "Column" in line and "= node" in line:
                # Regex: Column, 2, = node, 1
                m = re.search(r"Column,\s*(\d+),\s*=\s*node,\s*(\d+)", line)
                if m:
                    # CSV Col 2 is Index 1 in 0-based array
                    col_map[int(m.group(1)) - 1] = int(m.group(2))
            if re.match(r"^\s*[\d.-]+,", line):
                start_row = i
                break
    return col_map, start_row


def load_ladwp_data(filepath, col_map, num_frames_expected=None):
    """Loads a single component file into a structured array."""
    _, start_row = parse_ladwp_header(filepath)
    # Read CSV, skipping footer (Min/Max rows)
    df = pd.read_csv(filepath, skiprows=start_row, header=None)

    # Simple footer check
    if isinstance(df.iloc[-1, 0], str):
        df = df.iloc[:-2]  # Remove Max/Min rows

    vals = df.values.astype(np.float32)

    if num_frames_expected and len(vals) != num_frames_expected:
        print(f"Warning: Frame count mismatch in {filepath}")

    return vals, col_map


# --- PROCESSORS ---


def process_building(building):
    """Process building data and return node mapping"""
    building_name = building["name"]
    building_output_dir = os.path.join(BINARY_DIR, building_name)

    print(f"\n{'='*60}")
    print(f"Processing Building: {building_name}")
    print(f"{'='*60}")

    if not os.path.exists(building_output_dir):
        os.makedirs(building_output_dir)

    # 1. Load Nodes
    df_nodes = pd.read_csv(building["node_data"])
    unique_ids = df_nodes["Node ID"].unique()
    id_to_index = {uid: i for i, uid in enumerate(unique_ids)}
    index_to_id = {i: uid for i, uid in enumerate(unique_ids)}
    count_nodes = len(unique_ids)

    # 2. Prepare Binary Buffer (Only XYZ)
    buffer = np.zeros(count_nodes * 3, dtype=np.float32)
    for _, row in df_nodes.iterrows():
        idx = id_to_index.get(row["Node ID"])
        if idx is not None:
            buffer[idx * 3 + 0] = row["H1"]
            buffer[idx * 3 + 1] = row["H2"]
            buffer[idx * 3 + 2] = row["V"]

    # 3. Load Stories & Corners
    df_height = pd.read_csv(building["height"])

    storiesElevations = {}
    for i, row in df_height.iterrows():
        story = row["Story level"]

        elevation = row["Story Height (ft)"]
        for j, row2 in df_height[i:].iterrows():
            if i == j:
                continue
            elevation += row2["Story Height (ft)"]

        storiesElevations[story] = elevation * 12

    stories = {}
    storiesCorners = {}

    min_x = df_nodes["H1"].min()
    min_y = df_nodes["H2"].min()
    min_v = df_nodes["V"].min()

    for _, row in df_nodes.iterrows():
        nid = row["Node ID"]
        idx = id_to_index.get(nid)
        if idx is not None:
            x, y, z = row["H1"] - min_x, row["H2"] - min_y, row["V"] - min_v

            # Find story elevation closest to node
            stidx = list(storiesElevations.values()).index(z) if z in list(storiesElevations.values()) else None
            if stidx == None:
                continue
            story = list(storiesElevations.keys())[stidx]
            if story not in stories:
                stories[story] = []
            stories[story].append(idx)

    # Now find corners for each story based on all nodes at that elevation
    for story, node_indices in stories.items():
        # Get all coordinates for nodes at this story
        story_nodes = df_nodes[df_nodes["Node ID"].isin([index_to_id[idx] for idx in node_indices])]

        xs = story_nodes["H1"].values - min_x
        ys = story_nodes["H2"].values - min_y

        # Find the bounding box
        max_x, min_x_story = xs.max(), xs.min()
        max_y, min_y_story = ys.max(), ys.min()

        # Define ideal corner positions
        ideal_corners = {
            "NW": (min_x_story, max_y),
            "NE": (max_x, max_y),
            "SW": (min_x_story, min_y_story),
            "SE": (max_x, min_y_story),
        }

        corners = {}
        for corner_name, (ideal_x, ideal_y) in ideal_corners.items():
            # Find node closest to this ideal corner
            distances = np.sqrt((xs - ideal_x) ** 2 + (ys - ideal_y) ** 2)
            closest_idx = distances.argmin()

            corners[corner_name] = {
                "index": node_indices[closest_idx],
                "x": xs[closest_idx],
                "y": ys[closest_idx],
            }

        storiesCorners[story] = corners

    corners = {
        "NW": [],
        "NE": [],
        "SW": [],
        "SE": [],
    }

    for story, storyCorners in storiesCorners.items():
        for corner, cornerData in storyCorners.items():
            corners[corner].append(cornerData["index"])

    storyHeights = {}
    for i, row in df_height.iterrows():
        story = row["Story level"]
        storyHeights[story] = row["Story Height (ft)"] * 12

    storyOrder = list(stories.keys())
    storyOrder.reverse()
    print(f"Story order: {storyOrder}")

    # 4. Write
    header = {"count_nodes": count_nodes, "stories": stories, "corners": corners, "story_heights": storyHeights, "story_order": storyOrder}

    write_bld_file("building.bld", header, buffer.tobytes(), building_output_dir)

    return id_to_index, building_output_dir


def process_response_file(file_key, type_name, id_to_index, files_config, simulation_output_dir):
    """
    Generic processor for Displacement, Velocity, Acceleration.
    Splits data into separate _lin.bld and _rot.bld files (stride 3 each).
    Supports both 'Entire' files and merged 'Grid' files.
    """
    print(f"\n{'='*70}")
    print(f"PROCESSING RESPONSE FILE: {type_name}")
    print(f"{'='*70}")

    file_list = files_config.get(file_key)
    if not file_list:
        print(f"❌ Skipping {type_name}: Files not available in files_config.")
        print(f"   files_config keys: {list(files_config.keys())}")
        return

    # Check if files exist
    lin_files = file_list.get("lin", [])
    rot_files = file_list.get("rot", [])

    print(f"Configuration:")
    print(f"  Linear files: {len(lin_files)} component(s)")
    print(f"  Rotation files: {'Yes' if rot_files is not None else 'No'}")

    # Check if we're dealing with grid files (lists of lists) or entire files (single list)
    is_grid_format = lin_files and isinstance(lin_files[0], list)

    if is_grid_format:
        print(f"  Format: Grid (merged from multiple files)")
        # lin_files is a list of lists: [[h1_grid_files], [h2_grid_files], [v_grid_files]]
        h1_grid_files = lin_files[0] if len(lin_files) > 0 else []
        h2_grid_files = lin_files[1] if len(lin_files) > 1 else []
        v_grid_files = lin_files[2] if len(lin_files) > 2 else []

        # Verify grid files exist
        print(f"\nVerifying grid files:")
        all_grid_files = h1_grid_files + h2_grid_files + v_grid_files
        for f in all_grid_files:
            if not os.path.exists(f):
                print(f"❌ Skipping {type_name}: Grid file not found: {f}")
                return
        print(f"  ✓ All {len(all_grid_files)} grid file(s) verified")

        # Merge grid data for each component
        print(f"\n--- Loading and Merging Grid Data ---")
        print(f"Merging H1 component from {len(h1_grid_files)} grid file(s)...")
        d_lx, col_map_x = merge_grid_data(h1_grid_files, id_to_index)

        print(f"Merging H2 component from {len(h2_grid_files)} grid file(s)...")
        d_ly, _ = merge_grid_data(h2_grid_files, id_to_index)

        print(f"Merging V component from {len(v_grid_files)} grid file(s)...")
        d_lz, _ = merge_grid_data(v_grid_files, id_to_index)

        if d_lx is None or d_ly is None or d_lz is None:
            print(f"❌ Skipping {type_name}: Failed to merge grid data")
            return

        num_frames = len(d_lx)
        num_nodes = len(id_to_index)

        # Load Rotational Data if available (also grid format)
        has_rotation = rot_files is not None and len(rot_files) > 0 and isinstance(rot_files[0], list)
        if has_rotation:
            h1_rot_files = rot_files[0] if len(rot_files) > 0 else []
            h2_rot_files = rot_files[1] if len(rot_files) > 1 else []
            v_rot_files = rot_files[2] if len(rot_files) > 2 else []

            print(f"\nMerging rotation data:")
            print(f"  H1 rotation from {len(h1_rot_files)} grid file(s)...")
            d_rx, _ = merge_grid_data(h1_rot_files, id_to_index)
            print(f"  H2 rotation from {len(h2_rot_files)} grid file(s)...")
            d_ry, _ = merge_grid_data(h2_rot_files, id_to_index)
            print(f"  V rotation from {len(v_rot_files)} grid file(s)...")
            d_rz, _ = merge_grid_data(v_rot_files, id_to_index)

            if d_rx is None or d_ry is None or d_rz is None:
                print(f"  ⚠ Rotation data incomplete, will create empty rotation data")
                has_rotation = False
                d_rx = np.zeros((num_frames, num_nodes), dtype=np.float32)
                d_ry = np.zeros((num_frames, num_nodes), dtype=np.float32)
                d_rz = np.zeros((num_frames, num_nodes), dtype=np.float32)
        else:
            has_rotation = False
            d_rx = np.zeros((num_frames, num_nodes), dtype=np.float32)
            d_ry = np.zeros((num_frames, num_nodes), dtype=np.float32)
            d_rz = np.zeros((num_frames, num_nodes), dtype=np.float32)

        # Use merged data directly (already aligned by node index)
        aligned_lx = d_lx
        aligned_ly = d_ly
        aligned_lz = d_lz
        aligned_rx = d_rx
        aligned_ry = d_ry
        aligned_rz = d_rz

    else:
        print(f"  Format: Entire (single file per component)")
        # Original 'Entire' format - single files
        # Verify linear files exist
        print(f"\nVerifying linear files:")
        for f in lin_files:
            exists = "✓" if os.path.exists(f) else "✗"
            print(f"  {exists} {f}")
            if not os.path.exists(f):
                print(f"❌ Skipping {type_name}: File not found: {f}")
                return

        # Check if rotation files exist
        has_rotation = rot_files is not None
        if has_rotation:
            print(f"\nVerifying rotation files:")
            for f in rot_files:
                exists = "✓" if os.path.exists(f) else "✗"
                print(f"  {exists} {f}")
                if not os.path.exists(f):
                    has_rotation = False
                    print(f"  ⚠ Rotation file missing, will create empty rotation data")
                    break

        print(f"\nProcessing configuration:")
        print(f"  Has rotation data: {has_rotation}")

        print(f"\n--- Loading {type_name} Data ---")

        # Files
        f_lx, f_ly, f_lz = lin_files[0], lin_files[1], lin_files[2]

        # 1. Parse Header Map (Assume X file governs)
        col_map_x, _ = parse_ladwp_header(f_lx)

        # 2. Load Linear Data
        print(f"Loading Linear Data...")
        d_lx, _ = load_ladwp_data(f_lx, col_map_x)
        d_ly, _ = load_ladwp_data(f_ly, col_map_x)
        d_lz, _ = load_ladwp_data(f_lz, col_map_x)

        # Load Rotational Data if available
        if has_rotation:
            print(f"Loading Rotational Data...")
            f_rx, f_ry, f_rz = rot_files[0], rot_files[1], rot_files[2]
            d_rx, _ = load_ladwp_data(f_rx, col_map_x)
            d_ry, _ = load_ladwp_data(f_ry, col_map_x)
            d_rz, _ = load_ladwp_data(f_rz, col_map_x)
        else:
            # Create empty arrays for rotation
            d_rx = np.zeros_like(d_lx)
            d_ry = np.zeros_like(d_lx)
            d_rz = np.zeros_like(d_lx)

        num_frames = len(d_lx)
        num_nodes = len(id_to_index)

        # 3. Interleave Data
        print("Interleaving data...")

        # Pre-calculate column indices for every node index 0..N
        csv_cols = [-1] * num_nodes
        for col, nid in col_map_x.items():
            if nid in id_to_index:
                csv_cols[id_to_index[nid]] = col

        # Create temp arrays aligned to Node Index 0..N
        aligned_lx = np.zeros((num_frames, num_nodes), dtype=np.float32)
        aligned_ly = np.zeros((num_frames, num_nodes), dtype=np.float32)
        aligned_lz = np.zeros((num_frames, num_nodes), dtype=np.float32)
        aligned_rx = np.zeros((num_frames, num_nodes), dtype=np.float32)
        aligned_ry = np.zeros((num_frames, num_nodes), dtype=np.float32)
        aligned_rz = np.zeros((num_frames, num_nodes), dtype=np.float32)

        for n_idx, c_idx in enumerate(csv_cols):
            if c_idx != -1:
                aligned_lx[:, n_idx] = d_lx[:, c_idx]
                aligned_ly[:, n_idx] = d_ly[:, c_idx]
                aligned_lz[:, n_idx] = d_lz[:, c_idx]
                aligned_rx[:, n_idx] = d_rx[:, c_idx]
                aligned_ry[:, n_idx] = d_ry[:, c_idx]
                aligned_rz[:, n_idx] = d_rz[:, c_idx]

    # Stack linear components: (Frames, Nodes, 3)
    stacked_lin = np.stack([aligned_lx, aligned_ly, aligned_lz], axis=2)
    buffer_lin = stacked_lin.flatten()

    # Write linear file (always written, stride 3)
    header_lin = {"type": f"{type_name}_lin", "count_frames": num_frames, "count_nodes": num_nodes, "dt": 0.01}
    write_bld_file(f"{file_key}_lin.bld", header_lin, buffer_lin.tobytes(), simulation_output_dir)

    # Write rotation file if rotation data exists
    if has_rotation:
        stacked_rot = np.stack([aligned_rx, aligned_ry, aligned_rz], axis=2)
        buffer_rot = stacked_rot.flatten()
        header_rot = {"type": f"{type_name}_rot", "count_frames": num_frames, "count_nodes": num_nodes, "dt": 0.01}
        write_bld_file(f"{file_key}_rot.bld", header_rot, buffer_rot.tobytes(), simulation_output_dir)


def process_ground_motion(files_config, simulation_output_dir):
    print("\n--- Processing Ground Motion ---")
    motion_file = files_config.get("ground_motion")

    if not motion_file or not os.path.exists(motion_file):
        print("Ground Motion files not found, skipping.")
        return

    # Load 3 components (assuming headerless or simple CSV)
    motion = pd.read_csv(motion_file, header=None, sep=r"\s+")

    num_frames = len(motion)

    # Interleave [x, y, z, x, y, z...]
    buffer = np.zeros(num_frames * 3, dtype=np.float32)
    buffer[0::3] = motion.iloc[:, 1]
    buffer[1::3] = motion.iloc[:, 2]
    buffer[2::3] = motion.iloc[:, 3]

    header = {"count_frames": num_frames, "dt": 0.01}

    write_bld_file("ground_motion.bld", header, buffer.tobytes(), simulation_output_dir)


def process_simulation_response_type(args):
    """Process a single response type for a simulation (for parallel execution)"""
    file_key, type_name, id_to_index, files_config, simulation_output_dir = args
    try:
        process_response_file(file_key, type_name, id_to_index, files_config, simulation_output_dir)
        return (type_name, "success", None)
    except Exception as e:
        return (type_name, "error", e)


def process_simulation_parallel(building, simulation, id_to_index, building_output_dir, max_workers=3):
    """Process a single simulation with parallel response type processing"""
    simulation_name = simulation["name"]
    simulation_output_dir = os.path.join(building_output_dir, simulation_name)

    print(f"\n{'-'*60}")
    print(f"Processing Simulation: {simulation_name}")
    print(f"Pattern: {simulation.get('file_pattern', 'Unknown')}")
    print(f"Displacement: {simulation['has_displacement']}, Velocity: {simulation['has_velocity']}, Acceleration: {simulation['has_acceleration']}")
    print(f"{'-'*60}")

    if not os.path.exists(simulation_output_dir):
        os.makedirs(simulation_output_dir)

    # Get file paths for this simulation
    files_config = get_simulation_files(building["folder"], simulation)

    # Build list of tasks for parallel processing
    tasks = []
    if simulation["has_displacement"]:
        tasks.append(("displacement", "displacement", id_to_index, files_config, simulation_output_dir))
    if simulation["has_velocity"]:
        tasks.append(("velocity", "velocity", id_to_index, files_config, simulation_output_dir))
    if simulation["has_acceleration"]:
        tasks.append(("acceleration", "acceleration", id_to_index, files_config, simulation_output_dir))

    # Process response files in parallel using threads (I/O bound + shared memory)
    if tasks:
        with ThreadPoolExecutor(max_workers=min(len(tasks), max_workers)) as executor:
            futures = [executor.submit(process_simulation_response_type, task) for task in tasks]
            for future in as_completed(futures):
                type_name, status, error = future.result()
                if status == "error":
                    print(f"Error processing {type_name}: {error}")

    # Process ground motion (single threaded, usually fast)
    if simulation["has_ground_motion"]:
        process_ground_motion(files_config, simulation_output_dir)


def process_simulation(building, simulation, id_to_index, building_output_dir):
    """Process a single simulation for a building (sequential version)"""
    simulation_name = simulation["name"]
    simulation_output_dir = os.path.join(building_output_dir, simulation_name)

    print(f"\n{'-'*60}")
    print(f"Processing Simulation: {simulation_name}")
    print(f"Pattern: {simulation.get('file_pattern', 'Unknown')}")
    print(f"Displacement: {simulation['has_displacement']}, Velocity: {simulation['has_velocity']}, Acceleration: {simulation['has_acceleration']}")
    print(f"{'-'*60}")

    if not os.path.exists(simulation_output_dir):
        os.makedirs(simulation_output_dir)

    # Get file paths for this simulation
    files_config = get_simulation_files(building["folder"], simulation)

    # Process response files
    if simulation["has_displacement"]:
        process_response_file("displacement", "displacement", id_to_index, files_config, simulation_output_dir)

    if simulation["has_velocity"]:
        process_response_file("velocity", "velocity", id_to_index, files_config, simulation_output_dir)

    if simulation["has_acceleration"]:
        process_response_file("acceleration", "acceleration", id_to_index, files_config, simulation_output_dir)

    # Process ground motion
    if simulation["has_ground_motion"]:
        process_ground_motion(files_config, simulation_output_dir)


def process_complete_building(building):
    """Process a complete building with all its simulations (for multiprocessing)"""
    try:
        building_name = building["name"]

        # Discover simulations for this building
        simulations = discover_simulations(building["folder"])

        if not simulations:
            return (building_name, "skipped", "no simulations found")

        # Process building (creates building.bld)
        id_to_index, building_output_dir = process_building(building)

        # Process each simulation (can also be parallelized per simulation)
        for simulation in simulations:
            process_simulation_parallel(building, simulation, id_to_index, building_output_dir)

        return (building_name, "success", f"processed {len(simulations)} simulation(s)")
    except Exception as e:
        return (building["name"], "error", e)


# --- MAIN ---
if __name__ == "__main__":
    import time

    start_time = time.time()

    print("=" * 70)
    print("BINARY DATA GENERATION SCRIPT")
    print("=" * 70)
    print(f"Configuration:")
    print(f"  CSV_DIR: {CSV_DIR}")
    print(f"  BINARY_DIR: {BINARY_DIR}")
    print(f"  Expected file patterns:")
    print(f"    - Displacement: D_H1T_Entire.txt, D_H2T_Entire.txt, D_VT_Entire.txt (linear)")
    print(f"    - Displacement: D_H1R_Entire.txt, D_H2R_Entire.txt, D_VR_Entire.txt (rotation)")
    print(f"    - Velocity: V_H1T_Entire.txt, V_H2T_Entire.txt, V_VT_Entire.txt (linear)")
    print(f"    - Velocity: V_H1R_Entire.txt, V_H2R_Entire.txt, V_VR_Entire.txt (rotation)")
    print(f"    - Acceleration: A_H1T_Entire.txt, A_H2T_Entire.txt, A_VT_Entire.txt (linear)")
    print(f"    - Acceleration: A_H1R_Entire.txt, A_H2R_Entire.txt, A_VR_Entire.txt (rotation)")
    print(f"    - Ground Motion: ground_motion.txt")
    print(f"=" * 70)

    # Discover all buildings
    buildings = discover_buildings()
    print(f"Found {len(buildings)} building(s): {[b['name'] for b in buildings]}")

    if not buildings:
        print("No buildings found. Exiting.")
        exit(1)

    # Determine number of worker processes
    num_workers = min(len(buildings), cpu_count())
    print(f"Processing with {num_workers} parallel worker(s)...")

    # Process buildings in parallel
    with Pool(processes=num_workers) as pool:
        results = pool.map(process_complete_building, buildings)

    # Report results
    print("\n" + "=" * 60)
    print("Processing Results:")
    print("=" * 60)
    for building_name, status, message in results:
        print(f"  {building_name}: {status} - {message}")

    elapsed_time = time.time() - start_time
    print("=" * 60)
    print(f"Batch processing complete! Total time: {elapsed_time:.2f}s")
    print("=" * 60)
