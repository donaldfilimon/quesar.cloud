#!/usr/bin/env bash
# A throwaway PostgreSQL for the Rust server's database tests.
#
#   scripts/dev-postgres.sh start   # prints postgres://quesar@127.0.0.1:<port>/postgres
#   scripts/dev-postgres.sh stop    # stops it and removes the data directory
#
# Trust auth on loopback, superuser `quesar`. Port: $QUESAR_TEST_PG_PORT or 54329.
# If TEST_DATABASE_URL is already set, `start` just prints it.
# PostgreSQL refuses to run as root, so as root the server runs as the `postgres`
# system user (the cloud container's case); otherwise as the current user.
# Exit codes: 2 usage, 3 no PostgreSQL binaries found, 4 server failed to start.
set -euo pipefail

port="${QUESAR_TEST_PG_PORT:-54329}"
url="postgres://quesar@127.0.0.1:${port}/postgres"

if [ "$(id -u)" = "0" ]; then
  as_root=1
  datadir="/tmp/quesar-dev-postgres-${port}"
else
  as_root=0
  datadir="${TMPDIR:-/tmp}/quesar-dev-postgres-$(id -u)-${port}"
  datadir="${datadir//\/\//\/}"
fi

# Runs a command as the user that owns the data directory.
as_pg() {
  if [ "$as_root" = "1" ]; then
    runuser -u postgres -- "$@"
  else
    "$@"
  fi
}

find_bin_dir() {
  if command -v initdb >/dev/null 2>&1 && command -v pg_ctl >/dev/null 2>&1; then
    dirname "$(command -v pg_ctl)"
    return 0
  fi
  local dir newest=""
  # Version-sorted, newest last (lexical order would put 9 after 16).
  for dir in $(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -t/ -k5,5n); do
    if [ -x "$dir/initdb" ] && [ -x "$dir/pg_ctl" ]; then
      newest="$dir"
    fi
  done
  if [ -n "$newest" ]; then
    echo "$newest"
    return 0
  fi
  return 1
}

start() {
  if [ -n "${TEST_DATABASE_URL:-}" ]; then
    echo "$TEST_DATABASE_URL"
    return 0
  fi
  local bin
  if ! bin="$(find_bin_dir)"; then
    echo "dev-postgres: initdb/pg_ctl not found on PATH or in /usr/lib/postgresql/*/bin; install PostgreSQL (e.g. brew install postgresql@16)." >&2
    exit 3
  fi

  if [ ! -f "$datadir/PG_VERSION" ]; then
    if [ "$as_root" = "1" ]; then
      mkdir -p "$datadir"
      chown postgres "$datadir"
    fi
    as_pg "$bin/initdb" -D "$datadir" -U quesar --auth=trust --encoding=UTF8 >/dev/null
  fi

  if ! as_pg "$bin/pg_ctl" -D "$datadir" status >/dev/null 2>&1; then
    # The socket directory is the data directory, so nothing else needs to be writable.
    if ! as_pg "$bin/pg_ctl" -D "$datadir" -l "$datadir/server.log" -w \
      -o "-c listen_addresses=127.0.0.1 -p ${port} -k ${datadir} -c fsync=off" start >/dev/null; then
      echo "dev-postgres: server failed to start; see ${datadir}/server.log" >&2
      exit 4
    fi
  fi
  echo "$url"
}

stop() {
  local bin
  if bin="$(find_bin_dir)" && [ -f "$datadir/PG_VERSION" ]; then
    as_pg "$bin/pg_ctl" -D "$datadir" -m fast -w stop >/dev/null 2>&1 || true
  fi
  rm -rf "$datadir"
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  *)
    echo "usage: scripts/dev-postgres.sh start|stop" >&2
    exit 2
    ;;
esac
