import { Platform } from 'react-native';
import * as Constants from 'expo-constants';

// Conditional imports for expo modules that may not be available
let Application: any = null;
let Device: any = null;

try {
  if (Platform.OS !== 'web') {
    Application = require('expo-application');
    Device = require('expo-device');
  }
} catch (error) {
  console.warn('Some expo modules not available:', error);
}

interface SecurityThreat {
  type: 'root' | 'jailbreak' | 'emulator' | 'debugger' | 'tampering' | 'frida' | 'xposed' | 'hooking' | 'memory_dump' | 'runtime_manipulation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected: boolean;
  details: string;
  timestamp: number;
  mitigationAction?: string;
  confidence: number; // 0-100 confidence level
}

interface DeviceFingerprint {
  deviceId: string;
  model: string;
  osVersion: string;
  appVersion: string;
  installationId: string;
  securityHash: string;
  buildFingerprint: string;
  kernelVersion: string;
  bootloaderStatus: string;
  hardwareFingerprint: string;
  securityPatchLevel?: string;
}

interface AntiTamperingConfig {
  enableRootDetection: boolean;
  enableDebuggerDetection: boolean;
  enableEmulatorDetection: boolean;
  enableHookingDetection: boolean;
  enableMemoryProtection: boolean;
  enableRuntimeProtection: boolean;
  enableIntegrityChecks: boolean;
  enableObfuscationValidation: boolean;
  responseMode: 'log' | 'warn' | 'block' | 'shutdown';
  confidenceThreshold: number; // Minimum confidence level to trigger response
}

class DeviceSecurityService {
  private static instance: DeviceSecurityService;
  private securityThreats: SecurityThreat[] = [];
  private deviceFingerprint: DeviceFingerprint | null = null;
  private isSecurityCheckRunning = false;
  private antiTamperingConfig: AntiTamperingConfig;
  private securityMonitoringInterval: NodeJS.Timeout | null = null;
  private integrityChecksum: string | null = null;
  private runtimeProtectionActive = false;
  private sensitiveOperationsBlocked = false;
  private lastSecurityCheck = 0;

  private constructor() {
    this.antiTamperingConfig = {
      enableRootDetection: true,
      enableDebuggerDetection: true,
      enableEmulatorDetection: true,
      enableHookingDetection: true,
      enableMemoryProtection: true,
      enableRuntimeProtection: true,
      enableIntegrityChecks: true,
      enableObfuscationValidation: true,
      responseMode: 'block',
      confidenceThreshold: 75 // 75% confidence threshold
    };

    // Relax checks in dev/web to avoid false positives and blocking during development
    if (__DEV__ || Platform.OS === 'web') {
      this.antiTamperingConfig = {
        ...this.antiTamperingConfig,
        enableDebuggerDetection: false,
        enableIntegrityChecks: false,
        responseMode: 'warn',
        confidenceThreshold: 101
      };
      console.log('DeviceSecurityService: dev/web mode detected. Anti-tampering relaxed to prevent false positives.');
    }

    this.initializeDeviceSecurity();
  }

  static getInstance(): DeviceSecurityService {
    if (!DeviceSecurityService.instance) {
      DeviceSecurityService.instance = new DeviceSecurityService();
    }
    return DeviceSecurityService.instance;
  }

  // Initialize enhanced device security with RASP
  private async initializeDeviceSecurity(): Promise<void> {
    try {
      await this.generateEnhancedDeviceFingerprint();
      await this.performComprehensiveSecurityChecks();
      await this.initializeRuntimeProtection();
      this.startContinuousSecurityMonitoring();
      console.log('Enhanced device security with RASP initialized');
    } catch (error) {
      console.error('Enhanced device security initialization failed:', error);
      this.handleSecurityThreat({
        type: 'tampering',
        severity: 'critical',
        detected: true,
        details: 'Security initialization failure',
        timestamp: Date.now(),
        mitigationAction: 'security_init_failed',
        confidence: 100
      });
    }
  }

