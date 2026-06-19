"""
processor_response.py
=====================
Processor for time-series response data: displacement, velocity, acceleration.

All three metrics share the same binary format and the same loading/merging
logic, so a single generic function handles all of them.

Public functions
----------------
process_response_file(file_key, type_name, id_to_index, files_config, simulation_output_dir)
    Load, align, and write one response type (displacement, velocity, or
    acceleration) to a pair of .bld files: one for linear components and one
    for rotational components (when rotation data is available).

process_simulation_response_type(args)
    Thin wrapper for use in a ThreadPoolExecutor; unpacks a single tuple arg
    and calls process_response_file.

Output files (per simulation, per response type)
------------------------------------------------
<type>_lin.bld
    Header: {"type": "<type>_lin", "count_frames": N, "count_nodes": M,
             "dt": 0.01, "missing_node_indices": [...]}
    Binary: float32 interleaved [H1, H2, V, H1, H2, V, …] — Frames × Nodes × 3

<type>_rot.bld  (only written when rotation source files exist)
    Same header/binary layout as _lin.bld but for rotational components.

Input file patterns
-------------------
"Entire" pattern (one file per component):
    Displacement : D_H1T_Entire.txt, D_H2T_Entire.txt, D_VT_Entire.txt
                   D_H1R_Entire.txt, D_H2R_Entire.txt, D_VR_Entire.txt
    Velocity     : V_H1T_Entire.txt, V_H2T_Entire.txt, V_VT_Entire.txt
                   V_H1R_Entire.txt, V_H2R_Entire.txt, V_VR_Entire.txt
    Acceleration : A_H1T_Entire.txt, A_H2T_Entire.txt, A_VT_Entire.txt
                   A_H1R_Entire.txt, A_H2R_Entire.txt, A_VR_Entire.txt

"Grid" pattern (multiple fragment files per component, merged at runtime):
    D_H1T_Grid_<id>.txt, D_H1R_Grid_<id>.txt, etc.
    Each fragment covers a subset of nodes; they are merged by node ID.
"""

import os

import numpy as np

from .shared import (
    parse_ladwp_header,
    load_ladwp_data,
    merge_grid_data,
    compute_missing_node_indices,
    write_bld_file,
)


