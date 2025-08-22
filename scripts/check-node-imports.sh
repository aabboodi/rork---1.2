#!/bin/bash

# Phase C - Expo Go v53 Compatibility Check
# This script prevents Node.js imports that are incompatible with Expo Go v53

echo "🔍 Phase C: Checking for Node.js imports incompatible with Expo Go v53..."

# Define Node.js modules that are not available in React Native/Expo Go
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
ERRORS_FOUND=0

# Function to check files (works with or without git)
check_files() {
    local pattern="$1"
    local search_type="$2"
    
    # Try git first, fallback to find if not in git repo
    if git rev-parse --git-dir > /dev/null 2>&1; then
        FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' || find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | grep -v .git)
    else
        FILES=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | grep -v .git)
    fi
    
    if [ ! -z "$FILES" ]; then
        echo "$FILES" | xargs grep -l "$pattern" 2>/dev/null || true
    fi
}

for module in "${NODE_MODULES[@]}"; do
  echo "Checking for '$module' imports..."
  
  # Check for direct imports: import ... from 'module'
  DIRECT_IMPORTS=$(check_files "import.*from.*['\"]${module}['\"]" "direct")
  
  # Check for require() calls: require('module')
  REQUIRE_IMPORTS=$(check_files "require(['\"]${module}['\"])" "require")
  
  # Check for node: prefix imports: import ... from 'node:module'
  NODE_PREFIX_IMPORTS=$(check_files "import.*from.*['\"]node:${module}['\"]" "node_prefix")
  
  if [ ! -z "$DIRECT_IMPORTS" ]; then
    echo "❌ Found Node.js import: ${module}"
    echo "   Files: $DIRECT_IMPORTS"
    echo "   Use Expo Go v53 compatible alternatives:"
    case $module in
      "events")
        echo "   → Use eventemitter3 package (already installed)"
        echo "   → Or use services/events/EventBus"
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
        echo "   → Use fetch API instead"
        ;;
      "path")
        echo "   → Use string manipulation or expo-file-system paths"
        ;;
      *)
        echo "   → This module is not available in Expo Go v53"
        ;;
    esac
    FOUND_ISSUES=true
    ERRORS_FOUND=1
  fi
  
  if [ ! -z "$REQUIRE_IMPORTS" ]; then
    echo "❌ Found Node.js require: ${module}"
    echo "   Files: $REQUIRE_IMPORTS"
    echo "   Use Expo Go v53 compatible alternatives"
    FOUND_ISSUES=true
    ERRORS_FOUND=1
  fi
  
  if [ ! -z "$NODE_PREFIX_IMPORTS" ]; then
    echo "❌ Found Node.js built-in import with node: prefix: ${module}"
    echo "   Files: $NODE_PREFIX_IMPORTS"
    echo "   Node.js built-in modules are not available in Expo Go v53"
    FOUND_ISSUES=true
    ERRORS_FOUND=1
  fi
done

# Additional checks for EventBus compatibility
echo "Checking EventBus compatibility..."
EVENT_EMITTER_USAGE=$(check_files "EventEmitter" "eventemitter" | xargs grep -l "EventEmitter" 2>/dev/null | xargs grep -L "eventemitter3" 2>/dev/null || true)

if [ ! -z "$EVENT_EMITTER_USAGE" ]; then
    echo "⚠️  Found potential Node.js EventEmitter usage:"
    echo "   Files: $EVENT_EMITTER_USAGE"
    echo "   → Use eventemitter3 package instead of Node.js events"
fi

# Summary
if [ $ERRORS_FOUND -eq 1 ]; then
    echo ""
    echo "💥 Phase C Failed: Node.js imports detected that are incompatible with Expo Go v53!"
    echo ""
    echo "These imports will cause the app to crash during bundling or runtime."
    echo "Expo Go v53 does not support Node.js built-in modules."
    echo ""
    echo "Required fixes:"
    echo "  1. Replace Node.js 'events' with 'eventemitter3'"
    echo "  2. Replace Node.js 'fs' with 'expo-file-system'"
    echo "  3. Replace Node.js 'crypto' with 'expo-crypto'"
    echo "  4. Use React Native APIs instead of Node.js APIs"
    echo ""
    echo "Phase C requirement: No Node.js polyfills allowed in Expo Go v53"
    echo ""
    exit 1
else
    echo ""
    echo "✅ Phase C Passed: No incompatible Node.js imports found."
    echo "✅ Code is compatible with Expo Go v53."
    echo ""
    exit 0
fi