import pandas as pd
import numpy as np
import json
import struct
import gzip
import re
import os
import argparse
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

# Global arguments (set by argparse)
ARGS = None


def create_arg_parser():
    """Create and return the argument parser."""
    parser = argparse.ArgumentParser(
        description="Generate binary data from CSV files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --dryrun
  %(prog)s --only-missing
  %(prog)s --building 15story
  %(prog)s --building 15story --simulation EQ_1
  %(prog)s --building 15story --simulation EQ_1 --metrics displacement velocity
        """,
    )
    parser.add_argument("--dryrun", action="store_true", help="Print actions without writing files")
    parser.add_argument("--generate-missing-only", "--only-missing", action="store_true", dest="generate_missing_only", help="Skip generating binary files that already exist")
    parser.add_argument("--building", nargs="+", help="Building folder name(s) to process (e.g., --building 15story 20story)")
    parser.add_argument("--simulation", nargs="+", help="Simulation name(s) to process (requires --building)")
    parser.add_argument(
        "--metrics", nargs="+", choices=["displacement", "velocity", "acceleration", "ground_motion", "hinge", "building", "all"], default=["all"], help="Data types to generate (default: all)"
    )
    return parser


def check_outputs_exist(building_name, simulation_name=None):
    """
    Check if binary output files already exist for a building/simulation.

    Returns True if all expected outputs exist, False otherwise.
    """
    building_output_dir = os.path.join(BINARY_DIR, building_name)

    if not os.path.exists(building_output_dir):
        return False

    if simulation_name is None:
        return os.path.exists(os.path.join(building_output_dir, "building.bld")) and os.path.exists(os.path.join(building_output_dir, "beam_data.bld"))

    simulation_output_dir = os.path.join(building_output_dir, simulation_name)
    if not os.path.exists(simulation_output_dir):
        return False

    expected_files = []
    if ARGS and ARGS.metrics:
        metrics = ARGS.metrics
        if "all" in metrics or "building" in metrics:
            expected_files.append("building.bld")
        if "all" in metrics or "displacement" in metrics:
            expected_files.extend(["displacement_lin.bld"])
        if "all" in metrics or "velocity" in metrics:
            expected_files.extend(["velocity_lin.bld"])
        if "all" in metrics or "acceleration" in metrics:
            expected_files.extend(["acceleration_lin.bld"])
        if "all" in metrics or "ground_motion" in metrics:
            expected_files.append("ground_motion.bld")
        if "all" in metrics or "hinge" in metrics:
            expected_files.append("hinge_data.bld")
    else:
        expected_files = ["building.bld", "displacement_lin.bld", "velocity_lin.bld", "acceleration_lin.bld", "ground_motion.bld", "hinge_data.bld"]

    for fname in expected_files:
        if not os.path.exists(os.path.join(simulation_output_dir, fname)):
            return False

    return True


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

HINGE_COMPONENT_TO_SIDE = {
    2: "I",
    3: "I",
    4: "J",
    5: "J",
}


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
            beam_data_file = os.path.join(building_path, "beam_data.csv")

            has_node = os.path.exists(node_data_file)
            has_height = os.path.exists(height_file)
            has_beam = os.path.exists(beam_data_file)

            print(f"    node_data.csv: {'✓' if has_node else '✗'} ({node_data_file})")
            print(f"    building_height.csv: {'✓' if has_height else '✗'} ({height_file})")
            print(f"    beam_data.csv: {'✓' if has_beam else '✗'} ({beam_data_file})")

            if has_node and has_height and has_beam:
                # Convert folder name to proper case for output (e.g., "15story" -> "15Story")
                building_name = building_folder.capitalize() if building_folder.islower() else building_folder
                buildings.append(
                    {
                        "folder": building_folder,
                        "name": building_name,
                        "node_data": node_data_file,
                        "height": height_file,
                        "beam_data": beam_data_file,
                    }
                )
                print(f"    → Building ACCEPTED: {building_name}")
            else:
                missing = []
                if not has_node:
                    missing.append("node_data.csv")
                if not has_height:
                    missing.append("building_height.csv")
                if not has_beam:
                    missing.append("beam_data.csv")
                print(f"    → Building REJECTED: missing {', '.join(missing)}")

    print(f"\n{'='*70}")
    print(f"DISCOVERY COMPLETE: Found {len(buildings)} building(s)")
    if buildings:
        print(f"Buildings: {[b['name'] for b in buildings]}")
    print(f"{'='*70}\n")

    return buildings


def discover_hinge_file(simulation_path):
    """
    Locate a hinge results file in the simulation folder.

    Search order:
    1) Hinge results/hinge_data.csv
    """
    hinge_dir = os.path.join(simulation_path, "Hinge results")
    if not os.path.exists(hinge_dir):
        return None

    preferred_csv = os.path.join(hinge_dir, "hinge_data.csv")
    if os.path.exists(preferred_csv):
        return preferred_csv

    return None


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
                "has_hinge_data": False,
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

            # Check for hinge results (non-time-series element data)
            hinge_file = discover_hinge_file(item_path)
            print(f"      hinge results: {'✓' if hinge_file else '✗ not found'}")
            if hinge_file:
                sim_data["has_hinge_data"] = True
                sim_data["hinge_file"] = hinge_file
                print(f"      hinge file: {hinge_file}")

            # Only add if it has at least some data
            if sim_data["has_displacement"] or sim_data["has_velocity"] or sim_data["has_acceleration"] or sim_data["has_hinge_data"]:
                simulations.append(sim_data)
                print(f"    → Simulation ACCEPTED: {item}")
                print(
                    f"      Displacement: {sim_data['has_displacement']}, Velocity: {sim_data['has_velocity']}, "
                    f"Acceleration: {sim_data['has_acceleration']}, Ground Motion: {sim_data['has_ground_motion']}, "
                    f"Hinge: {sim_data['has_hinge_data']}"
                )
            else:
                print(f"    → Simulation REJECTED: {item} " f"(no displacement, velocity, acceleration, or hinge data found)")

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
    files: dict = {"displacement": None, "velocity": None, "acceleration": None, "ground_motion": None, "hinge": None}

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

    if simulation.get("has_hinge_data"):
        print(f"\n    Hinge results file:")
        hinge_file = simulation.get("hinge_file")
        files["hinge"] = hinge_file
        exists = "✓" if hinge_file and os.path.exists(hinge_file) else "✗"
        print(f"      {exists} {hinge_file}")

    return files


# --- HELPERS ---


def write_bld_file(filename, header, binary_data, output_dir, dryrun_override=None):
    """Writes JSON Header + Binary Body to GZIP."""
    dryrun = dryrun_override if dryrun_override is not None else (ARGS and ARGS.dryrun)

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


def _infer_node_to_inches_scale(node_elevations_in, story_elevations_in):
    """Infer whether node elevations are in inches or feet by matching normalized story elevations."""
    candidate_scales = [1.0, 12.0]
    tolerance_in = 0.5

    node_elevations = np.asarray(node_elevations_in, dtype=np.float64)
    story_elevations = np.asarray(story_elevations_in, dtype=np.float64)

    if node_elevations.size == 0 or story_elevations.size == 0:
        return 1.0

    unique_node_elevations = np.unique(np.round(node_elevations, decimals=6))
    best_scale = 1.0
    best_matched = -1
    best_mean_delta = np.inf

    for scale in candidate_scales:
        scaled_elev = unique_node_elevations * scale
        normalized_elev = scaled_elev - np.min(scaled_elev)
        min_deltas = np.min(np.abs(normalized_elev[None, :] - story_elevations[:, None]), axis=1)
        matched_count = int(np.count_nonzero(min_deltas <= tolerance_in))
        mean_delta = float(np.mean(min_deltas))

        print(
            f"Scale check ({scale:.1f}): matched {matched_count}/{len(story_elevations)} "
            f"story elevations (mean abs delta={mean_delta:.3f} in)."
        )

        if matched_count > best_matched or (matched_count == best_matched and mean_delta < best_mean_delta):
            best_scale = scale
            best_matched = matched_count
            best_mean_delta = mean_delta

    print(
        f"Auto-selected node scale: {best_scale:.1f} "
        f"(matched {best_matched}/{len(story_elevations)} story elevations)"
    )
    return best_scale


def _assign_nodes_to_stories(df_nodes, story_elevations, story_levels, node_scale, min_x, min_y, min_v, tol=0.5):
    stories = {}
    unmatched_nodes = []

    for _, row in df_nodes.iterrows():
        x = row["H1"] * node_scale - min_x
        y = row["H2"] * node_scale - min_y
        z = row["V"] * node_scale - min_v
        matches = np.where(np.isclose(story_elevations, z, atol=tol))[0]
        if len(matches) == 0:
            unmatched_nodes.append(
                {
                    "node_id": row["Node ID"],
                    "x": float(x),
                    "y": float(y),
                    "z": float(z),
                }
            )
            continue

        stidx = int(matches[0])
        story = story_levels[stidx]
        stories.setdefault(story, []).append(row["Node ID"] if pd.notna(row["Node ID"]) else None)

    # Remove any accidental Nones (in case IDs are malformed)
    stories = {story: [idx for idx in node_indices if idx is not None] for story, node_indices in stories.items()}
    unmatched_nodes = [n for n in unmatched_nodes if n["node_id"] is not None]
    return stories, unmatched_nodes


def _warn_unmatched_nodes(building_name, unmatched_nodes, story_elevations):
    if not unmatched_nodes:
        print(f"✓ All nodes were assigned to story elevations for {building_name}.")
        return

    unmatched_count = len(unmatched_nodes)
    print(f"\n⚠ WARNING: {unmatched_count} nodes in {building_name} were not assigned to any story elevation.")
    print("      These nodes often indicate non-floor nodes (e.g., hinges, connectors, auxiliary points) or mismatched unit scale.")
    print("      node_id, x(in), y(in), z(in):")

    sample = unmatched_nodes[:20]
    for node in sample:
        print(f"      {node['node_id']}: ({node['x']:.3f}, {node['y']:.3f}, {node['z']:.3f})")

    if unmatched_count > len(sample):
        print(f"      ... and {unmatched_count - len(sample)} more.")

    if story_elevations.size > 0:
        deltas = []
        for node in unmatched_nodes:
            z = node["z"]
            deltas.append(float(np.min(np.abs(story_elevations - z))))
        print(f"      Nearest-story delta stats: min={min(deltas):.4f} in, max={max(deltas):.4f} in, mean={np.mean(deltas):.4f} in")


# --- PROCESSORS ---


def process_building(building):
    """Process building data and return node mapping + beam lookup."""
    building_name = building["name"]
    building_output_dir = os.path.join(BINARY_DIR, building_name)

    print(f"\n{'='*60}")
    print(f"Processing Building: {building_name}")
    print(f"{'='*60}")

    if not os.path.exists(building_output_dir):
        os.makedirs(building_output_dir)

    # 1. Load Nodes + Story Heights
    df_nodes = pd.read_csv(building["node_data"])
    df_height = pd.read_csv(building["height"])

    unique_ids = df_nodes["Node ID"].unique()
    id_to_index = {uid: i for i, uid in enumerate(unique_ids)}
    index_to_id = {i: uid for i, uid in enumerate(unique_ids)}
    count_nodes = len(unique_ids)

    # 2. Load Stories & Corners

    # Cumulative elevation from ground for each story (story level -> elevation in inches)
    # This is the sum of all story heights from ground up to this story
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

    # Infer whether node coordinates are already inches (scale=1.0) or feet (scale=12.0)
    story_elevations_array = np.array(list(storiesElevations.values()), dtype=np.float64)
    node_to_inches_scale = _infer_node_to_inches_scale(df_nodes["V"].values, story_elevations_array)

    # 3. Prepare Binary Buffer (Only XYZ), always written in inches.
    buffer = np.zeros(count_nodes * 3, dtype=np.float32)
    for _, row in df_nodes.iterrows():
        idx = id_to_index.get(row["Node ID"])
        if idx is not None:
            buffer[idx * 3 + 0] = row["H1"] * node_to_inches_scale
            buffer[idx * 3 + 1] = row["H2"] * node_to_inches_scale
            buffer[idx * 3 + 2] = row["V"] * node_to_inches_scale

    # Write node positions in inches
    min_x = df_nodes["H1"].min() * node_to_inches_scale
    min_y = df_nodes["H2"].min() * node_to_inches_scale
    min_v = df_nodes["V"].min() * node_to_inches_scale
    story_levels = list(storiesElevations.keys())
    story_elevations = story_elevations_array

    stories, unmatched_nodes = _assign_nodes_to_stories(
        df_nodes,
        story_elevations,
        story_levels,
        node_to_inches_scale,
        min_x,
        min_y,
        min_v,
    )
    _warn_unmatched_nodes(building_name, unmatched_nodes, story_elevations)

    # Convert discovered floor Node IDs to zero-based geometry indices used by parser/binary output
    stories = {story: [id_to_index[nid] for nid in node_indices if nid in id_to_index] for story, node_indices in stories.items()}

    # Now find corners for each story based on all nodes at that elevation
    for story, node_indices in stories.items():
        # Get all coordinates for nodes at this story
        story_nodes = df_nodes[df_nodes["Node ID"].isin([index_to_id[idx] for idx in node_indices])]

        xs = story_nodes["H1"].values * node_to_inches_scale - min_x
        ys = story_nodes["H2"].values * node_to_inches_scale - min_y

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

    # Per-story height (story level -> height in inches)
    # This is the height of each individual story, not cumulative
    storyHeights = {}
    for i, row in df_height.iterrows():
        story = row["Story level"]
        storyHeights[story] = row["Story Height (ft)"] * 12

    storyOrder = list(stories.keys())
    storyOrder.reverse()
    print(f"Story order: {storyOrder}")

    # 4. Write building binary file
    # story_heights: per-story height in inches (not cumulative elevation)
    header = {"count_nodes": count_nodes, "stories": stories, "corners": corners, "story_heights": storyHeights, "story_order": storyOrder}

    write_bld_file("building.bld", header, buffer.tobytes(), building_output_dir)

    # 5. Write beam/member connectivity using the same node ordering used for all simulation arrays.
    beam_index_by_group2_element_id = process_beam_data(building, id_to_index, building_output_dir)

    return id_to_index, beam_index_by_group2_element_id, building_output_dir


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


def load_hinge_dataframe(hinge_file):
    """Load hinge table from CSV or Excel."""
    suffix = Path(hinge_file).suffix.lower()

    if suffix == ".csv":
        return pd.read_csv(hinge_file)

    print(f"⚠ Skipping unsupported hinge file format: {hinge_file}")
    return None


def summarize_hinge_metric(series, bins=64):
    """Compute summary + histogram for a numeric hinge metric."""
    values = pd.to_numeric(series, errors="coerce").to_numpy(dtype=np.float64)
    values = values[np.isfinite(values)]
    count = int(values.size)

    if count == 0:
        return {
            "count": 0,
            "min": None,
            "max": None,
            "mean": None,
            "std": None,
            "p50": None,
            "p95": None,
            "p99": None,
            "histogram": {"bin_edges": [], "counts": []},
        }

    min_value = float(values.min())
    max_value = float(values.max())
    p50, p95, p99 = np.percentile(values, [50, 95, 99])

    if np.isclose(min_value, max_value):
        delta = max(abs(min_value) * 1e-6, 1e-6)
        hist_edges = np.array([min_value - delta, max_value + delta], dtype=np.float64)
        hist_counts = np.array([count], dtype=np.int64)
    else:
        hist_counts, hist_edges = np.histogram(values, bins=bins)

    return {
        "count": count,
        "min": min_value,
        "max": max_value,
        "mean": float(values.mean()),
        "std": float(values.std(ddof=0)),
        "p50": float(p50),
        "p95": float(p95),
        "p99": float(p99),
        "histogram": {
            "bin_edges": [float(v) for v in hist_edges.tolist()],
            "counts": [int(v) for v in hist_counts.tolist()],
        },
    }


def normalize_hinge_dataframe(df_hinge, hinge_file):
    """Normalize hinge table to canonical schema and validate key constraints."""
    normalized = df_hinge.copy()
    normalized.columns = [str(c).strip() for c in normalized.columns]

    missing_columns = [column for column in HINGE_REQUIRED_COLUMNS if column not in normalized.columns]
    if missing_columns:
        print(f"❌ Hinge file missing required columns: {missing_columns}")
        print(f"   Source: {hinge_file}")
        return None

    normalized = normalized[HINGE_REQUIRED_COLUMNS].copy()

    for column in HINGE_NUMERIC_COLUMNS:
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")

    normalized["Step Type"] = normalized["Step Type"].fillna("").astype(str).str.strip()

    invalid_key_rows = normalized["Step Type"].eq("") | normalized[["Group ID", "Element ID", "Component No.", "Performance Level"]].isna().any(axis=1)
    invalid_count = int(invalid_key_rows.sum())
    if invalid_count > 0:
        print(f"⚠ Dropping {invalid_count} hinge rows with invalid key fields from: {hinge_file}")
        normalized = normalized.loc[~invalid_key_rows].copy()

    if normalized.empty:
        print(f"❌ Hinge file has no valid rows after normalization: {hinge_file}")
        return None

    # Keys must remain unique for deterministic threshold/distribution usage.
    key_columns = ["Element ID", "Component No.", "Step Type", "Performance Level"]
    duplicate_count = int(normalized.duplicated(subset=key_columns).sum())
    if duplicate_count > 0:
        print(f"❌ Hinge data has {duplicate_count} duplicate key row(s): {hinge_file}")
        print(f"   Key columns: {key_columns}")
        return None

    for column in ["Group ID", "Element ID", "Component No.", "Performance Level"]:
        normalized[column] = normalized[column].round().astype(np.int32)

    return normalized


def process_beam_data(building, id_to_index, building_output_dir):
    """Process building-level beam connectivity and return hinge beam lookup by Element ID (Group 2 only)."""
    beam_file = building.get("beam_data")
    if not beam_file or not os.path.exists(beam_file):
        raise FileNotFoundError(f"beam_data.csv not found for building {building['name']}: {beam_file}")

    df_beams = pd.read_csv(beam_file)
    df_beams.columns = [str(c).strip() for c in df_beams.columns]

    required_columns = ["Group ID", "Element ID", "I-Node ID", "J-Node ID"]
    missing_columns = [column for column in required_columns if column not in df_beams.columns]
    if missing_columns:
        raise ValueError(f"beam_data.csv missing required columns: {missing_columns}")

    for column in required_columns:
        df_beams[column] = pd.to_numeric(df_beams[column], errors="coerce")

    invalid_rows = df_beams[required_columns].isna().any(axis=1)
    invalid_count = int(invalid_rows.sum())
    if invalid_count > 0:
        print(f"⚠ Dropping {invalid_count} invalid beam rows with missing numeric fields")
        df_beams = df_beams.loc[~invalid_rows].copy()

    if df_beams.empty:
        raise ValueError(f"beam_data.csv has no valid rows after normalization: {beam_file}")

    for column in required_columns:
        df_beams[column] = df_beams[column].round().astype(np.int32)

    row_count = len(df_beams)
    stride = 4
    fields = ["elementId", "iNodeIndex", "jNodeIndex", "groupId"]
    encoded = np.zeros((row_count, stride), dtype=np.float32)

    beam_index_by_group2_element_id = {}
    missing_node_refs = []

    for beam_index, (_, row) in enumerate(df_beams.iterrows()):
        element_id = int(row["Element ID"])
        group_id = int(row["Group ID"])
        i_node_id = int(row["I-Node ID"])
        j_node_id = int(row["J-Node ID"])

        i_node_index = id_to_index.get(i_node_id)
        j_node_index = id_to_index.get(j_node_id)
        if i_node_index is None or j_node_index is None:
            missing_node_refs.append((beam_index, element_id, group_id, i_node_id, j_node_id))
            continue

        encoded[beam_index, 0] = np.float32(element_id)
        encoded[beam_index, 1] = np.float32(i_node_index)
        encoded[beam_index, 2] = np.float32(j_node_index)
        encoded[beam_index, 3] = np.float32(group_id)

        if group_id == 2:
            if element_id in beam_index_by_group2_element_id:
                existing_index = beam_index_by_group2_element_id[element_id]
                raise ValueError(f"Duplicate beam Element ID within Group ID 2: {element_id} " f"(rows {existing_index} and {beam_index})")
            beam_index_by_group2_element_id[element_id] = beam_index

    if missing_node_refs:
        raise ValueError(f"beam_data.csv contains {len(missing_node_refs)} row(s) referencing unknown node IDs. " f"Sample: {missing_node_refs[:5]}")

    group_id_counts = {str(int(group_id)): int(count) for group_id, count in df_beams["Group ID"].value_counts().sort_index().items()}  # type: ignore

    header = {
        "type": "beam_data",
        "version": 1,
        "count_rows": row_count,
        "stride": stride,
        "fields": fields,
        "summary": {
            "counts": {
                "rows": row_count,
                "group_ids": group_id_counts,
                "group2_rows": int((df_beams["Group ID"] == 2).sum()),
                "hinge_lookup_rows": len(beam_index_by_group2_element_id),
            }
        },
    }

    write_bld_file("beam_data.bld", header, encoded.flatten().tobytes(), building_output_dir)
    return beam_index_by_group2_element_id


def process_hinge_data(files_config, simulation_output_dir, beam_index_by_group2_element_id):
    """Process non-time-series hinge data for a simulation into paired beam-end rows."""
    print("\n--- Processing Hinge Data ---")
    hinge_file = files_config.get("hinge")
    if not hinge_file or not os.path.exists(hinge_file):
        print("Hinge data file not found, skipping.")
        return

    df_hinge = load_hinge_dataframe(hinge_file)
    if df_hinge is None:
        return

    normalized = normalize_hinge_dataframe(df_hinge, hinge_file)
    if normalized is None:
        return

    unique_group_ids = sorted(normalized["Group ID"].dropna().astype(int).unique().tolist())
    if unique_group_ids != [2]:
        raise ValueError(f"Expected hinge Group ID to be [2], got {unique_group_ids}")

    source_row_count = int(len(normalized))
    normalized = normalized.loc[normalized["Performance Level"] == 1].copy()
    if normalized.empty:
        print("⚠ No hinge rows remain after filtering Performance Level == 1; skipping.")
        return

    unsupported_steps = sorted(set(normalized["Step Type"].unique().tolist()) - {"Max", "Min"})
    if unsupported_steps:
        raise ValueError(f"Unsupported Step Type values in hinge data: {unsupported_steps}")

    normalized["beamIndex"] = normalized["Element ID"].map(beam_index_by_group2_element_id)
    missing_beam_rows = normalized["beamIndex"].isna()
    missing_beam_count = int(missing_beam_rows.sum())
    if missing_beam_count > 0:
        sample_ids = normalized.loc[missing_beam_rows, "Element ID"].dropna().astype(int).unique().tolist()[:10]
        raise ValueError(f"{missing_beam_count} hinge row(s) could not map to beam_data.bld rows. " f"Sample Element IDs: {sample_ids}")
    normalized["beamIndex"] = normalized["beamIndex"].round().astype(np.int32)

    normalized["hingeSide"] = normalized["Component No."].map(HINGE_COMPONENT_TO_SIDE)
    invalid_component_rows = normalized["hingeSide"].isna()
    if bool(invalid_component_rows.any()):
        sample_components = normalized.loc[invalid_component_rows, "Component No."].dropna().astype(int).unique().tolist()[:10]
        raise ValueError(f"Unsupported hinge Component No. values: {sample_components}")

    duplicate_same_side = int(normalized.duplicated(subset=["beamIndex", "Step Type", "hingeSide"]).sum())
    if duplicate_same_side > 0:
        raise ValueError(f"Hinge data has {duplicate_same_side} duplicate row(s) for the same (beamIndex, Step Type, hingeSide) after PL=1 filtering")

    records_by_beam = {}

    def init_record(beam_index):
        return {
            "beamIndex": int(beam_index),
            "endMask": 0,
            "iM3Max": np.float32(np.nan),
            "iM3Min": np.float32(np.nan),
            "iR3Max": np.float32(np.nan),
            "iR3Min": np.float32(np.nan),
            "iMaxPosDcrMax": np.float32(np.nan),
            "iMaxPosDcrMin": np.float32(np.nan),
            "iMaxNegDcrMax": np.float32(np.nan),
            "iMaxNegDcrMin": np.float32(np.nan),
            "jM3Max": np.float32(np.nan),
            "jM3Min": np.float32(np.nan),
            "jR3Max": np.float32(np.nan),
            "jR3Min": np.float32(np.nan),
            "jMaxPosDcrMax": np.float32(np.nan),
            "jMaxPosDcrMin": np.float32(np.nan),
            "jMaxNegDcrMax": np.float32(np.nan),
            "jMaxNegDcrMin": np.float32(np.nan),
        }

    target_fields = {
        ("I", "Max"): ("iM3Max", "iR3Max", "iMaxPosDcrMax", "iMaxNegDcrMax"),
        ("I", "Min"): ("iM3Min", "iR3Min", "iMaxPosDcrMin", "iMaxNegDcrMin"),
        ("J", "Max"): ("jM3Max", "jR3Max", "jMaxPosDcrMax", "jMaxNegDcrMax"),
        ("J", "Min"): ("jM3Min", "jR3Min", "jMaxPosDcrMin", "jMaxNegDcrMin"),
    }

    ordered = normalized.sort_values(["beamIndex", "Step Type", "hingeSide"], kind="stable")
    for _, row in ordered.iterrows():
        beam_index = int(row["beamIndex"])
        side = str(row["hingeSide"])
        step_type = str(row["Step Type"])

        record = records_by_beam.get(beam_index)
        if record is None:
            record = init_record(beam_index)
            records_by_beam[beam_index] = record

        if side == "I":
            record["endMask"] |= 0b01
        elif side == "J":
            record["endMask"] |= 0b10
        else:
            raise ValueError(f"Unexpected hinge side value: {side}")

        m3_field, r3_field, pos_field, neg_field = target_fields[(side, step_type)]
        record[m3_field] = np.float32(row["M3"])
        record[r3_field] = np.float32(row["R3"])
        record[pos_field] = np.float32(row["Max Pos Deform DCRatio"])
        record[neg_field] = np.float32(row["Max Neg Deform DCRatio"])

    sorted_beam_indices = sorted(records_by_beam.keys())
    row_count = len(sorted_beam_indices)
    stride = 18
    fields = [
        "beamIndex",
        "endMask",
        "iM3Max",
        "iM3Min",
        "iR3Max",
        "iR3Min",
        "iMaxPosDcrMax",
        "iMaxPosDcrMin",
        "iMaxNegDcrMax",
        "iMaxNegDcrMin",
        "jM3Max",
        "jM3Min",
        "jR3Max",
        "jR3Min",
        "jMaxPosDcrMax",
        "jMaxPosDcrMin",
        "jMaxNegDcrMax",
        "jMaxNegDcrMin",
    ]

    encoded = np.full((row_count, stride), np.nan, dtype=np.float32)
    for row_idx, beam_index in enumerate(sorted_beam_indices):
        record = records_by_beam[beam_index]
        encoded[row_idx, :] = np.array([record[field] for field in fields], dtype=np.float32)

    step_type_counts = {str(k): int(v) for k, v in normalized["Step Type"].value_counts().sort_index().items()}
    component_counts = {str(int(k)): int(v) for k, v in normalized["Component No."].value_counts().sort_index().items()}  # type: ignore
    side_counts = {str(k): int(v) for k, v in normalized["hingeSide"].value_counts().sort_index().items()}

    end_masks = [int(records_by_beam[beam_index]["endMask"]) for beam_index in sorted_beam_indices]
    beams_with_i = sum(1 for mask in end_masks if mask & 0b01)
    beams_with_j = sum(1 for mask in end_masks if mask & 0b10)

    metrics_summary = {
        "m3": {
            "max": summarize_hinge_metric(normalized.loc[normalized["Step Type"] == "Max", "M3"]),
            "min": summarize_hinge_metric(normalized.loc[normalized["Step Type"] == "Min", "M3"]),
        },
        "r3": {
            "max": summarize_hinge_metric(normalized.loc[normalized["Step Type"] == "Max", "R3"]),
            "min": summarize_hinge_metric(normalized.loc[normalized["Step Type"] == "Min", "R3"]),
        },
        "max_pos_deform_dc_ratio": {
            "max": summarize_hinge_metric(normalized.loc[normalized["Step Type"] == "Max", "Max Pos Deform DCRatio"]),
            "min": summarize_hinge_metric(normalized.loc[normalized["Step Type"] == "Min", "Max Pos Deform DCRatio"]),
        },
        "max_neg_deform_dc_ratio": {
            "max": summarize_hinge_metric(normalized.loc[normalized["Step Type"] == "Max", "Max Neg Deform DCRatio"]),
            "min": summarize_hinge_metric(normalized.loc[normalized["Step Type"] == "Min", "Max Neg Deform DCRatio"]),
        },
    }

    header = {
        "type": "hinge_data",
        "version": 2,
        "count_rows": row_count,
        "stride": stride,
        "fields": fields,
        "step_types": ["Max", "Min"],
        "source_file": os.path.basename(hinge_file),
        "source_format": Path(hinge_file).suffix.lower().lstrip("."),
        "summary": {
            "counts": {
                "source_rows": source_row_count,
                "rows_performance_level_1": int(len(normalized)),
                "rows_paired": row_count,
                "beams": row_count,
                "beams_with_i": int(beams_with_i),
                "beams_with_j": int(beams_with_j),
                "step_types": step_type_counts,
                "component_numbers": component_counts,
                "sides": side_counts,
            },
            "metrics": metrics_summary,
        },
    }

    write_bld_file("hinge_data.bld", header, encoded.flatten().tobytes(), simulation_output_dir)


def should_process_metric(metric_name):
    """Check if a metric should be processed based on --metrics filter."""
    if ARGS is None:
        return True
    if not ARGS.metrics:
        return True
    if "all" in ARGS.metrics:
        return True
    return metric_name in ARGS.metrics


def process_simulation_response_type(args):
    """Process a single response type for a simulation (for parallel execution)"""
    file_key, type_name, id_to_index, files_config, simulation_output_dir = args
    try:
        process_response_file(file_key, type_name, id_to_index, files_config, simulation_output_dir)
        return (type_name, "success", None)
    except Exception as e:
        return (type_name, "error", e)


def process_simulation_parallel(building, simulation, id_to_index, beam_index_by_group2_element_id, building_output_dir, max_workers=3):
    """Process a single simulation with parallel response type processing"""
    simulation_name = simulation["name"]
    simulation_output_dir = os.path.join(building_output_dir, simulation_name)

    print(f"\n{'-'*60}")
    print(f"Processing Simulation: {simulation_name}")
    print(f"Pattern: {simulation.get('file_pattern', 'Unknown')}")
    print(
        f"Displacement: {simulation['has_displacement']}, Velocity: {simulation['has_velocity']}, " f"Acceleration: {simulation['has_acceleration']}, Hinge: {simulation.get('has_hinge_data', False)}"
    )
    print(f"{'-'*60}")

    if not os.path.exists(simulation_output_dir):
        os.makedirs(simulation_output_dir)

    files_config = get_simulation_files(building["folder"], simulation)

    tasks = []
    if simulation["has_displacement"] and should_process_metric("displacement"):
        tasks.append(("displacement", "displacement", id_to_index, files_config, simulation_output_dir))
    if simulation["has_velocity"] and should_process_metric("velocity"):
        tasks.append(("velocity", "velocity", id_to_index, files_config, simulation_output_dir))
    if simulation["has_acceleration"] and should_process_metric("acceleration"):
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
    if simulation["has_ground_motion"] and should_process_metric("ground_motion"):
        process_ground_motion(files_config, simulation_output_dir)

    # Process non-time-series hinge data
    if simulation.get("has_hinge_data") and should_process_metric("hinge"):
        process_hinge_data(files_config, simulation_output_dir, beam_index_by_group2_element_id)


def process_simulation(building, simulation, id_to_index, beam_index_by_group2_element_id, building_output_dir):
    """Process a single simulation for a building (sequential version)"""
    simulation_name = simulation["name"]
    simulation_output_dir = os.path.join(building_output_dir, simulation_name)

    print(f"\n{'-'*60}")
    print(f"Processing Simulation: {simulation_name}")
    print(f"Pattern: {simulation.get('file_pattern', 'Unknown')}")
    print(
        f"Displacement: {simulation['has_displacement']}, Velocity: {simulation['has_velocity']}, " f"Acceleration: {simulation['has_acceleration']}, Hinge: {simulation.get('has_hinge_data', False)}"
    )
    print(f"{'-'*60}")

    if not os.path.exists(simulation_output_dir):
        os.makedirs(simulation_output_dir)

    # Get file paths for this simulation
    files_config = get_simulation_files(building["folder"], simulation)

    # Process response files
    if simulation["has_displacement"] and should_process_metric("displacement"):
        process_response_file("displacement", "displacement", id_to_index, files_config, simulation_output_dir)

    if simulation["has_velocity"] and should_process_metric("velocity"):
        process_response_file("velocity", "velocity", id_to_index, files_config, simulation_output_dir)

    if simulation["has_acceleration"] and should_process_metric("acceleration"):
        process_response_file("acceleration", "acceleration", id_to_index, files_config, simulation_output_dir)

    # Process ground motion
    if simulation["has_ground_motion"] and should_process_metric("ground_motion"):
        process_ground_motion(files_config, simulation_output_dir)

    # Process non-time-series hinge data
    if simulation.get("has_hinge_data") and should_process_metric("hinge"):
        process_hinge_data(files_config, simulation_output_dir, beam_index_by_group2_element_id)


def process_complete_building(building):
    """Process a complete building with all its simulations (for multiprocessing)"""
    try:
        building_name = building["name"]

        # Discover simulations for this building
        simulations = discover_simulations(building["folder"])

        if not simulations:
            return (building_name, "skipped", "no simulations found")

        # Process building (creates building.bld)
        id_to_index, beam_index_by_group2_element_id, building_output_dir = process_building(building)

        # Process each simulation (can also be parallelized per simulation)
        for simulation in simulations:
            process_simulation_parallel(building, simulation, id_to_index, beam_index_by_group2_element_id, building_output_dir)

        return (building_name, "success", f"processed {len(simulations)} simulation(s)")
    except Exception as e:
        return (building["name"], "error", e)


# --- MAIN ---
if __name__ == "__main__":
    import time

    parser = create_arg_parser()
    args = parser.parse_args()
    ARGS = args

    if args.simulation and not args.building:
        parser.error("--simulation requires --building")

    start_time = time.time()

    print("=" * 70)
    print("BINARY DATA GENERATION SCRIPT")
    print("=" * 70)
    print(f"Configuration:")
    print(f"  CSV_DIR: {CSV_DIR}")
    print(f"  BINARY_DIR: {BINARY_DIR}")
    if args.dryrun:
        print(f"  DRYRUN: Enabled (no files will be written)")
    if args.generate_missing_only:
        print(f"  GENERATE_MISSING_ONLY: Enabled (skipping existing files)")
    if args.building:
        print(f"  FILTER - Buildings: {args.building}")
    if args.simulation:
        print(f"  FILTER - Simulations: {args.simulation}")
    if args.metrics:
        print(f"  FILTER - Metrics: {args.metrics}")
    print(f"  Expected file patterns:")
    print(f"    - Displacement: D_H1T_Entire.txt, D_H2T_Entire.txt, D_VT_Entire.txt (linear)")
    print(f"    - Displacement: D_H1R_Entire.txt, D_H2R_Entire.txt, D_VR_Entire.txt (rotation)")
    print(f"    - Velocity: V_H1T_Entire.txt, V_H2T_Entire.txt, V_VT_Entire.txt (linear)")
    print(f"    - Velocity: V_H1R_Entire.txt, V_H2R_Entire.txt, V_VR_Entire.txt (rotation)")
    print(f"    - Acceleration: A_H1T_Entire.txt, A_H2T_Entire.txt, A_VT_Entire.txt (linear)")
    print(f"    - Acceleration: A_H1R_Entire.txt, A_H2R_Entire.txt, A_VR_Entire.txt (rotation)")
    print(f"    - Ground Motion: ground_motion.txt")
    print(f"    - Hinge Results: Hinge results/hinge_data.csv (or first CSV in folder)")
    print(f"=" * 70)

    buildings = discover_buildings()

    if args.building:
        building_folders = set(args.building)
        buildings = [b for b in buildings if b["folder"] in building_folders]
        print(f"Filtered to {len(buildings)} building(s): {[b['name'] for b in buildings]}")

    print(f"Found {len(buildings)} building(s): {[b['name'] for b in buildings]}")

    if not buildings:
        print("No buildings found. Exiting.")
        exit(1)

    num_workers = min(len(buildings), cpu_count())
    print(f"Processing with {num_workers} parallel worker(s)...")

    def should_process_simulation(building_name, simulation_name):
        if args.simulation:
            return simulation_name in args.simulation
        return True

    def should_process_building(building_name):
        if args.generate_missing_only:
            return not check_outputs_exist(building_name)
        return True

    results = []
    for building in buildings:
        building_name = building["name"]

        # Only check building-level outputs when generating building.bld (not simulation-specific metrics)
        building_level_metrics = args.metrics and ("all" in args.metrics or "building" in args.metrics)

        if args.generate_missing_only and building_level_metrics:
            if check_outputs_exist(building_name):
                print(f"\nSkipping {building_name} - all outputs already exist")
                results.append((building_name, "skipped", "outputs already exist"))
                continue

        # Skip building-level processing if not in metrics
        if args.metrics and "all" not in args.metrics and "building" not in args.metrics:
            print(f"\nSkipping building {building_name} - building data not in metrics")
            # Still process simulations for non-building metrics like hinge

        try:
            simulations = discover_simulations(building["folder"])

            if args.simulation:
                simulations = [s for s in simulations if s["name"] in args.simulation]
                print(f"Filtered to {len(simulations)} simulation(s): {[s['name'] for s in simulations]}")

            if not simulations:
                results.append((building_name, "skipped", "no simulations found"))
                continue

            id_to_index, beam_index_by_group2_element_id, building_output_dir = process_building(building)

            for simulation in simulations:
                sim_name = simulation["name"]

                if args.generate_missing_only:
                    if check_outputs_exist(building_name, sim_name):
                        print(f"\nSkipping simulation {sim_name} - outputs already exist")
                        results.append((building_name, "skipped", f"{sim_name} outputs exist"))
                        continue

                process_simulation_parallel(building, simulation, id_to_index, beam_index_by_group2_element_id, building_output_dir)

            results.append((building_name, "success", f"processed {len(simulations)} simulation(s)"))
        except Exception as e:
            results.append((building["name"], "error", str(e)))

    print("\n" + "=" * 60)
    print("Processing Results:")
    print("=" * 60)
    for building_name, status, message in results:
        print(f"  {building_name}: {status} - {message}")

    elapsed_time = time.time() - start_time
    print("=" * 60)
    print(f"Batch processing complete! Total time: {elapsed_time:.2f}s")
    print("=" * 60)
