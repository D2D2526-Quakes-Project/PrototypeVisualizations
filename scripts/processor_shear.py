"""
processor_shear.py
==================
Processor for static per-floor shear summary data.

This module reads a pair of PERFORM-3D shear summary text files (one for each
horizontal direction), parses the per-story max/min values, aligns them to
the building's story order, computes cumulative shears from roof down, and
writes the result to shear_data.bld.

Public functions
----------------
parse_shear_summary_file(filepath)
    Parse a single PERFORM-3D shear summary file and return a dict of
    story → {max, min} values for column-section entries only.

process_shear_data(files_config, simulation_output_dir, story_order)
    Main entry point.  Loads both H1 and H2 shear files, merges them into
    story-aligned rows, applies cumulative summing, and writes shear_data.bld.

Required input files (per simulation)
--------------------------------------
Shears/<name>_H1M.txt
    PERFORM-3D shear summary for the H1 (X) direction.

Shears/<name>_H2M.txt
    PERFORM-3D shear summary for the H2 (Y) direction.

Both files must use the PERFORM column header format:
    Column, <N>, = section no., <type>, name = , <Story> Bottom - C
The "Bottom - C" suffix selects column-only shear sections.

Story label aliases
-------------------
Non-standard story names in the PERFORM output are mapped to canonical names
before matching against building_height.csv (see config.SHEAR_STORY_ALIASES).
For example, "Int Mezz" → "Mezzanine".

Output file
-----------
<simulation_output_dir>/shear_data.bld
    Header:
        count_rows  : int        — number of stories (= len(story_order))
        stride      : int        — 4 (h1Max, h1Min, h2Max, h2Min)
        fields      : list[str]  — field names in binary order
        story_order : list[str]  — bottom-to-top story labels
        units       : str        — "kip"

    Binary body:
        float32 rows in story_order sequence.
        Values are cumulative shears from the roof down (i.e., each story's
        value is the sum of shear contributions at that story and all stories
        above it).  Stories without data are NaN before cumulation (treated
        as 0 during cumulation).
        Fields per row: h1Max, h1Min, h2Max, h2Min
"""

import csv
import os
import re

import numpy as np

from .shared import SHEAR_STORY_ALIASES, write_bld_file


def normalize_shear_story_label(story_label):
    """
    Map a raw PERFORM story label to its canonical name.

    Applies the SHEAR_STORY_ALIASES lookup and strips surrounding whitespace.

    Parameters
    ----------
    story_label : str or any
        Raw story label from the PERFORM shear file.

    Returns
    -------
    str
        Canonical story label (possibly unchanged if no alias applies).
    """
    story = str(story_label).strip()
    return SHEAR_STORY_ALIASES.get(story, story)


def parse_shear_summary_file(filepath):
    """
    Parse a PERFORM-3D shear summary file into story→max/min value pairs.

    Only "column-only" shear sections are extracted.  These are lines whose
    section name matches the pattern::

        Story <label> Bottom - C

    The ``Maximum`` and ``Minimum`` rows at the end of the file are read and
    matched to the column headers by position.

    Parameters
    ----------
    filepath : str
        Absolute path to the shear summary text file.

    Returns
    -------
    dict[str, dict]
        ``{story_label: {"max": float32, "min": float32}}``
        Story labels are passed through ``normalize_shear_story_label`` before
        being returned.

    Raises
    ------
    ValueError
        If the file is missing Maximum/Minimum rows, if a column index is out
        of range, or if duplicate story labels appear (after alias mapping).
    """
    column_pattern = re.compile(r"^Column,\s*(\d+),\s*=\s*section no\.?,\s*[^,]+,\s*name\s*=\s*,?\s*(.*?)\s*$")
    story_pattern = re.compile(r"^Story\s+(.+?)\s+Bottom\s*-\s*C\s*$")
    columns = []
    maximum_values = None
    minimum_values = None

    with open(filepath, "r", encoding="utf-8-sig", errors="replace") as f:
        for raw_line in f:
            line = raw_line.strip()
            column_match = column_pattern.match(line)
            if column_match:
                column_number = int(column_match.group(1))
                section_name = column_match.group(2).strip()
                story_match = story_pattern.match(section_name)
                if story_match:
                    columns.append((column_number, normalize_shear_story_label(story_match.group(1))))
                continue

            if line.startswith("Maximum"):
                maximum_values = next(csv.reader([line]))[1:]
            elif line.startswith("Minimum"):
                minimum_values = next(csv.reader([line]))[1:]

    if maximum_values is None or minimum_values is None:
        raise ValueError(f"Shear file missing Maximum/Minimum rows: {filepath}")

    values_by_story = {}
    duplicate_stories = []
    for column_number, story in columns:
        value_index = column_number - 2
        if value_index < 0 or value_index >= len(maximum_values) or value_index >= len(minimum_values):
            raise ValueError(f"Shear column {column_number} is out of range for value rows in: {filepath}")

        if story in values_by_story:
            duplicate_stories.append(story)
            continue

        values_by_story[story] = {
            "max": np.float32(float(maximum_values[value_index])),
            "min": np.float32(float(minimum_values[value_index])),
        }

    if duplicate_stories:
        raise ValueError(f"Duplicate column-only shear stories in {filepath}: {sorted(set(duplicate_stories))}")

    return values_by_story


