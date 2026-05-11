#!/usr/bin/env bash
set -euo pipefail

STAGED="$(git diff --cached --name-only --diff-filter=ACMR)"
[[ -z "${STAGED}" ]] && exit 0

BAD="$(printf '%s\n' "${STAGED}" | rg '(^|/)\.env($|\.|_)' || true)"
if [[ -n "${BAD}" ]]; then
  echo "Blocked: .env-like files are staged:"
  printf '%s\n' "${BAD}"
  exit 1
fi
