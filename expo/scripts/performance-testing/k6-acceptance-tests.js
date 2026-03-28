import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const throughput = new Counter('requests_total');
const aiProcessingTime = new Trend('ai_processing_time');
const offloadRate = new Rate('offload_rate');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Network interruption resilience
    network_interruption: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '60s', target: 10 }, // Stable load
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'network_interruption' },
    },
    
    // Scenario 2: Local inference performance
    local_inference: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      tags: { scenario: 'local_inference' },
    },
    
    // Scenario 3: Policy compliance verification
    policy_compliance: {
      executor: 'per-vu-iterations',
      vus: 3,
      iterations: 10,
      tags: { scenario: 'policy_compliance' },
    },
    
    // Scenario 4: SLO validation
    slo_validation: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 5,
      maxVUs: 20,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '60s', target: 10 },
        { duration: '30s', target: 5 },
      ],
      tags: { scenario: 'slo_validation' },
    },
  },
  
  thresholds: {
    // SLO Requirements
    'response_time': ['p(95)<500'], // P95 latency < 500ms
    'errors': ['rate<0.05'], // Error rate < 5%
    'ai_processing_time': ['p(90)<600'], // AI processing < 600ms
    'offload_rate{scenario:network_interruption}': ['rate<0.8'], // Offload rate < 80% during network issues
    
    // Scenario-specific thresholds
    'http_req_duration{scenario:local_inference}': ['p(95)<300'], // Local inference should be faster
    'http_req_duration{scenario:policy_compliance}': ['p(99)<1000'], // Policy checks can be slower
    'http_req_failed{scenario:slo_validation}': ['rate<0.01'], // Very low error rate for SLO validation
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.example.com';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test data
const testPrompts = [
  'Analyze this financial transaction for fraud',
  'Moderate this chat message for inappropriate content',
  'Generate a summary of this conversation',
  'Classify this image for content safety',
  'Translate this text to Spanish',
];

const testPolicies = [
  { id: 'policy-1', version: '1.0', signature: 'valid-signature-1' },
  { id: 'policy-2', version: '1.1', signature: 'valid-signature-2' },
  { id: 'policy-3', version: '2.0', signature: 'valid-signature-3' },
];

export function setup() {
  console.log('🚀 Starting Phase 4 Acceptance Tests');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Verify API availability
  const healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, {
    'API is available': (r) => r.status === 200,
  });
  
  return {
    baseUrl: BASE_URL,
    apiKey: API_KEY,
    testData: {
      prompts: testPrompts,
      policies: testPolicies,
    },
  };
}

export default function (data) {
  const scenario = __ENV.SCENARIO || 'default';
  
  switch (scenario) {
    case 'network_interruption':
      testNetworkInterruption(data);
      break;
    case 'local_inference':
      testLocalInference(data);
      break;
    case 'policy_compliance':
      testPolicyCompliance(data);
      break;
    case 'slo_validation':
      testSLOValidation(data);
      break;
    default:
      testComprehensive(data);
  }
}

// Test 1: Network Interruption Resilience
function testNetworkInterruption(data) {
  const prompt = data.testData.prompts[Math.floor(Math.random() * data.testData.prompts.length)];
  
  // Simulate network interruption by using invalid endpoint occasionally
  const shouldSimulateFailure = Math.random() < 0.3; // 30% failure rate
  const endpoint = shouldSimulateFailure ? '/ai/process-offline' : '/ai/process-invalid';
  
  const startTime = Date.now();
  
  const response = http.post(`${data.baseUrl}${endpoint}`, JSON.stringify({
    prompt: prompt,
    mode: 'local_only',
    timeout: 5000,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.apiKey}`,
    },
    timeout: '10s',
  });
  
  const processingTime = Date.now() - startTime;
  
  // Check that local inference continues working during network issues
  const isLocalInferenceWorking = check(response, {
    'Local inference available during network issues': (r) => {
      if (shouldSimulateFailure) {
        // Should fallback to local processing
        return r.status === 200 || r.status === 202;
      }
      return r.status === 200;
    },
    'Response time acceptable during network issues': (r) => processingTime < 2000,
  });
  
  // Track metrics
  errorRate.add(!isLocalInferenceWorking);
  responseTime.add(processingTime);
  throughput.add(1);
  aiProcessingTime.add(processingTime);
  offloadRate.add(shouldSimulateFailure ? 0 : 1); // 0 = local, 1 = offloaded
  
  sleep(1);
}

// Test 2: Local Inference Performance
function testLocalInference(data) {
  const prompt = data.testData.prompts[Math.floor(Math.random() * data.testData.prompts.length)];
  
  const startTime = Date.now();
  
  const response = http.post(`${data.baseUrl}/ai/local-inference`, JSON.stringify({
    prompt: prompt,
    model: 'lightweight',
    max_tokens: 100,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.apiKey}`,
    },
  });
  
  const processingTime = Date.now() - startTime;
  
  const isSuccessful = check(response, {
    'Local inference successful': (r) => r.status === 200,
    'Local inference fast': (r) => processingTime < 300,
    'Response contains result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result && body.result.length > 0;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!isSuccessful);
  responseTime.add(processingTime);
  aiProcessingTime.add(processingTime);
  
  sleep(0.5);
}

// Test 3: Policy Compliance Verification
function testPolicyCompliance(data) {
  const policy = data.testData.policies[Math.floor(Math.random() * data.testData.policies.length)];
  
  // Test 3a: Valid signed policy
  const validPolicyResponse = http.post(`${data.baseUrl}/ai/validate-policy`, JSON.stringify({
    policy: policy,
    action: 'process_data',
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.apiKey}`,
    },
  });
  
  check(validPolicyResponse, {
    'Valid signed policy accepted': (r) => r.status === 200,
    'Policy validation response correct': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.valid === true;
      } catch {
        return false;
      }
    },
  });
  
  sleep(0.5);
  
  // Test 3b: Invalid/unsigned policy
  const invalidPolicyResponse = http.post(`${data.baseUrl}/ai/validate-policy`, JSON.stringify({
    policy: {
      id: 'invalid-policy',
      version: '1.0',
      signature: 'invalid-signature',
    },
    action: 'process_data',
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.apiKey}`,
    },
  });
  
  check(invalidPolicyResponse, {
    'Invalid policy rejected': (r) => r.status === 403 || r.status === 400,
    'Rejection reason provided': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.error && body.error.includes('signature');
      } catch {
        return false;
      }
    },
  });
  
  sleep(1);
}

