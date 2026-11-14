#!/usr/bin/env bash
# Prepare career-tree/ for a static GitHub Pages build, then build it.
# Run only in CI on a throwaway checkout: it deletes and rewrites files.
#
# GitHub Pages serves plain files, so everything that needs a server is removed:
#   - app/api (the Suggest a path / Edit guide forms) and app/og (share images)
#   - ISR: every career and explore page is prerendered instead of 200
#   - the homepage's live Supabase counters (they show 0)
# Usage: PAGES_BASE_PATH=/Repo-Name scripts/pages-export.sh
set -euo pipefail
: "${PAGES_BASE_PATH:?set PAGES_BASE_PATH, e.g. /Open-Source-SCOPE-Career-Lab}"

cd "$(dirname "$0")/../career-tree"

rm -rf app/api app/og

for f in app/page.tsx "app/careers/[type]/[slug]/page.tsx" "app/explore/[type]/[slug]/page.tsx"; do
  sed -i -E '/^export const revalidate = /d; s/^export const dynamicParams = true;/export const dynamicParams = false;/' "$f"
done
sed -i -E 's/^const PRERENDER_LIMIT = [0-9]+;/const PRERENDER_LIMIT = Number.MAX_SAFE_INTEGER;/' lib/v2/prerender.ts

# Plain (non-next/link) paths to files in public/ need the base path.
sed -i "s#src=\"/icon.png\"#src=\"${PAGES_BASE_PATH}/icon.png\"#" components/v2/V2FocusView.tsx
sed -i "s#src: \"/#src: \"${PAGES_BASE_PATH}/#g" app/manifest.ts

npx next build
touch out/.nojekyll
