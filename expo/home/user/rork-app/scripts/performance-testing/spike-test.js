import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Spike test metrics
const spikeErrors = new Rate('spike_errors');
const spikeResponseTime = new Trend('spike_response_time');
const spikeRequests = new Counter('spike_requests');
const recoveryTime = new Trend('recovery_time');

// Spike test configuration - sudden traffic spikes
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Normal load
    { duration: '30s', target: 1000 }, // Sudden spike!
    { duration: '1m', target: 1000 },  // Maintain spike
    { duration: '30s', target: 10 },   // Drop back to normal
    { duration: '2m', target: 10 },    // Recovery period
    { duration: '30s', target: 2000 }, // Even bigger spike!
    { duration: '1m', target: 2000 },  // Maintain bigger spike
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // Allow higher response times during spikes
    http_req_failed: ['rate<0.5'],     // Allow higher error rate during spikes
    spike_errors: ['rate<0.5'],
  },
};

const BASE_URL = 'http://localhost:8081';

let spikeStartTime = null;
let normalLoadTime = null;

export default function () {
  const currentVUs = __VU;
  const userId = `spike_user_${currentVUs}_${__ITER}`;
  
  // Detect spike conditions
  if (currentVUs > 500 && !spikeStartTime) {
    spikeStartTime = Date.now();
  }
  
  if (currentVUs <= 50 && spikeStartTime && !normalLoadTime) {
    normalLoadTime = Date.now();
    const recovery = normalLoadTime - spikeStartTime;
    recoveryTime.add(recovery);
  }
  
  // Run different test patterns based on load level
  if (currentVUs > 1000) {
    // During major spike - test critical functions only
    testCriticalFunctions(userId);
  } else if (currentVUs > 100) {
    // During moderate spike - test core features
    testCoreFeatures(userId);
  } else {
    // Normal load - test all features
    testAllFeatures(userId);
  }
  
  // Adaptive sleep based on load
  const sleepTime = currentVUs > 500 ? Math.random() * 0.1 : Math.random() * 0.5;
  sleep(sleepTime);
}

