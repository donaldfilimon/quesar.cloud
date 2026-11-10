#!/usr/bin/env bash
# Smoke test for the Rust server (server/): start it against a built export and
# check the behaviour a reverse proxy and a browser depend on.
#
#   scripts/smoke.sh [site-dir]     # default: docs
#
# Needs a built export (`bun run build:static`) and cargo. Runs every check and
# exits non-zero if any failed.
#
# Two servers are started. The first has no database, so it checks the static
# site and what `/api/auth` answers without one. The second runs only when
# `scripts/dev-postgres.sh start` succeeds (PostgreSQL binaries installed): it
# gets a fresh `quesar_smoke` database and checks the auth API with curl.
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
DB_SERVER_PID=""
PG_STARTED=0
cleanup() {
  kill "${SERVER_PID}" 2>/dev/null || true
  [ -z "${DB_SERVER_PID}" ] || kill "${DB_SERVER_PID}" 2>/dev/null || true
  [ "${PG_STARTED}" = 1 ] && scripts/dev-postgres.sh stop >/dev/null 2>&1 || true
}
trap cleanup EXIT

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
body() { curl -s "$@"; }

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

# --- /api/auth without a database -------------------------------------------
# Only /methods answers; everything else is 503 AUTH_UNAVAILABLE (the origin and
# cross-site checks need the auth services, so they run in the database half).
check "methods answers 200" 200 "$(status "${BASE}/api/auth/methods")"
check "methods is JSON" "application/json" "$(header content-type "${BASE}/api/auth/methods")"
check "methods offers nothing without a database" '{"ok":true,"result":{"email":false,"passkey":false,"social":[]}}' \
  "$(body "${BASE}/api/auth/methods")"
check "sign-in without a database is 503" 503 \
  "$(status -X POST -H 'Origin: https://evil.example' "${BASE}/api/auth/sign-in")"
check "auth paths are JSON without a database" "application/json" \
  "$(header content-type "${BASE}/api/auth/nope")"

# --- /api/auth over a database ----------------------------------------------
# psql and openssl may be missing even when dev-postgres.sh finds a keg-only
# install, so check them before starting anything.
if command -v psql >/dev/null 2>&1 && command -v openssl >/dev/null 2>&1 \
  && pg_url="$(scripts/dev-postgres.sh start 2>/dev/null | tail -n 1)" && [ -n "${pg_url}" ]; then
  PG_STARTED=1
  smoke_url="${pg_url%/*}/quesar_smoke"
  psql "${pg_url}" -qc 'drop database if exists quesar_smoke' -c 'create database quesar_smoke' >/dev/null
  DB_PORT=$((PORT + 1))
  DB_BASE="http://127.0.0.1:${DB_PORT}"
  ORIGIN="${DB_BASE}"
  DATABASE_URL="${smoke_url}" QUESAR_MIGRATIONS_DIR=migrations RUST_LOG=warn \
    server/target/debug/quesar-server migrate >/dev/null
  # A throwaway Apple key so the Apple callback is configured; it signs nothing real.
  apple_key="$(openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt)"
  DATABASE_URL="${smoke_url}" PUBLIC_ORIGIN="${ORIGIN}" TRUSTED_PROXY=x-real-ip \
    APPLE_CLIENT_ID=smoke.example APPLE_TEAM_ID=SMOKETEAM01 APPLE_KEY_ID=SMOKEKEY01 \
    APPLE_PRIVATE_KEY="${apple_key}" \
    QUESAR_LISTEN="127.0.0.1:${DB_PORT}" QUESAR_SITE_DIR="${SITE_DIR}" RUST_LOG=warn \
    server/target/debug/quesar-server &
  DB_SERVER_PID=$!
  for _ in $(seq 1 50); do
    curl -fsS -o /dev/null "${DB_BASE}/api/readiness" 2>/dev/null && break
    sleep 0.1
  done
  A="${DB_BASE}/api/auth"
  JSON='Content-Type: application/json'

  check "cross-site sign-in is refused" 403 \
    "$(status -X POST -H 'Origin: https://evil.example' -H "${JSON}" -d '{}' "${A}/sign-in")"
  check "cross-site Fetch Metadata sign-in is refused" 403 \
    "$(status -X POST -H 'Sec-Fetch-Site: cross-site' -H "${JSON}" -d '{}' "${A}/sign-in")"
  check "Apple's form POST is accepted cross-site" 303 \
    "$(status -X POST -H 'Origin: https://appleid.apple.com' -H 'Sec-Fetch-Site: cross-site' \
      -d 'state=x&code=y' "${A}/callback/apple")"
  check "the same form POST to sign-in is refused" 403 \
    "$(status -X POST -H 'Origin: https://appleid.apple.com' -H 'Sec-Fetch-Site: cross-site' \
      -d 'state=x&code=y' "${A}/sign-in")"
  check "methods answers 200" 200 "$(status "${A}/methods")"
  check "methods is JSON" "application/json" "$(header content-type "${A}/methods")"
  check "an unknown auth path is 404" 404 "$(status "${A}/nope")"
  check "an unknown auth path is JSON" "application/json" "$(header content-type "${A}/nope")"
  check "a wrong method is 405" 405 "$(status -X DELETE "${A}/session")"

  signup_headers="$(curl -s -D - -o /dev/null -X POST -H "Origin: ${ORIGIN}" -H "${JSON}" \
    -d '{"name":"Smoke Test","email":"smoke@example.com","password":"smoke-test-password-2026"}' \
    "${A}/sign-up" | tr -d '\r')"
  check "sign-up answers 200" "HTTP/1.1 200 OK" "$(printf '%s\n' "${signup_headers}" | head -n 1)"
  # curl will not send a Secure cookie over http, so pass the pair by hand.
  cookie="$(printf '%s\n' "${signup_headers}" | awk -F': ' 'tolower($1) == "set-cookie" { split($2, p, ";"); print p[1]; exit }')"
  check "sign-up sets the session cookie" "yes" \
    "$(case "${cookie}" in __Host-quesar.session_token=?*) echo yes ;; *) echo no ;; esac)"
  check "session shows the user" "smoke@example.com" \
    "$(body -H "Cookie: ${cookie}" "${A}/session" | sed -n 's/.*"email":"\([^"]*\)".*/\1/p')"
  check "sign-out answers 200" 200 "$(status -X POST -H "Origin: ${ORIGIN}" -H "${JSON}" -d '{}' -H "Cookie: ${cookie}" "${A}/sign-out")"
  check "the session is null after sign-out" '{"ok":true,"result":null}' \
    "$(body -H "Cookie: ${cookie}" "${A}/session")"

  kill "${DB_SERVER_PID}" 2>/dev/null || true
  DB_SERVER_PID=""
  psql "${pg_url}" -qc 'drop database if exists quesar_smoke' >/dev/null
else
  echo "skip  database-backed auth checks (PostgreSQL, psql or openssl is not available)"
fi

if [ "${failures}" -gt 0 ]; then
  echo "smoke: ${failures} check(s) failed" >&2
  exit 1
fi
echo "smoke: all checks passed"
