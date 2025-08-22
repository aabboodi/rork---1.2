#!/bin/bash

# Phase B Validation Script - Enhanced
# Validates TypeScript configuration and Node.js import prevention
# Includes comprehensive Node.js import detection

set -e

echo "🔍 Phase B - TypeScript Configuration Guard Validation (Enhanced)"
echo "================================================================"

VALIDATION_PASSED=true
VIOLATIONS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Node.js modules that should not be imported in mobile code
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

# Mobile code directories (should not import Node.js modules)
MOBILE_DIRS=(
    "app"
    "components"
    "services"
    "store"
    "utils"
    "constants"
    "types"
)

# Function to check for Node.js imports in a file
check_file_for_node_imports() {
    local file="$1"
    local violations_in_file=0
    
    for module in "${NODE_MODULES[@]}"; do
        # Check for various import patterns
        if grep -q "import.*from ['\"]${module}['\"]" "$file" 2>/dev/null; then
            echo -e "${RED}❌ VIOLATION: $file imports Node.js module '${module}'${NC}"
            violations_in_file=$((violations_in_file + 1))
        fi
        
        if grep -q "import.*from ['\"]node:${module}['\"]" "$file" 2>/dev/null; then
            echo -e "${RED}❌ VIOLATION: $file imports Node.js module 'node:${module}'${NC}"
            violations_in_file=$((violations_in_file + 1))
        fi
        
        if grep -q "require(['\"]${module}['\"])" "$file" 2>/dev/null; then
            echo -e "${RED}❌ VIOLATION: $file requires Node.js module '${module}'${NC}"
            violations_in_file=$((violations_in_file + 1))
        fi
        
        if grep -q "require(['\"]node:${module}['\"])" "$file" 2>/dev/null; then
            echo -e "${RED}❌ VIOLATION: $file requires Node.js module 'node:${module}'${NC}"
            violations_in_file=$((violations_in_file + 1))
        fi
    done
    
    return $violations_in_file
}

# 1. Check ESLint Configuration
echo ""
echo "1️⃣ Checking ESLint Configuration..."
if [ -f ".eslintrc.security.js" ]; then
    if grep -q "no-restricted-imports" .eslintrc.security.js; then
        echo "✅ ESLint no-restricted-imports rule found"
        
        # Count blocked Node.js modules
        BLOCKED_COUNT=$(grep -c "name.*:" .eslintrc.security.js | head -1)
        echo "   📊 Blocking $BLOCKED_COUNT Node.js modules"
    else
        echo "❌ ESLint no-restricted-imports rule not found"
        VALIDATION_PASSED=false
    fi
else
    echo "❌ .eslintrc.security.js not found"
    VALIDATION_PASSED=false
fi

# 2. Check TypeScript Configuration
echo ""
echo "2️⃣ Checking TypeScript Configuration..."
if [ -f "tsconfig.json" ]; then
    echo "✅ Main tsconfig.json exists"
    
    # Check if it extends Expo base (expected)
    if grep -q "expo/tsconfig.base" tsconfig.json; then
        echo "✅ Extends Expo base configuration"
    else
        echo "⚠️  Does not extend Expo base (may be intentional)"
    fi
    
    # Check for explicit Node.js types (should not be present)
    if grep -q '"node"' tsconfig.json; then
        echo "❌ Contains Node.js types - this may cause issues"
        VALIDATION_PASSED=false
    else
        echo "✅ No explicit Node.js types found"
    fi
else
    echo "❌ tsconfig.json not found"
    VALIDATION_PASSED=false
fi

# 3. Check Pre-commit Hook
echo ""
echo "3️⃣ Checking Pre-commit Hook..."
if [ -f "scripts/check-node-imports.sh" ]; then
    echo "✅ Node.js import check script exists"
    
    if [ -x "scripts/check-node-imports.sh" ]; then
        echo "✅ Script is executable"
    else
        echo "⚠️  Script is not executable (run: chmod +x scripts/check-node-imports.sh)"
    fi
else
    echo "❌ scripts/check-node-imports.sh not found"
    VALIDATION_PASSED=false
fi

# 4. Check EventBus Implementation
echo ""
echo "4️⃣ Checking EventBus Implementation..."
if [ -f "services/events/EventBus.ts" ]; then
    echo "✅ EventBus replacement exists"
    
    # Check if it uses eventemitter3
    if grep -q "eventemitter3" services/events/EventBus.ts; then
        echo "✅ Uses eventemitter3 (React Native compatible)"
    else
        echo "⚠️  May not use React Native compatible event emitter"
    fi
