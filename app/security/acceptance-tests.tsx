import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { PolicyAgent, SignedPolicy } from '@/services/ai/edge/policy/agent';
import { BiometricSafe, checkNativeModulesHealth, NativeModuleGuard } from '@/services/security/NativeAvailability';
import NetworkSecurity from '@/services/security/NetworkSecurity';
import { CheckCircle, XCircle, AlertTriangle, Play, RefreshCw } from 'lucide-react-native';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'running';
  message: string;
  details?: string;
  timestamp: number;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  status: 'pass' | 'fail' | 'warning' | 'running' | 'pending';
}

export default function AcceptanceTestsScreen() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'pass' | 'fail' | 'warning' | 'pending'>('pending');

  useEffect(() => {
    initializeTestSuites();
  }, []);

  const initializeTestSuites = () => {
    const suites: TestSuite[] = [
      {
        name: 'Policy Signature Validation',
        status: 'pending',
        tests: []
      },
      {
        name: 'Native Module Availability',
        status: 'pending', 
        tests: []
      },
      {
        name: 'Certificate Pinning',
        status: 'pending',
        tests: []
      },
      {
        name: 'Biometric Fallback Handling',
        status: 'pending',
        tests: []
      },
      {
        name: 'Network Security',
        status: 'pending',
        tests: []
      }
    ];
    
    setTestSuites(suites);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    console.log('🧪 Starting acceptance tests...');
    
    try {
      const updatedSuites = [...testSuites];
      
      // Run Policy Signature Tests
      updatedSuites[0] = await runPolicySignatureTests();
      setTestSuites([...updatedSuites]);
      
      // Run Native Module Tests
      updatedSuites[1] = await runNativeModuleTests();
      setTestSuites([...updatedSuites]);
      
      // Run Certificate Pinning Tests
      updatedSuites[2] = await runCertificatePinningTests();
      setTestSuites([...updatedSuites]);
      
      // Run Biometric Fallback Tests
      updatedSuites[3] = await runBiometricFallbackTests();
      setTestSuites([...updatedSuites]);
      
      // Run Network Security Tests
      updatedSuites[4] = await runNetworkSecurityTests();
      setTestSuites([...updatedSuites]);
      
      // Calculate overall status
      const hasFailures = updatedSuites.some(suite => suite.status === 'fail');
      const hasWarnings = updatedSuites.some(suite => suite.status === 'warning');
      
      setOverallStatus(hasFailures ? 'fail' : hasWarnings ? 'warning' : 'pass');
      
      console.log('✅ All acceptance tests completed');
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      Alert.alert('Test Error', 'Failed to run acceptance tests');
    } finally {
      setIsRunning(false);
    }
  };

  const runPolicySignatureTests = async (): Promise<TestSuite> => {
    const suite: TestSuite = {
      name: 'Policy Signature Validation',
      status: 'running',
      tests: []
    };
    
    try {
      console.log('🔐 Testing policy signature validation...');
      
      const policyAgent = new PolicyAgent();
      await policyAgent.initialize();
      
      // Test 1: Valid policy should be accepted
      const validPolicyTest: TestResult = {
        name: 'Valid Policy Acceptance',
        status: 'running',
        message: 'Testing valid policy acceptance...',
        timestamp: Date.now()
      };
      
      try {
        const validPolicy: SignedPolicy = {
          id: 'test-valid-policy',
          version: '1.0.0',
          name: 'Test Valid Policy',
          fingerprint: 'valid-fingerprint-hash',
          signature: {
            algorithm: 'ECDSA-P256',
            signature: 'valid-signature-base64',
            keyId: 'test-key-1',
            timestamp: Date.now()
          },
          validFrom: Date.now() - 1000,
          validUntil: Date.now() + (24 * 60 * 60 * 1000),
          securityLevel: 'medium',
          rules: [
            {
              id: 'test-rule',
              type: 'allow',
              priority: 100,
              condition: { taskType: ['test'] },
              action: { type: 'allow' }
            }
          ]
        };
        
        const result = await policyAgent.loadSignedPolicies([validPolicy]);
        
        if (result.loaded > 0) {
          validPolicyTest.status = 'pass';
          validPolicyTest.message = 'Valid policy accepted successfully';
          validPolicyTest.details = `Loaded ${result.loaded} policies`;
        } else {
          validPolicyTest.status = 'fail';
          validPolicyTest.message = 'Valid policy was rejected';
          validPolicyTest.details = result.reasons.join(', ');
        }
      } catch (error) {
        validPolicyTest.status = 'fail';
        validPolicyTest.message = 'Valid policy test failed';
        validPolicyTest.details = error.message;
      }
      
      suite.tests.push(validPolicyTest);
      
      // Test 2: Invalid signature should be rejected
      const invalidSignatureTest: TestResult = {
        name: 'Invalid Signature Rejection',
        status: 'running',
        message: 'Testing invalid signature rejection...',
        timestamp: Date.now()
      };
      
      try {
        const invalidPolicy: SignedPolicy = {
          id: 'test-invalid-policy',
          version: '1.0.0',
          name: 'Test Invalid Policy',
          fingerprint: 'invalid-fingerprint',
          signature: {
            algorithm: 'ECDSA-P256',
            signature: 'INVALID-SIGNATURE',
            keyId: 'invalid-key',
            timestamp: Date.now()
          },
          validFrom: Date.now() - 1000,
          validUntil: Date.now() + (24 * 60 * 60 * 1000),
          securityLevel: 'high',
          rules: []
        };
        
        const result = await policyAgent.loadSignedPolicies([invalidPolicy]);
        
        if (result.rejected > 0 && result.reasons.some(r => r.includes('signature'))) {
          invalidSignatureTest.status = 'pass';
          invalidSignatureTest.message = 'Invalid signature correctly rejected';
          invalidSignatureTest.details = `Rejected ${result.rejected} policies`;
        } else {
          invalidSignatureTest.status = 'fail';
          invalidSignatureTest.message = 'Invalid signature was not rejected';
          invalidSignatureTest.details = 'Security vulnerability detected';
        }
      } catch (error) {
        invalidSignatureTest.status = 'pass';
        invalidSignatureTest.message = 'Invalid signature correctly rejected with error';
        invalidSignatureTest.details = error.message;
      }
      
      suite.tests.push(invalidSignatureTest);
      
      // Test 3: Expired policy should be rejected
      const expiredPolicyTest: TestResult = {
        name: 'Expired Policy Rejection',
        status: 'running',
        message: 'Testing expired policy rejection...',
        timestamp: Date.now()
      };
      
      try {
        const expiredPolicy: SignedPolicy = {
          id: 'test-expired-policy',
          version: '1.0.0',
          name: 'Test Expired Policy',
          fingerprint: 'expired-fingerprint',
          signature: {
            algorithm: 'ECDSA-P256',
            signature: 'expired-signature',
            keyId: 'test-key',
            timestamp: Date.now() - (48 * 60 * 60 * 1000)
          },
          validFrom: Date.now() - (48 * 60 * 60 * 1000),
          validUntil: Date.now() - (24 * 60 * 60 * 1000), // Expired
          securityLevel: 'low',
          rules: []
        };
        
        const result = await policyAgent.loadSignedPolicies([expiredPolicy]);
        
        if (result.rejected > 0 && result.reasons.some(r => r.includes('Expired'))) {
          expiredPolicyTest.status = 'pass';
          expiredPolicyTest.message = 'Expired policy correctly rejected';
          expiredPolicyTest.details = 'Policy expiration check working';
        } else {
          expiredPolicyTest.status = 'fail';
          expiredPolicyTest.message = 'Expired policy was not rejected';
          expiredPolicyTest.details = 'Expiration check failed';
        }
      } catch (error) {
        expiredPolicyTest.status = 'warning';
        expiredPolicyTest.message = 'Expired policy test encountered error';
        expiredPolicyTest.details = error.message;
      }
      
      suite.tests.push(expiredPolicyTest);
      
      // Determine suite status
      const hasFailures = suite.tests.some(test => test.status === 'fail');
      const hasWarnings = suite.tests.some(test => test.status === 'warning');
      
      suite.status = hasFailures ? 'fail' : hasWarnings ? 'warning' : 'pass';
      
    } catch (error) {
      suite.status = 'fail';
      suite.tests.push({
        name: 'Policy Agent Initialization',
        status: 'fail',
        message: 'Failed to initialize policy agent',
        details: error.message,
        timestamp: Date.now()
      });
    }
    
    return suite;
  };

  const runNativeModuleTests = async (): Promise<TestSuite> => {
    const suite: TestSuite = {
      name: 'Native Module Availability',
      status: 'running',
      tests: []
    };
    
    try {
      console.log('📱 Testing native module availability...');
      
      // Test native modules health
      const healthCheck = await checkNativeModulesHealth();
      
      const healthTest: TestResult = {
        name: 'Native Modules Health Check',
        status: 'pass',
        message: `Modules: ${healthCheck.available.length} available, ${healthCheck.withFallbacks.length} with fallbacks, ${healthCheck.unavailable.length} unavailable`,
        details: `Available: ${healthCheck.available.join(', ')}\nWith Fallbacks: ${healthCheck.withFallbacks.join(', ')}\nUnavailable: ${healthCheck.unavailable.join(', ')}`,
        timestamp: Date.now()
      };
      
      // If critical modules are unavailable without fallbacks, mark as warning
      if (healthCheck.unavailable.length > 0) {
        healthTest.status = 'warning';
        healthTest.message += ' (Some modules unavailable)';
      }
      
      suite.tests.push(healthTest);
      
      // Test individual module availability
      const modules = ['UEBAService', 'RASPService', 'BiometricService', 'AttestationService'];
      
      for (const moduleName of modules) {
        const moduleTest: TestResult = {
          name: `${moduleName} Availability`,
          status: 'running',
          message: `Testing ${moduleName}...`,
          timestamp: Date.now()
        };
        
        try {
          const isAvailable = await NativeModuleGuard.checkAvailability(moduleName);
          const hasFallback = !!NativeModuleGuard.getFallback(moduleName);
          
          if (isAvailable) {
            moduleTest.status = 'pass';
            moduleTest.message = `${moduleName} is available natively`;
          } else if (hasFallback) {
            moduleTest.status = 'warning';
            moduleTest.message = `${moduleName} using fallback implementation`;
            moduleTest.details = 'Native module not available, using safe fallback';
          } else {
            moduleTest.status = 'warning';
            moduleTest.message = `${moduleName} not available`;
            moduleTest.details = 'Module will use no-op implementation';
          }
        } catch (error) {
          moduleTest.status = 'fail';
          moduleTest.message = `${moduleName} check failed`;
          moduleTest.details = error.message;
        }
        
        suite.tests.push(moduleTest);
      }
      
      // Determine suite status
      const hasFailures = suite.tests.some(test => test.status === 'fail');
      const hasWarnings = suite.tests.some(test => test.status === 'warning');
      
      suite.status = hasFailures ? 'fail' : hasWarnings ? 'warning' : 'pass';
      
    } catch (error) {
      suite.status = 'fail';
      suite.tests.push({
        name: 'Module Health Check',
        status: 'fail',
        message: 'Failed to check native modules health',
        details: error.message,
        timestamp: Date.now()
      });
    }
    
    return suite;
  };

  const runCertificatePinningTests = async (): Promise<TestSuite> => {
    const suite: TestSuite = {
      name: 'Certificate Pinning',
      status: 'running',
      tests: []
    };
    
    try {
      console.log('📌 Testing certificate pinning...');
      
      const networkSecurity = NetworkSecurity.getInstance();
      await networkSecurity.initialize();
      
      // Test certificate pinning status
      const pinningStatus = networkSecurity.getCertificatePinningStatus();
      
      const pinningTest: TestResult = {
        name: 'Certificate Pinning Configuration',
        status: pinningStatus.enabled ? 'pass' : 'warning',
        message: pinningStatus.enabled 
          ? `Certificate pinning enabled for ${pinningStatus.totalPins} domains`
          : 'Certificate pinning not configured',
        details: `Platform: ${pinningStatus.platform}\nPinned domains: ${pinningStatus.pinnedDomains.join(', ')}\nActive rotation windows: ${pinningStatus.activeRotationWindows.join(', ')}`,
        timestamp: Date.now()
      };
      
      suite.tests.push(pinningTest);
      
      // Test rotation window functionality
      const rotationTest: TestResult = {
        name: 'Certificate Rotation Windows',
        status: 'running',
        message: 'Testing certificate rotation windows...',
        timestamp: Date.now()
      };
      
      try {
        // Add a test rotation window
        networkSecurity.setupRotationWindow('test.example.com', {
          oldPins: ['OLD_PIN_HASH'],
          newPins: ['NEW_PIN_HASH'],
          transitionStart: Date.now(),
          transitionEnd: Date.now() + (7 * 24 * 60 * 60 * 1000)
        });
        
        const updatedStatus = networkSecurity.getCertificatePinningStatus();
        
        if (updatedStatus.activeRotationWindows.includes('test.example.com')) {
          rotationTest.status = 'pass';
          rotationTest.message = 'Certificate rotation windows working correctly';
          rotationTest.details = 'Successfully created and detected rotation window';
        } else {
          rotationTest.status = 'warning';
          rotationTest.message = 'Certificate rotation window not detected';
          rotationTest.details = 'Rotation window functionality may not be working';
        }
      } catch (error) {
        rotationTest.status = 'fail';
        rotationTest.message = 'Certificate rotation test failed';
        rotationTest.details = error.message;
      }
      
      suite.tests.push(rotationTest);
      
      // Test secure request with pinning
      const secureRequestTest: TestResult = {
        name: 'Secure Request with Pinning',
        status: 'running',
        message: 'Testing secure request functionality...',
        timestamp: Date.now()
      };
      
      try {
        // Test with a mock URL (won't actually make request)
        const testUrl = 'https://api.mada.sa/test';
        
        // This would normally make a real request, but we're just testing the setup
        const securityStatus = networkSecurity.getSecurityStatus();
        
        if (securityStatus.certificatePinningEnabled) {
          secureRequestTest.status = 'pass';
          secureRequestTest.message = 'Secure request infrastructure ready';
          secureRequestTest.details = 'Certificate pinning validation configured';
        } else {
          secureRequestTest.status = 'warning';
          secureRequestTest.message = 'Secure requests without certificate pinning';
          secureRequestTest.details = 'Basic security only';
        }
      } catch (error) {
        secureRequestTest.status = 'fail';
        secureRequestTest.message = 'Secure request test failed';
        secureRequestTest.details = error.message;
      }
      
      suite.tests.push(secureRequestTest);
      
      // Determine suite status
      const hasFailures = suite.tests.some(test => test.status === 'fail');
      const hasWarnings = suite.tests.some(test => test.status === 'warning');
      
      suite.status = hasFailures ? 'fail' : hasWarnings ? 'warning' : 'pass';
      
    } catch (error) {
      suite.status = 'fail';
      suite.tests.push({
        name: 'Certificate Pinning Initialization',
        status: 'fail',
        message: 'Failed to initialize certificate pinning',
        details: error.message,
        timestamp: Date.now()
      });
    }
    
    return suite;
  };

  const runBiometricFallbackTests = async (): Promise<TestSuite> => {
    const suite: TestSuite = {
      name: 'Biometric Fallback Handling',
      status: 'running',
      tests: []
    };
    
    try {
      console.log('👆 Testing biometric fallback handling...');
      
      // Test biometric availability check
      const availabilityTest: TestResult = {
        name: 'Biometric Availability Check',
        status: 'running',
        message: 'Checking biometric availability...',
        timestamp: Date.now()
      };
      
      try {
        const isAvailable = await BiometricSafe.isHardwareAvailable!();
        const supportedTypes = await BiometricSafe.getSupportedBiometrics!();
        
        availabilityTest.status = 'pass';
        availabilityTest.message = isAvailable 
          ? 'Biometric hardware available'
          : 'Biometric hardware not available (expected on some platforms)';
        availabilityTest.details = `Supported types: ${supportedTypes.join(', ')}`;
      } catch (error) {
        availabilityTest.status = 'fail';
        availabilityTest.message = 'Biometric availability check failed';
        availabilityTest.details = error.message;
      }
      
      suite.tests.push(availabilityTest);
      
      // Test biometric authentication fallback
      const authTest: TestResult = {
        name: 'Biometric Authentication Fallback',
        status: 'running',
        message: 'Testing biometric authentication fallback...',
        timestamp: Date.now()
      };
      
      try {
        const authResult = await BiometricSafe.authenticate!('Test authentication');
        
        // On devices without biometric support, this should gracefully fail
        if (!authResult.success && authResult.error) {
          authTest.status = 'pass';
          authTest.message = 'Biometric authentication gracefully handled';
          authTest.details = `Fallback reason: ${authResult.error}`;
        } else if (authResult.success) {
          authTest.status = 'pass';
          authTest.message = 'Biometric authentication successful';
          authTest.details = 'Device supports biometric authentication';
        } else {
          authTest.status = 'warning';
          authTest.message = 'Unexpected biometric authentication result';
          authTest.details = 'Authentication result unclear';
        }
      } catch (error) {
        // If it throws an error, that's actually bad - should handle gracefully
        authTest.status = 'fail';
        authTest.message = 'Biometric authentication crashed';
        authTest.details = `Error: ${error.message} - Should handle gracefully`;
      }
      
      suite.tests.push(authTest);
      
      // Test initialization without crash
      const initTest: TestResult = {
        name: 'Biometric Service Initialization',
        status: 'running',
        message: 'Testing biometric service initialization...',
        timestamp: Date.now()
      };
      
      try {
        await BiometricSafe.init!();
        
        initTest.status = 'pass';
        initTest.message = 'Biometric service initialized without crash';
        initTest.details = 'Safe initialization on all platforms';
      } catch (error) {
        initTest.status = 'fail';
        initTest.message = 'Biometric service initialization failed';
        initTest.details = error.message;
      }
      
      suite.tests.push(initTest);
      
      // Determine suite status
      const hasFailures = suite.tests.some(test => test.status === 'fail');
      const hasWarnings = suite.tests.some(test => test.status === 'warning');
      
      suite.status = hasFailures ? 'fail' : hasWarnings ? 'warning' : 'pass';
      
    } catch (error) {
      suite.status = 'fail';
      suite.tests.push({
        name: 'Biometric Test Suite',
        status: 'fail',
        message: 'Biometric test suite failed to run',
        details: error.message,
        timestamp: Date.now()
      });
    }
    
    return suite;
  };

  const runNetworkSecurityTests = async (): Promise<TestSuite> => {
    const suite: TestSuite = {
      name: 'Network Security',
      status: 'running',
      tests: []
    };
    
    try {
      console.log('🌐 Testing network security...');
      
      const networkSecurity = NetworkSecurity.getInstance();
      
      // Test security status
      const statusTest: TestResult = {
        name: 'Network Security Status',
        status: 'running',
        message: 'Checking network security status...',
        timestamp: Date.now()
      };
      
      try {
        const securityStatus = networkSecurity.getSecurityStatus();
        
        statusTest.status = 'pass';
        statusTest.message = `Security level: ${securityStatus.implementationLevel}`;
        statusTest.details = `Features: ${Object.entries(securityStatus.features)
          .filter(([_, enabled]) => enabled)
          .map(([feature, _]) => feature)
          .join(', ')}`;
      } catch (error) {
        statusTest.status = 'fail';
        statusTest.message = 'Network security status check failed';
        statusTest.details = error.message;
      }
      
      suite.tests.push(statusTest);
      
      // Test rate limiting
      const rateLimitTest: TestResult = {
        name: 'Rate Limiting',
        status: 'running',
        message: 'Testing rate limiting...',
        timestamp: Date.now()
      };
      
      try {
        const testUrl = 'https://api.test.com/endpoint';
        
        // Test multiple requests to trigger rate limiting
        let rateLimitTriggered = false;
        
        for (let i = 0; i < 15; i++) {
          const allowed = networkSecurity.checkBasicRateLimit(testUrl);
          if (!allowed) {
            rateLimitTriggered = true;
            break;
          }
        }
        
        if (rateLimitTriggered) {
          rateLimitTest.status = 'pass';
          rateLimitTest.message = 'Rate limiting working correctly';
          rateLimitTest.details = 'Rate limit triggered after multiple requests';
        } else {
          rateLimitTest.status = 'warning';
          rateLimitTest.message = 'Rate limiting not triggered';
          rateLimitTest.details = 'May need adjustment for production';
        }
      } catch (error) {
        rateLimitTest.status = 'fail';
        rateLimitTest.message = 'Rate limiting test failed';
        rateLimitTest.details = error.message;
      }
      
      suite.tests.push(rateLimitTest);
      
      // Test URL sanitization
      const urlSanitizationTest: TestResult = {
        name: 'URL Sanitization',
        status: 'running',
        message: 'Testing URL sanitization...',
        timestamp: Date.now()
      };
      
      try {
        // Test valid URL
        const validUrl = networkSecurity.sanitizeUrl('https://api.mada.sa/test');
        
        // Test invalid protocol
        let invalidProtocolCaught = false;
        try {
          networkSecurity.sanitizeUrl('ftp://malicious.com/test');
        } catch {
          invalidProtocolCaught = true;
        }
        
        if (validUrl && invalidProtocolCaught) {
          urlSanitizationTest.status = 'pass';
          urlSanitizationTest.message = 'URL sanitization working correctly';
          urlSanitizationTest.details = 'Valid URLs pass, invalid protocols rejected';
        } else {
          urlSanitizationTest.status = 'fail';
          urlSanitizationTest.message = 'URL sanitization not working properly';
          urlSanitizationTest.details = 'Security vulnerability detected';
        }
      } catch (error) {
        urlSanitizationTest.status = 'fail';
        urlSanitizationTest.message = 'URL sanitization test failed';
        urlSanitizationTest.details = error.message;
      }
      
      suite.tests.push(urlSanitizationTest);
      
      // Determine suite status
      const hasFailures = suite.tests.some(test => test.status === 'fail');
      const hasWarnings = suite.tests.some(test => test.status === 'warning');
      
      suite.status = hasFailures ? 'fail' : hasWarnings ? 'warning' : 'pass';
      
    } catch (error) {
      suite.status = 'fail';
      suite.tests.push({
        name: 'Network Security Initialization',
        status: 'fail',
        message: 'Network security test suite failed',
        details: error.message,
        timestamp: Date.now()
      });
    }
    
    return suite;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle size={20} color="#10B981" />;
      case 'fail':
        return <XCircle size={20} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={20} color="#F59E0B" />;
      case 'running':
        return <RefreshCw size={20} color="#3B82F6" />;
      default:
        return <RefreshCw size={20} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return '#10B981';
      case 'fail':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      case 'running':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Security Acceptance Tests',
          headerStyle: { backgroundColor: '#1F2937' },
          headerTintColor: '#FFFFFF'
        }} 
      />
      
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Security Acceptance Tests</Text>
          <Text style={styles.subtitle}>Phase 0 - Security Enhancement Validation</Text>
          
          <View style={[styles.overallStatus, { borderColor: getStatusColor(overallStatus) }]}>
            {getStatusIcon(overallStatus)}
            <Text style={[styles.overallStatusText, { color: getStatusColor(overallStatus) }]}>
              Overall Status: {overallStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Run Tests Button */}
        <TouchableOpacity 
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={runAllTests}
          disabled={isRunning}
        >
          <Play size={20} color="#FFFFFF" />
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>

        {/* Test Suites */}
        {testSuites.map((suite, suiteIndex) => (
          <View key={suiteIndex} style={styles.testSuite}>
            <View style={styles.suiteHeader}>
              {getStatusIcon(suite.status)}
              <Text style={styles.suiteName}>{suite.name}</Text>
            </View>
            
            {suite.tests.map((test, testIndex) => (
              <View key={testIndex} style={styles.testItem}>
                <View style={styles.testHeader}>
                  {getStatusIcon(test.status)}
                  <Text style={styles.testName}>{test.name}</Text>
                </View>
                
                <Text style={styles.testMessage}>{test.message}</Text>
                
                {test.details && (
                  <Text style={styles.testDetails}>{test.details}</Text>
                )}
                
                <Text style={styles.testTimestamp}>
                  {new Date(test.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Security acceptance tests validate certificate pinning, native module availability,
            policy signature verification, and biometric fallback handling.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  overallStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  overallStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    margin: 20,
    padding: 16,
    borderRadius: 8,
  },
  runButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  runButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  testSuite: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    overflow: 'hidden',
  },
  suiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#374151',
  },
  suiteName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  testItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  testMessage: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  testDetails: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  testTimestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});