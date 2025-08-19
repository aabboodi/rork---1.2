import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { I18nManager, Alert, AppState, Platform } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { AccessibilityProvider } from "@/components/accessibility/AccessibilityProvider";
import SecurityManager from "@/services/security/SecurityManager";
import DeviceSecurityService from "@/services/security/DeviceSecurityService";
import ScreenProtectionService from "@/services/security/ScreenProtectionService";
import SessionManager from "@/services/security/SessionManager";
import DeviceBindingService from "@/services/security/DeviceBindingService";
import { APISecurityMiddleware } from "@/services/security/APISecurityMiddleware";
import { WAFService } from "@/services/security/WAFService";
import { CSPMiddleware } from "@/services/security/CSPMiddleware";
import IncidentResponseService from "@/services/security/IncidentResponseService";
import CentralizedLoggingService from "@/services/security/CentralizedLoggingService";
import SOCService from "@/services/security/SOCService";
import DevSecOpsIntegrationService from "@/services/security/DevSecOpsIntegrationService";
import UEBAService from "@/services/security/UEBAService";
import ThreatIntelligenceService from "@/services/security/ThreatIntelligenceService";
import BehaviorAnalyticsService from "@/services/security/BehaviorAnalyticsService";
import SecurityNotificationService from "@/services/security/SecurityNotificationService";
import SecureStorage from "@/services/security/SecureStorage";
import SystemMonitoringService from "@/services/monitoring/SystemMonitoringService";

