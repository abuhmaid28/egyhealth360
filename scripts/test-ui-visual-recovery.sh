#!/usr/bin/env bash
# Run the original browser entrypoint in a disposable copy of the exact tree.
set -euo pipefail
source_tree=${1:-HEAD}
receipts=${2:?Pass an absolute output directory}
[[ "$receipts" = /* ]]
mkdir -p "$receipts"
receipts="$(realpath "$receipts")"
sandbox="$(mktemp -d "$(dirname "$receipts")/browser-checkout.XXXXXX")"
if [[ "${EH_UI_KEEP_HARNESS:-0}" = 1 ]]; then
  printf '%s\n' "$sandbox" > "$receipts/checkout.txt"
else
  trap 'rm -rf -- "$sandbox"' EXIT
fi
export EH_UI_VISUAL_SOURCE_TREE="$(git rev-parse "$source_tree^{tree}")"
git archive "$EH_UI_VISUAL_SOURCE_TREE" | tar -x -C "$sandbox"
cp "$sandbox/scripts/support/ui-demo-scenario-harness.ts" "$sandbox/apps/web/src/components/v2/demo-test-scenario.ts"
cd "$sandbox"
unset EH_UI_API_ORIGIN VERCEL
export NEXT_TELEMETRY_DISABLED=1
export EH_UI_CHROMIUM="${EH_UI_CHROMIUM:-/usr/bin/chromium}"
export UI_SCREENSHOT_DIR="$receipts/screens"
test "$(node -v)" = v24.21.0
test "$(pnpm -v)" = 10.34.6
pnpm install --offline --frozen-lockfile --ignore-scripts > "$receipts/install.log" 2>&1
pnpm --filter @egyhealth/web build > "$receipts/build.log" 2>&1
status=0
node scripts/test-ui-browser.mjs > "$receipts/browser.log" 2>&1 || status=$?
printf '%s\n' "$status" > "$receipts/browser.exit"
exit "$status"
