#!/bin/bash

# Phase D - CI Gate & Tests (≤200k)
# Automated tests to prevent Node.js imports in mobile codebase
# This script is designed to run in CI/CD pipelines

set -e  # Exit on any error

echo "🚀 Phase D - CI Gate & Tests Starting..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
ERROR_DETAILS=()

# Function to log results
log_check() {
    local status=$1
    local message=$2
    local details=$3
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
        if [ -n "$details" ]; then
            echo -e "   ${YELLOW}Details:${NC} $details"
            ERROR_DETAILS+=("$message: $details")
        fi
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
        if [ -n "$details" ]; then
            echo -e "   ${YELLOW}Details:${NC} $details"
        fi
    else
        echo -e "${BLUE}ℹ️  INFO${NC}: $message"
    fi
}

# Check 1: Automated test for Node.js imports using ripgrep
echo -e "\n${BLUE}🔍 Check 1: Scanning for Node.js imports...${NC}"

# Define Node.js modules to check
NODE_MODULES=(
    "events" "fs" "path" "crypto" "child_process" "net" "tls" "dns" "os"
    "http" "https" "url" "querystring" "stream" "buffer" "util" "zlib"
    "readline" "cluster" "worker_threads" "perf_hooks" "v8" "vm" "repl"
    "dgram" "timers" "console" "process" "assert"
)

# Check for direct imports
FOUND_IMPORTS=false
for module in "${NODE_MODULES[@]}"; do
    # Check for ES6 imports
    if rg -n "from ['\"]${module}['\"]" --type ts --type js --type tsx --type jsx . 2>/dev/null; then
        log_check "FAIL" "Found ES6 import of Node.js module: ${module}" "Use React Native/Expo alternatives"
        FOUND_IMPORTS=true
    fi
    
    # Check for CommonJS require
    if rg -n "require\\(['\"]${module}['\"]\\)" --type ts --type js --type tsx --type jsx . 2>/dev/null; then
        log_check "FAIL" "Found CommonJS require of Node.js module: ${module}" "Use React Native/Expo alternatives"
        FOUND_IMPORTS=true
    fi
    
    # Check for node: prefix imports
    if rg -n "from ['\"]node:${module}['\"]" --type ts --type js --type tsx --type jsx . 2>/dev/null; then
        log_check "FAIL" "Found node: prefix import: ${module}" "Node.js built-ins not available in React Native"
        FOUND_IMPORTS=true
    fi
done

if [ "$FOUND_IMPORTS" = false ]; then
    log_check "PASS" "No Node.js imports detected in mobile code"
fi

# Check 2: Verify EventBus implementation exists
echo -e "\n${BLUE}🔍 Check 2: Verifying EventBus implementation...${NC}"

if [ -f "services/events/EventBus.ts" ]; then
    # Check if EventBus uses eventemitter3
    if grep -q "eventemitter3" "services/events/EventBus.ts"; then
        log_check "PASS" "EventBus implementation found and uses eventemitter3"
    else
        log_check "FAIL" "EventBus exists but doesn't use eventemitter3" "Should import from 'eventemitter3'"
    fi
    
    # Check if EventBus has proper TypeScript types
    if grep -q "EventMap" "services/events/EventBus.ts"; then
        log_check "PASS" "EventBus has proper TypeScript event mapping"
    else
        log_check "WARN" "EventBus missing EventMap type definitions" "Consider adding typed events"
    fi
else
    log_check "FAIL" "EventBus implementation not found" "Create services/events/EventBus.ts"
fi

# Check 3: Verify eventemitter3 dependency
echo -e "\n${BLUE}🔍 Check 3: Verifying eventemitter3 dependency...${NC}"

if [ -f "package.json" ]; then
    if grep -q '"eventemitter3"' package.json; then
        log_check "PASS" "eventemitter3 dependency found in package.json"
    else
        log_check "FAIL" "eventemitter3 dependency missing" "Run: npm install eventemitter3"
    fi
else
    log_check "FAIL" "package.json not found" "Invalid project structure"
fi

# Check 4: ESLint configuration validation
echo -e "\n${BLUE}🔍 Check 4: Validating ESLint configuration...${NC}"

if [ -f ".eslintrc.security.js" ]; then
    # Check if no-restricted-imports rule exists
    if grep -q "no-restricted-imports" ".eslintrc.security.js"; then
        log_check "PASS" "ESLint no-restricted-imports rule configured"
        
        # Check specific Node.js modules are blocked
        BLOCKED_MODULES=0
        for module in "events" "fs" "crypto" "path" "os"; do
            if grep -q "'name': '${module}'" ".eslintrc.security.js"; then
                BLOCKED_MODULES=$((BLOCKED_MODULES + 1))
            fi
        done
        
        if [ $BLOCKED_MODULES -ge 5 ]; then
            log_check "PASS" "Core Node.js modules properly blocked in ESLint"
        else
            log_check "WARN" "Some Node.js modules may not be blocked" "Check .eslintrc.security.js configuration"
        fi
    else
        log_check "FAIL" "ESLint no-restricted-imports rule not found" "Add Node.js import restrictions"
    fi
else
    log_check "FAIL" "ESLint security configuration not found" "Create .eslintrc.security.js"
fi

# Check 5: TypeScript configuration validation
echo -e "\n${BLUE}🔍 Check 5: Validating TypeScript configuration...${NC}"

if [ -f "tsconfig.json" ]; then
    # Check if @types/node is excluded from mobile code
    if ! grep -q '"@types/node"' tsconfig.json; then
        log_check "PASS" "@types/node not included in mobile TypeScript config"
    else
        log_check "WARN" "@types/node found in tsconfig.json" "Consider excluding for mobile-only projects"
    fi
    
    # Check for proper types configuration
    if grep -q '"types"' tsconfig.json; then
        if grep -q '"react-native"' tsconfig.json; then
            log_check "PASS" "React Native types properly configured"
        else
            log_check "WARN" "React Native types not explicitly configured" "Consider adding react-native to types array"
        fi
    fi
