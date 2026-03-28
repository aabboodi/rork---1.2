import SecurityGuardrailsService from '@/services/security/SecurityGuardrailsService';

// Mock wallet paths that should be blocked
const WALLET_PATHS = [
  '/wallet/balance',
  '/wallet/send', 
  '/wallet/receive',
  '/payment/process',
  '/transaction/create',
  '/financial/transfer',
  '/money/send',
  '/balance/check'
];

// Mock AI module names that should be blocked from wallet access
const AI_MODULES = [
  'ai_personalization',
  'social_recommender', 
  'chat_auto_reply',
  'content_moderation',
  'recommendation_engine'
];

function expectTruthy(val: unknown, message?: string) {
  if (!val) throw new Error(message || 'Expected truthy but got ' + String(val));
}

function expectFalsy(val: unknown, message?: string) {
  if (val) throw new Error(message || 'Expected falsy but got ' + String(val));
}

async function testNoWalletRuleEnforcement() {
  console.log('🔒 Testing NO_WALLET_RULE enforcement...');
  
  const guardrails = SecurityGuardrailsService.getInstance();
  await guardrails.initialize();
  
  // Test 1: Wallet paths should be blocked
  for (const path of WALLET_PATHS) {
    const allowed = await guardrails.enforceNoWalletRule(path);
    expectFalsy(allowed, `Wallet path ${path} should be blocked`);
  }
  
  // Test 2: AI modules should be blocked from wallet components
  for (const module of AI_MODULES) {
    const allowed = await guardrails.enforceNoWalletRule('/some/path', module);
    expectFalsy(allowed, `AI module ${module} should be blocked from wallet access`);
  }
  
  // Test 3: Non-wallet paths should be allowed
  const nonWalletPaths = ['/profile', '/settings', '/chat', '/feed'];
  for (const path of nonWalletPaths) {
    const allowed = await guardrails.enforceNoWalletRule(path);
    expectTruthy(allowed, `Non-wallet path ${path} should be allowed`);
  }
  
  console.log('✅ NO_WALLET_RULE enforcement tests passed');
}

async function testWalletAccessPrevention() {
  console.log('🚫 Testing wallet access prevention...');
  
  const guardrails = SecurityGuardrailsService.getInstance();
  
  // Test 1: Financial operations should be blocked
  const financialOperations = [
    { path: '/wallet/send', component: 'TransactionSender' },
    { path: '/payment/process', component: 'PaymentProcessor' },
    { path: '/financial/transfer', component: 'MoneyTransfer' },
  ];
  
  for (const op of financialOperations) {
    const allowed = await guardrails.enforceNoWalletRule(op.path, op.component);
    expectFalsy(allowed, `Financial operation ${op.path}:${op.component} should be blocked`);
  }
  
  // Test 2: Security status should show wallet rule active
  const status = await guardrails.getSecurityStatus();
  expectTruthy(status.noWalletRuleActive, 'NO_WALLET_RULE should be active in security status');
  
  console.log('✅ Wallet access prevention tests passed');
}

async function testIntegrationWalletGuards() {
  console.log('🔗 Testing integration wallet guards...');
  
  const guardrails = SecurityGuardrailsService.getInstance();
  
  // Test 1: Multiple wallet access attempts should all be blocked
  const walletAttempts = [
    { path: '/wallet/balance', module: 'ai_personalization' },
    { path: '/payment/send', module: 'social_recommender' },
    { path: '/transaction/history', module: 'chat_auto_reply' },
    { path: '/financial/account', module: 'recommendation_engine' },
  ];
  
  let blockedCount = 0;
  for (const attempt of walletAttempts) {
    const allowed = await guardrails.enforceNoWalletRule(attempt.path, attempt.module);
    if (!allowed) blockedCount++;
  }
  
  expectTruthy(blockedCount === walletAttempts.length, 
    `All ${walletAttempts.length} wallet attempts should be blocked, got ${blockedCount}`);
  
  // Test 2: Mixed access (wallet + non-wallet) should block only wallet
  const mixedAttempts = [
    { path: '/profile/settings', module: 'ai_personalization', shouldBlock: false },
    { path: '/wallet/send', module: 'ai_personalization', shouldBlock: true },
    { path: '/chat/messages', module: 'chat_auto_reply', shouldBlock: false },
    { path: '/payment/process', module: 'chat_auto_reply', shouldBlock: true },
  ];
  
  for (const attempt of mixedAttempts) {
    const allowed = await guardrails.enforceNoWalletRule(attempt.path, attempt.module);
    if (attempt.shouldBlock) {
      expectFalsy(allowed, `${attempt.path}:${attempt.module} should be blocked`);
    } else {
      expectTruthy(allowed, `${attempt.path}:${attempt.module} should be allowed`);
    }
  }
  
  console.log('✅ Integration wallet guards tests passed');
}

