#!/bin/bash
# SessionStart hook for Claude Code on the web: make `bun run check` work in a
# fresh cloud container. bun.lock is lockfileVersion 2, which Bun < 1.4 cannot
# parse, and cloud images can ship an older Bun, so upgrade it first.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

bun_ok() {
  command -v bun >/dev/null 2>&1 || return 1
  local v major minor
  v="$(bun --version)"
  major="${v%%.*}"
  minor="$(echo "$v" | cut -d. -f2)"
  [ "$major" -gt 1 ] || { [ "$major" -eq 1 ] && [ "$minor" -ge 4 ]; }
}

if ! bun_ok; then
  echo "session-start: Bun $(bun --version 2>/dev/null || echo missing) is older than 1.4; upgrading" >&2
  npm install -g bun@latest >&2
  npm_bin="$(npm prefix -g)/bin"
  export PATH="$npm_bin:$PATH"
  # Keep the upgraded Bun ahead of any older copy for the rest of the session.
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export PATH=\"$npm_bin:\$PATH\"" >>"$CLAUDE_ENV_FILE"
  fi
  hash -r
fi
bun_ok || { echo "session-start: Bun >= 1.4 unavailable after upgrade" >&2; exit 1; }

bun install --frozen-lockfile >&2
