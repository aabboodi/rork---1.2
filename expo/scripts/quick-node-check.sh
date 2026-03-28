#!/bin/bash

# Phase C - Quick Node.js Import Check
# Simplified version for CI/CD as specified in Phase D requirements

echo "🔍 Phase C: Quick check for Node.js imports incompatible with Expo Go v53..."

# Use ripgrep to check for Node.js imports
# Exit with code 1 if any are found (as specified in Phase D)
if rg -n "from ['\"](?:events|fs|path|crypto|net|tls|dns|child_process|os)['\"]" --type ts --type tsx --type js --type jsx . 2>/dev/null; then
    echo ""
    echo "💥 Phase C FAILED: Node.js imports detected!"
    echo "These will cause Metro bundler to fail in Expo Go v53."
    echo ""
    echo "Required fixes:"
    echo "• events → Use eventemitter3 (already installed)"
    echo "• fs → Use expo-file-system"
    echo "• crypto → Use expo-crypto"
    echo "• path → Use string manipulation"
    echo "• os → Use expo-device or Platform API"
    echo ""
    echo "Phase C requirement: No Node.js polyfills in Expo Go v53"
    echo ""
    exit 1
fi

# Also check for require() calls
if rg -n "require\\(['\"](?:events|fs|path|crypto|net|tls|dns|child_process|os)['\"]\\)" --type ts --type tsx --type js --type jsx . 2>/dev/null; then
    echo ""
    echo "💥 Phase C FAILED: Node.js require() calls detected!"
    echo "These will cause Metro bundler to fail in Expo Go v53."
    exit 1
fi

# Check for node: prefix imports
if rg -n "from ['\"]node:(?:events|fs|path|crypto|net|tls|dns|child_process|os)['\"]" --type ts --type tsx --type js --type jsx . 2>/dev/null; then
    echo ""
    echo "💥 Phase C FAILED: Node.js built-in imports with node: prefix detected!"
    echo "These are not available in Expo Go v53."
    exit 1
fi

echo "✅ Phase C PASSED: No Node.js imports detected - compatible with Expo Go v53"
exit 0