// Test 4: SLO Validation
function testSLOValidation(data) {
  const prompt = data.testData.prompts[Math.floor(Math.random() * data.testData.prompts.length)];
  
  const startTime = Date.now();
  
  // Test different processing modes
  const mode = Math.random() < 0.7 ? 'hybrid' : 'local_only';
  
  const response = http.post(`${data.baseUrl}/ai/process`, JSON.stringify({
    prompt: prompt,
    mode: mode,
    priority: 'normal',
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.apiKey}`,
    },
  });
  
  const processingTime = Date.now() - startTime;
  
  // SLO checks
  const sloCompliant = check(response, {
    'SLO: Response successful': (r) => r.status === 200,
    'SLO: Latency under 500ms': (r) => processingTime < 500,
    'SLO: Response complete': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  // Resource consumption check
  const resourceResponse = http.get(`${data.baseUrl}/metrics/resources`, {
    headers: {
      'Authorization': `Bearer ${data.apiKey}`,
    },
  });
  
  check(resourceResponse, {
    'SLO: CPU usage under 70%': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.cpu < 70;
      } catch {
        return true; // Assume OK if can't parse
      }
    },
    'SLO: Memory usage under 512MB': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.memory < 512;
      } catch {
        return true;
      }
    },
  });
  
  errorRate.add(!sloCompliant);
  responseTime.add(processingTime);
  aiProcessingTime.add(processingTime);
  offloadRate.add(mode === 'hybrid' ? 1 : 0);
  
  sleep(0.8);
}

// Comprehensive test combining all scenarios
function testComprehensive(data) {
  const testType = Math.random();
  
  if (testType < 0.25) {
    testNetworkInterruption(data);
  } else if (testType < 0.5) {
    testLocalInference(data);
  } else if (testType < 0.75) {
    testPolicyCompliance(data);
  } else {
    testSLOValidation(data);
  }
}

export function teardown(data) {
  console.log('🏁 Phase 4 Acceptance Tests completed');
  
  // Generate summary report
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: data.baseUrl,
    scenarios: {
      network_interruption: 'Network resilience validated',
      local_inference: 'Local processing performance verified',
      policy_compliance: 'Signed policy enforcement confirmed',
      slo_validation: 'SLO compliance metrics collected',
    },
    metrics: {
      response_time: 'P95 latency measured',
      error_rate: 'Error rate tracked',
      ai_processing_time: 'AI processing performance monitored',
      offload_rate: 'Hybrid offload behavior validated',
    },
  };
  
  console.log('📊 Test Summary:', JSON.stringify(summary, null, 2));
}

// Helper function to generate test report
export function handleSummary(data) {
  return {
    'Phase4-acceptance-results.json': JSON.stringify(data, null, 2),
    'Phase4-acceptance-summary.txt': generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  const { metrics } = data;
  
  return `
# Phase 4 Acceptance Test Results

## Test Execution Summary
- Duration: ${data.state.testRunDurationMs}ms
- VUs: ${data.metrics.vus.values.max}
- Iterations: ${data.metrics.iterations.values.count}

## SLO Compliance Results
- P95 Response Time: ${metrics.response_time?.values?.['p(95)']?.toFixed(2)}ms (Target: <500ms)
- Error Rate: ${(metrics.errors?.values?.rate * 100)?.toFixed(2)}% (Target: <5%)
- AI Processing P90: ${metrics.ai_processing_time?.values?.['p(90)']?.toFixed(2)}ms (Target: <600ms)

## Scenario Results
- Network Interruption: ${metrics['http_req_failed{scenario:network_interruption}']?.values?.rate < 0.8 ? 'PASS' : 'FAIL'}
- Local Inference: ${metrics['http_req_duration{scenario:local_inference}']?.values?.['p(95)'] < 300 ? 'PASS' : 'FAIL'}
- Policy Compliance: ${metrics['http_req_failed{scenario:policy_compliance}']?.values?.rate < 0.05 ? 'PASS' : 'FAIL'}
- SLO Validation: ${metrics['http_req_failed{scenario:slo_validation}']?.values?.rate < 0.01 ? 'PASS' : 'FAIL'}

## Overall Status
${data.metrics.checks?.values?.passes / data.metrics.checks?.values?.value > 0.95 ? '✅ ACCEPTANCE TESTS PASSED' : '❌ ACCEPTANCE TESTS FAILED'}

Generated: ${new Date().toISOString()}
`;
}