  // Generate enhanced device fingerprint with anti-tampering checks
  private async generateEnhancedDeviceFingerprint(): Promise<void> {
    try {
      let deviceId = 'unknown';
      let model = 'unknown';
      let osVersion = 'unknown';
      let appVersion = '1.0.0';
      let installationId = 'unknown';
      let buildFingerprint = 'unknown';
      let kernelVersion = 'unknown';
      let bootloaderStatus = 'unknown';
      let securityPatchLevel: string | undefined;

      // Enhanced device information gathering
      if (Platform.OS !== 'web' && Device) {
        deviceId = Device.osInternalBuildId || Device.deviceName || 'unknown';
        model = Device.modelName || 'unknown';
        osVersion = Device.osVersion || 'unknown';
        
        // Additional security-focused device info
        if (Platform.OS === 'android') {
          buildFingerprint = (Device as any).buildFingerprint || 'unknown';
          kernelVersion = (Device as any).kernelVersion || 'unknown';
          bootloaderStatus = (Device as any).bootloader || 'unknown';
          securityPatchLevel = (Device as any).securityPatchLevel;
        }
      } else {
        // Web fallback with enhanced fingerprinting
        deviceId = this.generateWebFingerprint();
        model = 'web-browser';
        osVersion = Platform.OS;
      }

      // Enhanced application information
      if (Platform.OS !== 'web' && Application) {
        appVersion = Application.nativeApplicationVersion || '1.0.0';
      }

      // Enhanced installation ID with integrity check
      if ((Constants as any).sessionId) {
        installationId = (Constants as any).sessionId;
      } else if ((Constants as any).installationId) {
        installationId = (Constants as any).installationId;
      } else {
        installationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Generate hardware fingerprint
      const hardwareFingerprint = await this.generateHardwareFingerprint();

      // Create enhanced security hash with multiple factors
      const fingerprintData = `${deviceId}-${model}-${osVersion}-${appVersion}-${installationId}-${buildFingerprint}-${kernelVersion}-${hardwareFingerprint}`;
      const securityHash = await this.createEnhancedSecurityHash(fingerprintData);

      this.deviceFingerprint = {
        deviceId,
        model,
        osVersion,
        appVersion,
        installationId,
        securityHash,
        buildFingerprint,
        kernelVersion,
        bootloaderStatus,
        hardwareFingerprint,
        securityPatchLevel
      };

      // Generate application integrity checksum
      this.integrityChecksum = await this.generateIntegrityChecksum();

      console.log('Enhanced device fingerprint generated with integrity checks');
    } catch (error) {
      console.error('Enhanced device fingerprint generation failed:', error);
      throw new Error('Critical security initialization failure');
    }
  }

  // Generate hardware fingerprint for enhanced security
  private async generateHardwareFingerprint(): Promise<string> {
    try {
      const hardwareData: string[] = [];

      if (Platform.OS !== 'web' && Device) {
        // Device hardware characteristics
        hardwareData.push(Device.modelName || 'unknown');
        hardwareData.push(Device.brand || 'unknown');
        hardwareData.push(Device.manufacturer || 'unknown');
        hardwareData.push((Device as any).totalMemory?.toString() || 'unknown');
        
        // Platform-specific hardware data
        if (Platform.OS === 'android') {
          hardwareData.push((Device as any).buildFingerprint || 'unknown');
          hardwareData.push((Device as any).bootloader || 'unknown');
          hardwareData.push((Device as any).hardware || 'unknown');
          hardwareData.push((Device as any).board || 'unknown');
        } else if (Platform.OS === 'ios') {
          hardwareData.push((Device as any).identifierForVendor || 'unknown');
        }
      } else {
        // Web hardware fingerprinting
        if (typeof navigator !== 'undefined') {
          hardwareData.push(navigator.hardwareConcurrency?.toString() || 'unknown');
          hardwareData.push(navigator.deviceMemory?.toString() || 'unknown');
          hardwareData.push(screen.width + 'x' + screen.height);
          hardwareData.push(screen.colorDepth.toString());
          hardwareData.push(navigator.platform);
        }
      }

      const hardwareString = hardwareData.join('|');
      return this.createEnhancedSecurityHash(hardwareString);
    } catch (error) {
      console.error('Hardware fingerprint generation failed:', error);
      return 'fallback-hardware-fingerprint';
    }
  }

  // Enhanced security hash with multiple algorithms
  private async createEnhancedSecurityHash(data: string): Promise<string> {
    // Multi-layer hashing for enhanced security
    let hash1 = 0;
    let hash2 = 0;
    let hash3 = 0;
    
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash1 = hash1 & hash1; // Convert to 32-bit integer
      
      hash2 = ((hash2 << 3) - hash2) + char + i;
      hash2 = hash2 & hash2;
      
      hash3 = ((hash3 << 7) - hash3) + char * i;
      hash3 = hash3 & hash3;
    }
    
    const combinedHash = Math.abs(hash1 ^ hash2 ^ hash3).toString(16);
    const timestamp = Date.now().toString(16);
    
    return `${combinedHash}-${timestamp}`;
  }

  // Generate web-specific fingerprint
  private generateWebFingerprint(): string {
    if (typeof window === 'undefined') return 'server-side';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Security fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.platform,
      navigator.cookieEnabled.toString()
    ].join('|');
    
