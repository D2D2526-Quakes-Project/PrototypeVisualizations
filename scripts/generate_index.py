#!/usr/bin/env python3
"""
Generate index.json from R2 bucket contents
Run this after uploading with rclone to create the index.json file
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List

import boto3
from dotenv import load_dotenv


def main():
    # Load environment variables
    load_dotenv()
    load_dotenv(dotenv_path=Path(__file__).parent / ".env")

    # Get R2 credentials
    access_key = os.getenv("R2_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
    endpoint = os.getenv("R2_ENDPOINT")
    bucket = os.getenv("R2_BUCKET")

    if not access_key or not secret_key or not endpoint or not bucket:
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
    base_url = endpoint.replace("https://", f"https://{bucket}.")

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
                    buildings[building_name] = {"data_type": "binary", "name": building_name, "folder": building_name, "building_data": None, "building_data_size": 0, "simulations": [], "size": 0}

                buildings[building_name]["building_data"] = url
                buildings[building_name]["building_data_size"] = size
                print(f"  ✓ Building: {building_name}/building.bld ({size:,} bytes)")

            elif len(parts) == 3:
                # Simulation file: building_name/sim_name/file.bld
                building_name = parts[0]
                sim_name = parts[1]
                file_name = parts[2]

                # Ensure building exists
                if building_name not in buildings:
                    buildings[building_name] = {"data_type": "binary", "name": building_name, "folder": building_name, "building_data": None, "building_data_size": 0, "simulations": [], "size": 0}

                # Find or create simulation
                sim = next((s for s in buildings[building_name]["simulations"] if s["name"] == sim_name), None)
                if not sim:
                    sim = {"name": sim_name, "folder": sim_name, "size": 0}
                    buildings[building_name]["simulations"].append(sim)

                # Determine file type from filename
                file_type = file_name.replace(".bld", "")

                # Map to correct field name
                if file_type == "ground_motion":
                    file_type = "groundMotion"

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
        building["size"] = building["building_data_size"] + sum(s["size"] for s in building["simulations"])

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
