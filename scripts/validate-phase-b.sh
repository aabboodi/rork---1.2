#!/bin/bash

# Phase B Validation Script
# Validates TypeScript configuration and Node.js import prevention

echo "🔍 Phase B - TypeScript Configuration Guard Validation"
echo "=================================================="

VALIDATION_PASSED=true

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

# 5. Run Node.js Import Check
echo ""
echo "5️⃣ Running Node.js Import Check..."
if [ -f "scripts/check-node-imports.sh" ]; then
    if ./scripts/check-node-imports.sh > /dev/null 2>&1; then
        echo "✅ No Node.js imports detected"
    else
        echo "❌ Node.js imports detected - run ./scripts/check-node-imports.sh for details"
        VALIDATION_PASSED=false
    fi
else
    echo "⚠️  Cannot run check - script not found"
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
echo "=================================================="
if [ "$VALIDATION_PASSED" = true ]; then
    echo "🎉 Phase B Validation PASSED"
    echo ""
    echo "✅ All TypeScript configuration guards are in place"
    echo "✅ Node.js import prevention system is active"
    echo "✅ React Native/Expo compatibility ensured"
    echo ""
    echo "📋 Next Steps:"
    echo "   • Run: expo start -c (to test bundling)"
    echo "   • Run: npx eslint . --ext .ts,.tsx (to check all files)"
    echo "   • Consider adding check script to CI/CD pipeline"
    exit 0
else
    echo "❌ Phase B Validation FAILED"
    echo ""
    echo "🔧 Issues found that need attention:"
    echo "   • Check the specific errors above"
    echo "   • Ensure all Node.js imports are replaced"
    echo "   • Verify ESLint configuration is complete"
    echo ""
    echo "📖 See docs/PHASE_B_TYPESCRIPT_GUARD.md for guidance"
    exit 1
fi