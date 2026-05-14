#!/usr/bin/env bash
set -euo pipefail

STAGED="$(git diff --cached --name-only --diff-filter=ACMR)"
[[ -z "${STAGED}" ]] && exit 0

BAD=()
while IFS= read -r path; do
  [[ -z "${path}" ]] && continue
  if git check-ignore -q "$path"; then
    BAD+=("$path")
  fi
done <<< "$STAGED"

if (( ${#BAD[@]} > 0 )); then
  echo "Blocked: staged files match .gitignore:"
  printf ' - %s\n' "${BAD[@]}"
  exit 1
fi
