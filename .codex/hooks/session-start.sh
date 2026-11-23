#!/bin/bash
set -euo pipefail

if [ "${QUESAR_CODEX_CLOUD_BOOTSTRAP:-}" != 1 ]; then
  exit 0
fi

exec "$(dirname "$0")/../../scripts/bootstrap-bun.sh"
