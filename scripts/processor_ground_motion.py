"""
processor_ground_motion.py
==========================
Processor for ground motion time-series data.

Public functions
----------------
process_ground_motion(files_config, simulation_output_dir)
    Read ground_motion.txt, interleave the three translational components
    (X, Y, Z), and write ground_motion.bld.

Input file
----------
ground_motion.txt
    Whitespace-separated, no header.
    Four columns: time, x-component, y-component, z-component.
    Example row:  0.01  0.001234  -0.000567  0.000089

Output file
-----------
<simulation_output_dir>/ground_motion.bld
    Header : {"count_frames": N, "dt": 0.01}
    Binary : float32 interleaved [x, y, z, x, y, z, …] — N × 3 values
"""

import os

import numpy as np
import pandas as pd

from .shared import write_bld_file


def process_ground_motion(files_config, simulation_output_dir, *, args):
    """
    Read ground_motion.txt and write ground_motion.bld.

    The source file is expected to have four whitespace-delimited columns:
    ``time``, ``x``, ``y``, ``z``.  Only the last three columns are encoded;
    the time column is discarded (``dt`` is hard-coded to 0.01 s).

    Parameters
    ----------
    files_config : dict
        Simulation file-path configuration as returned by
        ``discovery.get_simulation_files()``.  The ``"ground_motion"`` key
        must map to the absolute path of ``ground_motion.txt``.
    simulation_output_dir : str
        Directory to write ``ground_motion.bld`` into.
    """
    print("\n--- Processing Ground Motion ---")
    motion_file = files_config.get("ground_motion")

    if not motion_file or not os.path.exists(motion_file):
        print("Ground Motion files not found, skipping.")
        return

    motion = pd.read_csv(motion_file, header=None, sep=r"\s+")

    num_frames = len(motion)

    buffer = np.zeros(num_frames * 3, dtype=np.float32)
    buffer[0::3] = motion.iloc[:, 1]
    buffer[1::3] = motion.iloc[:, 2]
    buffer[2::3] = motion.iloc[:, 3]

    header = {"count_frames": num_frames, "dt": 0.01}

    write_bld_file("ground_motion.bld", header, buffer.tobytes(), simulation_output_dir, args.dryrun)
