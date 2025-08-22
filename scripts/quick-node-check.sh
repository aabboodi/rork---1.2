#!/bin/bash

# Quick Node.js Import Check for CI/CD
# This is the simplified version mentioned in Phase D requirements

echo "🔍 Checking for Node.js imports that break React Native/Expo..."

# Use ripgrep to check for Node.js imports
# Exit with code 1 if any are found (as specified in Phase D)
if rg -n "from ['\"](events|fs|path|crypto|net|tls|dns|child_process|os)['\"]" --type ts --type tsx --type js --type jsx . 2>/dev/null; then
    echo ""
    echo "❌ CRITICAL: Node.js imports detected!"
    echo "These will cause Metro bundler to fail."
    echo ""
    echo "Quick fixes:"
    echo "• events → Use services/events/EventBus (eventemitter3)"
    echo "• fs → Use expo-file-system"
    echo "• crypto → Use expo-crypto"
    echo "• path → Use string manipulation"
    echo "• os → Use expo-device or Platform API"
    echo ""
    exit 1
fi

# Also check for require() calls
if rg -n "require\\(['\"](?:events|fs|path|crypto|net|tls|dns|child_process|os)['\"]\\)" --type ts --type tsx --type js --type jsx . 2>/dev/null; then
    echo ""
    echo "❌ CRITICAL: Node.js require() calls detected!"
    echo "These will cause Metro bundler to fail."
    exit 1
fi

# Check for node: prefix imports
if rg -n "from ['\"]node:(?:events|fs|path|crypto|net|tls|dns|child_process|os)['\"]" --type ts --type tsx --type js --type jsx . 2>/dev/null; then
    echo ""
    echo "❌ CRITICAL: Node.js built-in imports with node: prefix detected!"
    echo "These are not available in React Native."
    exit 1
fi

echo "✅ No Node.js imports detected - safe for React Native/Expo"
exit 0