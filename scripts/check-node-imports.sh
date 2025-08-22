#!/bin/bash

# Pre-commit hook to prevent Node.js imports in React Native/Expo code
# This script checks for Node.js module imports that would break the mobile app

echo "🔍 Checking for Node.js imports that could break React Native/Expo..."

# Define Node.js modules that are not available in React Native
NODE_MODULES=(
  "events"
  "fs" 
  "path"
  "crypto"
  "child_process"
  "net"
  "tls"
  "dns"
  "os"
  "http"
  "https"
  "url"
  "querystring"
  "stream"
  "buffer"
  "util"
  "zlib"
  "readline"
  "cluster"
  "worker_threads"
  "perf_hooks"
  "v8"
  "vm"
  "repl"
  "dgram"
  "timers"
  "console"
  "process"
  "assert"
)

# Check for imports in TypeScript/JavaScript files
FOUND_ISSUES=false

for module in "${NODE_MODULES[@]}"; do
  # Check for direct imports
  if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -l "import.*from.*['\"]${module}['\"]" 2>/dev/null; then
    echo "❌ Found Node.js import: ${module}"
    echo "   Use React Native/Expo alternatives instead:"
    case $module in
      "events")
        echo "   → Use services/events/EventBus instead"
        ;;
      "fs")
        echo "   → Use expo-file-system instead"
        ;;
      "crypto")
        echo "   → Use expo-crypto instead"
        ;;
      "os")
        echo "   → Use expo-device or Platform API instead"
        ;;
      "http"|"https")
        echo "   → Use fetch API or axios instead"
        ;;
      "path")
        echo "   → Use string manipulation or expo-file-system paths"
        ;;
      *)
        echo "   → This module is not available in React Native"
        ;;
    esac
    FOUND_ISSUES=true
  fi
  
  # Check for require() calls
  if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -l "require(['\"]${module}['\"])" 2>/dev/null; then
    echo "❌ Found Node.js require: ${module}"
    echo "   Use React Native/Expo alternatives instead"
    FOUND_ISSUES=true
  fi
  
  # Check for node: prefix imports
  if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -l "import.*from.*['\"]node:${module}['\"]" 2>/dev/null; then
    echo "❌ Found Node.js built-in import with node: prefix: ${module}"
    echo "   Node.js built-in modules are not available in React Native"
    FOUND_ISSUES=true
  fi
done

if [ "$FOUND_ISSUES" = true ]; then
  echo ""
  echo "🚫 Commit blocked: Node.js imports detected!"
  echo ""
  echo "These imports will cause the React Native/Expo app to fail during bundling."
  echo "Please use React Native/Expo compatible alternatives."
  echo ""
  echo "For more information, see the ESLint configuration in .eslintrc.security.js"
  echo "which includes comprehensive rules to prevent these issues."
  echo ""
  exit 1
fi

echo "✅ No Node.js imports detected. Safe to commit!"
exit 0