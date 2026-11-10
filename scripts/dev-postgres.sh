#!/usr/bin/env bash
# A throwaway PostgreSQL for the Rust server's database tests.
#
#   scripts/dev-postgres.sh start   # prints postgres://quesar@127.0.0.1:<port>/postgres
#   scripts/dev-postgres.sh stop    # stops it and removes the data directory
#   scripts/dev-postgres.sh exec <cmd...>
#                                   # starts it, exports TEST_DATABASE_URL, runs <cmd>
#                                   # in place; a failed start exits with its status
#
# Trust auth on loopback, superuser `quesar`. Port: $QUESAR_TEST_PG_PORT or 54329.
# If TEST_DATABASE_URL is already set, `start` just prints it.
# PostgreSQL refuses to run as root, so as root the server runs as the `postgres`
# system user (the cloud container's case); otherwise as the current user.
# Exit codes: 2 usage, 3 no PostgreSQL binaries found, 4 server failed to start
# (`exec` passes those through, or the command's own status).
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

# Directories holding initdb and pg_ctl, newest version first: Debian-style
# /usr/lib/postgresql/<n>/bin, then Homebrew's postgresql@<n> kegs.
candidate_bin_dirs() {
  ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -t/ -k5,5nr || true
  local prefix
  prefix="$(brew --prefix 2>/dev/null || true)"
  if [ -n "$prefix" ]; then
    ls -d "$prefix"/opt/postgresql@*/bin 2>/dev/null | sort -t@ -k2,2nr || true
  fi
}

find_bin_dir() {
  if command -v initdb >/dev/null 2>&1 && command -v pg_ctl >/dev/null 2>&1; then
    dirname "$(command -v pg_ctl)"
    return 0
  fi
  local dir
  while IFS= read -r dir; do
    if [ -x "$dir/initdb" ] && [ -x "$dir/pg_ctl" ]; then
      echo "$dir"
      return 0
    fi
  done < <(candidate_bin_dirs)
  return 1
}

start() {
  if [ -n "${TEST_DATABASE_URL:-}" ]; then
    echo "$TEST_DATABASE_URL"
    return 0
  fi
  local bin
  if ! bin="$(find_bin_dir)"; then
    echo "dev-postgres: initdb/pg_ctl not found. Install PostgreSQL and put its bin directory on PATH (searched too: /usr/lib/postgresql/*/bin and Homebrew's postgresql@* kegs; e.g. brew install postgresql@16)." >&2
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
    # TCP only: no unix socket, so no socket directory has to be writable.
    if ! as_pg "$bin/pg_ctl" -D "$datadir" -l "$datadir/server.log" -w \
      -o "-c listen_addresses=127.0.0.1 -p ${port} -c unix_socket_directories='' -c fsync=off" start >/dev/null; then
      echo "dev-postgres: server failed to start; see ${datadir}/server.log (run scripts/dev-postgres.sh stop to reset)" >&2
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

# Starts the server, then replaces this process with the command, with
# TEST_DATABASE_URL set. A failed start ends here, so the command never runs
# against a missing database.
run_with_db() {
  local db
  db="$(start)" || exit $?
  export TEST_DATABASE_URL="$db"
  exec "$@"
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  exec)
    shift
    if [ "$#" -eq 0 ]; then
      echo "usage: scripts/dev-postgres.sh exec <command> [args...]" >&2
      exit 2
    fi
    run_with_db "$@"
    ;;
  *)
    echo "usage: scripts/dev-postgres.sh start|stop|exec <command...>" >&2
    exit 2
    ;;
esac
