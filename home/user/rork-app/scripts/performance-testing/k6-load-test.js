import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('requests');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    errors: ['rate<0.1'],
  },
};

// Base URL - adjust according to your setup
const BASE_URL = 'http://localhost:8081';

// Test data
const testUsers = [
  { id: 'user1', name: 'Test User 1' },
  { id: 'user2', name: 'Test User 2' },
  { id: 'user3', name: 'Test User 3' },
];

const testMessages = [
  'Hello, how are you?',
  'This is a test message',
  'Performance testing in progress',
  'Load testing with k6',
  'Checking app performance',
];

const testImages = [
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
];

export default function () {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Test scenarios
  testChatMessaging(user);
  testImageAnalysis();
  testWalletOperations(user);
  testSocialMediaFeatures(user);
  testSecurityFeatures();
  
  sleep(1);
}

function testChatMessaging(user) {
  const message = testMessages[Math.floor(Math.random() * testMessages.length)];
  
  // Simulate sending a message
  const response = http.post(`${BASE_URL}/api/messages`, JSON.stringify({
    userId: user.id,
    message: message,
    timestamp: new Date().toISOString(),
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'message sent successfully': (r) => r.status === 200 || r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testImageAnalysis() {
  const image = testImages[Math.floor(Math.random() * testImages.length)];
  
  // Test AI Vision Service
  const response = http.post(`${BASE_URL}/api/ai/analyze-image`, JSON.stringify({
    imageBase64: image,
    options: {
      provider: 'hybrid',
      enableFaceDetection: true,
      enableTextDetection: true,
      enableObjectDetection: true,
    },
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  
  const success = check(response, {
    'image analysis completed': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000, // AI analysis can take longer
    'valid analysis result': (r) => {
      try {
        const result = JSON.parse(r.body);
        return result.hasOwnProperty('isSafe') && result.hasOwnProperty('confidence');
      } catch {
        return false;
      }
    },
  });
  
  if (!success) {
    errorRate.add(1);
  }
}

function testWalletOperations(user) {
  // Test wallet balance check
  const balanceResponse = http.get(`${BASE_URL}/api/wallet/${user.id}/balance`);
  
  requestCount.add(1);
  responseTime.add(balanceResponse.timings.duration);
  
  const balanceSuccess = check(balanceResponse, {
    'balance retrieved': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  if (!balanceSuccess) {
    errorRate.add(1);
  }
  
  // Test transaction history
  const historyResponse = http.get(`${BASE_URL}/api/wallet/${user.id}/transactions`);
  
  requestCount.add(1);
  responseTime.add(historyResponse.timings.duration);
  
  const historySuccess = check(historyResponse, {
    'transaction history retrieved': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  if (!historySuccess) {
    errorRate.add(1);
  }
}

function testSocialMediaFeatures(user) {
  // Test feed loading
  const feedResponse = http.get(`${BASE_URL}/api/social/feed/${user.id}`);
  
  requestCount.add(1);
  responseTime.add(feedResponse.timings.duration);
  
  const feedSuccess = check(feedResponse, {
    'feed loaded': (r) => r.status === 200,
    'response time < 800ms': (r) => r.timings.duration < 800,
  });
  
  if (!feedSuccess) {
    errorRate.add(1);
  }
  
  // Test post creation
  const postResponse = http.post(`${BASE_URL}/api/social/posts`, JSON.stringify({
    userId: user.id,
    content: 'Performance test post',
    type: 'text',
    timestamp: new Date().toISOString(),
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  requestCount.add(1);
  responseTime.add(postResponse.timings.duration);
  
  const postSuccess = check(postResponse, {
    'post created': (r) => r.status === 200 || r.status === 201,
    'response time < 600ms': (r) => r.timings.duration < 600,
  });
  
  if (!postSuccess) {
    errorRate.add(1);
  }
}

function testSecurityFeatures() {
  // Test security analysis
  const securityResponse = http.post(`${BASE_URL}/api/security/analyze`, JSON.stringify({
    content: 'Test content for security analysis',
    type: 'text',
    userId: 'test-user',
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  requestCount.add(1);
  responseTime.add(securityResponse.timings.duration);
  
  const securitySuccess = check(securityResponse, {
    'security analysis completed': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'valid security result': (r) => {
      try {
        const result = JSON.parse(r.body);
        return result.hasOwnProperty('isSpam') && result.hasOwnProperty('confidence');
      } catch {
        return false;
      }
    },
  });
  
  if (!securitySuccess) {
    errorRate.add(1);
  }
}

// Teardown function
export function teardown(data) {
  console.log('Performance test completed');
  console.log(`Total requests: ${requestCount.count}`);
  console.log(`Error rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`Average response time: ${responseTime.avg.toFixed(2)}ms`);
}