def process_shear_data(files_config, simulation_output_dir, story_order, *, args):
    """
    Process static per-floor shear summaries and write shear_data.bld.

    Workflow:
    1. Load the H1 and H2 shear summary files via parse_shear_summary_file.
    2. Validate that all source stories exist in building story_order.
    3. Align values to story_order rows (NaN for stories with no data).
    4. Apply cumulative summation from roof downward (NaN treated as 0).
    5. Write shear_data.bld.

    Parameters
    ----------
    files_config : dict
        Simulation file-path dict; the ``"shear"`` key must be a dict with
        ``"h1"`` and ``"h2"`` path entries.
    simulation_output_dir : str
        Directory to write ``shear_data.bld`` into.
    story_order : list[str]
        Bottom-to-top ordered story labels from the building processor.

    Raises
    ------
    ValueError
        If any story label in the shear files does not exist in story_order.
    """
    print("\n--- Processing Shear Data ---")
    shear_files = files_config.get("shear")
    if not shear_files:
        print("Shear summary files not found, skipping.")
        return

    h1_file = shear_files.get("h1")
    h2_file = shear_files.get("h2")
    if not h1_file or not h2_file or not os.path.exists(h1_file) or not os.path.exists(h2_file):
        print("Shear H1/H2 file pair incomplete, skipping.")
        return

    h1_by_story = parse_shear_summary_file(h1_file)
    h2_by_story = parse_shear_summary_file(h2_file)
    print(f"  H1 column-only story rows: {len(h1_by_story)}")
    print(f"  H2 column-only story rows: {len(h2_by_story)}")

    all_source_stories = set(h1_by_story.keys()) | set(h2_by_story.keys())
    unknown_stories = sorted(story for story in all_source_stories if story not in story_order)
    if unknown_stories:
        raise ValueError(f"Shear source contains stories not present in building metadata: {unknown_stories}")

    row_count = len(story_order)
    fields = ["h1Max", "h1Min", "h2Max", "h2Min"]
    stride = len(fields)
    encoded = np.full((row_count, stride), np.nan, dtype=np.float32)

    for story_index, story in enumerate(story_order):
        h1 = h1_by_story.get(story)
        h2 = h2_by_story.get(story)
        if h1:
            encoded[story_index, 0] = h1["max"]
            encoded[story_index, 1] = h1["min"]
        if h2:
            encoded[story_index, 2] = h2["max"]
            encoded[story_index, 3] = h2["min"]

    # Cumulative shear from roof down (NaN → 0 during summation)
    for col in range(stride):
        col_data = encoded[:, col].copy()
        print("Col_data", col, col_data)
        col_data = np.where(np.isnan(col_data), 0, col_data)
        print("Col_dat2", col, col_data)
        encoded[:, col] = np.cumsum(col_data[::-1])[::-1]
        print("Col_dat3", col, encoded[:, col])

    populated_rows = int(np.sum(~np.isnan(encoded).all(axis=1)))
    missing_stories = [story for story, row in zip(story_order, encoded) if np.isnan(row).all()]
    print(f"  Story-aligned shear rows: {populated_rows}/{row_count}")
    if missing_stories:
        print(f"  Missing shear stories: {missing_stories}")

    header = {
        "count_rows": row_count,
        "stride": stride,
        "fields": fields,
        "story_order": story_order,
        "units": "kip",
    }

    write_bld_file("shear_data.bld", header, encoded.flatten().tobytes(), simulation_output_dir, args.dryrun)