def process_response_file(file_key, type_name, id_to_index, files_config, simulation_output_dir, dryrun):
    """
    Generic processor for displacement, velocity, or acceleration data.

    Reads up to six source files (H1/H2/V linear + H1/H2/V rotational),
    aligns all data to the global node index, interleaves the three
    components, and writes one or two .bld files.

    Supports both the "Entire" file format (one file per component) and the
    "Grid" format (multiple fragment files per component that must be merged).

    Parameters
    ----------
    file_key : str
        Key into ``files_config``; one of ``"displacement"``, ``"velocity"``,
        ``"acceleration"``.
    type_name : str
        Human-readable type label used in header and log output; typically
        the same as ``file_key``.
    id_to_index : dict[int, int]
        Node ID → zero-based node index (from the building processor).
    files_config : dict
        File-path configuration dict as returned by
        ``discovery.get_simulation_files()``.
    simulation_output_dir : str
        Directory to write the output .bld files into.
    """
    print(f"\n{'='*70}")
    print(f"PROCESSING RESPONSE FILE: {type_name}")
    print(f"{'='*70}")

    file_list = files_config.get(file_key)
    if not file_list:
        print(f"❌ Skipping {type_name}: Files not available in files_config.")
        print(f"   files_config keys: {list(files_config.keys())}")
        return

    lin_files = file_list.get("lin", [])
    rot_files = file_list.get("rot", [])

    print(f"Configuration:")
    print(f"  Linear files: {len(lin_files)} component(s)")
    print(f"  Rotation files: {'Yes' if rot_files is not None else 'No'}")

    # Detect grid vs. entire format
    is_grid_format = lin_files and isinstance(lin_files[0], list)

    if is_grid_format:
        print(f"  Format: Grid (merged from multiple files)")
        h1_grid_files = lin_files[0] if len(lin_files) > 0 else []
        h2_grid_files = lin_files[1] if len(lin_files) > 1 else []
        v_grid_files = lin_files[2] if len(lin_files) > 2 else []

        # Verify all grid files exist
        print(f"\nVerifying grid files:")
        all_grid_files = h1_grid_files + h2_grid_files + v_grid_files
        for f in all_grid_files:
            if not os.path.exists(f):
                print(f"❌ Skipping {type_name}: Grid file not found: {f}")
                return
        print(f"  ✓ All {len(all_grid_files)} grid file(s) verified")

        print(f"\n--- Loading and Merging Grid Data ---")
        print(f"Merging H1 component from {len(h1_grid_files)} grid file(s)...")
        d_lx, col_map_x, covered_lin_x = merge_grid_data(h1_grid_files, id_to_index)

        print(f"Merging H2 component from {len(h2_grid_files)} grid file(s)...")
        d_ly, col_map_y, covered_lin_y = merge_grid_data(h2_grid_files, id_to_index)

        print(f"Merging V component from {len(v_grid_files)} grid file(s)...")
        d_lz, col_map_z, covered_lin_z = merge_grid_data(v_grid_files, id_to_index)

        if d_lx is None or d_ly is None or d_lz is None:
            print(f"❌ Skipping {type_name}: Failed to merge grid data")
            return

        num_frames = len(d_lx)
        num_nodes = len(id_to_index)
        missing_lin_node_indices = compute_missing_node_indices(num_nodes, id_to_index, covered_lin_x, covered_lin_y, covered_lin_z)

        has_rotation = rot_files is not None and len(rot_files) > 0 and isinstance(rot_files[0], list)
        if has_rotation:
            h1_rot_files = rot_files[0] if len(rot_files) > 0 else []
            h2_rot_files = rot_files[1] if len(rot_files) > 1 else []
            v_rot_files = rot_files[2] if len(rot_files) > 2 else []

            print(f"\nMerging rotation data:")
            print(f"  H1 rotation from {len(h1_rot_files)} grid file(s)...")
            d_rx, col_map_rx, covered_rot_x = merge_grid_data(h1_rot_files, id_to_index)
            print(f"  H2 rotation from {len(h2_rot_files)} grid file(s)...")
            d_ry, col_map_ry, covered_rot_y = merge_grid_data(h2_rot_files, id_to_index)
            print(f"  V rotation from {len(v_rot_files)} grid file(s)...")
            d_rz, col_map_rz, covered_rot_z = merge_grid_data(v_rot_files, id_to_index)

            if d_rx is None or d_ry is None or d_rz is None:
                print(f"  ⚠ Rotation data incomplete, will create empty rotation data")
                has_rotation = False
                d_rx = np.zeros((num_frames, num_nodes), dtype=np.float32)
                d_ry = np.zeros((num_frames, num_nodes), dtype=np.float32)
                d_rz = np.zeros((num_frames, num_nodes), dtype=np.float32)
                missing_rot_node_indices = []
            else:
                missing_rot_node_indices = compute_missing_node_indices(num_nodes, id_to_index, covered_rot_x, covered_rot_y, covered_rot_z)
        else:
            has_rotation = False
            d_rx = np.zeros((num_frames, num_nodes), dtype=np.float32)
            d_ry = np.zeros((num_frames, num_nodes), dtype=np.float32)
            d_rz = np.zeros((num_frames, num_nodes), dtype=np.float32)
            missing_rot_node_indices = []

        # Grid data is already node-aligned from merge_grid_data
        aligned_lx = d_lx
        aligned_ly = d_ly
        aligned_lz = d_lz
        aligned_rx = d_rx
        aligned_ry = d_ry
        aligned_rz = d_rz

    else:
        print(f"  Format: Entire (single file per component)")

        # Verify linear files exist
        print(f"\nVerifying linear files:")
        for f in lin_files:
            exists = "✓" if os.path.exists(f) else "✗"
            print(f"  {exists} {f}")
            if not os.path.exists(f):
                print(f"❌ Skipping {type_name}: File not found: {f}")
                return

        # Check rotation files
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

        f_lx, f_ly, f_lz = lin_files[0], lin_files[1], lin_files[2]

        col_map_x, _ = parse_ladwp_header(f_lx)
        col_map_y, _ = parse_ladwp_header(f_ly)
        col_map_z, _ = parse_ladwp_header(f_lz)

        print(f"Loading Linear Data...")
        d_lx, _ = load_ladwp_data(f_lx, col_map_x)
        d_ly, _ = load_ladwp_data(f_ly, col_map_y)
        d_lz, _ = load_ladwp_data(f_lz, col_map_z)

        num_frames = len(d_lx)
        num_nodes = len(id_to_index)
        missing_lin_node_indices = compute_missing_node_indices(num_nodes, id_to_index, col_map_x, col_map_y, col_map_z)

        if has_rotation:
            print(f"Loading Rotational Data...")
            f_rx, f_ry, f_rz = rot_files[0], rot_files[1], rot_files[2]
            col_map_rx, _ = parse_ladwp_header(f_rx)
            col_map_ry, _ = parse_ladwp_header(f_ry)
            col_map_rz, _ = parse_ladwp_header(f_rz)
            d_rx, _ = load_ladwp_data(f_rx, col_map_rx)
            d_ry, _ = load_ladwp_data(f_ry, col_map_ry)
            d_rz, _ = load_ladwp_data(f_rz, col_map_rz)
            missing_rot_node_indices = compute_missing_node_indices(num_nodes, id_to_index, col_map_rx, col_map_ry, col_map_rz)
        else:
            d_rx = np.zeros_like(d_lx)
            d_ry = np.zeros_like(d_lx)
            d_rz = np.zeros_like(d_lx)
            missing_rot_node_indices = []

        # Align data to global node index
        print("Interleaving data...")
        csv_cols = [-1] * num_nodes
        for col, nid in col_map_x.items():
            if nid in id_to_index:
                csv_cols[id_to_index[nid]] = col

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

    # Stack and write linear output
    stacked_lin = np.stack([aligned_lx, aligned_ly, aligned_lz], axis=2)
    buffer_lin = stacked_lin.flatten()

    header_lin = {
        "type": f"{type_name}_lin",
        "count_frames": num_frames,
        "count_nodes": num_nodes,
        "dt": 0.01,
        "missing_node_indices": missing_lin_node_indices,
    }
    write_bld_file(f"{file_key}_lin.bld", header_lin, buffer_lin.tobytes(), simulation_output_dir, dryrun)

    # Stack and write rotation output (only when rotation source files exist)
    if has_rotation:
        stacked_rot = np.stack([aligned_rx, aligned_ry, aligned_rz], axis=2)
        buffer_rot = stacked_rot.flatten()
        header_rot = {
            "type": f"{type_name}_rot",
            "count_frames": num_frames,
            "count_nodes": num_nodes,
            "dt": 0.01,
            "missing_node_indices": missing_rot_node_indices,
        }
        write_bld_file(f"{file_key}_rot.bld", header_rot, buffer_rot.tobytes(), simulation_output_dir, dryrun)


def process_simulation_response_type(task):
    """
    Thin wrapper for parallel execution of process_response_file.

    Accepts a single tuple argument so it can be submitted to a
    ThreadPoolExecutor with a single-argument callable.

    Parameters
    ----------
    args : tuple
        ``(file_key, type_name, id_to_index, files_config,
           simulation_output_dir)``

    Returns
    -------
    tuple
        ``(type_name, "success", None)`` on success, or
        ``(type_name, "error", exception)`` on failure.
    """
    file_key, type_name, id_to_index, files_config, simulation_output_dir, dryrun = task
    try:
        process_response_file(file_key, type_name, id_to_index, files_config, simulation_output_dir, dryrun)
        return (type_name, "success", None)
    except Exception as e:
        return (type_name, "error", e)
