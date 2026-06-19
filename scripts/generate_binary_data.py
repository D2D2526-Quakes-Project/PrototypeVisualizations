"""
generate_binary_data.py
=======================
Main entry point for the binary data generation pipeline.

This script discovers buildings and simulations from the CSV directory tree,
then orchestrates the per-building and per-simulation processors to produce
gzip-compressed .bld binary files consumed by the visualisation front-end.

Usage
-----
Run from the scripts/ directory (or any directory, since paths are resolved
relative to this file's location):

    python generate_binary_data.py [options]

Options
-------
--dryrun
    Print what would be written without actually creating any files.

--generate-missing-only / --only-missing
    Skip buildings and simulations whose output files already exist.

--building <name> [<name> ...]
    Process only the specified building folder(s).

--simulation <name> [<name> ...]
    Process only the specified simulation(s).  Requires --building.

--metrics <metric> [<metric> ...]
    Process only the selected data types.  Choices:
        displacement  velocity  acceleration  ground_motion
        hinge  shear  brb  building  all  (default: all)

Examples
--------
    python generate_binary_data.py --dryrun
    python generate_binary_data.py --only-missing
    python generate_binary_data.py --building 15story
    python generate_binary_data.py --building 15story --simulation station3139
    python generate_binary_data.py --building 15story --simulation station3138 station3139 --metrics displacement velocity
"""

import argparse
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Protocol

from .shared import BINARY_DIR, CSV_DIR, discover_buildings, discover_simulations, get_simulation_files
from .processor_building import process_building
from .processor_response import process_simulation_response_type
from .processor_ground_motion import process_ground_motion
from .processor_hinge import process_hinge_data
from .processor_brb import load_brb_properties, process_brb_data
from .processor_shear import process_shear_data

# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------


