#!/usr/bin/env python3
"""
Generate index.json from R2 bucket contents or local files.
Run this after uploading with rclone to create the index.json file.

Usage:
  python generate_index.py           # Generate from R2 bucket
  python generate_index.py --local    # Generate from local files
  python generate_index.py -l         # Generate from local files
  python generate_index.py --local /path/to/data  # Generate from specific local directory
"""

import argparse
import os
import sys
import json
from pathlib import Path
from typing import Dict, List

import boto3
from dotenv import load_dotenv


def to_camel_case(snake_str: str) -> str:
    """Convert snake_case string to camelCase"""
    components = snake_str.split("_")
    return components[0] + "".join(word.capitalize() for word in components[1:])


def main():
    parser = argparse.ArgumentParser(description="Generate index.json from R2 bucket or local files")
    parser.add_argument(
        "--local",
        "-l",
        nargs="?",
        const="default",
        default=None,
        help="Generate index from local files. Optional: specify local data directory path (default: data/binary)",
    )
    args = parser.parse_args()

    is_local = args.local is not None
    source_dir = args.local if args.local and args.local != "default" else None

    if is_local:
        generate_local_index(source_dir)
    else:
        generate_r2_index()


def generate_local_index(source_dir: str | None = None):
    """Generate index.json from local files."""
    import shutil

    script_dir = Path(__file__).parent
    project_root = script_dir.parent if script_dir.name == "scripts" else script_dir

    if source_dir:
        data_dir = Path(source_dir).resolve()
    else:
        data_dir = project_root / "data" / "binary"

    public_data_dir = project_root / "public" / "data"
    index_out_dir = project_root / "src" / "data"

    if not data_dir.exists():
        print(f"❌ Data directory not found: {data_dir}")
        sys.exit(1)

    print("=" * 70)
    print("Generate index.json from Local Files")
    print("=" * 70)
    print()
    print(f"Source directory: {data_dir}")
    print(f"Public data directory: {public_data_dir}")
    print()

    if public_data_dir.exists():
        print(f"Removing existing public/data directory...")
        shutil.rmtree(public_data_dir)

    print(f"Copying data files to public/data...")
    shutil.copytree(data_dir, public_data_dir)
    print(f"✓ Copied data files")
    print()

    buildings: Dict[str, dict] = {}
    total_files = 0

    for building_dir in sorted(data_dir.iterdir()):
        if not building_dir.is_dir():
            continue

        building_name = building_dir.name

        building_file = building_dir / "building.bld"
        if not building_file.exists():
            print(f"⏭️  Skipping {building_name}: no building.bld found")
            continue

        building_size = building_file.stat().st_size
        buildings[building_name] = {
            "data_type": "binary",
            "name": building_name,
            "folder": building_name,
            "building_data": "building.bld",
            "building_data_size": building_size,
            "simulations": [],
            "size": 0,
        }
        print(f"  ✓ Building: {building_name}/building.bld ({building_size:,} bytes)")

        for sim_dir in sorted(building_dir.iterdir()):
            if not sim_dir.is_dir():
                continue

            sim_name = sim_dir.name
            sim_files = {}
            sim_size = 0

            for bld_file in sorted(sim_dir.iterdir()):
                if not bld_file.suffix == ".bld":
                    continue

                file_name = bld_file.name
                file_size = bld_file.stat().st_size
                sim_size += file_size
                total_files += 1

                file_type = to_camel_case(file_name.replace(".bld", ""))
                sim_files[file_type] = file_name

            if sim_files:
                sim_entry = {"name": sim_name, "folder": sim_name, "size": sim_size, **sim_files}
                buildings[building_name]["simulations"].append(sim_entry)
                print(f"  ✓ Simulation: {building_name}/{sim_name}/ ({sim_size:,} bytes)")

    print()
    print(f"Found {total_files} total files")
    print(f"Organized into {len(buildings)} buildings")
    print()

    for building in buildings.values():
        building["size"] = building["building_data_size"] + sum(s["size"] for s in building["simulations"])

    index = {"$schema": "./index.schema.json", "buildings": list(buildings.values()), "size": sum(b["size"] for b in buildings.values())}

    output_file = index_out_dir / "index.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w") as f:
        json.dump(index, f, indent=2)

    print("=" * 70)
    print("Summary")
    print("=" * 70)
    print(f"Buildings: {len(buildings)}")
    print(f"Total size: {index['size']:,} bytes ({index['size'] / (1024**3):.2f} GB)")
    print()
    print(f"✅ Generated index.json")
    print(f"💾 Saved to: {output_file}")
    print("=" * 70)


