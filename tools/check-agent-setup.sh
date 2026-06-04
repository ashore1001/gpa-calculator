#!/usr/bin/env bash
set -euo pipefail

echo "== Codex 本机操作环境检查 =="

echo
echo "[1/5] Homebrew"
if command -v brew >/dev/null 2>&1; then
  brew --version | head -n 1
else
  echo "未安装 Homebrew"
fi

echo
echo "[2/5] Git"
if command -v git >/dev/null 2>&1; then
  git --version
else
  echo "未安装 Git"
fi

echo
echo "[3/5] GitHub CLI"
if command -v gh >/dev/null 2>&1; then
  gh --version | head -n 1
  gh auth status || true
else
  echo "未安装 gh。可运行：brew install gh"
fi

echo
echo "[4/5] 当前仓库"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status --short --branch
  git remote -v || true
else
  echo "当前目录不是 Git 仓库"
fi

echo
echo "[5/5] macOS 自动化权限提示"
echo "如果看到 osascript 不允许发送按键，需要在：系统设置 -> 隐私与安全性 -> 辅助功能，给启动 Codex 的应用授权。"