// Force RTL layout for Arabic
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export const unstable_settings = {
  initialRouteName: "index",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });
  const [securityInitialized, setSecurityInitialized] = useState(false);
  const [securityBlocked, setSecurityBlocked] = useState(false);
  const [incidentResponseInitialized, setIncidentResponseInitialized] = useState(false);
  const [uebaInitialized, setUEBAInitialized] = useState(false);
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      initializeAppSecurity();
    }
  }, [loaded]);
  
  // Initialize enhanced theme system
  useEffect(() => {
    const initializeEnhancedTheme = async () => {
      try {
        console.log('🎨 Initializing enhanced auto-adaptive theme system...');
        const cleanup = initializeTheme();
        
        // Set up theme monitoring
        console.log('✅ Enhanced theme system initialized with auto-adaptive features');
        
        return cleanup;
      } catch (error) {
        console.error('❌ Enhanced theme initialization failed:', error);
      }
    };
    
    const cleanup = initializeEnhancedTheme();
    
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => cleanupFn?.());
      } else if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  // Initialize comprehensive security with UEBA and Behavior Analytics integration
  const initializeAppSecurity = async () => {
    try {
      console.log('🚀 Initializing comprehensive security with UEBA and Behavior Analytics...');
      
      // Phase 1: Initialize core security services
      const securityManager = SecurityManager.getInstance();
      const deviceSecurity = DeviceSecurityService.getInstance();
      const screenProtection = ScreenProtectionService.getInstance();
      const apiMiddleware = APISecurityMiddleware.getInstance();
      const wafService = WAFService.getInstance();
      const cspMiddleware = CSPMiddleware.getInstance();
      
      // Pre-flight: sanitize secure storage to prevent insecure_storage alerts
      try {
        await SecureStorage.getInstance().initializeWithCleanup();
      } catch (e) {
        console.warn('SecureStorage preflight cleanup failed', e);
      }
      
      // Phase 2: Initialize monitoring and logging services
      const systemMonitoring = SystemMonitoringService.getInstance();
      const centralizedLogging = CentralizedLoggingService.getInstance();
      
      // Phase 3: Initialize incident response and SOC services
      const incidentResponse = IncidentResponseService.getInstance();
      const socService = SOCService.getInstance();
      
      // Phase 4: Initialize UEBA and Behavior Analytics services
      const uebaService = UEBAService.getInstance();
      const threatIntelligenceService = ThreatIntelligenceService.getInstance();
      const behaviorAnalyticsService = BehaviorAnalyticsService.getInstance();
      
      // Phase 5: Initialize Security Notification Service
      const securityNotificationService = SecurityNotificationService.getInstance();
      
      console.log('📊 Initializing monitoring services...');
      await systemMonitoring.startMonitoring();
      await centralizedLogging.initialize();
      
      console.log('🚨 Initializing incident response services...');
      await incidentResponse.initialize();
      await socService.initialize();
      
      console.log('🧠 Initializing UEBA and Behavior Analytics services...');
      await uebaService.initialize();
      await threatIntelligenceService.initialize();
      await behaviorAnalyticsService.initialize();
      
      console.log('🔔 Initializing Security Notification Service...');
      // Security notification service is already initialized in constructor
      
      console.log('🔧 Initializing DevSecOps integration...');
      await DevSecOpsIntegrationService.getInstance().initializeDevSecOps();
      
      // Perform initial security checks
      const securityStatus = await securityManager.forceSecurityCheck();
      
      // Check for critical security threats that would block app usage
      if (securityStatus.securityStatus.riskLevel === 'critical') {
        console.error('🚨 CRITICAL SECURITY THREATS DETECTED ON APP START');
        setSecurityBlocked(true);
        
        // Create critical incident
        await incidentResponse.createIncident(
          'Critical Security Threats on App Start',
          'Critical security issues detected during application initialization',
          'critical',
          'system_compromise',
          [],
          ['application_core']
        );
        
        Alert.alert(
          'Security Alert',
          'Critical security issues detected. The application cannot start safely.',
          [
            {
              text: 'Exit',
              onPress: () => {
                console.error('Application should be terminated due to security threats');
              }
            }
          ],
          { cancelable: false }
        );
        return;
      }
      
      // Enable screen protection globally
      await screenProtection.enableGlobalProtection();
      
      // Initialize dynamic CSP for web platform
      if (Platform.OS === 'web') {
        await initializeWebCSP();
      }
      
      // Set up app state monitoring for security
      AppState.addEventListener('change', handleAppStateChange);
      
      // Set up incident response monitoring
      setupIncidentResponseMonitoring(incidentResponse, socService);
      
      // Set up UEBA monitoring
      setupUEBAMonitoring(uebaService, behaviorAnalyticsService, threatIntelligenceService);
      
      setSecurityInitialized(true);
      setIncidentResponseInitialized(true);
      setUEBAInitialized(true);
      console.log('✅ Comprehensive security with UEBA and Behavior Analytics initialized successfully');
      
      // Log successful initialization
      await centralizedLogging.logSecurity('info', 'app_initialization', 'Security services initialized successfully', {
        services: ['SecurityManager', 'IncidentResponse', 'SOC', 'SystemMonitoring', 'CentralizedLogging', 'UEBA', 'BehaviorAnalytics', 'ThreatIntelligence', 'SecurityNotifications'],
        securityLevel: securityStatus.securityStatus.riskLevel,
        timestamp: Date.now()
      });
      
      // Hide splash screen after security initialization
      await SplashScreen.hideAsync();
      
    } catch (error) {
      console.error('💥 Critical security initialization failure:', error);
      setSecurityBlocked(true);
      
      // Try to log the error if logging service is available
      try {
        const centralizedLogging = CentralizedLoggingService.getInstance();
        await centralizedLogging.logSecurity('critical', 'app_initialization', 'Security initialization failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        });
      } catch (loggingError) {
        console.error('Failed to log initialization error:', loggingError);
      }
      
      Alert.alert(
        'Security Error',
        'Failed to initialize security features. The application cannot start safely.',
        [
          {
            text: 'Retry',
            onPress: () => initializeAppSecurity()
          },
          {
            text: 'Exit',
            onPress: () => {
              console.error('Application should be terminated due to security initialization failure');
            }
          }
        ],
        { cancelable: false }
      );
    }
  };

  // Set up incident response monitoring
  const setupIncidentResponseMonitoring = (incidentResponse: IncidentResponseService, socService: SOCService) => {
    try {
      // Subscribe to critical incidents
      incidentResponse.subscribeToIncidents((incident) => {
        if (incident.severity === 'critical') {
          console.log('🚨 Critical incident detected:', incident.title);
          
          // Show alert for critical incidents
          Alert.alert(
            'Critical Security Incident',
            `${incident.title}

Incident ID: ${incident.id}`,
            [
              {
                text: 'Acknowledge',
                onPress: async () => {
                  // In a real app, this would navigate to incident details
                  console.log('Incident acknowledged by user');
                }
              }
            ]
          );
        }
      });
      
      console.log('📡 Incident response monitoring configured');
    } catch (error) {
      console.error('Failed to setup incident response monitoring:', error);
    }
  };

  // Set up UEBA and Behavior Analytics monitoring
  const setupUEBAMonitoring = (
    uebaService: UEBAService, 
    behaviorAnalyticsService: BehaviorAnalyticsService,
    threatIntelligenceService: ThreatIntelligenceService
  ) => {
    try {
      // Set up periodic behavior analysis
      setInterval(async () => {
        try {
          // Analyze current user behavior if authenticated
          const { isAuthenticated } = useAuthStore.getState();
          if (isAuthenticated) {
            // Simulate user activity analysis
            const currentTime = Date.now();
            const mockUserActivity = {
              timestamp: currentTime,
              deviceFingerprint: 'mock_device_fingerprint',
              location: { lat: 24.7136, lng: 46.6753 }, // Riyadh coordinates
              ip: '127.0.0.1'
            };

            // Analyze login behavior
            const behaviorAnalysis = await behaviorAnalyticsService.analyzeUserBehavior(
              'current_user',
              'login',
              mockUserActivity
            );

            // Log high-risk behavior
            if (behaviorAnalysis.behaviorAnalysis.riskScore > 0.7) {
              console.log('⚠️ High-risk behavior detected:', behaviorAnalysis);
              
              // Create incident for high-risk behavior
              const incidentResponse = IncidentResponseService.getInstance();
              await incidentResponse.createIncident(
                'High-Risk User Behavior Detected',
                `User behavior analysis detected high risk: ${behaviorAnalysis.behaviorAnalysis.anomalyType}`,
                'medium',
                'unauthorized_access',
                [{
                  type: 'behavior_pattern',
                  value: behaviorAnalysis.behaviorAnalysis.anomalyType,
                  confidence: 'high',
                  source: 'ueba_service',
                  firstSeen: currentTime,
                  lastSeen: currentTime,
                  isMalicious: true
                }],
                ['user_behavior']
              );
            }
          }
        } catch (error) {
          console.error('UEBA monitoring error:', error);
        }
      }, 300000); // Every 5 minutes

      // Set up threat intelligence monitoring
      setInterval(async () => {
        try {
          // Check for new threats
          const recentThreats = await threatIntelligenceService.getRecentThreats(1); // Last hour
          if (recentThreats.length > 0) {
            console.log(`🎯 ${recentThreats.length} new threats detected in the last hour`);
            
            // Create SOC alert for new threats
            const socService = SOCService.getInstance();
            for (const threat of recentThreats) {
              if (threat.severity === 'critical' || threat.severity === 'high') {
                await socService.createAlert(
                  `New ${threat.severity} Threat Detected`,
                  `Threat Intelligence: ${threat.description}`,
                  threat.severity,
                  'threat_detection',
                  'threat_intelligence',
                  [{
                    type: 'threat_indicator',
                    value: threat.indicator,
                    confidence: threat.confidence > 0.8 ? 'high' : 'medium',
                    source: 'threat_intelligence',
                    firstSeen: threat.timestamp,
                    lastSeen: threat.timestamp,
                    isMalicious: true
                  }],
                  ['threat_intelligence_system']
                );
              }
            }
          }
        } catch (error) {
          console.error('Threat intelligence monitoring error:', error);
        }
      }, 600000); // Every 10 minutes

      console.log('🧠 UEBA and Behavior Analytics monitoring configured');
    } catch (error) {
      console.error('Failed to setup UEBA monitoring:', error);
    }
  };

  // Initialize web-specific CSP features
  const initializeWebCSP = async () => {
    try {
      if (typeof document !== 'undefined') {
        // Set up CSP violation reporting
        document.addEventListener('securitypolicyviolation', handleCSPViolation);
        
        // Apply initial CSP meta tag if not present
        const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (!existingCSP) {
          const cspMeta = document.createElement('meta');
          cspMeta.httpEquiv = 'Content-Security-Policy';
          cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://toolkit.rork.com;";
          document.head.appendChild(cspMeta);
        }
        
        console.log('🌐 Web CSP features initialized');
      }
    } catch (error) {
      console.error('Web CSP initialization failed:', error);
    }
  };

  // Handle CSP violations on web with incident creation
  const handleCSPViolation = async (event: SecurityPolicyViolationEvent) => {
    try {
      const wafService = WAFService.getInstance();
      const incidentResponse = IncidentResponseService.getInstance();
      const centralizedLogging = CentralizedLoggingService.getInstance();
      const currentRoute = getCurrentRoute();
      
      const violationReport = {
        'document-uri': event.documentURI,
        'referrer': event.referrer,
        'violated-directive': event.violatedDirective,
        'effective-directive': event.effectiveDirective,
        'original-policy': event.originalPolicy,
        'disposition': event.disposition,
        'blocked-uri': event.blockedURI,
        'line-number': event.lineNumber,
        'column-number': event.columnNumber,
        'source-file': event.sourceFile,
        'status-code': 0,
        'script-sample': event.sample || ''
      };

      const context = {
        route: currentRoute,
        userAgent: navigator.userAgent,
        clientIP: '127.0.0.1',
        timestamp: Date.now()
      };

      await wafService.handleCSPViolation(violationReport, context);
      
      // Log CSP violation
      await centralizedLogging.logSecurity('warn', 'csp_violation', 'CSP violation detected', {
        violation: violationReport,
        context
      });
      
      // Create incident for repeated violations
      const recentViolations = await getRecentCSPViolations();
      if (recentViolations > 5) {
        await incidentResponse.createIncident(
          'Multiple CSP Violations Detected',
          `${recentViolations} CSP violations detected in the last hour`,
          'medium',
          'unauthorized_access',
          [{
            type: 'behavior_pattern',
            value: 'csp_violations',
            confidence: 'high',
            source: 'web_browser',
            firstSeen: Date.now() - 3600000,
            lastSeen: Date.now(),
            isMalicious: true
          }],
          [currentRoute]
        );
      }
      
      console.warn('⚠️ CSP Violation detected and reported:', violationReport);
    } catch (error) {
      console.error('CSP violation handling failed:', error);
    }
  };

  // Get recent CSP violations count
  const getRecentCSPViolations = async (): Promise<number> => {
    try {
      const centralizedLogging = CentralizedLoggingService.getInstance();
      const recentLogs = await centralizedLogging.searchLogs('csp_violation', 100);
      const oneHourAgo = Date.now() - 3600000;
      
      return recentLogs.filter(log => log.timestamp > oneHourAgo).length;
    } catch (error) {
      console.error('Failed to get recent CSP violations:', error);
      return 0;
    }
  };

  // Get current route for CSP context
  const getCurrentRoute = (): string => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  };

  // Handle app state changes for security monitoring with incident creation
  const handleAppStateChange = (nextAppState: string) => {
    try {
      const screenProtection = ScreenProtectionService.getInstance();
      screenProtection.handleAppStateChange(nextAppState);
      
      // Perform security check when app becomes active
      if (nextAppState === 'active') {
        performActiveSecurityCheck();
      }
    } catch (error) {
      console.error('App state security handling failed:', error);
    }
  };

  // Enhanced security check when app becomes active with incident response
  const performActiveSecurityCheck = async () => {
    try {
      const securityManager = SecurityManager.getInstance();
      const sessionManager = SessionManager.getInstance();
      const deviceBinding = DeviceBindingService.getInstance();
      const incidentResponse = IncidentResponseService.getInstance();
      const centralizedLogging = CentralizedLoggingService.getInstance();
      const uebaService = UEBAService.getInstance();
      const behaviorAnalyticsService = BehaviorAnalyticsService.getInstance();
      
      // Comprehensive security check on app resume
      const securityStatus = await securityManager.forceSecurityCheck();
      
      if (securityStatus.securityStatus.riskLevel === 'critical') {
        console.error('🚨 CRITICAL SECURITY THREATS DETECTED ON APP RESUME');
        
        // Create critical incident
        await incidentResponse.createIncident(
          'Critical Security Threats on App Resume',
          'Critical security issues detected when application resumed from background',
          'critical',
          'system_compromise',
          [],
          ['application_runtime']
        );
        
        // Log security event
        await centralizedLogging.logSecurity('critical', 'app_resume_security', 'Critical threats on app resume', {
          threats: securityStatus.deviceThreats,
          riskLevel: securityStatus.securityStatus.riskLevel
        });
        
        Alert.alert(
          'Security Alert',
          'Critical security issues detected. Your session has been terminated for protection.',
          [
            {
              text: 'OK',
              onPress: () => {
                performSecureLogout('critical_threat_on_resume');
              }
            }
          ],
          { cancelable: false }
        );
        return;
      }
      
      // Check if device binding is still valid
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        const deviceBindingValid = await deviceBinding.validateCurrentDeviceBinding();
        if (!deviceBindingValid) {
          console.error('🔒 SECURITY ALERT: Device binding changed during app background');
          
          // Create security incident
          await incidentResponse.createIncident(
            'Device Binding Validation Failed',
            'Device security signature changed while app was in background',
            'high',
            'unauthorized_access',
            [{
              type: 'behavior_pattern',
              value: 'device_binding_change',
              confidence: 'high',
              source: 'device_security',
              firstSeen: Date.now(),
              lastSeen: Date.now(),
              isMalicious: true
            }],
            ['user_device']
          );
          
          Alert.alert(
            'Security Alert',
            'Device security signature has changed. Please log in again for protection.',
            [
              {
                text: 'OK',
                onPress: () => {
                  performSecureLogout('device_binding_changed');
                }
              }
            ],
            { cancelable: false }
          );
          return;
        }
        
        // Validate session is still active
        const sessionValid = await sessionManager.validateSession();
        if (!sessionValid) {
          console.warn('⚠️ Session invalidated during app background');
          
          // Log session invalidation
          await centralizedLogging.logSecurity('warn', 'session_validation', 'Session invalidated during background', {
            reason: 'session_expired_background'
          });
          
          performSecureLogout('session_invalidated_background');
          return;
        }

        // Analyze app resume behavior with UEBA
        try {
          const resumeBehaviorAnalysis = await behaviorAnalyticsService.analyzeUserBehavior(
            'current_user',
            'device_change',
            {
              timestamp: Date.now(),
              deviceFingerprint: securityStatus.deviceThreats?.[0]?.details || 'unknown',
              appState: 'resume_from_background',
              securityStatus: securityStatus.securityStatus.riskLevel
            }
          );

          if (resumeBehaviorAnalysis.behaviorAnalysis.riskScore > 0.8) {
            console.warn('⚠️ High-risk behavior detected on app resume');
            
            // Create incident for suspicious app resume behavior
            await incidentResponse.createIncident(
              'Suspicious App Resume Behavior',
              `High-risk behavior detected when app resumed: ${resumeBehaviorAnalysis.behaviorAnalysis.anomalyType}`,
              'medium',
              'unauthorized_access',
              [{
                type: 'behavior_pattern',
                value: 'suspicious_app_resume',
                confidence: 'high',
                source: 'ueba_service',
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                isMalicious: true
              }],
              ['user_behavior', 'application_runtime']
            );
          }
        } catch (uebaError) {
          console.error('UEBA analysis failed on app resume:', uebaError);
        }
      }
      
      console.log('✅ Active security check passed');
      
    } catch (error) {
      console.error('💥 CRITICAL: Active security check failed:', error);
      
      // Log critical error
      try {
        const centralizedLogging = CentralizedLoggingService.getInstance();
        await centralizedLogging.logSecurity('critical', 'security_check_failure', 'Active security check failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (loggingError) {
        console.error('Failed to log security check failure:', loggingError);
      }
      
      // On security check failure, force logout for safety
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        performSecureLogout('security_check_failed');
      }
    }
  };

  // Don't render anything until fonts are loaded and security is initialized
  if (!loaded || !securityInitialized || !incidentResponseInitialized || !uebaInitialized) {
    return null;
  }

  // Show security blocked screen
  if (securityBlocked) {
    return null; // In a real app, this would show a security blocked screen
  }

  return (
    <AccessibilityProvider>
      <RootLayoutNav />
    </AccessibilityProvider>
  );
}

