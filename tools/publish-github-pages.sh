#!/usr/bin/env bash
set -euo pipefail

REPO="ashore1001/gpa-calculator"
REMOTE_URL="https://github.com/${REPO}.git"
SITE_URL="https://ashore1001.github.io/gpa-calculator/"

cd "$(dirname "$0")/.."

if ! command -v gh >/dev/null 2>&1; then
  echo "缺少 GitHub CLI。请先运行：brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI 还没登录。请先运行：gh auth login"
  exit 1
fi

git remote set-url origin "$REMOTE_URL" 2>/dev/null || git remote add origin "$REMOTE_URL"
git branch -M main

if ! git diff --quiet || ! git diff --cached --quiet; then
  git add index.html style.css script.js README.md AGENT_SETUP.md tools/check-agent-setup.sh tools/publish-github-pages.sh
  git commit -m "Add publishing setup"
fi

git fetch origin main >/dev/null 2>&1 || true

# The GitHub repository may contain a placeholder README created before the
# local project was pushed. Replace that placeholder with this local history.
git push -u origin main --force-with-lease

if gh api "repos/${REPO}/pages" >/dev/null 2>&1; then
  gh api \
    --method PUT \
    "repos/${REPO}/pages" \
    -f source[branch]=main \
    -f source[path]=/
else
  gh api \
    --method POST \
    "repos/${REPO}/pages" \
    -f source[branch]=main \
    -f source[path]=/
fi

echo
echo "GitHub Pages 已配置。公开网站地址："
echo "$SITE_URL"
echo "第一次发布可能需要 1 到 3 分钟生效。"