def generate_r2_index():
    # Load environment variables
    load_dotenv()
    load_dotenv(dotenv_path=Path(__file__).parent / ".env")

    # Get R2 credentials
    access_key = os.getenv("R2_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
    endpoint = os.getenv("R2_ENDPOINT")
    bucket = os.getenv("R2_BUCKET")
    public_endpoint = os.getenv("R2_PUBLIC_ENDPOINT")

    if not access_key or not secret_key or not endpoint or not bucket or not public_endpoint:
        print("❌ Missing R2 credentials in .env file")
        sys.exit(1)

    print("=" * 70)
    print("Generate index.json from R2 Bucket")
    print("=" * 70)
    print()

    # Create S3 client
    print(f"Connecting to R2...")
    s3 = boto3.client("s3", endpoint_url=endpoint, aws_access_key_id=access_key, aws_secret_access_key=secret_key, region_name="auto")

    # Construct public URL base
    base_url = public_endpoint.rstrip("/")

    print(f"✓ Connected to bucket: {bucket}")
    print()

    # List all objects in bucket
    print("Listing all objects in bucket...")

    buildings: Dict[str, dict] = {}
    continuation_token = None
    total_objects = 0

    while True:
        # List objects (with pagination support)
        if continuation_token:
            response = s3.list_objects_v2(Bucket=bucket, ContinuationToken=continuation_token)
        else:
            response = s3.list_objects_v2(Bucket=bucket)

        objects = response.get("Contents", [])
        total_objects += len(objects)

        print(f"Processing {len(objects)} objects...")

        for obj in objects:
            key = obj["Key"]
            size = obj["Size"]
            url = f"{base_url}/{key}"

            parts = key.split("/")

            # Skip non-.bld files
            if not key.endswith(".bld"):
                print(f"⏭️  Skipping non-.bld file: {key}")
                continue

            if len(parts) == 2 and parts[1] == "building.bld":
                # Building file: building_name/building.bld
                building_name = parts[0]

                if building_name not in buildings:
                    buildings[building_name] = {
                        "data_type": "binary",
                        "name": building_name,
                        "folder": building_name,
                        "building_data": None,
                        "building_data_size": 0,
                        "extra_building_files_size": 0,
                        "simulations": [],
                        "size": 0,
                    }

                buildings[building_name]["building_data"] = url
                buildings[building_name]["building_data_size"] = size
                print(f"  ✓ Building: {building_name}/building.bld ({size:,} bytes)")

            elif len(parts) == 2:
                # Additional building-level file: building_name/<file>.bld
                building_name = parts[0]
                file_name = parts[1]

                if building_name not in buildings:
                    buildings[building_name] = {
                        "data_type": "binary",
                        "name": building_name,
                        "folder": building_name,
                        "building_data": None,
                        "building_data_size": 0,
                        "extra_building_files_size": 0,
                        "simulations": [],
                        "size": 0,
                    }

                file_type = to_camel_case(file_name.replace(".bld", ""))
                buildings[building_name][file_type] = url
                buildings[building_name]["extra_building_files_size"] = buildings[building_name].get("extra_building_files_size", 0) + size
                print(f"  ✓ Building extra: {building_name}/{file_name} ({size:,} bytes)")

            elif len(parts) == 3:
                # Simulation file: building_name/sim_name/file.bld
                building_name = parts[0]
                sim_name = parts[1]
                file_name = parts[2]

                # Ensure building exists
                if building_name not in buildings:
                    buildings[building_name] = {
                        "data_type": "binary",
                        "name": building_name,
                        "folder": building_name,
                        "building_data": None,
                        "building_data_size": 0,
                        "extra_building_files_size": 0,
                        "simulations": [],
                        "size": 0,
                    }

                # Find or create simulation
                sim = next((s for s in buildings[building_name]["simulations"] if s["name"] == sim_name), None)
                if not sim:
                    sim = {"name": sim_name, "folder": sim_name, "size": 0}
                    buildings[building_name]["simulations"].append(sim)

                # Determine file type from filename and convert to camelCase
                file_type = to_camel_case(file_name.replace(".bld", ""))

                # Add URL to simulation
                sim[file_type] = url
                sim["size"] = sim.get("size", 0) + size

                print(f"  ✓ Simulation: {building_name}/{sim_name}/{file_name} ({size:,} bytes)")

            else:
                print(f"⚠️  Unexpected key format: {key}")

        # Check if there are more objects to list
        if response.get("IsTruncated"):
            continuation_token = response.get("NextContinuationToken")
        else:
            break

    print()
    print(f"Found {total_objects} total objects")
    print(f"Organized into {len(buildings)} buildings")
    print()

    # Calculate total sizes for each building
    for building in buildings.values():
        building["size"] = building["building_data_size"] + building.get("extra_building_files_size", 0) + sum(s["size"] for s in building["simulations"])
        building.pop("extra_building_files_size", None)

    # Create index structure
    index = {"$schema": "./index.schema.json", "buildings": list(buildings.values()), "size": sum(b["size"] for b in buildings.values())}

    # Save to file
    script_dir = Path(__file__).parent
    project_root = script_dir.parent if script_dir.name == "scripts" else script_dir
    output_file = project_root / "src" / "data" / "index.json"

    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w") as f:
        json.dump(index, f, indent=2)

    print("=" * 70)
    print("Summary")
    print("=" * 70)
    print(f"Buildings: {len(buildings)}")
    print(f"Total size: {index['size']:,} bytes ({index['size'] / (1024**3):.2f} GB)")
    print()
    print(f"✅ Generated index.json")
    print(f"💾 Saved to: {output_file}")
    print("=" * 70)


if __name__ == "__main__":
    main()
