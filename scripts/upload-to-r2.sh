#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "Usage: $0 [option]"
  echo ""
  echo "Options:"
  echo "  all         Upload all files"
  echo "  touch       Touch all files to force re-upload (for metadata changes)"
  echo "  none        Don't upload"
  echo ""
  exit 1
}

if [ $# -eq 0 ]; then
  UPLOAD_MODE="all"
else
  UPLOAD_MODE="$1"
fi

case "$UPLOAD_MODE" in
all)
  echo "📤 Uploading all files to R2..."
  rclone copy "$SCRIPT_DIR/../data/binary" r2:quakes-binaries/ \
    --progress \
    --size-only \
    --include "*.bld" \
    --transfers 4 \
    --checkers 2 \
    --s3-chunk-size 64M \
    --s3-upload-cutoff 100M \
    --s3-upload-concurrency 16 \
    --stats 10s \
    --log-file rclone-upload.log \
    --log-level INFO
  ;;
touch)
  echo "🔄 Touching all files to force re-upload..."
  find "$SCRIPT_DIR/../data/binary" -type f -exec touch {} \;
  echo "📤 Uploading all files (forced by touch)..."
  rclone copy "$SCRIPT_DIR/../data/binary" r2:quakes-binaries/ \
    --progress \
    --include "*.bld" \
    --transfers 4 \
    --checkers 2 \
    --s3-chunk-size 64M \
    --s3-upload-cutoff 100M \
    --s3-upload-concurrency 16 \
    --stats 10s \
    --log-file rclone-upload.log \
    --log-level INFO
  ;;
none)
  echo "⏭️  Skipping upload"
  ;;
*)
  echo "❌ Unknown option: $UPLOAD_MODE"
  usage
  ;;
esac
