#!/usr/bin/env bash
# Run Seclusa Word Puzzle unit tests with the ambr3-dev Node toolchain when available.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f /home/ambr3/ambr3-dev/tools/env.sh ]]; then
  # shellcheck source=/dev/null
  source /home/ambr3/ambr3-dev/tools/env.sh
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node not found. Install Node or source ambr3-dev/tools/env.sh" >&2
  exit 127
fi

echo "node $(node --version)"
# Explicit globs — `node --test test/` mis-resolves when the path contains spaces.
exec node --test test/*.test.mjs