function RootLayoutNav() {
  const { isAuthenticated, logout } = useAuthStore();
  const [sessionValid, setSessionValid] = useState(true);

  useEffect(() => {
    // Enhanced authentication check with session validation and incident logging
    if (isAuthenticated) {
      validateSession();
    }
  }, [isAuthenticated]);

  const validateSession = async () => {
    try {
      const sessionManager = SessionManager.getInstance();
      const deviceBinding = DeviceBindingService.getInstance();
      const securityManager = SecurityManager.getInstance();
      const centralizedLogging = CentralizedLoggingService.getInstance();
      
      // CRITICAL: Comprehensive session validation
      const isValid = await sessionManager.validateSession();
      
      if (!isValid) {
        console.warn('⚠️ Session validation failed - forcing secure logout');
        
        // Log session validation failure
        await centralizedLogging.logSecurity('warn', 'session_validation', 'Session validation failed', {
          reason: 'session_expired',
          action: 'force_logout'
        });
        
        Alert.alert(
          'Session Expired',
          'Your session has expired or is invalid. Please log in again for security.',
          [
            {
              text: 'OK',
              onPress: () => {
                performSecureLogout('session_expired');
              }
            }
          ],
          { cancelable: false }
        );
        return;
      }
      
      // CRITICAL: Validate device binding to prevent session hijacking
      const deviceBindingValid = await deviceBinding.validateCurrentDeviceBinding();
      if (!deviceBindingValid) {
        console.error('🚨 SECURITY ALERT: Device binding validation failed - potential session hijacking');
        
        // Log potential session hijacking
        await centralizedLogging.logSecurity('critical', 'session_security', 'Potential session hijacking detected', {
          reason: 'device_binding_failed',
          action: 'force_logout'
        });
        
        Alert.alert(
          'Security Alert',
          'This session was created on a different device or the device signature has changed. Please log in again for security.',
          [
            {
              text: 'OK',
              onPress: () => {
                performSecureLogout('device_binding_failed');
              }
            }
          ],
          { cancelable: false }
        );
        return;
      }
      
      // CRITICAL: Check for ongoing security threats
      const currentSecurityStatus = await securityManager.forceSecurityCheck();
      if (currentSecurityStatus.securityStatus.riskLevel === 'critical') {
        console.error('🚨 SECURITY ALERT: Critical threats detected during session validation');
        
        // Log critical threats
        await centralizedLogging.logSecurity('critical', 'session_security', 'Critical threats during session validation', {
          threats: currentSecurityStatus.deviceThreats,
          riskLevel: currentSecurityStatus.securityStatus.riskLevel
        });
        
        Alert.alert(
          'Security Alert',
          'Critical security threats detected. Your session has been terminated for protection.',
          [
            {
              text: 'OK',
              onPress: () => {
                performSecureLogout('security_threat_detected');
              }
            }
          ],
          { cancelable: false }
        );
        return;
      }
      
      // SECURITY: Check session age and force re-authentication if too old
      const sessionAge = await sessionManager.getSessionAge();
      const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
      
      if (sessionAge > MAX_SESSION_AGE) {
        console.warn('⏰ Session too old - forcing re-authentication');
        
        // Log session age expiration
        await centralizedLogging.logSecurity('info', 'session_management', 'Session expired due to age', {
          sessionAge,
          maxAge: MAX_SESSION_AGE,
          action: 'force_reauth'
        });
        
        Alert.alert(
          'Session Expired',
          'Your session has expired for security reasons. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => {
                performSecureLogout('session_too_old');
              }
            }
          ],
          { cancelable: false }
        );
        return;
      }
      
      // Update session activity timestamp
      await sessionManager.updateSessionActivity();
      
      setSessionValid(true);
      console.log('✅ Session validation successful');
      
    } catch (error) {
      console.error('💥 CRITICAL: Session validation error:', error);
      
      // Log validation error
      try {
        const centralizedLogging = CentralizedLoggingService.getInstance();
        await centralizedLogging.logSecurity('critical', 'session_validation', 'Session validation error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (loggingError) {
        console.error('Failed to log session validation error:', loggingError);
      }
      
      // On any validation error, force logout for security
      performSecureLogout('validation_error');
    }
  };
  
  // Secure logout with proper cleanup and logging
  const performSecureLogout = async (reason: string) => {
    try {
      console.log(`🔐 Performing secure logout. Reason: ${reason}`);
      
      const sessionManager = SessionManager.getInstance();
      const deviceBinding = DeviceBindingService.getInstance();
      const centralizedLogging = CentralizedLoggingService.getInstance();
      
      // Log logout event
      await centralizedLogging.logSecurity('info', 'user_logout', 'Secure logout performed', {
        reason,
        timestamp: Date.now()
      });
      
      // Clear all session data securely
      await sessionManager.clearSession();
      await deviceBinding.clearDeviceBinding();
      
      // Clear auth store
      logout();
      setSessionValid(false);
      
      // Log security event
      console.log(`✅ Secure logout completed. Reason: ${reason}`);
      
    } catch (error) {
      console.error('💥 Error during secure logout:', error);
      // Force logout even if cleanup fails
      logout();
      setSessionValid(false);
    }
  };

  // Don't render authenticated screens if session is invalid
  const shouldShowAuthenticatedScreens = isAuthenticated && sessionValid;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!shouldShowAuthenticatedScreens ? (
        <>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth/otp" options={{ headerShown: false }} />
          <Stack.Screen name="auth/permissions" options={{ headerShown: false }} />
        </>
      ) : (
        <>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="wallet/send" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="wallet/receive" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="profile/edit" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="profile/settings" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="security/incident-response" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="security/logging" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="security/soc" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="security/devsecops" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="security/ueba" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="security/access-control" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="security/notifications" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="security/ota" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="security/dynamic-permissions" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="security/root-detection" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="dashboard" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="accessibility" options={{ headerShown: true, presentation: 'card' }} />
          <Stack.Screen name="accessibility-showcase" options={{ headerShown: true, presentation: 'card' }} />
        </>
      )}
    </Stack>
  );
}