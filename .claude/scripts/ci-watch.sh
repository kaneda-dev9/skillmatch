#!/bin/bash
# PostToolUse hook: git push 後に CI を監視し、失敗時に修正を依頼する

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# git push 以外は無視
if ! echo "$COMMAND" | grep -qE '^git push'; then
  exit 0
fi

# 最新の workflow run を取得
sleep 3  # GitHub が run を登録するまで少し待つ
RUN_ID=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null)

if [ -z "$RUN_ID" ]; then
  exit 0
fi

# CI の完了を待つ（最大5分）
gh run watch "$RUN_ID" --exit-status > /dev/null 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"CI passed. All checks green."}}'
else
  # 失敗ログを取得
  FAILURE_LOG=$(gh run view "$RUN_ID" --log-failed 2>/dev/null | tail -50)
  FAILED_JOBS=$(gh run view "$RUN_ID" --json jobs --jq '[.jobs[] | select(.conclusion == "failure") | .name] | join(", ")' 2>/dev/null)

  # JSON安全にエスケープ
  ESCAPED_LOG=$(echo "$FAILURE_LOG" | jq -Rs .)
  ESCAPED_JOBS=$(echo "$FAILED_JOBS" | jq -Rs .)

  jq -n --argjson log "$ESCAPED_LOG" --argjson jobs "$ESCAPED_JOBS" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: ("CI FAILED.\n\nFailed jobs: " + $jobs + "\n\nFailure log (last 50 lines):\n" + $log + "\n\nFix the CI failures autonomously: read the errors, fix the code, run the failing checks locally to verify, then commit and push again.")
    }
  }'
fi