else
    log_check "FAIL" "tsconfig.json not found" "TypeScript configuration missing"
fi

# Check 6: Package.json scripts validation
echo -e "\n${BLUE}🔍 Check 6: Validating package.json scripts...${NC}"

if [ -f "package.json" ]; then
    # Check for security-related scripts
    if grep -q '"lint:security"' package.json; then
        log_check "PASS" "Security linting script configured"
    else
        log_check "WARN" "Security linting script not found" "Add lint:security script"
    fi
    
    # Check for pre-commit hooks
    if grep -q '"pre-commit"' package.json; then
        log_check "PASS" "Pre-commit script configured"
    else
        log_check "WARN" "Pre-commit script not found" "Consider adding pre-commit validation"
    fi
fi

# Check 7: Metro bundler compatibility test
echo -e "\n${BLUE}🔍 Check 7: Testing Metro bundler compatibility...${NC}"

# Check if metro.config.js exists and has proper resolver configuration
if [ -f "metro.config.js" ]; then
    log_check "PASS" "Metro configuration found"
else
    log_check "INFO" "Metro configuration not found" "Using default Expo configuration"
fi

# Check 8: Validate React Native Web compatibility
echo -e "\n${BLUE}🔍 Check 8: Checking React Native Web compatibility...${NC}"

# Check for web-incompatible imports
WEB_INCOMPATIBLE=false

# Check for react-native-reanimated layout animations (web incompatible)
if rg -n "layout=" --type ts --type tsx . 2>/dev/null | grep -v "Platform.OS !== 'web'"; then
    log_check "WARN" "Potential react-native-reanimated layout animations found" "These may crash on web - use Platform checks"
    WEB_INCOMPATIBLE=true
fi

# Check for Animated SVG components (web incompatible)
if rg -n "Animated\.createAnimatedComponent.*Circle|Animated\.createAnimatedComponent.*Path" --type ts --type tsx . 2>/dev/null; then
    log_check "WARN" "Animated SVG components found" "These crash on web - use Platform checks"
    WEB_INCOMPATIBLE=true
fi

if [ "$WEB_INCOMPATIBLE" = false ]; then
    log_check "PASS" "No obvious web compatibility issues detected"
fi

# Check 9: Security-specific validations
echo -e "\n${BLUE}🔍 Check 9: Security-specific validations...${NC}"

# Check for hardcoded secrets (basic check)
if rg -i "(api[_-]?key|secret[_-]?key|password|token)\s*[:=]\s*['\"][a-zA-Z0-9]{20,}" --type ts --type tsx --type js --type jsx . 2>/dev/null; then
    log_check "FAIL" "Potential hardcoded secrets detected" "Remove hardcoded credentials"
else
    log_check "PASS" "No obvious hardcoded secrets detected"
fi

# Check for console.log in production code (security concern)
if rg -n "console\.log" --type ts --type tsx app/ components/ services/ 2>/dev/null | grep -v "__DEV__" | head -5; then
    log_check "WARN" "console.log statements found in production code" "Consider removing or wrapping in __DEV__ checks"
else
    log_check "PASS" "No problematic console.log statements found"
fi

# Check 10: Dependency security validation
echo -e "\n${BLUE}🔍 Check 10: Dependency security validation...${NC}"

# Check for known vulnerable packages (basic check)
VULNERABLE_PACKAGES=("lodash@4.17.20" "moment@2.29.1" "axios@0.21.0")
for pkg in "${VULNERABLE_PACKAGES[@]}"; do
    if grep -q "$pkg" package.json 2>/dev/null; then
        log_check "WARN" "Potentially vulnerable package detected: $pkg" "Update to latest secure version"
    fi
done

# Check if audit command exists in scripts
if grep -q '"audit"' package.json; then
    log_check "PASS" "Security audit script configured"
else
    log_check "WARN" "Security audit script not found" "Add npm audit to package.json scripts"
fi

# Final Summary
echo -e "\n${BLUE}📊 Phase D CI Gate Summary${NC}"
echo "================================================"
echo -e "Total Checks: ${TOTAL_CHECKS}"
echo -e "${GREEN}Passed: ${PASSED_CHECKS}${NC}"
echo -e "${RED}Failed: ${FAILED_CHECKS}${NC}"

if [ ${#ERROR_DETAILS[@]} -gt 0 ]; then
    echo -e "\n${RED}❌ Critical Issues Found:${NC}"
    for error in "${ERROR_DETAILS[@]}"; do
        echo -e "   • $error"
    done
fi

# Exit with appropriate code
if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "\n${RED}🚫 CI Gate FAILED: $FAILED_CHECKS critical issues must be resolved${NC}"
    echo -e "\n${YELLOW}Quick Fix Commands:${NC}"
    echo "1. Install eventemitter3: npm install eventemitter3"
    echo "2. Run ESLint: npx eslint . --ext .ts,.tsx,.js,.jsx --fix"
    echo "3. Remove Node.js imports and use React Native alternatives"
    echo "4. Check documentation: docs/NODE_IMPORT_PREVENTION.md"
    exit 1
else
    echo -e "\n${GREEN}✅ CI Gate PASSED: All critical checks successful${NC}"
    if [ $TOTAL_CHECKS -gt $PASSED_CHECKS ]; then
        echo -e "${YELLOW}Note: Some warnings were found - consider addressing them${NC}"
    fi
    exit 0
fi