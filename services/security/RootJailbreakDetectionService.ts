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

interface RootJailbreakThreat {
  type: 'root' | 'jailbreak';
  detected: boolean;
  confidence: number; // 0-100
  indicators: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details: string;
  mitigationAction?: string;
}

interface DetectionConfig {
  enableRootDetection: boolean;
  enableJailbreakDetection: boolean;
  enableEmulatorDetection: boolean;
  enableDebuggerDetection: boolean;
  confidenceThreshold: number;
  responseMode: 'log' | 'warn' | 'block' | 'shutdown';
  continuousMonitoring: boolean;
  monitoringInterval: number; // in milliseconds
}

interface DeviceInfo {
  platform: string;
  model: string;
  brand: string;
  osVersion: string;
  buildFingerprint?: string;
  bootloader?: string;
  hardware?: string;
  board?: string;
  isDevice: boolean;
  isEmulator: boolean;
}

class RootJailbreakDetectionService {
  private static instance: RootJailbreakDetectionService;
  private detectionConfig: DetectionConfig;
  private deviceInfo: DeviceInfo | null = null;
  private detectionResults: RootJailbreakThreat[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isDetectionRunning = false;
  private lastDetectionTime = 0;

  private constructor() {
    this.detectionConfig = {
      enableRootDetection: true,
      enableJailbreakDetection: true,
      enableEmulatorDetection: true,
      enableDebuggerDetection: true,
      confidenceThreshold: 90,
      responseMode: __DEV__ ? 'log' : 'warn',
      continuousMonitoring: true,
      monitoringInterval: 30000 // 30 seconds
    };
    
    this.initializeService();
  }

  static getInstance(): RootJailbreakDetectionService {
    if (!RootJailbreakDetectionService.instance) {
      RootJailbreakDetectionService.instance = new RootJailbreakDetectionService();
    }
    return RootJailbreakDetectionService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      await this.gatherDeviceInfo();
      await this.performInitialDetection();
      
      if (this.detectionConfig.continuousMonitoring) {
        this.startContinuousMonitoring();
      }
      
      console.log('Root/Jailbreak Detection Service initialized');
    } catch (error) {
      console.error('Failed to initialize Root/Jailbreak Detection Service:', error);
    }
  }

  // Gather comprehensive device information
  private async gatherDeviceInfo(): Promise<void> {
    try {
      let deviceInfo: DeviceInfo = {
        platform: Platform.OS,
        model: 'unknown',
        brand: 'unknown',
        osVersion: 'unknown',
        isDevice: true,
        isEmulator: false
      };

      if (Platform.OS !== 'web' && Device) {
        deviceInfo = {
          platform: Platform.OS,
          model: Device.modelName || 'unknown',
          brand: Device.brand || 'unknown',
          osVersion: Device.osVersion || 'unknown',
          isDevice: Device.isDevice || false,
          isEmulator: !Device.isDevice
        };

        // Android-specific information
        if (Platform.OS === 'android') {
          deviceInfo.buildFingerprint = (Device as any).buildFingerprint || 'unknown';
          deviceInfo.bootloader = (Device as any).bootloader || 'unknown';
          deviceInfo.hardware = (Device as any).hardware || 'unknown';
          deviceInfo.board = (Device as any).board || 'unknown';
        }
      }

      this.deviceInfo = deviceInfo;
      console.log('Device info gathered:', deviceInfo);
    } catch (error) {
      console.error('Failed to gather device info:', error);
    }
  }

  // Perform initial comprehensive detection
  private async performInitialDetection(): Promise<void> {
    if (this.isDetectionRunning) return;
    
    this.isDetectionRunning = true;
    this.detectionResults = [];
    this.lastDetectionTime = Date.now();

    try {
      if (Platform.OS === 'android' && this.detectionConfig.enableRootDetection) {
        await this.performAndroidRootDetection();
      }
      
      if (Platform.OS === 'ios' && this.detectionConfig.enableJailbreakDetection) {
        await this.performiOSJailbreakDetection();
      }
      
      if (this.detectionConfig.enableEmulatorDetection) {
        await this.performEmulatorDetection();
      }
      
      if (this.detectionConfig.enableDebuggerDetection) {
        await this.performDebuggerDetection();
      }

      // Process results and take action
      await this.processDetectionResults();
      
    } catch (error) {
      console.error('Detection process failed:', error);
    } finally {
      this.isDetectionRunning = false;
    }
  }