function testCriticalFunctions(userId) {
  // Only test the most critical functions during major spikes
  
  // 1. Authentication/Session check
  const authResponse = http.get(`${BASE_URL}/api/auth/status/${userId}`, {
    timeout: '3s',
  });
  
  trackSpikeMetrics(authResponse, 'auth_check');
  
  // 2. Basic message sending
  const messageResponse = http.post(`${BASE_URL}/api/messages`, JSON.stringify({
    userId: userId,
    message: 'Critical spike test message',
    timestamp: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '5s',
  });
  
  trackSpikeMetrics(messageResponse, 'critical_message');
}

function testCoreFeatures(userId) {
  // Test core features during moderate spikes
  
  // Messaging
  const messageResponse = http.post(`${BASE_URL}/api/messages`, JSON.stringify({
    userId: userId,
    message: 'Spike test message',
    timestamp: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '5s',
  });
  
  trackSpikeMetrics(messageResponse, 'message');
  
  // Wallet balance check
  const balanceResponse = http.get(`${BASE_URL}/api/wallet/${userId}/balance`, {
    timeout: '3s',
  });
  
  trackSpikeMetrics(balanceResponse, 'balance');
  
  // Basic security scan
  const securityResponse = http.post(`${BASE_URL}/api/security/analyze`, JSON.stringify({
    content: 'Test content',
    type: 'text',
    userId: userId,
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '8s',
  });
  
  trackSpikeMetrics(securityResponse, 'security');
}

function testAllFeatures(userId) {
  // Full feature testing during normal load
  
  // Messaging with AI analysis
  const messageResponse = http.post(`${BASE_URL}/api/messages`, JSON.stringify({
    userId: userId,
    message: 'Full feature test message with potential spam keywords: free money, click here',
    timestamp: new Date().toISOString(),
    enableAIAnalysis: true,
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  });
  
  trackSpikeMetrics(messageResponse, 'full_message');
  
  // Image analysis
  const imageResponse = http.post(`${BASE_URL}/api/ai/analyze-image`, JSON.stringify({
    imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    userId: userId,
    options: {
      provider: 'hybrid',
      enableFaceDetection: true,
      enableTextDetection: true,
    },
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '15s',
  });
  
  trackSpikeMetrics(imageResponse, 'image_analysis');
  
  // Wallet operations
  const walletResponse = http.post(`${BASE_URL}/api/wallet/send`, JSON.stringify({
    fromUserId: userId,
    toUserId: `recipient_${Math.floor(Math.random() * 10)}`,
    amount: 10,
    currency: 'USD',
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '5s',
  });
  
  trackSpikeMetrics(walletResponse, 'wallet_transaction');
  
  // Social media feed
  const feedResponse = http.get(`${BASE_URL}/api/social/feed/${userId}`, {
    timeout: '8s',
  });
  
  trackSpikeMetrics(feedResponse, 'social_feed');
  
  // Security risk assessment
  const riskResponse = http.get(`${BASE_URL}/api/security/risk-score/${userId}`, {
    timeout: '3s',
  });
  
  trackSpikeMetrics(riskResponse, 'risk_assessment');
}

function trackSpikeMetrics(response, operation) {
  spikeRequests.add(1);
  spikeResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    [`${operation} - status OK`]: (r) => r.status === 200 || r.status === 201,
    [`${operation} - response time acceptable`]: (r) => {
      // Different thresholds based on current load
      const threshold = __VU > 1000 ? 10000 : (__VU > 100 ? 5000 : 2000);
      return r.timings.duration < threshold;
    },
    [`${operation} - no timeout`]: (r) => r.status !== 0,
  });
  
  if (!success) {
    spikeErrors.add(1);
  }
  
  // Log critical failures during spikes
  if (!success && __VU > 500) {
    console.error(`SPIKE FAILURE: ${operation} failed with ${response.status} in ${response.timings.duration}ms at ${__VU} VUs`);
  }
}

// Setup function
export function setup() {
  console.log('Starting spike test...');
  console.log('Pattern: Normal → 1000 users → Normal → 2000 users → End');
  console.log('Testing system resilience to sudden traffic spikes');
  return {};
}

// Teardown with spike-specific analysis
export function teardown(data) {
  console.log('\n=== SPIKE TEST RESULTS ===');
  console.log(`Total spike requests: ${spikeRequests.count}`);
  console.log(`Spike error rate: ${(spikeErrors.rate * 100).toFixed(2)}%`);
  console.log(`Average spike response time: ${spikeResponseTime.avg.toFixed(2)}ms`);
  console.log(`95th percentile spike response time: ${spikeResponseTime.p(95).toFixed(2)}ms`);
  console.log(`Maximum spike response time: ${spikeResponseTime.max.toFixed(2)}ms`);
  
  if (recoveryTime.count > 0) {
    console.log(`Average recovery time: ${recoveryTime.avg.toFixed(2)}ms`);
  }
  
  // Spike resilience assessment
  console.log('\n=== SPIKE RESILIENCE ASSESSMENT ===');
  
  if (spikeErrors.rate < 0.2) {
    console.log('✅ EXCELLENT: System handled spikes very well (< 20% error rate)');
  } else if (spikeErrors.rate < 0.5) {
    console.log('⚠️  ACCEPTABLE: System survived spikes with degraded performance');
  } else {
    console.log('❌ POOR: System struggled with traffic spikes - needs optimization');
  }
  
  if (spikeResponseTime.p(95) < 5000) {
    console.log('✅ GOOD: Response times remained reasonable during spikes');
  } else {
    console.log('⚠️  SLOW: High response times during spikes - consider scaling improvements');
  }
  
  // Recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  if (spikeErrors.rate > 0.3) {
    console.log('• Implement rate limiting and request queuing');
    console.log('• Add auto-scaling capabilities');
    console.log('• Optimize database queries and caching');
  }
  
  if (spikeResponseTime.p(95) > 3000) {
    console.log('• Consider implementing circuit breakers');
    console.log('• Add CDN for static content');
    console.log('• Optimize AI processing with batching');
  }
  
  console.log('=== END SPIKE TEST ===\n');
}