class Args(Protocol):
    dryrun: bool
    generate_missing_only: bool
    building: list[str] | None
    simulation: list[str] | None
    metrics: list[str]


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
  %(prog)s --building 15story --simulation station3139
  %(prog)s --building 15story --simulation station3138 station3139 --metrics displacement velocity
        """,
    )
    parser.add_argument(
        "--dryrun",
        action="store_true",
        help="Print actions without writing files",
    )
    parser.add_argument(
        "--generate-missing-only",
        "--only-missing",
        action="store_true",
        dest="generate_missing_only",
        help="Skip generating binary files that already exist",
    )
    parser.add_argument(
        "--building",
        nargs="+",
        help="Building folder name(s) to process (e.g., --building 15story 20story)",
    )
    parser.add_argument(
        "--simulation",
        nargs="+",
        help="Simulation name(s) to process (requires --building)",
    )
    parser.add_argument(
        "--metrics",
        nargs="+",
        choices=["displacement", "velocity", "acceleration", "ground_motion", "hinge", "shear", "brb", "building", "all"],
        default=["all"],
        help="Data types to generate (default: all)",
    )
    return parser


# ---------------------------------------------------------------------------
# Output-existence check
# ---------------------------------------------------------------------------


def check_outputs_exist(building_name: str, simulation_name: str | None = None, *, args: Args):
    """
    Check whether binary output files already exist for a building/simulation.

    Used by --generate-missing-only to skip work that was already done.

    Parameters
    ----------
    building_name : str
    simulation_name : str or None
        When None, only checks for building.bld at the building level.

    Returns
    -------
    bool
        True when all expected outputs already exist.
    """
    building_output_dir = os.path.join(BINARY_DIR, building_name)

    if not os.path.exists(building_output_dir):
        return False

    if simulation_name is None:
        return os.path.exists(os.path.join(building_output_dir, "building.bld"))

    simulation_output_dir = os.path.join(building_output_dir, simulation_name)
    if not os.path.exists(simulation_output_dir):
        return False

    expected_files = []
    if args and args.metrics:
        metrics = args.metrics
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
        if "all" in metrics or "shear" in metrics:
            expected_files.append("shear_data.bld")
        if "all" in metrics or "brb" in metrics:
            expected_files.append("brb_data.bld")
    else:
        expected_files = [
            "building.bld",
            "displacement_lin.bld",
            "velocity_lin.bld",
            "acceleration_lin.bld",
            "ground_motion.bld",
            "hinge_data.bld",
            "shear_data.bld",
            "brb_data.bld",
        ]

    for fname in expected_files:
        if not os.path.exists(os.path.join(simulation_output_dir, fname)):
            return False

    return True


# ---------------------------------------------------------------------------
# Metric filter
# ---------------------------------------------------------------------------


def should_process_metric(metric_name: str, *, args: Args):
    """
    Return True when the given metric should be processed.

    Respects the ``--metrics`` CLI flag.  Defaults to True when args is None.
    """
    if args is None:
        return True
    if not args.metrics:
        return True
    if "all" in args.metrics:
        return True
    return metric_name in args.metrics


# ---------------------------------------------------------------------------
# Simulation orchestrator
# ---------------------------------------------------------------------------


def process_simulation_parallel(building, simulation, id_to_index, beam_lookup_maps, building_output_dir, story_order, max_workers=3):
    """
    Process a single simulation, running time-series types in parallel.

    Displacement, velocity, and acceleration are processed concurrently using
    a ThreadPoolExecutor (they are I/O-bound and share no state).  Ground
    motion, hinge, shear, and BRB are processed sequentially because they are
    fast or have no parallelism benefit.

    Parameters
    ----------
    building : dict
        Building metadata dict from discovery.
    simulation : dict
        Simulation metadata dict from discover_simulations.
    id_to_index : dict[int, int]
        Node ID → node index (from process_building).
    beam_lookup_maps : dict or None
        Lookup maps for hinge/BRB processors (from process_beam_data), or
        None when beam_data.csv is absent.
    building_output_dir : str
        Absolute path to the building's output directory.
    story_order : list[str]
        Bottom-to-top story labels (from process_building).
    max_workers : int
        Maximum number of parallel threads for time-series processing.
    """
    simulation_name = simulation["name"]
    simulation_output_dir = os.path.join(building_output_dir, simulation_name)

    print(f"\n{'-'*60}")
    print(f"Processing Simulation: {simulation_name}")
    print(f"Pattern: {simulation.get('file_pattern', 'Unknown')}")
    print(
        f"Displacement: {simulation['has_displacement']}, Velocity: {simulation['has_velocity']}, "
        f"Acceleration: {simulation['has_acceleration']}, Hinge: {simulation.get('has_hinge_data', False)}, "
        f"Shear: {simulation.get('has_shear_data', False)}, BRB: {simulation.get('has_brb_data', False)}"
    )
    print(f"{'-'*60}")

    if not os.path.exists(simulation_output_dir):
        os.makedirs(simulation_output_dir)

    files_config = get_simulation_files(building["folder"], simulation)

    # Build list of parallel tasks for time-series response data
    tasks = []
    if simulation["has_displacement"] and should_process_metric("displacement", args=args):
        tasks.append(("displacement", "displacement", id_to_index, files_config, simulation_output_dir, args.dryrun))
    if simulation["has_velocity"] and should_process_metric("velocity", args=args):
        tasks.append(("velocity", "velocity", id_to_index, files_config, simulation_output_dir, args.dryrun))
    if simulation["has_acceleration"] and should_process_metric("acceleration", args=args):
        tasks.append(("acceleration", "acceleration", id_to_index, files_config, simulation_output_dir, args.dryrun))

    if tasks:
        with ThreadPoolExecutor(max_workers=min(len(tasks), max_workers)) as executor:
            futures = [executor.submit(process_simulation_response_type, task) for task in tasks]
            for future in as_completed(futures):
                type_name, status, error = future.result()
                if status == "error":
                    print(f"Error processing {type_name}: {error}")

    # Sequential processors (fast or stateful)
    if simulation["has_ground_motion"] and should_process_metric("ground_motion", args=args):
        process_ground_motion(files_config, simulation_output_dir, args=args)

    if simulation.get("has_hinge_data") and should_process_metric("hinge", args=args):
        if beam_lookup_maps is not None:
            process_hinge_data(files_config, simulation_output_dir, beam_lookup_maps["hinge_by_group2_element_id"], args=args)
        else:
            print("    Skipping hinge data: beam_data.csv not available for this building")

    if simulation.get("has_shear_data") and should_process_metric("shear", args=args):
        process_shear_data(files_config, simulation_output_dir, story_order, args=args)

    if simulation.get("has_brb_data") and should_process_metric("brb", args=args):
        if beam_lookup_maps is not None:
            brb_properties = load_brb_properties(building)
            process_brb_data(files_config, simulation_output_dir, beam_lookup_maps["by_group_id_element_id"], brb_properties, args=args)
        else:
            print("    Skipping BRB data: beam_data.csv not available for this building")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = create_arg_parser()
    args: Args = parser.parse_args()  # pyright: ignore[reportAssignmentType]

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
    print(f"    - Shear Results: Shears/*_H1M.txt + Shears/*_H2M.txt")
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

    results = []
    for building in buildings:
        building_name = building["name"]

        building_level_metrics = args.metrics and ("all" in args.metrics or "building" in args.metrics)

        if args.generate_missing_only and building_level_metrics:
            if check_outputs_exist(building_name, args=args):
                print(f"\nSkipping {building_name} - all outputs already exist")
                results.append((building_name, "skipped", "outputs already exist"))
                continue

        try:
            simulations = discover_simulations(building["folder"])

            if args.simulation:
                simulations = [s for s in simulations if s["name"] in args.simulation]
                print(f"Filtered to {len(simulations)} simulation(s): {[s['name'] for s in simulations]}")

            if not simulations:
                results.append((building_name, "skipped", "no simulations found"))
                continue

            id_to_index, beam_lookup_maps, building_output_dir, story_order = process_building(building, args=args)

            for simulation in simulations:
                sim_name = simulation["name"]

                if args.generate_missing_only:
                    if check_outputs_exist(building_name, sim_name, args=args):
                        print(f"\nSkipping simulation {sim_name} - outputs already exist")
                        results.append((building_name, "skipped", f"{sim_name} outputs exist"))
                        continue

                process_simulation_parallel(
                    building,
                    simulation,
                    id_to_index,
                    beam_lookup_maps,
                    building_output_dir,
                    story_order,
                )

            results.append((building_name, "success", f"processed {len(simulations)} simulation(s)"))
        except Exception as e:
            results.append((building["name"], "error", str(e)))
            raise e

    print("\n" + "=" * 60)
    print("Processing Results:")
    print("=" * 60)
    for building_name, status, message in results:
        print(f"  {building_name}: {status} - {message}")

    elapsed_time = time.time() - start_time
    print("=" * 60)
    print(f"Batch processing complete! Total time: {elapsed_time:.2f}s")
    print("=" * 60)
