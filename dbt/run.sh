#!/usr/bin/env bash
# Helper script to run dbt commands locally.
# Usage: ./dbt/run.sh build --full-refresh
#        ./dbt/run.sh test
#        ./dbt/run.sh run --select sessions

set -euo pipefail
cd "$(dirname "$0")"

# Find dbt binary
if command -v dbt &>/dev/null; then
  DBT=dbt
elif [ -x "$HOME/Library/Python/3.9/bin/dbt" ]; then
  DBT="$HOME/Library/Python/3.9/bin/dbt"
else
  echo "Error: dbt not found. Install with: pip3 install dbt-bigquery"
  exit 1
fi

exec "$DBT" "$@" --profiles-dir .