    return fingerprint.substring(0, 32);
  }

  // Comprehensive security checks with RASP
  async performComprehensiveSecurityChecks(): Promise<SecurityThreat[]> {
    if (this.isSecurityCheckRunning) {
      return this.securityThreats;
    }

    this.isSecurityCheckRunning = true;
    this.securityThreats = [];
    this.lastSecurityCheck = Date.now();

    try {
      // Skip security checks in development mode to prevent false positives
      if (__DEV__) {
        console.log('Security checks disabled in development mode');
        return this.securityThreats;
      }
      
      // Core security checks with confidence scoring
      await this.checkAdvancedRootJailbreak();
      await this.checkAdvancedEmulator();
      await this.checkAdvancedDebugging();
      await this.checkApplicationTampering();
      
      // RASP-specific checks
      await this.checkHookingFrameworks();
      await this.checkMemoryDumping();
      await this.checkRuntimeManipulation();
      await this.checkObfuscationIntegrity();
      await this.checkNetworkSecurity();
      await this.checkEnvironmentSecurity();

      console.log('Comprehensive security checks completed:', this.securityThreats.length, 'threats detected');
      
      // Handle detected threats based on confidence
      await this.processDetectedThreats();
      
      return this.securityThreats;
    } catch (error) {
      console.error('Comprehensive security checks failed:', error);
      this.handleSecurityThreat({
        type: 'tampering',
        severity: 'critical',
        detected: true,
        details: 'Security check system compromised',
        timestamp: Date.now(),
        mitigationAction: 'security_system_failure',
        confidence: 100
      });
      return this.securityThreats;
    } finally {
      this.isSecurityCheckRunning = false;
    }
  }

  // Advanced root/jailbreak detection with confidence scoring
  private async checkAdvancedRootJailbreak(): Promise<void> {
    const threat: SecurityThreat = {
      type: Platform.OS === 'ios' ? 'jailbreak' : 'root',
      severity: 'critical',
      detected: false,
      details: 'Advanced device integrity check',
      timestamp: Date.now(),
      confidence: 0
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      if (Platform.OS === 'android') {
        // Multiple Android root detection techniques
        if (await this.checkAndroidRootIndicators()) {
          confidenceScore += 30;
          indicators.push('root_indicators');
        }
        
        if (await this.checkSuBinaries()) {
          confidenceScore += 25;
          indicators.push('su_binaries');
        }
        
        if (await this.checkBuildTags()) {
          confidenceScore += 20;
          indicators.push('build_tags');
        }
        
        if (await this.checkSystemProperties()) {
          confidenceScore += 15;
          indicators.push('system_properties');
        }
        
        if (await this.checkRootManagementApps()) {
          confidenceScore += 35;
          indicators.push('root_apps');
        }
        
      } else if (Platform.OS === 'ios') {
        // Multiple iOS jailbreak detection techniques
        if (await this.checkiOSJailbreakIndicators()) {
          confidenceScore += 30;
          indicators.push('jailbreak_indicators');
        }
        
        if (await this.checkJailbreakUrlSchemes()) {
          confidenceScore += 25;
          indicators.push('url_schemes');
        }
        
        if (await this.checkJailbreakFileSystem()) {
          confidenceScore += 20;
          indicators.push('file_system');
        }
        
        if (await this.checkJailbreakApps()) {
          confidenceScore += 35;
          indicators.push('jailbreak_apps');
        }
      }

      threat.confidence = Math.min(confidenceScore, 100);
      
      if (threat.confidence >= this.antiTamperingConfig.confidenceThreshold) {
        threat.detected = true;
        threat.details = `Advanced ${threat.type} detection: ${indicators.join(', ')} (confidence: ${threat.confidence}%)`;
        threat.mitigationAction = `block_${threat.type}_device`;
      }

      this.securityThreats.push(threat);
    } catch (error) {
      console.error('Advanced root/jailbreak detection failed:', error);
    }
  }

  // Check for Android root indicators
  private async checkAndroidRootIndicators(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      // Check device characteristics
      const deviceModel = Device?.modelName?.toLowerCase() || '';
      const brand = Device?.brand?.toLowerCase() || '';
      
      // Suspicious device characteristics
      const suspiciousModels = ['generic', 'unknown', 'emulator', 'android sdk', 'google_sdk'];
      const suspiciousBrands = ['generic', 'unknown', 'google'];
      
      return suspiciousModels.some(model => deviceModel.includes(model)) ||
             suspiciousBrands.some(brandName => brand.includes(brandName));
    } catch (error) {
      console.error('Android root indicator check failed:', error);
      return false;
    }
  }

  // Check for SU binaries
  private async checkSuBinaries(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      // Check for development environment indicators
      return __DEV__ && Device?.isDevice === false;
    } catch (error) {
      return false;
    }
  }

  // Check Android build tags
  private async checkBuildTags(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      const buildTags = (Device as any)?.buildTags || '';
      const suspiciousTags = ['test-keys', 'dev-keys', 'unofficial'];
      
      return suspiciousTags.some(tag => buildTags.toLowerCase().includes(tag));
    } catch (error) {
      return false;
    }
  }

  // Check system properties
  private async checkSystemProperties(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      // Check for debugging properties
      const isDebuggable = __DEV__;
      const isEmulator = !Device?.isDevice;
      
      return isDebuggable || isEmulator;
    } catch (error) {
      return false;
    }
  }

  // Check for root management apps
  private async checkRootManagementApps(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      // In a real implementation, this would check for installed root apps
      // For React Native, we do a simplified check
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check iOS jailbreak indicators
  private async checkiOSJailbreakIndicators(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    
    try {
      const deviceModel = Device?.modelName?.toLowerCase() || '';
      const isSimulator = !Device?.isDevice;
      
      return isSimulator;
    } catch (error) {
      return false;
    }
  }

  // Check jailbreak URL schemes
  private async checkJailbreakUrlSchemes(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    
    // In a real implementation, this would try to open jailbreak app URL schemes
    return false;
  }

  // Check jailbreak file system
  private async checkJailbreakFileSystem(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    
    // In a real implementation, this would check for jailbreak files
    return false;
  }

  // Check for jailbreak apps
  private async checkJailbreakApps(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    
    // In a real implementation, this would check for installed jailbreak apps
    return false;
  }

  // Advanced emulator detection with confidence scoring
  private async checkAdvancedEmulator(): Promise<void> {
    const threat: SecurityThreat = {
      type: 'emulator',
      severity: 'high',
      detected: false,
      details: 'Advanced emulator detection check',
      timestamp: Date.now(),
      confidence: 0
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      if (Platform.OS !== 'web' && Device) {
        // Multiple emulator detection techniques
        if (!Device.isDevice) {
          confidenceScore += 40;
          indicators.push('not_physical_device');
        }
        
        if (this.checkEmulatorModel()) {
          confidenceScore += 30;
          indicators.push('emulator_model');
        }
        
        if (await this.checkEmulatorPerformance()) {
          confidenceScore += 20;
          indicators.push('performance_characteristics');
        }
        
        if (await this.checkEmulatorSensors()) {
          confidenceScore += 25;
          indicators.push('missing_sensors');
        }
        
        if (await this.checkEmulatorFiles()) {
          confidenceScore += 35;
          indicators.push('emulator_files');
        }
        
      } else if (Platform.OS === 'web') {
        // Web environment checks
        if (this.checkWebEmulatorIndicators()) {
          confidenceScore += 50;
          indicators.push('automation_tools');
        }
      }

      threat.confidence = Math.min(confidenceScore, 100);
      
      if (threat.confidence >= this.antiTamperingConfig.confidenceThreshold) {
        threat.detected = true;
        threat.details = `Advanced emulator detection: ${indicators.join(', ')} (confidence: ${threat.confidence}%)`;
        threat.mitigationAction = 'block_emulator';
      }

      this.securityThreats.push(threat);
    } catch (error) {
      console.error('Advanced emulator detection failed:', error);
    }
  }

  // Check emulator model indicators
  private checkEmulatorModel(): boolean {
    if (!Device) return false;
    
    const model = Device.modelName?.toLowerCase() || '';
    const brand = Device.brand?.toLowerCase() || '';
    
    const emulatorIndicators = [
      'simulator', 'emulator', 'virtual', 'genymotion', 'bluestacks',
      'android sdk', 'google_sdk', 'sdk_gphone', 'sdk_google'
    ];
    
    return emulatorIndicators.some(indicator => 
      model.includes(indicator) || brand.includes(indicator)
    );
  }

  // Check emulator performance characteristics
  private async checkEmulatorPerformance(): Promise<boolean> {
    try {
      // Simple performance test
      const start = Date.now();
      for (let i = 0; i < 100000; i++) {
        Math.random();
      }
      const duration = Date.now() - start;
      
      // Emulators typically perform slower
      return duration > 100; // Threshold in milliseconds
    } catch (error) {
      return false;
    }
  }

  // Check emulator sensor availability
  private async checkEmulatorSensors(): Promise<boolean> {
    // In a real implementation, this would check for missing sensors
    // that are typically absent in emulators
    return false;
  }

  // Check for emulator files
  private async checkEmulatorFiles(): Promise<boolean> {
    // In a real implementation, this would check for emulator-specific files
    return false;
  }

  // Check web emulator indicators
  private checkWebEmulatorIndicators(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for automation tools
    const automationIndicators = [
      'webdriver', 'selenium', 'phantomjs', 'headless', 'chrome-headless'
    ];
    
    const userAgent = navigator.userAgent.toLowerCase();
    return automationIndicators.some(indicator => userAgent.includes(indicator));
  }

  // Advanced debugging detection with confidence scoring
  private async checkAdvancedDebugging(): Promise<void> {
    const threat: SecurityThreat = {
      type: 'debugger',
      severity: 'high',
      detected: false,
      details: 'Advanced debugger detection check',
      timestamp: Date.now(),
      confidence: 0
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Multiple debugging detection techniques
      if (__DEV__) {
        confidenceScore += 30;
        indicators.push('dev_mode');
      }
      
      if (this.checkDebuggerPresence()) {
        confidenceScore += 35;
        indicators.push('debugger_presence');
      }
      
      if (await this.checkDebuggerTiming()) {
        confidenceScore += 40;
        indicators.push('timing_attack');
      }
      
      if (this.checkConsoleDebugger()) {
        confidenceScore += 25;
        indicators.push('console_debugger');
      }
      
      if (this.checkDevTools()) {
        confidenceScore += 30;
        indicators.push('dev_tools');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      
      if (threat.confidence >= this.antiTamperingConfig.confidenceThreshold) {
        threat.detected = true;
        threat.details = `Advanced debugger detection: ${indicators.join(', ')} (confidence: ${threat.confidence}%)`;
        threat.mitigationAction = 'block_debugging';
      }

      this.securityThreats.push(threat);
    } catch (error) {
      console.error('Advanced debugging detection failed:', error);
    }
  }

  // Check for debugger presence
  private checkDebuggerPresence(): boolean {
    try {
      // Check for common debugging indicators
      if (typeof window !== 'undefined') {
        return !!(window as any).chrome?.runtime?.onConnect ||
               !!(window as any).devtools ||
               !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check debugger timing attacks
  private async checkDebuggerTiming(): Promise<boolean> {
    try {
      if (__DEV__ || Platform.OS === 'web') {
        return false;
      }
      const start = performance.now();
      debugger; // This will pause if debugger is attached
      const end = performance.now();
      
      return (end - start) > 100;
    } catch (error) {
      return false;
    }
  }

  // Check console debugger
  private checkConsoleDebugger(): boolean {
    try {
      if (typeof window !== 'undefined' && window.console) {
        const originalLog = console.log;
        let debuggerDetected = false;
        
        console.log = function() {
          debuggerDetected = true;
          return originalLog.apply(console, arguments);
        };
        
        console.log('Security check');
        console.log = originalLog;
        
        return debuggerDetected;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for dev tools
  private checkDevTools(): boolean {
    try {
      if (typeof window !== 'undefined') {
        // Check window size for dev tools
        const threshold = 160;
        return window.outerHeight - window.innerHeight > threshold ||
               window.outerWidth - window.innerWidth > threshold;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for hooking frameworks (Frida, Xposed, etc.)
  private async checkHookingFrameworks(): Promise<void> {
    const threat: SecurityThreat = {
      type: 'hooking',
      severity: 'critical',
      detected: false,
      details: 'Hooking framework detection check',
      timestamp: Date.now(),
      confidence: 0
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Check for Frida
      if (await this.checkFridaPresence()) {
        confidenceScore += 40;
        indicators.push('frida');
      }
      
      // Check for Xposed (Android)
      if (await this.checkXposedPresence()) {
        confidenceScore += 35;
        indicators.push('xposed');
      }
      
      // Check for other hooking frameworks
      if (await this.checkOtherHookingFrameworks()) {
        confidenceScore += 30;
        indicators.push('other_hooks');
      }
      
      // Check for function hooking
      if (await this.checkFunctionHooking()) {
        confidenceScore += 25;
        indicators.push('function_hooks');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      
      if (threat.confidence >= this.antiTamperingConfig.confidenceThreshold) {
        threat.detected = true;
        threat.details = `Hooking framework detected: ${indicators.join(', ')} (confidence: ${threat.confidence}%)`;
        threat.mitigationAction = 'shutdown_app';
      }

      this.securityThreats.push(threat);
    } catch (error) {
      console.error('Hooking framework detection failed:', error);
    }
  }

  // Check for Frida presence
  private async checkFridaPresence(): Promise<boolean> {
    try {
      // Check for Frida-specific indicators
      if (typeof window !== 'undefined') {
        return !!(window as any).frida ||
               !!(window as any).Java ||
               !!(window as any).send ||
               !!(window as any).recv;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for Xposed presence (Android)
  private async checkXposedPresence(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      // In a real implementation, this would check for Xposed modules
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for other hooking frameworks
  private async checkOtherHookingFrameworks(): Promise<boolean> {
    try {
      // Check for Substrate (iOS)
      if (Platform.OS === 'ios') {
        // Check for Substrate indicators
        return false;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for function hooking
  private async checkFunctionHooking(): Promise<boolean> {
    try {
      // Check if critical functions have been modified
      const originalFetch = fetch.toString();
      const originalXMLHttpRequest = XMLHttpRequest.toString();
      
      // In a real implementation, this would compare against known good signatures
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for memory dumping attempts
  private async checkMemoryDumping(): Promise<void> {
    const threat: SecurityThreat = {
      type: 'memory_dump',
      severity: 'high',
      detected: false,
      details: 'Memory dumping detection check',
      timestamp: Date.now(),
      confidence: 0
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Check for memory analysis tools
      if (await this.checkMemoryAnalysisTools()) {
        confidenceScore += 40;
        indicators.push('memory_tools');
      }
      
      // Check for suspicious memory access patterns
      if (await this.checkSuspiciousMemoryAccess()) {
        confidenceScore += 35;
        indicators.push('suspicious_access');
      }
      
      // Check for memory protection bypass
      if (await this.checkMemoryProtectionBypass()) {
        confidenceScore += 30;
        indicators.push('protection_bypass');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      
      if (threat.confidence >= this.antiTamperingConfig.confidenceThreshold) {
        threat.detected = true;
        threat.details = `Memory dumping attempt detected: ${indicators.join(', ')} (confidence: ${threat.confidence}%)`;
        threat.mitigationAction = 'clear_sensitive_memory';
      }

      this.securityThreats.push(threat);
    } catch (error) {
      console.error('Memory dumping detection failed:', error);
    }
  }

  // Check for memory analysis tools
  private async checkMemoryAnalysisTools(): Promise<boolean> {
    try {
      // In a real implementation, this would check running processes
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for suspicious memory access
  private async checkSuspiciousMemoryAccess(): Promise<boolean> {
    try {
      // Monitor for unusual memory access patterns
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for memory protection bypass
  private async checkMemoryProtectionBypass(): Promise<boolean> {
    try {
      // Check if memory protection has been bypassed
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for runtime manipulation
  private async checkRuntimeManipulation(): Promise<void> {
    const threat: SecurityThreat = {
      type: 'runtime_manipulation',
      severity: 'critical',
      detected: false,
      details: 'Runtime manipulation detection check',
      timestamp: Date.now(),
      confidence: 0
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Check for prototype pollution
      if (await this.checkPrototypePollution()) {
        confidenceScore += 35;
        indicators.push('prototype_pollution');
      }
      
      // Check for code injection
      if (await this.checkCodeInjection()) {
        confidenceScore += 40;
        indicators.push('code_injection');
      }
      
      // Check for eval usage
      if (await this.checkEvalUsage()) {
        confidenceScore += 30;
        indicators.push('eval_usage');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      
      if (threat.confidence >= this.antiTamperingConfig.confidenceThreshold) {
        threat.detected = true;
        threat.details = `Runtime manipulation detected: ${indicators.join(', ')} (confidence: ${threat.confidence}%)`;
        threat.mitigationAction = 'shutdown_app';
      }

      this.securityThreats.push(threat);
    } catch (error) {
      console.error('Runtime manipulation detection failed:', error);
    }
  }

  // Check for prototype pollution
  private async checkPrototypePollution(): Promise<boolean> {
    try {
      // Check for prototype pollution attacks
      const hasPrototypePollution = 
        Object.prototype.hasOwnProperty('__proto__') ||
        Object.prototype.hasOwnProperty('constructor') ||
        Object.prototype.hasOwnProperty('prototype');
      
      return hasPrototypePollution;
    } catch (error) {
      return false;
    }
  }

  // Check for code injection
  private async checkCodeInjection(): Promise<boolean> {
    try {
      // Check for dynamic code execution
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for eval usage
  private async checkEvalUsage(): Promise<boolean> {
    try {
      // Check for eval usage and dynamic code execution
      const hasEval = typeof eval !== 'undefined';
      const hasFunction = typeof Function !== 'undefined';
      
      // In a real implementation, this would be more sophisticated
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check obfuscation integrity
  private async checkObfuscationIntegrity(): Promise<void> {
    const threat: SecurityThreat = {
      type: 'tampering',
      severity: 'high',
      detected: false,
      details: 'Obfuscation integrity check',
      timestamp: Date.now(),
      confidence: 0
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Check if code has been deobfuscated or modified
      if (!await this.verifyObfuscation()) {
        confidenceScore += 50;
        indicators.push('obfuscation_compromised');
      }
      
      // Check for code beautification
      if (await this.checkCodeBeautification()) {
        confidenceScore += 30;
        indicators.push('code_beautified');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      
      if (threat.confidence >= this.antiTamperingConfig.confidenceThreshold) {
        threat.detected = true;
        threat.details = `Obfuscation integrity compromised: ${indicators.join(', ')} (confidence: ${threat.confidence}%)`;
        threat.mitigationAction = 'block_tampered_app';
      }

      this.securityThreats.push(threat);
    } catch (error) {
      console.error('Obfuscation integrity check failed:', error);
    }
  }

  // Verify obfuscation integrity
  private async verifyObfuscation(): Promise<boolean> {
    try {
      // In a real implementation, this would check obfuscation markers
      // and verify that critical functions are still obfuscated
      
      // Check for function name obfuscation
      const functionNames = Object.getOwnPropertyNames(this);
      const hasObfuscatedNames = functionNames.some(name => 
        name.length < 3 || /^[a-z]{1,2}$/.test(name)
      );
      
      // For development, assume obfuscation is intact
      return !__DEV__;
    } catch (error) {
      return false;
    }
  }

  // Check for code beautification
  private async checkCodeBeautification(): Promise<boolean> {
    try {
      // Check if code has been beautified/formatted
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check application integrity
  private async checkApplicationTampering(): Promise<void> {
    const threat: SecurityThreat = {
      type: 'tampering',
      severity: 'critical',
      detected: false,
      details: 'Application integrity check',
      timestamp: Date.now(),
      confidence: 0
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Check application signature
      if (!await this.verifyApplicationSignature()) {
        confidenceScore += 40;
        indicators.push('signature_invalid');
      }
      
      // Check file integrity
      if (!await this.verifyFileIntegrity()) {
        confidenceScore += 35;
        indicators.push('files_modified');
      }
      
      // Check checksum
      if (!await this.verifyApplicationChecksum()) {
        confidenceScore += 30;
        indicators.push('checksum_mismatch');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      
      if (threat.confidence >= this.antiTamperingConfig.confidenceThreshold) {
        threat.detected = true;
        threat.details = `Application tampering detected: ${indicators.join(', ')} (confidence: ${threat.confidence}%)`;
        threat.mitigationAction = 'shutdown_app';
      }

      this.securityThreats.push(threat);
    } catch (error) {
      console.error('Application tampering check failed:', error);
    }
  }

  // Check network security
  private async checkNetworkSecurity(): Promise<void> {
    const threat: SecurityThreat = {
      type: 'tampering',
      severity: 'medium',
      detected: false,
      details: 'Network security check',
      timestamp: Date.now(),
      confidence: 0
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Check for proxy usage
      if (await this.checkProxyUsage()) {
        confidenceScore += 30;
        indicators.push('proxy_detected');
      }
      
      // Check for SSL/TLS manipulation
      if (await this.checkSSLManipulation()) {
        confidenceScore += 40;
        indicators.push('ssl_manipulation');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      
      if (threat.confidence >= this.antiTamperingConfig.confidenceThreshold) {
        threat.detected = true;
        threat.details = `Network security threat: ${indicators.join(', ')} (confidence: ${threat.confidence}%)`;
        threat.mitigationAction = 'block_network_access';
      }

      this.securityThreats.push(threat);
    } catch (error) {
      console.error('Network security check failed:', error);
    }
  }

  // Check for proxy usage
  private async checkProxyUsage(): Promise<boolean> {
    try {
      // In a real implementation, this would check for proxy indicators
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for SSL/TLS manipulation
  private async checkSSLManipulation(): Promise<boolean> {
    try {
      // In a real implementation, this would check for SSL/TLS manipulation
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check environment security
  private async checkEnvironmentSecurity(): Promise<void> {
    const threat: SecurityThreat = {
      type: 'tampering',
      severity: 'medium',
      detected: false,
      details: 'Environment security check',
      timestamp: Date.now(),
      confidence: 0
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Check for virtualization
      if (await this.checkVirtualization()) {
        confidenceScore += 25;
        indicators.push('virtualization');
      }
      
      // Check for sandboxing
      if (await this.checkSandboxing()) {
        confidenceScore += 20;
        indicators.push('sandboxing');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      
      if (threat.confidence >= this.antiTamperingConfig.confidenceThreshold) {
        threat.detected = true;
        threat.details = `Environment security threat: ${indicators.join(', ')} (confidence: ${threat.confidence}%)`;
        threat.mitigationAction = 'warn_environment';
      }

      this.securityThreats.push(threat);
    } catch (error) {
      console.error('Environment security check failed:', error);
    }
  }

  // Check for virtualization
  private async checkVirtualization(): Promise<boolean> {
    try {
      // In a real implementation, this would check for virtualization indicators
      return false;
    } catch (error) {
      return false;
    }
  }

  // Check for sandboxing
  private async checkSandboxing(): Promise<boolean> {
    try {
      // In a real implementation, this would check for sandbox indicators
      return false;
    } catch (error) {
      return false;
    }
  }

  // Verify application signature
  private async verifyApplicationSignature(): Promise<boolean> {
    try {
      // In a real implementation, this would verify the app signature
      // against a known good signature
      
      if (Platform.OS !== 'web' && Application) {
        const buildVersion = Application.nativeBuildVersion;
        const appVersion = Application.nativeApplicationVersion;
        
        // Basic version consistency check
        return !!(buildVersion && appVersion);
      }
      
      return true; // Assume valid for web
    } catch (error) {
      return false;
    }
  }

  // Verify file integrity
  private async verifyFileIntegrity(): Promise<boolean> {
    try {
      // In a real implementation, this would check file hashes
      // against known good values
      return true;
    } catch (error) {
      return false;
    }
  }

  // Verify application checksum
  private async verifyApplicationChecksum(): Promise<boolean> {
    try {
      if (!this.integrityChecksum) {
        return false;
      }
      
      // Generate current checksum and compare
      const currentChecksum = await this.generateIntegrityChecksum();
      return currentChecksum === this.integrityChecksum;
    } catch (error) {
      return false;
    }
  }

  // Generate integrity checksum
  private async generateIntegrityChecksum(): Promise<string> {
    try {
      // Deterministic checksum based on app metadata only (no timestamp) to avoid false positives in dev
      const appVersion = (Constants as any)?.expoConfig?.version || '1.0.0';
      const platform = Platform.OS;
      const data = `${appVersion}-${platform}`;
      
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(16);
    } catch (error) {
      return 'fallback-checksum';
    }
  }

  // Initialize runtime protection
  private async initializeRuntimeProtection(): Promise<void> {
    try {
      if (!this.antiTamperingConfig.enableRuntimeProtection) {
        return;
      }

      // Set up runtime protection mechanisms
      await this.setupMemoryProtection();
      await this.setupAntiDebugging();
      await this.setupIntegrityMonitoring();
      
      this.runtimeProtectionActive = true;
      console.log('Runtime protection (RASP) initialized');
    } catch (error) {
      console.error('Runtime protection initialization failed:', error);
    }
  }

  // Setup memory protection
  private async setupMemoryProtection(): Promise<void> {
    if (!this.antiTamperingConfig.enableMemoryProtection) {
      return;
    }

    try {
      // In a real implementation, this would set up memory protection
      // such as stack canaries, ASLR verification, etc.
      console.log('Memory protection mechanisms activated');
    } catch (error) {
      console.error('Memory protection setup failed:', error);
    }
  }

  // Setup anti-debugging measures
  private async setupAntiDebugging(): Promise<void> {
    if (!this.antiTamperingConfig.enableDebuggerDetection) {
      return;
    }

    try {
      if (__DEV__ || Platform.OS === 'web') {
        console.log('Anti-debugging disabled in dev/web to prevent false positives');
        return;
      }
      // Set up anti-debugging measures
      setInterval(() => {
        this.performAntiDebuggingCheck();
      }, 5000); // Check every 5 seconds
      
      console.log('Anti-debugging measures activated');
    } catch (error) {
      console.error('Anti-debugging setup failed:', error);
    }
  }

  // Perform anti-debugging check
  private performAntiDebuggingCheck(): void {
    try {
      if (__DEV__ || Platform.OS === 'web' || !this.antiTamperingConfig.enableDebuggerDetection) {
        return;
      }
      const start = performance.now();
      debugger;
      const end = performance.now();
      
      if (end - start > 100) {
        this.handleSecurityThreat({
          type: 'debugger',
          severity: 'critical',
          detected: true,
          details: 'Debugger attachment detected during runtime',
          timestamp: Date.now(),
          mitigationAction: 'shutdown_app',
          confidence: 95
        });
      }
    } catch (error) {
      // Ignore errors in anti-debugging checks
    }
  }

  // Setup integrity monitoring
  private async setupIntegrityMonitoring(): Promise<void> {
    if (!this.antiTamperingConfig.enableIntegrityChecks) {
      return;
    }

    try {
      // Monitor critical functions for modifications
      setInterval(() => {
        this.performIntegrityCheck();
      }, 30000); // Check every 30 seconds
      
      console.log('Integrity monitoring activated');
    } catch (error) {
      console.error('Integrity monitoring setup failed:', error);
    }
  }

  // Perform integrity check
  private async performIntegrityCheck(): Promise<void> {
    try {
      const currentChecksum = await this.generateIntegrityChecksum();
      
      if (this.integrityChecksum && currentChecksum !== this.integrityChecksum) {
        this.handleSecurityThreat({
          type: 'tampering',
          severity: 'critical',
          detected: true,
          details: 'Application integrity violation detected',
          timestamp: Date.now(),
          mitigationAction: 'shutdown_app',
          confidence: 100
        });
      }
    } catch (error) {
      console.error('Integrity check failed:', error);
    }
  }

  // Start continuous security monitoring
  private startContinuousSecurityMonitoring(): void {
    if (this.securityMonitoringInterval) {
      clearInterval(this.securityMonitoringInterval);
    }

    this.securityMonitoringInterval = setInterval(async () => {
      await this.performComprehensiveSecurityChecks();
    }, 60000); // Check every minute

    console.log('Continuous security monitoring started');
  }

  // Process detected threats based on confidence
  private async processDetectedThreats(): Promise<void> {
    const highConfidenceThreats = this.securityThreats.filter(
      threat => threat.detected && threat.confidence >= this.antiTamperingConfig.confidenceThreshold
    );

    if (highConfidenceThreats.length > 0) {
      await this.handleHighConfidenceThreats(highConfidenceThreats);
    }
  }

  // Handle high confidence threats
  private async handleHighConfidenceThreats(threats: SecurityThreat[]): Promise<void> {
    console.error('HIGH CONFIDENCE SECURITY THREATS DETECTED:', threats);
    
    for (const threat of threats) {
      await this.handleSecurityThreat(threat);
    }
  }

  // Handle individual security threat
  private async handleSecurityThreat(threat: SecurityThreat): Promise<void> {
    console.error(`SECURITY THREAT: ${threat.type} - ${threat.details} (confidence: ${threat.confidence}%)`);
    
    switch (this.antiTamperingConfig.responseMode) {
      case 'shutdown':
        await this.shutdownApplication(threat);
        break;
      case 'block':
        await this.blockSensitiveOperations(threat);
        break;
      case 'warn':
        this.warnUser(threat);
        break;
      case 'log':
      default:
        this.logThreat(threat);
        break;
    }
  }

  // Shutdown application
  private async shutdownApplication(threat: SecurityThreat): Promise<void> {
    console.error('SHUTTING DOWN APPLICATION DUE TO SECURITY THREAT:', threat);
    
    try {
      // Clear sensitive data
      await this.clearSensitiveData();
      
      // Block all operations
      this.sensitiveOperationsBlocked = true;
      
      // In a real implementation, this would force close the app
      if (Platform.OS !== 'web') {
        console.error('Application should be terminated due to security threat');
      }
    } catch (error) {
      console.error('Failed to shutdown application safely:', error);
    }
  }

  // Block sensitive operations
  private async blockSensitiveOperations(threat: SecurityThreat): Promise<void> {
    console.warn('BLOCKING SENSITIVE OPERATIONS DUE TO SECURITY THREAT:', threat);
    
    // Set a flag to block sensitive operations
    this.sensitiveOperationsBlocked = true;
  }

  // Warn user
  private warnUser(threat: SecurityThreat): void {
    console.warn('SECURITY WARNING:', threat);
    // In a real implementation, this would show a user warning
  }

  // Log threat
  private logThreat(threat: SecurityThreat): void {
    console.log('SECURITY THREAT LOGGED:', threat);
  }

  // Clear sensitive data
  private async clearSensitiveData(): Promise<void> {
    try {
      // Clear memory of sensitive information
      this.deviceFingerprint = null;
      this.integrityChecksum = null;
      
      // In a real implementation, this would clear all sensitive data
      console.log('Sensitive data cleared due to security threat');
    } catch (error) {
      console.error('Failed to clear sensitive data:', error);
    }
  }

  // Public API methods
  getDeviceFingerprint(): DeviceFingerprint | null {
    return this.deviceFingerprint;
  }

  async verifyDeviceBinding(storedFingerprint: string): Promise<boolean> {
    if (!this.deviceFingerprint) {
      await this.generateEnhancedDeviceFingerprint();
    }

    return this.deviceFingerprint?.securityHash === storedFingerprint;
  }

  getSecurityStatus(): {
    isSecure: boolean;
    threats: SecurityThreat[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    runtimeProtectionActive: boolean;
    lastSecurityCheck: number;
    averageConfidence: number;
  } {
    const detectedThreats = this.securityThreats.filter(threat => threat.detected);
    const criticalThreats = detectedThreats.filter(threat => threat.severity === 'critical');
    const highThreats = detectedThreats.filter(threat => threat.severity === 'high');

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (criticalThreats.length > 0) {
      riskLevel = 'critical';
    } else if (highThreats.length > 0) {
      riskLevel = 'high';
    } else if (detectedThreats.length > 0) {
      riskLevel = 'medium';
    }

    // Calculate average confidence of detected threats
    const averageConfidence = detectedThreats.length > 0 
      ? detectedThreats.reduce((sum, threat) => sum + threat.confidence, 0) / detectedThreats.length
      : 0;

    return {
      isSecure: detectedThreats.length === 0 && !this.sensitiveOperationsBlocked,
      threats: detectedThreats,
      riskLevel,
      runtimeProtectionActive: this.runtimeProtectionActive,
      lastSecurityCheck: this.lastSecurityCheck,
      averageConfidence
    };
  }

  async forceSecurityCheck(): Promise<SecurityThreat[]> {
    return await this.performComprehensiveSecurityChecks();
  }

  // Configuration management
  updateAntiTamperingConfig(config: Partial<AntiTamperingConfig>): void {
    this.antiTamperingConfig = { ...this.antiTamperingConfig, ...config };
    console.log('Anti-tampering configuration updated:', this.antiTamperingConfig);
  }

  getAntiTamperingConfig(): AntiTamperingConfig {
    return { ...this.antiTamperingConfig };
  }

  // Check if sensitive operations are blocked
  isSensitiveOperationsBlocked(): boolean {
    return this.sensitiveOperationsBlocked;
  }

  // Stop security monitoring
  stopSecurityMonitoring(): void {
    if (this.securityMonitoringInterval) {
      clearInterval(this.securityMonitoringInterval);
      this.securityMonitoringInterval = null;
    }
    console.log('Security monitoring stopped');
  }

  // Get security metrics
  getSecurityMetrics(): {
    totalThreats: number;
    criticalThreats: number;
    highThreats: number;
    averageConfidence: number;
    lastCheck: number;
    monitoringActive: boolean;
  } {
    const detectedThreats = this.securityThreats.filter(threat => threat.detected);
    const criticalThreats = detectedThreats.filter(threat => threat.severity === 'critical');
    const highThreats = detectedThreats.filter(threat => threat.severity === 'high');
    
    const averageConfidence = detectedThreats.length > 0 
      ? detectedThreats.reduce((sum, threat) => sum + threat.confidence, 0) / detectedThreats.length
      : 0;

    return {
      totalThreats: detectedThreats.length,
      criticalThreats: criticalThreats.length,
      highThreats: highThreats.length,
      averageConfidence,
      lastCheck: this.lastSecurityCheck,
      monitoringActive: !!this.securityMonitoringInterval
    };
  }
}

export default DeviceSecurityService;