else
    echo "❌ services/events/EventBus.ts not found"
    VALIDATION_PASSED=false
fi

# 5. Run Comprehensive Node.js Import Check
echo ""
echo "5️⃣ Running Comprehensive Node.js Import Check..."
echo "📱 Checking mobile code directories for Node.js imports..."

for dir in "${MOBILE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "🔍 Scanning $dir/..."
        
        # Find all TypeScript and JavaScript files
        while IFS= read -r -d '' file; do
            check_file_for_node_imports "$file"
            VIOLATIONS=$((VIOLATIONS + $?))
        done < <(find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -print0)
    fi
done

if [ $VIOLATIONS -eq 0 ]; then
    echo -e "${GREEN}✅ No Node.js imports detected in mobile code${NC}"
else
    echo -e "${RED}❌ Found $VIOLATIONS Node.js import violations${NC}"
    VALIDATION_PASSED=false
fi

# 6. Check Package Dependencies
echo ""
echo "6️⃣ Checking Package Dependencies..."
if [ -f "package.json" ]; then
    # Check for eventemitter3
    if grep -q "eventemitter3" package.json; then
        echo "✅ eventemitter3 dependency found"
    else
        echo "⚠️  eventemitter3 not found - may need to install"
    fi
    
    # Check for problematic Node.js packages
    PROBLEMATIC_PACKAGES=("fs-extra" "path" "crypto" "events")
    for pkg in "${PROBLEMATIC_PACKAGES[@]}"; do
        if grep -q "\"$pkg\"" package.json; then
            echo "❌ Found potentially problematic package: $pkg"
            VALIDATION_PASSED=false
        fi
    done
else
    echo "❌ package.json not found"
    VALIDATION_PASSED=false
fi

# 7. Documentation Check
echo ""
echo "7️⃣ Checking Documentation..."
DOCS_FOUND=0
if [ -f "docs/NODE_IMPORT_PREVENTION.md" ]; then
    echo "✅ Node.js import prevention guide exists"
    DOCS_FOUND=$((DOCS_FOUND + 1))
fi

if [ -f "docs/PHASE_B_TYPESCRIPT_GUARD.md" ]; then
    echo "✅ Phase B TypeScript guard documentation exists"
    DOCS_FOUND=$((DOCS_FOUND + 1))
fi

if [ $DOCS_FOUND -eq 0 ]; then
    echo "❌ No documentation found"
    VALIDATION_PASSED=false
fi

# Final Result
echo ""
echo "================================================================"
if [ "$VALIDATION_PASSED" = true ] && [ $VIOLATIONS -eq 0 ]; then
    echo -e "${GREEN}🎉 Phase B Validation PASSED${NC}"
    echo ""
    echo -e "${GREEN}✅ All TypeScript configuration guards are in place${NC}"
    echo -e "${GREEN}✅ Node.js import prevention system is active${NC}"
    echo -e "${GREEN}✅ React Native/Expo compatibility ensured${NC}"
    echo -e "${GREEN}✅ No Node.js imports found in mobile code${NC}"
    echo ""
    echo "📋 Next Steps:"
    echo "   • Run: expo start -c (to test bundling)"
    echo "   • Run: npx eslint . --ext .ts,.tsx (to check all files)"
    echo "   • Consider adding this script to CI/CD pipeline"
    echo "   • Add pre-commit hook: npm run validate:phase-b"
    exit 0
else
    echo -e "${RED}❌ Phase B Validation FAILED${NC}"
    echo ""
    echo "🔧 Issues found that need attention:"
    if [ $VIOLATIONS -gt 0 ]; then
        echo -e "${RED}   • Found $VIOLATIONS Node.js import violations${NC}"
        echo -e "${YELLOW}   💡 Recommended fixes:${NC}"
        echo "      • Replace 'events' with services/events/EventBus"
        echo "      • Replace 'fs' with expo-file-system"
        echo "      • Replace 'crypto' with expo-crypto"
        echo "      • Replace 'path' with string manipulation"
        echo "      • Replace 'os' with expo-device or Platform API"
        echo "      • Use fetch API instead of 'http'/'https'"
    fi
    echo "   • Check the specific errors above"
    echo "   • Ensure all Node.js imports are replaced"
    echo "   • Verify ESLint configuration is complete"
    echo ""
    echo "📖 See docs/PHASE_B_TYPESCRIPT_GUARD.md for guidance"
    exit 1
fi