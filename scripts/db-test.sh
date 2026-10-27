#!/usr/bin/env bash
# Builds a throwaway database from the Supabase migrations + seed and runs the
# database test suite (RLS, constraints, RPCs) against it.
#
# Plain PostgreSQL (default):  TEST_DB_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run test:db
# Local Supabase stack:        run `supabase db reset` first, then
#                              DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres SKIP_DB_BUILD=1 npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."

ADMIN_URL="${TEST_DB_ADMIN_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"
DB_NAME="${TEST_DB_NAME:-beauty_shelf_test}"

if [[ "${SKIP_DB_BUILD:-0}" != "1" ]]; then
  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB_NAME with (force);" -c "create database $DB_NAME;"
  DB_URL="${ADMIN_URL%/*}/$DB_NAME"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/shim/vanilla_postgres_shim.sql
  for f in supabase/migrations/*.sql; do
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"
  done
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
  export DATABASE_URL="$DB_URL"
fi

node --test supabase/tests/*.test.mjs
