#!/usr/bin/env bash
# Run the original browser entrypoint in a disposable detached worktree of the exact commit.
set -euo pipefail
source_tree=${1:-HEAD}
receipts=${2:?Pass an absolute output directory}
[[ "$receipts" = /* ]]
mkdir -p "$receipts"
receipts="$(realpath "$receipts")"
repo_root="$(git rev-parse --show-toplevel)"
git_common_dir="$(realpath "$(git -C "$repo_root" rev-parse --git-common-dir)")"
source_commit="$(git -C "$repo_root" rev-parse --verify "${source_tree}^{commit}")"
export EH_UI_VISUAL_SOURCE_TREE="$(git -C "$repo_root" rev-parse --verify "${source_commit}^{tree}")"
sandbox_base="$(mktemp -d "$(dirname "$receipts")/browser-checkout.XXXXXX")"
sandbox="$sandbox_base/$(basename "$sandbox_base")"
worktree_git_dir=""
cleanup() {
  cd / >/dev/null 2>&1 || true
  if [[ -n "$worktree_git_dir" || -d "$sandbox" ]]; then
    git -C "$repo_root" worktree remove --force "$sandbox" >/dev/null 2>&1 || true
  fi
  if [[ -n "$worktree_git_dir" && "$worktree_git_dir" == "$git_common_dir/worktrees/"* && -d "$worktree_git_dir" ]]; then
    rm -rf -- "$worktree_git_dir"
  fi
  rm -rf -- "$sandbox_base"
}
if [[ "${EH_UI_KEEP_HARNESS:-0}" = 1 ]]; then
  printf '%s\n' "$sandbox" > "$receipts/checkout.txt"
else
  trap cleanup EXIT
fi
git -C "$repo_root" worktree add --detach "$sandbox" "$source_commit"
worktree_git_dir="$(realpath "$(git -C "$sandbox" rev-parse --git-dir)")"
test "$(git -C "$sandbox" rev-parse --verify HEAD)" = "$source_commit"
test "$(git -C "$sandbox" rev-parse --verify "HEAD^{tree}")" = "$EH_UI_VISUAL_SOURCE_TREE"
cp "$sandbox/scripts/support/ui-demo-scenario-harness.ts" "$sandbox/apps/web/src/components/v2/demo-test-scenario.ts"
cd "$sandbox"
unset EH_UI_API_ORIGIN VERCEL
export NEXT_TELEMETRY_DISABLED=1
export EH_UI_CHROMIUM="${EH_UI_CHROMIUM:-/usr/bin/chromium}"
export UI_SCREENSHOT_DIR="$receipts/screens"
test "$(node -v)" = v24.22.3
test "$(pnpm -v)" = 10.34.6
pnpm install --offline --frozen-lockfile --ignore-scripts > "$receipts/install.log" 2>&1
pnpm --filter @egyhealth/web build > "$receipts/build.log" 2>&1
status=0
node scripts/test-ui-browser.mjs > "$receipts/browser.log" 2>&1 || status=$?
printf '%s\n' "$status" > "$receipts/browser.exit"
exit "$status"
