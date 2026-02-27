#!/usr/bin/env bash
set -euo pipefail

SOUNDS_DIR="/System/Library/Sounds"

if [[ ! -d "$SOUNDS_DIR" ]]; then
  echo "Sounds directory not found: $SOUNDS_DIR" >&2
  exit 1
fi

for sound in "$SOUNDS_DIR"/*.aiff; do
  name="$(basename "$sound")"
  echo "==> $name"
  afplay "$sound"
  sleep 2
done

echo "Done."
