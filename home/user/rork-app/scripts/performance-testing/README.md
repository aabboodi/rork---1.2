# Performance Testing with k6

## Quick Start

1. **Install k6**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install k6
   
   # macOS
   brew install k6
   
   # Windows
   choco install k6
   ```

2. **Make script executable**:
   ```bash
   chmod +x run-tests.sh
   ```

3. **Start your app**:
   ```bash
   bun expo start --web
   ```

4. **Run tests**:
   ```bash
   # Run all tests
   ./run-tests.sh
   
   # Run specific test
   ./run-tests.sh load
   ./run-tests.sh stress
   ./run-tests.sh spike
   ```

## Test Types

- **Load Test**: Normal usage patterns (10-20 users, 16 min)
- **Stress Test**: High load testing (up to 500 users, 16 min)
- **Spike Test**: Traffic spike resilience (up to 2000 users, 8 min)

## Reports

Results are saved in the `reports/` directory with timestamps.

## Thresholds

- **Load**: 95% requests < 500ms, error rate < 10%
- **Stress**: 95% requests < 2s, error rate < 30%
- **Spike**: 95% requests < 5s, error rate < 50%