#!/usr/bin/env bash
set -euo pipefail

cd "/mnt/c/Users/3W - Daniel Vaz"
exec npx "@playwright/mcp@latest" --headless --no-sandbox --isolated "$@"
