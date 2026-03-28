#!/bin/bash

# Performance Testing Suite for Rork App
# This script runs comprehensive performance tests using k6

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="$(dirname "$0")"
REPORTS_DIR="$TEST_DIR/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BASE_URL="http://localhost:8081"

# Create reports directory
mkdir -p "$REPORTS_DIR"

echo -e "${BLUE}🚀 Starting Performance Testing Suite${NC}"
echo -e "${BLUE}Timestamp: $TIMESTAMP${NC}"
echo -e "${BLUE}Target URL: $BASE_URL${NC}"
echo ""

# Function to check if k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}❌ k6 is not installed${NC}"
        echo -e "${YELLOW}Please install k6: https://k6.io/docs/getting-started/installation/${NC}"
        echo -e "${YELLOW}For Ubuntu/Debian: sudo apt-get install k6${NC}"
        echo -e "${YELLOW}For macOS: brew install k6${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ k6 is installed${NC}"
}

# Function to check if the app is running
check_app() {
    echo -e "${BLUE}🔍 Checking if app is running...${NC}"
    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ App is running at $BASE_URL${NC}"
    else
        echo -e "${YELLOW}⚠️  App might not be running at $BASE_URL${NC}"
        echo -e "${YELLOW}Please start your app with: bun expo start --web${NC}"
        echo -e "${YELLOW}Continuing with tests anyway...${NC}"
    fi
    echo ""
}

# Function to run a specific test
run_test() {
    local test_name="$1"
    local test_file="$2"
    local description="$3"
    
    echo -e "${BLUE}📊 Running $test_name${NC}"
    echo -e "${BLUE}Description: $description${NC}"
    echo ""
    
    local report_file="$REPORTS_DIR/${test_name}_${TIMESTAMP}.json"
    local html_report="$REPORTS_DIR/${test_name}_${TIMESTAMP}.html"
    
    # Run k6 test with JSON output
    if k6 run --out json="$report_file" "$test_file"; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        
        # Generate HTML report if possible
        if command -v k6-reporter &> /dev/null; then
            k6-reporter "$report_file" --output "$html_report"
            echo -e "${GREEN}📄 HTML report generated: $html_report${NC}"
        fi
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
    
    echo ""
}

# Function to generate summary report
generate_summary() {
    local summary_file="$REPORTS_DIR/performance_summary_${TIMESTAMP}.md"
    
    echo "# Performance Test Summary" > "$summary_file"
    echo "" >> "$summary_file"
    echo "**Date:** $(date)" >> "$summary_file"
    echo "**Target URL:** $BASE_URL" >> "$summary_file"
    echo "" >> "$summary_file"
    
    echo "## Test Results" >> "$summary_file"
    echo "" >> "$summary_file"
    
    # Parse JSON reports and extract key metrics
    for report in "$REPORTS_DIR"/*_"$TIMESTAMP".json; do
        if [[ -f "$report" ]]; then
            local test_name=$(basename "$report" .json | sed "s/_${TIMESTAMP}//")
            echo "### $test_name" >> "$summary_file"
            
            # Extract key metrics using jq if available
            if command -v jq &> /dev/null; then
                local avg_duration=$(jq -r '.metrics.http_req_duration.avg // "N/A"' "$report")
                local p95_duration=$(jq -r '.metrics.http_req_duration.p95 // "N/A"' "$report")
                local error_rate=$(jq -r '.metrics.http_req_failed.rate // "N/A"' "$report")
                local total_requests=$(jq -r '.metrics.http_reqs.count // "N/A"' "$report")
                
                echo "- **Average Response Time:** ${avg_duration}ms" >> "$summary_file"
                echo "- **95th Percentile:** ${p95_duration}ms" >> "$summary_file"
                echo "- **Error Rate:** $error_rate" >> "$summary_file"
                echo "- **Total Requests:** $total_requests" >> "$summary_file"
            else
                echo "- Report file: $(basename "$report")" >> "$summary_file"
            fi
            
            echo "" >> "$summary_file"
        fi
    done
    
    echo "## Recommendations" >> "$summary_file"
    echo "" >> "$summary_file"
    echo "Based on the test results, consider the following optimizations:" >> "$summary_file"
    echo "" >> "$summary_file"
    echo "- **High Response Times:** Optimize database queries, implement caching" >> "$summary_file"
    echo "- **High Error Rates:** Implement rate limiting, improve error handling" >> "$summary_file"
    echo "- **AI Processing:** Consider batching, async processing, or edge computing" >> "$summary_file"
    echo "- **Scaling:** Implement auto-scaling based on load metrics" >> "$summary_file"
    
    echo -e "${GREEN}📋 Summary report generated: $summary_file${NC}"
}

# Main execution
main() {
    check_k6
    check_app
    
    echo -e "${BLUE}🎯 Starting Performance Test Suite${NC}"
    echo ""
    
    # Run load test
    if run_test "load-test" "$TEST_DIR/k6-load-test.js" "Standard load testing with gradual ramp-up"; then
        echo -e "${GREEN}Load test passed${NC}"
    else
        echo -e "${RED}Load test failed${NC}"
    fi
    
    # Wait between tests
    echo -e "${YELLOW}⏳ Waiting 30 seconds before next test...${NC}"
    sleep 30
    
    # Run stress test
    if run_test "stress-test" "$TEST_DIR/stress-test.js" "Stress testing with high concurrent users"; then
        echo -e "${GREEN}Stress test passed${NC}"
    else
        echo -e "${RED}Stress test failed${NC}"
    fi
    
    # Wait between tests
    echo -e "${YELLOW}⏳ Waiting 30 seconds before next test...${NC}"
    sleep 30
    
    # Run spike test
    if run_test "spike-test" "$TEST_DIR/spike-test.js" "Spike testing with sudden traffic increases"; then
        echo -e "${GREEN}Spike test passed${NC}"
    else
        echo -e "${RED}Spike test failed${NC}"
    fi
    
    # Generate summary
    generate_summary
    
    echo -e "${GREEN}🎉 Performance testing suite completed!${NC}"
    echo -e "${BLUE}📁 Reports saved in: $REPORTS_DIR${NC}"
    echo ""
    
    # Display quick summary
    echo -e "${BLUE}📊 Quick Summary:${NC}"
    echo -e "${BLUE}- Load Test: Tests normal usage patterns${NC}"
    echo -e "${BLUE}- Stress Test: Tests system limits with high load${NC}"
    echo -e "${BLUE}- Spike Test: Tests resilience to sudden traffic spikes${NC}"
    echo ""
    
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo -e "${YELLOW}1. Review the generated reports${NC}"
    echo -e "${YELLOW}2. Identify performance bottlenecks${NC}"
    echo -e "${YELLOW}3. Implement optimizations${NC}"
    echo -e "${YELLOW}4. Re-run tests to validate improvements${NC}"
}

# Handle script arguments
case "${1:-all}" in
    "load")
        check_k6
        check_app
        run_test "load-test" "$TEST_DIR/k6-load-test.js" "Standard load testing"
        ;;
    "stress")
        check_k6
        check_app
        run_test "stress-test" "$TEST_DIR/stress-test.js" "Stress testing"
        ;;
    "spike")
        check_k6
        check_app
        run_test "spike-test" "$TEST_DIR/spike-test.js" "Spike testing"
        ;;
    "all")
        main
        ;;
    *)
        echo "Usage: $0 [load|stress|spike|all]"
        echo "  load   - Run load test only"
        echo "  stress - Run stress test only"
        echo "  spike  - Run spike test only"
        echo "  all    - Run all tests (default)"
        exit 1
        ;;
esac