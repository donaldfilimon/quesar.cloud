#!/bin/bash
# Prepare the pinned Bun lockfile in a fresh cloud checkout.
set -euo pipefail

cd "$(dirname "$0")/.."
env_file="${1:-}"
min_bun=1.4.2

bun_ok() {
  local version
  local release='^(0|[1-9][0-9]*)[.](0|[1-9][0-9]*)[.](0|[1-9][0-9]*)([+][0-9A-Za-z-]+([.][0-9A-Za-z-]+)*)?$'
  version="$(bun --version 2>/dev/null)" || return 1
  [[ "$version" =~ $release ]] || return 1
  version="${version%%+*}"
  [ "$(printf '%s\n%s\n' "$min_bun" "$version" | sort -V | head -n1)" = "$min_bun" ]
}

if ! bun_ok; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "session-start: Bun >= $min_bun or npm is required" >&2
    exit 1
  fi

  npm_bin="$(npm prefix -g)/bin"
  export PATH="$npm_bin:$PATH"
  hash -r
  if ! bun_ok; then
    echo "session-start: installing Bun $min_bun" >&2
    npm install -g "bun@$min_bun" >&2
    hash -r
  fi
  bun_ok || { echo "session-start: Bun >= $min_bun unavailable after upgrade" >&2; exit 1; }

  if [ -n "$env_file" ]; then
    printf -v path_export 'export PATH=%q:$PATH' "$npm_bin"
    if ! grep -Fqx -- "$path_export" "$env_file" 2>/dev/null; then
      printf '%s\n' "$path_export" >>"$env_file"
    fi
  fi
fi

bun install --frozen-lockfile >&2