async function testResourceGuardsWithWalletProtection() {
  console.log('⚡ Testing resource guards with wallet protection...');
  
  const guardrails = SecurityGuardrailsService.getInstance();
  
  // Test 1: Resource limits should not bypass wallet protection
  const resourceUsage = {
    memoryMB: 25, // Within limits
    latencyMs: 100, // Within limits
    cpuUsage: 50, // Within limits
  };
  
  const resourceCheck = await guardrails.enforceResourceLimits('wallet_operation', resourceUsage);
  expectTruthy(resourceCheck.allowed, 'Resource usage should be within limits');
  
  // But wallet access should still be blocked
  const walletAccess = await guardrails.enforceNoWalletRule('/wallet/send', 'ai_module');
  expectFalsy(walletAccess, 'Wallet access should be blocked regardless of resource usage');
  
  // Test 2: High resource usage should trigger graceful shutdown, not wallet access
  const highResourceUsage = {
    memoryMB: 35, // Above limit (30MB)
    cpuUsage: 85, // Above limit (80%)
  };
  
  const highResourceCheck = await guardrails.enforceResourceLimits('ai_operation', highResourceUsage);
  expectFalsy(highResourceCheck.allowed, 'High resource usage should be blocked');
  
  // Wallet should still be blocked even during resource issues
  const walletDuringHighUsage = await guardrails.enforceNoWalletRule('/payment/send', 'ai_module');
  expectFalsy(walletDuringHighUsage, 'Wallet should be blocked even during resource issues');
  
  console.log('✅ Resource guards with wallet protection tests passed');
}

async function testPrivacyWithWalletProtection() {
  console.log('🔐 Testing privacy enforcement with wallet protection...');
  
  const guardrails = SecurityGuardrailsService.getInstance();
  
  // Test 1: Privacy violations should not enable wallet access
  const sensitiveData = {
    message: 'Transfer $100 to account 12345',
    userId: 'user123',
    walletAddress: '0x1234567890abcdef',
  };
  
  const privacyCheck = await guardrails.enforcePrivacyByDefault(sensitiveData, 'transmit');
  expectFalsy(privacyCheck.allowed, 'Raw financial text should be blocked for privacy');
  
  // Wallet access should still be blocked even if privacy was somehow bypassed
  const walletAccess = await guardrails.enforceNoWalletRule('/wallet/transfer', 'ai_privacy_module');
  expectFalsy(walletAccess, 'Wallet access should be blocked regardless of privacy bypass');
  
  // Test 2: Anonymized data should not enable wallet access
  const anonymizedData = {
    messageHash: 'abc123def456',
    userIdHash: 'user_hash_789',
  };
  
  const anonymizedPrivacyCheck = await guardrails.enforcePrivacyByDefault(anonymizedData, 'store');
  expectTruthy(anonymizedPrivacyCheck.allowed, 'Anonymized data should be allowed for storage');
  
  // But wallet should still be blocked
  const walletWithAnonymized = await guardrails.enforceNoWalletRule('/financial/send', 'ai_module');
  expectFalsy(walletWithAnonymized, 'Wallet should be blocked even with anonymized data');
  
  console.log('✅ Privacy with wallet protection tests passed');
}

async function runAllWalletProtectionTests() {
  console.log('🧪 Starting Wallet Protection Unit Tests');
  console.log('=====================================');
  
  try {
    await testNoWalletRuleEnforcement();
    await testWalletAccessPrevention();
    await testIntegrationWalletGuards();
    await testResourceGuardsWithWalletProtection();
    await testPrivacyWithWalletProtection();
    
    console.log('=====================================');
    console.log('✅ ALL WALLET PROTECTION TESTS PASSED');
    console.log('🔒 NO_WALLET_RULE enforcement: VERIFIED');
    console.log('🚫 AI module wallet access: BLOCKED');
    console.log('🔗 Integration guards: ACTIVE');
    console.log('⚡ Resource limits: ENFORCED');
    console.log('🔐 Privacy protection: MAINTAINED');
    
    return 'PASS';
  } catch (error) {
    console.error('❌ WALLET PROTECTION TESTS FAILED:', error);
    console.error('=====================================');
    return 'FAIL';
  }
}

// Run tests if this file is executed directly
runAllWalletProtectionTests()
  .then((result) => {
    console.log(`\n🏁 Test Result: ${result}`);
    if (result === 'FAIL') {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export {
  testNoWalletRuleEnforcement,
  testWalletAccessPrevention,
  testIntegrationWalletGuards,
  testResourceGuardsWithWalletProtection,
  testPrivacyWithWalletProtection,
  runAllWalletProtectionTests,
};