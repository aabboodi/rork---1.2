import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for stress testing
const errorRate = new Rate('stress_errors');
const responseTime = new Trend('stress_response_time');
const requestCount = new Counter('stress_requests');
const concurrentUsers = new Trend('concurrent_users');

// Stress test configuration - aggressive load
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 300 },  // Stress test at 300 users
    { duration: '3m', target: 500 },  // Peak stress at 500 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s during stress
    http_req_failed: ['rate<0.3'],     // Allow higher error rate during stress
    stress_errors: ['rate<0.3'],
  },
};

const BASE_URL = 'http://localhost:8081';

// Stress test scenarios with higher intensity
export default function () {
  const userId = `stress_user_${__VU}_${__ITER}`;
  concurrentUsers.add(__VU);
  
  // Simulate heavy concurrent usage
  stressTestMessaging(userId);
  stressTestImageProcessing(userId);
  stressTestWalletTransactions(userId);
  stressTestSocialInteractions(userId);
  stressTestSecurityScanning(userId);
  
  // Shorter sleep for more aggressive testing
  sleep(Math.random() * 0.5);
}

function stressTestMessaging(userId) {
  // Send multiple messages rapidly
  for (let i = 0; i < 3; i++) {
    const response = http.post(`${BASE_URL}/api/messages`, JSON.stringify({
      userId: userId,
      message: `Stress test message ${i} from ${userId}`,
      timestamp: new Date().toISOString(),
      chatId: `stress_chat_${Math.floor(Math.random() * 10)}`,
    }), {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
    });
    
    requestCount.add(1);
    responseTime.add(response.timings.duration);
    
    const success = check(response, {
      'message sent under stress': (r) => r.status === 200 || r.status === 201,
      'stress response time acceptable': (r) => r.timings.duration < 3000,
    });
    
    if (!success) errorRate.add(1);
  }
}

