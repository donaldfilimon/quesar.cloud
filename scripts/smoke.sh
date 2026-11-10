#!/usr/bin/env bash
# Smoke test for the Rust server (server/): start it against a built export and
# check the behaviour a reverse proxy and a browser depend on.
#
#   scripts/smoke.sh [site-dir]     # default: docs
#
# Needs a built export (`bun run build:static`) and cargo. Exits non-zero on
# the first failed check.
set -euo pipefail

cd "$(dirname "$0")/.."
SITE_DIR="${1:-docs}"
PORT="${SMOKE_PORT:-8797}"
BASE="http://127.0.0.1:${PORT}"

[ -f "${SITE_DIR}/index.html" ] || { echo "smoke: ${SITE_DIR}/index.html is missing; run bun run build:static" >&2; exit 2; }

cargo build --manifest-path server/Cargo.toml --locked --quiet
QUESAR_LISTEN="127.0.0.1:${PORT}" QUESAR_SITE_DIR="${SITE_DIR}" RUST_LOG=warn \
  server/target/debug/quesar-server &
SERVER_PID=$!
trap 'kill "${SERVER_PID}" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
  curl -fsS -o /dev/null "${BASE}/api/readiness" 2>/dev/null && break
  sleep 0.1
done

failures=0
# check <label> <expected> <actual>
check() {
  if [ "$2" = "$3" ]; then
    echo "ok    $1"
  else
    echo "FAIL  $1: expected '$2', got '$3'"
    failures=$((failures + 1))
  fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
header() { curl -s -o /dev/null -D - "${@:2}" | tr -d '\r' | awk -F': ' -v name="$1" 'tolower($1) == name { print $2; exit }'; }

check "readiness answers 200" 200 "$(status "${BASE}/api/readiness")"
check "readiness is never cached" "no-store" "$(header cache-control "${BASE}/api/readiness")"
check "home page" 200 "$(status "${BASE}/")"
check "page without trailing slash" 200 "$(status "${BASE}/docs")"
check "page with trailing slash" 200 "$(status "${BASE}/docs/")"
check "pages revalidate" "no-cache" "$(header cache-control "${BASE}/docs")"
check "unknown page is 404" 404 "$(status "${BASE}/no-such-page")"
check "404 is the export's HTML page" "text/html" "$(header content-type "${BASE}/no-such-page" | cut -d';' -f1)"
check "unknown api path is 404" 404 "$(status "${BASE}/api/no-such-endpoint")"
check "unknown api path is JSON" "application/json" "$(header content-type "${BASE}/api/no-such-endpoint")"
check "old docs intro redirects" 308 "$(status "${BASE}/docs/intro")"
check "traversal is refused" 404 "$(status --path-as-is "${BASE}/../package.json")"
check "encoded traversal is refused" 404 "$(status "${BASE}/%2e%2e/package.json")"
check "dotfiles are not served" 404 "$(status "${BASE}/.nojekyll")"
check "home page carries the report-only CSP" "yes" \
  "$([ -n "$(header content-security-policy-report-only "${BASE}/")" ] && echo yes || echo no)"
check "readiness carries no CSP" "" "$(header content-security-policy-report-only "${BASE}/api/readiness")"
check "POST to a page is refused" 405 "$(status -X POST "${BASE}/docs")"

asset="$(find "${SITE_DIR}/_next/static" -type f -name '*.js' -print -quit)"
if [ -n "${asset}" ]; then
  check "hashed assets are immutable" "public, max-age=31536000, immutable" \
    "$(header cache-control "${BASE}/${asset#"${SITE_DIR}"/}")"
fi

if [ "${failures}" -gt 0 ]; then
  echo "smoke: ${failures} check(s) failed" >&2
  exit 1
fi
echo "smoke: all checks passed"
