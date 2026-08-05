#!/usr/bin/env bash
# Push real API keys from apps/api/.env to the Railway `api` service.
#
# Usage:
#   1) cp apps/api/.env.example apps/api/.env   # then fill in real values
#   2) ./scripts/push-api-keys.sh               # from the repo root
#
# Why stdin: `railway variable set NAME --stdin` pipes values without ever
# putting them in argv, so secrets don't appear in shell history or ps output.
# Already-set variables are overwritten; empty values are skipped.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT/apps/api/.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "error: $ENV_FILE not found" >&2
  echo "Do: cp apps/api/.env.example apps/api/.env, fill in keys, then re-run." >&2
  exit 1
fi

KEYS=(
  GEMINI_API_KEY
  GEMINI_CHAT_MODEL
  GEMINI_EMBEDDING_MODEL
  OPENAI_API_KEY
  OPENAI_CHAT_MODEL
  OPENAI_EMBEDDING_MODEL
  OPENAI_TRANSCRIPTION_MODEL
  CLERK_ISSUER
  CLERK_SECRET_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_STORAGE_BUCKET
  YOUTUBE_API_KEY
)

export PATH="/opt/homebrew/bin:$PATH"

for key in "${KEYS[@]}"; do
  raw="$(grep -E "^${key}=" "$ENV_FILE" | head -n 1 | cut -d= -f2-)"
  raw="${raw%$'\r'}"
  value="${raw#\"}"; value="${value%\"}"
  if [ -z "$value" ]; then
    echo "skip $key (empty in $ENV_FILE)"
    continue
  fi
  if printf '%s' "$value" | railway variable set "$key" --stdin --service api --environment production >/dev/null 2>&1; then
    echo "set $key"
  else
    echo "FAILED $key" >&2
  fi
done

echo "Done. Verify with: railway variable list --service api"