function stressTestImageProcessing(userId) {
  // Process multiple images simultaneously
  const largeImage = generateLargeTestImage();
  
  const response = http.post(`${BASE_URL}/api/ai/analyze-image`, JSON.stringify({
    imageBase64: largeImage,
    userId: userId,
    options: {
      provider: 'hybrid',
      enableFaceDetection: true,
      enableTextDetection: true,
      enableObjectDetection: true,
      enableLandmarkDetection: true,
    },
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s', // Longer timeout for AI processing
  });
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'image processed under stress': (r) => r.status === 200,
    'AI processing time acceptable': (r) => r.timings.duration < 10000,
    'valid AI response': (r) => {
      try {
        const result = JSON.parse(r.body);
        return result.confidence !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  if (!success) errorRate.add(1);
}

function stressTestWalletTransactions(userId) {
  // Simulate rapid wallet operations
  const operations = [
    { type: 'balance', endpoint: `/api/wallet/${userId}/balance` },
    { type: 'history', endpoint: `/api/wallet/${userId}/transactions` },
    { type: 'send', endpoint: '/api/wallet/send', data: {
      fromUserId: userId,
      toUserId: `recipient_${Math.floor(Math.random() * 100)}`,
      amount: Math.random() * 100,
      currency: 'USD',
    }},
  ];
  
  operations.forEach(op => {
    let response;
    if (op.type === 'send') {
      response = http.post(`${BASE_URL}${op.endpoint}`, JSON.stringify(op.data), {
        headers: { 'Content-Type': 'application/json' },
        timeout: '5s',
      });
    } else {
      response = http.get(`${BASE_URL}${op.endpoint}`, {
        timeout: '5s',
      });
    }
    
    requestCount.add(1);
    responseTime.add(response.timings.duration);
    
    const success = check(response, {
      [`${op.type} operation successful`]: (r) => r.status === 200 || r.status === 201,
      [`${op.type} response time OK`]: (r) => r.timings.duration < 2000,
    });
    
    if (!success) errorRate.add(1);
  });
}

function stressTestSocialInteractions(userId) {
  // Rapid social media interactions
  const interactions = [
    // Create post
    {
      method: 'POST',
      url: '/api/social/posts',
      data: {
        userId: userId,
        content: `Stress test post from ${userId}`,
        type: 'text',
        timestamp: new Date().toISOString(),
      },
    },
    // Like posts
    {
      method: 'POST',
      url: `/api/social/posts/${Math.floor(Math.random() * 100)}/like`,
      data: { userId: userId },
    },
    // Load feed
    {
      method: 'GET',
      url: `/api/social/feed/${userId}`,
    },
  ];
  
  interactions.forEach(interaction => {
    let response;
    if (interaction.method === 'POST') {
      response = http.post(`${BASE_URL}${interaction.url}`, JSON.stringify(interaction.data), {
        headers: { 'Content-Type': 'application/json' },
        timeout: '5s',
      });
    } else {
      response = http.get(`${BASE_URL}${interaction.url}`, {
        timeout: '5s',
      });
    }
    
    requestCount.add(1);
    responseTime.add(response.timings.duration);
    
    const success = check(response, {
      'social interaction successful': (r) => r.status === 200 || r.status === 201,
      'social response time OK': (r) => r.timings.duration < 1500,
    });
    
    if (!success) errorRate.add(1);
  });
}

function stressTestSecurityScanning(userId) {
  // Test security systems under load
  const securityTests = [
    {
      content: 'This is a test message with suspicious content click here for free money',
      type: 'text',
    },
    {
      content: generateLargeTestImage(),
      type: 'image',
    },
    {
      content: 'Normal message content',
      type: 'text',
    },
  ];
  
  securityTests.forEach(test => {
    const response = http.post(`${BASE_URL}/api/security/analyze`, JSON.stringify({
      content: test.content,
      type: test.type,
      userId: userId,
    }), {
      headers: { 'Content-Type': 'application/json' },
      timeout: '15s',
    });
    
    requestCount.add(1);
    responseTime.add(response.timings.duration);
    
    const success = check(response, {
      'security scan completed': (r) => r.status === 200,
      'security scan time acceptable': (r) => r.timings.duration < 5000,
      'valid security result': (r) => {
        try {
          const result = JSON.parse(r.body);
          return result.hasOwnProperty('isSpam') && result.hasOwnProperty('confidence');
        } catch {
          return false;
        }
      },
    });
    
    if (!success) errorRate.add(1);
  });
}

function generateLargeTestImage() {
  // Generate a larger base64 image for stress testing
  const canvas = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  // In a real scenario, you'd generate or use actual larger images
  return canvas;
}

// Setup function
export function setup() {
  console.log('Starting stress test...');
  console.log('Target: Up to 500 concurrent users');
  console.log('Duration: 16 minutes total');
  return {};
}

// Teardown function with detailed reporting
export function teardown(data) {
  console.log('\n=== STRESS TEST RESULTS ===');
  console.log(`Total requests processed: ${requestCount.count}`);
  console.log(`Error rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`Average response time: ${responseTime.avg.toFixed(2)}ms`);
  console.log(`95th percentile response time: ${responseTime.p(95).toFixed(2)}ms`);
  console.log(`Maximum response time: ${responseTime.max.toFixed(2)}ms`);
  console.log(`Peak concurrent users: ${concurrentUsers.max}`);
  
  // Performance assessment
  if (errorRate.rate < 0.1) {
    console.log('✅ EXCELLENT: Error rate under 10%');
  } else if (errorRate.rate < 0.3) {
    console.log('⚠️  ACCEPTABLE: Error rate under 30% during stress');
  } else {
    console.log('❌ POOR: High error rate - system needs optimization');
  }
  
  if (responseTime.p(95) < 2000) {
    console.log('✅ GOOD: 95% of requests under 2 seconds');
  } else {
    console.log('⚠️  SLOW: Response times need optimization');
  }
  
  console.log('=== END STRESS TEST ===\n');
}