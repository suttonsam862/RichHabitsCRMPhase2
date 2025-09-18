#!/bin/bash

# Phase 0 SEC-3: Pre-commit hook for secret scanning
# This script checks for exposed secrets before commits

echo "🔍 Checking for exposed secrets..."

# Pattern definitions for common secrets
PATTERNS=(
  # API Keys
  "sk-[a-zA-Z0-9]{48}"  # OpenAI
  "SG\.[a-zA-Z0-9]{22}\.[a-zA-Z0-9]{43}"  # SendGrid
  "AIza[0-9A-Za-z\\-_]{35}"  # Google API
  "xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}"  # Slack
  
  # Database URLs
  "postgres://[a-zA-Z0-9]+:[a-zA-Z0-9]+@"
  "postgresql://[a-zA-Z0-9]+:[a-zA-Z0-9]+@"
  
  # JWT secrets (base64 encoded)
  "eyJ[a-zA-Z0-9]+\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+"
  
  # AWS
  "AKIA[0-9A-Z]{16}"
  
  # Generic patterns
  "api[_-]?key['\"]?[[:space:]]*[:=][[:space:]]*['\"]?[a-zA-Z0-9]{32,}"
  "secret[_-]?key['\"]?[[:space:]]*[:=][[:space:]]*['\"]?[a-zA-Z0-9]{32,}"
  "password['\"]?[[:space:]]*[:=][[:space:]]*['\"]?[^[:space:]]+"
)

# Files to check (staged files only)
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|tsx|jsx|json|env|yaml|yml)$')

if [ -z "$FILES" ]; then
  echo "✅ No files to check"
  exit 0
fi

# Check each pattern
FOUND_SECRETS=0
for PATTERN in "${PATTERNS[@]}"; do
  for FILE in $FILES; do
    if [ -f "$FILE" ]; then
      MATCHES=$(grep -E "$PATTERN" "$FILE" 2>/dev/null | grep -v "process.env" | grep -v "example" | grep -v "mock")
      if [ ! -z "$MATCHES" ]; then
        echo "❌ Potential secret found in $FILE:"
        echo "$MATCHES"
        FOUND_SECRETS=1
      fi
    fi
  done
done

# Check for common secret file names
SECRET_FILES=$(echo "$FILES" | grep -E '\.env$|\.pem$|\.key$|\.cert$|credentials|secret')
if [ ! -z "$SECRET_FILES" ]; then
  echo "⚠️ Warning: Committing potential secret files:"
  echo "$SECRET_FILES"
  echo "Please ensure these files should be committed"
fi

if [ $FOUND_SECRETS -eq 1 ]; then
  echo ""
  echo "❌ Secret scan failed! Please remove secrets before committing."
  echo "If these are false positives, you can bypass with: git commit --no-verify"
  exit 1
fi

echo "✅ No secrets detected"
exit 0