  // Android Root Detection
  private async performAndroidRootDetection(): Promise<void> {
    if (Platform.OS !== 'android') return;

    const threat: RootJailbreakThreat = {
      type: 'root',
      detected: false,
      confidence: 0,
      indicators: [],
      severity: 'low',
      timestamp: Date.now(),
      details: 'Android root detection analysis'
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Check 1: SU Binary Detection
      if (await this.checkSuBinaries()) {
        confidenceScore += 25;
        indicators.push('su_binaries_found');
      }

      // Check 2: Root Management Apps
      if (await this.checkRootManagementApps()) {
        confidenceScore += 30;
        indicators.push('root_management_apps');
      }

      // Check 3: Build Tags
      if (await this.checkBuildTags()) {
        confidenceScore += 20;
        indicators.push('test_keys_build');
      }

      // Check 4: System Properties
      if (await this.checkDangerousSystemProperties()) {
        confidenceScore += 15;
        indicators.push('dangerous_props');
      }

      // Check 5: File System Checks
      if (await this.checkRootFileSystem()) {
        confidenceScore += 35;
        indicators.push('root_filesystem');
      }

      // Check 6: Package Manager Checks
      if (await this.checkPackageManager()) {
        confidenceScore += 20;
        indicators.push('package_manager_anomaly');
      }

      // Check 7: Busybox Detection
      if (await this.checkBusybox()) {
        confidenceScore += 15;
        indicators.push('busybox_found');
      }

      // Check 8: Xposed Framework
      if (await this.checkXposedFramework()) {
        confidenceScore += 40;
        indicators.push('xposed_framework');
      }

      // Check 9: Magisk Detection
      if (await this.checkMagisk()) {
        confidenceScore += 35;
        indicators.push('magisk_detected');
      }

      // Check 10: SELinux Status
      if (await this.checkSELinuxStatus()) {
        confidenceScore += 25;
        indicators.push('selinux_permissive');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      threat.indicators = indicators;
      
      if (threat.confidence >= this.detectionConfig.confidenceThreshold) {
        threat.detected = true;
        threat.severity = this.calculateSeverity(threat.confidence);
        threat.details = `Android root detected with ${threat.confidence}% confidence. Indicators: ${indicators.join(', ')}`;
        threat.mitigationAction = 'block_rooted_device';
      }

      this.detectionResults.push(threat);
    } catch (error) {
      console.error('Android root detection failed:', error);
    }
  }

  // iOS Jailbreak Detection
  private async performiOSJailbreakDetection(): Promise<void> {
    if (Platform.OS !== 'ios') return;

    const threat: RootJailbreakThreat = {
      type: 'jailbreak',
      detected: false,
      confidence: 0,
      indicators: [],
      severity: 'low',
      timestamp: Date.now(),
      details: 'iOS jailbreak detection analysis'
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Check 1: Jailbreak Files
      if (await this.checkJailbreakFiles()) {
        confidenceScore += 40;
        indicators.push('jailbreak_files');
      }

      // Check 2: Cydia and Package Managers
      if (await this.checkCydiaAndPackageManagers()) {
        confidenceScore += 35;
        indicators.push('cydia_detected');
      }

      // Check 3: URL Schemes
      if (await this.checkJailbreakUrlSchemes()) {
        confidenceScore += 25;
        indicators.push('jailbreak_url_schemes');
      }

      // Check 4: Sandbox Integrity
      if (await this.checkSandboxIntegrity()) {
        confidenceScore += 30;
        indicators.push('sandbox_violation');
      }

      // Check 5: System Calls
      if (await this.checkSystemCalls()) {
        confidenceScore += 20;
        indicators.push('system_calls_anomaly');
      }

      // Check 6: Dynamic Libraries
      if (await this.checkDynamicLibraries()) {
        confidenceScore += 25;
        indicators.push('suspicious_dylibs');
      }

      // Check 7: File Permissions
      if (await this.checkFilePermissions()) {
        confidenceScore += 15;
        indicators.push('file_permissions_anomaly');
      }

      // Check 8: Substrate Detection
      if (await this.checkSubstrate()) {
        confidenceScore += 35;
        indicators.push('substrate_detected');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      threat.indicators = indicators;
      
      if (threat.confidence >= this.detectionConfig.confidenceThreshold) {
        threat.detected = true;
        threat.severity = this.calculateSeverity(threat.confidence);
        threat.details = `iOS jailbreak detected with ${threat.confidence}% confidence. Indicators: ${indicators.join(', ')}`;
        threat.mitigationAction = 'block_jailbroken_device';
      }

      this.detectionResults.push(threat);
    } catch (error) {
      console.error('iOS jailbreak detection failed:', error);
    }
  }

  // Emulator Detection
  private async performEmulatorDetection(): Promise<void> {
    const threat: RootJailbreakThreat = {
      type: Platform.OS === 'ios' ? 'jailbreak' : 'root',
      detected: false,
      confidence: 0,
      indicators: [],
      severity: 'low',
      timestamp: Date.now(),
      details: 'Emulator detection analysis'
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Check 1: Device Hardware
      if (await this.checkEmulatorHardware()) {
        confidenceScore += 30;
        indicators.push('emulator_hardware');
      }

      // Check 2: Performance Characteristics
      if (await this.checkEmulatorPerformance()) {
        confidenceScore += 25;
        indicators.push('emulator_performance');
      }

      // Check 3: Sensor Availability
      if (await this.checkEmulatorSensors()) {
        confidenceScore += 20;
        indicators.push('missing_sensors');
      }

      // Check 4: Network Configuration
      if (await this.checkEmulatorNetwork()) {
        confidenceScore += 15;
        indicators.push('emulator_network');
      }

      // Check 5: File System
      if (await this.checkEmulatorFileSystem()) {
        confidenceScore += 25;
        indicators.push('emulator_filesystem');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      threat.indicators = indicators;
      
      if (threat.confidence >= this.detectionConfig.confidenceThreshold) {
        threat.detected = true;
        threat.severity = this.calculateSeverity(threat.confidence);
        threat.details = `Emulator detected with ${threat.confidence}% confidence. Indicators: ${indicators.join(', ')}`;
        threat.mitigationAction = 'block_emulator';
      }

      this.detectionResults.push(threat);
    } catch (error) {
      console.error('Emulator detection failed:', error);
    }
  }

  // Debugger Detection
  private async performDebuggerDetection(): Promise<void> {
    const threat: RootJailbreakThreat = {
      type: Platform.OS === 'ios' ? 'jailbreak' : 'root',
      detected: false,
      confidence: 0,
      indicators: [],
      severity: 'low',
      timestamp: Date.now(),
      details: 'Debugger detection analysis'
    };

    try {
      let confidenceScore = 0;
      const indicators: string[] = [];

      // Skip debugger detection in development mode
      if (__DEV__) {
        threat.confidence = 0;
        threat.detected = false;
        threat.details = 'Debugger detection disabled in development mode';
        this.detectionResults.push(threat);
        return;
      }

      // Check 1: Development Mode (only in production)
      if (process.env.NODE_ENV === 'development') {
        confidenceScore += 5;
        indicators.push('dev_mode');
      }

      // Check 2: Debugger Presence (only in production)
      if (await this.checkDebuggerPresence()) {
        confidenceScore += 40;
        indicators.push('debugger_attached');
      }

      // Check 3: Timing Attacks (only in production)
      if (await this.checkDebuggerTiming()) {
        confidenceScore += 35;
        indicators.push('timing_anomaly');
      }

      // Check 4: Console Detection (only in production)
      if (await this.checkConsoleDebugger()) {
        confidenceScore += 25;
        indicators.push('console_debugger');
      }

      threat.confidence = Math.min(confidenceScore, 100);
      threat.indicators = indicators;
      
      if (threat.confidence >= this.detectionConfig.confidenceThreshold) {
        threat.detected = true;
        threat.severity = this.calculateSeverity(threat.confidence);
        threat.details = `Debugger detected with ${threat.confidence}% confidence. Indicators: ${indicators.join(', ')}`;
        threat.mitigationAction = 'block_debugging';
      }

      this.detectionResults.push(threat);
    } catch (error) {
      console.error('Debugger detection failed:', error);
    }
  }

  // Android Root Detection Methods
  private async checkSuBinaries(): Promise<boolean> {
    try {
      // In a real implementation, this would check for SU binaries
      // For React Native, we simulate this check
      const suspiciousPaths = [
        '/system/bin/su',
        '/system/xbin/su',
        '/sbin/su',
        '/system/su',
        '/vendor/bin/su'
      ];
      
      // Simulate checking for SU binaries
      return false; // Would return true if found
    } catch (error) {
      return false;
    }
  }

  private async checkRootManagementApps(): Promise<boolean> {
    try {
      // Check for common root management apps
      const rootApps = [
        'com.noshufou.android.su',
        'com.thirdparty.superuser',
        'eu.chainfire.supersu',
        'com.koushikdutta.superuser',
        'com.zachspong.temprootremovejb',
        'com.ramdroid.appquarantine',
        'com.topjohnwu.magisk'
      ];
      
      // In a real implementation, this would check installed packages
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkBuildTags(): Promise<boolean> {
    try {
      if (!this.deviceInfo) return false;
      
      const buildTags = this.deviceInfo.buildFingerprint?.toLowerCase() || '';
      const suspiciousTags = ['test-keys', 'dev-keys', 'unofficial'];
      
      return suspiciousTags.some(tag => buildTags.includes(tag));
    } catch (error) {
      return false;
    }
  }

  private async checkDangerousSystemProperties(): Promise<boolean> {
    try {
      // Check for dangerous system properties
      // In a real implementation, this would read system properties
      return __DEV__; // Development mode is suspicious
    } catch (error) {
      return false;
    }
  }

  private async checkRootFileSystem(): Promise<boolean> {
    try {
      // Check for root-specific files and directories
      const rootPaths = [
        '/system/app/Superuser.apk',
        '/system/etc/init.d/',
        '/system/xbin/',
        '/cache/recovery/',
        '/system/recovery-from-boot.p'
      ];
      
      // In a real implementation, this would check file existence
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkPackageManager(): Promise<boolean> {
    try {
      // Check package manager for anomalies
      // In a real implementation, this would analyze package manager behavior
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkBusybox(): Promise<boolean> {
    try {
      // Check for Busybox installation
      // In a real implementation, this would check for busybox binary
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkXposedFramework(): Promise<boolean> {
    try {
      // Check for Xposed Framework
      // In a real implementation, this would check for Xposed modules
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkMagisk(): Promise<boolean> {
    try {
      // Check for Magisk root solution
      // In a real implementation, this would check for Magisk indicators
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkSELinuxStatus(): Promise<boolean> {
    try {
      // Check SELinux status (should be enforcing on non-rooted devices)
      // In a real implementation, this would check SELinux status
      return false;
    } catch (error) {
      return false;
    }
  }

  // iOS Jailbreak Detection Methods
  private async checkJailbreakFiles(): Promise<boolean> {
    try {
      // Check for common jailbreak files
      const jailbreakPaths = [
        '/Applications/Cydia.app',
        '/Library/MobileSubstrate/',
        '/bin/bash',
        '/usr/sbin/sshd',
        '/etc/apt',
        '/private/var/lib/apt/',
        '/private/var/lib/cydia',
        '/private/var/mobile/Library/SBSettings/Themes',
        '/Library/MobileSubstrate/MobileSafety.dylib',
        '/System/Library/LaunchDaemons/com.ikey.bbot.plist',
        '/private/var/cache/apt/',
        '/private/var/lib/cydia/',
        '/private/var/tmp/cydia.log',
        '/Applications/MxTube.app',
        '/Applications/RockApp.app',
        '/Applications/blackra1n.app',
        '/Applications/SBSettings.app',
        '/Applications/FakeCarrier.app',
        '/Applications/WinterBoard.app',
        '/Applications/IntelliScreen.app'
      ];
      
      // In a real implementation, this would check file existence
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkCydiaAndPackageManagers(): Promise<boolean> {
    try {
      // Check for Cydia and other package managers
      const packageManagers = [
        'cydia://',
        'sileo://',
        'zbra://',
        'installer://'
      ];
      
      // In a real implementation, this would try to open URL schemes
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkJailbreakUrlSchemes(): Promise<boolean> {
    try {
      // Check for jailbreak-specific URL schemes
      const jailbreakSchemes = [
        'cydia://',
        'sileo://',
        'zbra://',
        'activator://',
        'winterboard://'
      ];
      
      // In a real implementation, this would test URL scheme availability
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkSandboxIntegrity(): Promise<boolean> {
    try {
      // Check if app can access files outside its sandbox
      // In a real implementation, this would test sandbox violations
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkSystemCalls(): Promise<boolean> {
    try {
      // Check for suspicious system calls
      // In a real implementation, this would monitor system calls
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkDynamicLibraries(): Promise<boolean> {
    try {
      // Check for suspicious dynamic libraries
      const suspiciousLibs = [
        'MobileSubstrate',
        'SubstrateLoader',
        'SubstrateInserter',
        'CydiaSubstrate'
      ];
      
      // In a real implementation, this would check loaded libraries
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkFilePermissions(): Promise<boolean> {
    try {
      // Check for unusual file permissions
      // In a real implementation, this would check file permissions
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkSubstrate(): Promise<boolean> {
    try {
      // Check for Mobile Substrate
      // In a real implementation, this would check for Substrate presence
      return false;
    } catch (error) {
      return false;
    }
  }

  // Emulator Detection Methods
  private async checkEmulatorHardware(): Promise<boolean> {
    try {
      if (!this.deviceInfo) return false;
      
      const model = this.deviceInfo.model.toLowerCase();
      const brand = this.deviceInfo.brand.toLowerCase();
      
      const emulatorIndicators = [
        'simulator', 'emulator', 'virtual', 'genymotion', 'bluestacks',
        'android sdk', 'google_sdk', 'sdk_gphone', 'sdk_google', 'generic'
      ];
      
      return emulatorIndicators.some(indicator => 
        model.includes(indicator) || brand.includes(indicator)
      );
    } catch (error) {
      return false;
    }
  }

  private async checkEmulatorPerformance(): Promise<boolean> {
    try {
      // Performance test to detect emulator
      const start = Date.now();
      for (let i = 0; i < 100000; i++) {
        Math.random();
      }
      const duration = Date.now() - start;
      
      // Emulators typically perform slower
      return duration > 100;
    } catch (error) {
      return false;
    }
  }

  private async checkEmulatorSensors(): Promise<boolean> {
    try {
      // Check for missing sensors typical in emulators
      // In a real implementation, this would check sensor availability
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkEmulatorNetwork(): Promise<boolean> {
    try {
      // Check for emulator-specific network configuration
      // In a real implementation, this would check network settings
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkEmulatorFileSystem(): Promise<boolean> {
    try {
      // Check for emulator-specific file system characteristics
      // In a real implementation, this would check file system
      return false;
    } catch (error) {
      return false;
    }
  }

  // Debugger Detection Methods
  private async checkDebuggerPresence(): Promise<boolean> {
    try {
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

  private async checkDebuggerTiming(): Promise<boolean> {
    try {
      const start = performance.now();
      debugger; // This will pause if debugger is attached
      const end = performance.now();
      
      // If debugger is attached, this will take longer
      return (end - start) > 100;
    } catch (error) {
      return false;
    }
  }

  private async checkConsoleDebugger(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && window.console) {
        // Check for console modifications
        const originalLog = console.log.toString();
        return originalLog.includes('native code') === false;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Utility Methods
  private calculateSeverity(confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence >= 90) return 'critical';
    if (confidence >= 75) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }

  private async processDetectionResults(): Promise<void> {
    const detectedThreats = this.detectionResults.filter(threat => threat.detected);
    
    if (detectedThreats.length > 0) {
      console.error('ROOT/JAILBREAK THREATS DETECTED:', detectedThreats);
      
      for (const threat of detectedThreats) {
        await this.handleThreat(threat);
      }
    }
  }

  private async handleThreat(threat: RootJailbreakThreat): Promise<void> {
    console.error(`${threat.type.toUpperCase()} THREAT: ${threat.details}`);
    
    switch (this.detectionConfig.responseMode) {
      case 'shutdown':
        await this.shutdownApplication(threat);
        break;
      case 'block':
        await this.blockApplication(threat);
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

  private async shutdownApplication(threat: RootJailbreakThreat): Promise<void> {
    console.error('SHUTTING DOWN APPLICATION DUE TO ROOT/JAILBREAK:', threat);
    // In a real implementation, this would force close the app
  }

  private async blockApplication(threat: RootJailbreakThreat): Promise<void> {
    console.warn('BLOCKING APPLICATION DUE TO ROOT/JAILBREAK:', threat);
    // In a real implementation, this would block app functionality
  }

  private warnUser(threat: RootJailbreakThreat): void {
    console.warn('ROOT/JAILBREAK WARNING:', threat);
    // In a real implementation, this would show user warning
  }

  private logThreat(threat: RootJailbreakThreat): void {
    console.log('ROOT/JAILBREAK THREAT LOGGED:', threat);
  }

  // Continuous Monitoring
  private startContinuousMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.performInitialDetection();
    }, this.detectionConfig.monitoringInterval);

    console.log('Continuous root/jailbreak monitoring started');
  }

  private stopContinuousMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Continuous root/jailbreak monitoring stopped');
  }

  // Public API
  async performDetection(): Promise<RootJailbreakThreat[]> {
    await this.performInitialDetection();
    return this.getDetectionResults();
  }

  getDetectionResults(): RootJailbreakThreat[] {
    return [...this.detectionResults];
  }

  getDetectedThreats(): RootJailbreakThreat[] {
    return this.detectionResults.filter(threat => threat.detected);
  }

  isDeviceCompromised(): boolean {
    return this.detectionResults.some(threat => 
      threat.detected && threat.confidence >= this.detectionConfig.confidenceThreshold
    );
  }

  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  updateConfig(config: Partial<DetectionConfig>): void {
    this.detectionConfig = { ...this.detectionConfig, ...config };
    
    if (config.continuousMonitoring !== undefined) {
      if (config.continuousMonitoring) {
        this.startContinuousMonitoring();
      } else {
        this.stopContinuousMonitoring();
      }
    }
    
    console.log('Detection config updated:', this.detectionConfig);
  }

  getConfig(): DetectionConfig {
    return { ...this.detectionConfig };
  }

  getSecurityStatus(): {
    isSecure: boolean;
    compromised: boolean;
    threats: RootJailbreakThreat[];
    lastCheck: number;
    monitoringActive: boolean;
  } {
    const detectedThreats = this.getDetectedThreats();
    
    return {
      isSecure: detectedThreats.length === 0,
      compromised: this.isDeviceCompromised(),
      threats: detectedThreats,
      lastCheck: this.lastDetectionTime,
      monitoringActive: !!this.monitoringInterval
    };
  }

  // Cleanup
  destroy(): void {
    this.stopContinuousMonitoring();
    this.detectionResults = [];
    this.deviceInfo = null;
    console.log('Root/Jailbreak Detection Service destroyed');
  }
}

export default RootJailbreakDetectionService;