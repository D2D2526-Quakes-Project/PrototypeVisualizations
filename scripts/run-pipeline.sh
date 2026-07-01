#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛠️  Quake Data Pipeline"
echo "======================"
echo

DRYRUN=false
GENERATE_MISSING=false
BUILDINGS=""
SIMULATIONS=""
METRICS=""

# Choose dryrun mode
if gum confirm "Run in dryrun mode (print actions without writing)?" --default=false; then
  DRYRUN=true
fi

# Choose generate missing only
if gum confirm "Only generate missing files?" --default=false; then
  GENERATE_MISSING=true
fi

# Choose buildings
echo
BUILDING_CHOICES=$(ls "$SCRIPT_DIR/../data/csv" 2>/dev/null || echo "")
if [ -z "$BUILDING_CHOICES" ]; then
  echo "⚠️  No building folders found in data/csv"
  exit 1
fi
while [ -z "$BUILDINGS" ]; do
  BUILDINGS=$(echo "$BUILDING_CHOICES" | gum choose --no-limit --header="Select buildings (required)")
  [ -z "$BUILDINGS" ] && echo "⚠️  At least one building must be selected."
done

# Choose simulations (if buildings selected)
if [ -n "$BUILDINGS" ]; then
  SIM_CHOICES=""
  for bld in $BUILDINGS; do
    sims=$(ls -d "$SCRIPT_DIR/../data/csv/$bld"/*/ 2>/dev/null | xargs -n1 basename 2>/dev/null || true)
    if [ -n "$sims" ]; then
      SIM_CHOICES="$SIM_CHOICES $sims"
    fi
  done

  if [ -n "$SIM_CHOICES" ]; then
    while [ -z "$SIMULATIONS" ]; do
      SIMULATIONS=$(echo "$SIM_CHOICES" | gum choose --no-limit --header="Select simulations (required)")
      [ -z "$SIMULATIONS" ] && echo "⚠️  At least one simulation must be selected."
    done
  fi
fi

# Choose metrics
echo
METRICS=$(gum choose --no-limit "all" "displacement" "velocity" "acceleration" "ground_motion" "hinge" "shear" "brb" "building" --header="Select metrics to generate")

# Build command
CMD="python -m scripts.generate_binary_data"
[ "$DRYRUN" = true ] && CMD="$CMD --dryrun"
[ "$GENERATE_MISSING" = true ] && CMD="$CMD --generate-missing-only"
[ -n "$BUILDINGS" ] && CMD="$CMD --building $BUILDINGS"
[ -n "$SIMULATIONS" ] && CMD="$CMD --simulation $SIMULATIONS"
[ -n "$METRICS" ] && CMD="$CMD --metrics $METRICS"

echo
echo "▶️  Running generate_binary_data.py..."
echo "   Command: $CMD"
echo

eval $CMD

# Upload to R2
echo
UPLOAD_MODE=$(gum choose --limit=1 "all" "touch" "none" --header="Select upload mode")
case "$UPLOAD_MODE" in
all)
  echo "▶️  Uploading to R2..."
  bash "$SCRIPT_DIR/upload-to-r2.sh" all
  ;;
touch)
  echo "▶️  Touching and uploading to R2..."
  bash "$SCRIPT_DIR/upload-to-r2.sh" touch
  ;;
none)
  echo "⏭️  Skipping upload"
  ;;
esac

# Generate index
echo
if gum confirm "Generate index?" --default=false; then
  echo "▶️  Generating index..."
  python "$SCRIPT_DIR/generate_index.py"
fi

echo
echo "✅ Pipeline complete!"
