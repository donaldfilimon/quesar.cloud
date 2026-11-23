#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"
exec "$project_dir/scripts/bootstrap-bun.sh" "${CLAUDE_ENV_FILE:-}"
