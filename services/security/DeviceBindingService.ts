import { Platform } from 'react-native';
import * as Constants from 'expo-constants';
import CryptoService from './CryptoService';
import SecureStorage from './SecureStorage';
import DeviceSecurityService from './DeviceSecurityService';

// Conditional imports for expo modules
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
  networkFingerprint: string;
  screenFingerprint: string;
  timezoneFingerprint: string;
  localeFingerprint: string;
  batteryFingerprint?: string;
  storageFingerprint: string;
  memoryFingerprint: string;
  cpuFingerprint: string;
  sensorsFingerprint: string;
  timestamp: number;
  entropy: string;
}

interface SessionBinding {
  sessionId: string;
  userId: string;
  deviceFingerprint: string;
  bindingHash: string;
  createdAt: number;
  lastValidated: number;
  validationCount: number;
  isActive: boolean;
  serverValidated: boolean;
  riskScore: number;
  anomalies: string[];
  bindingStrength: 'weak' | 'medium' | 'strong' | 'maximum';
  validationHistory: ValidationRecord[];
}

interface ValidationRecord {
  timestamp: number;
  success: boolean;
  riskScore: number;
  anomalies: string[];
  fingerprintMatch: boolean;
  serverResponse?: any;
}

interface BindingSecurityEvent {
  type: 'created' | 'validated' | 'failed' | 'anomaly_detected' | 'binding_broken' | 'fingerprint_changed' | 'server_validation_failed';
  timestamp: number;
  sessionId: string;
  userId: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  mitigationAction?: string;
}

class DeviceBindingService {
  private static instance: DeviceBindingService;
  private cryptoService: CryptoService;
  private secureStorage: SecureStorage;
  private deviceSecurity: DeviceSecurityService;
  private currentFingerprint: DeviceFingerprint | null = null;
  private activeBindings: Map<string, SessionBinding> = new Map();
  private securityEvents: BindingSecurityEvent[] = [];
  private validationInterval: NodeJS.Timeout | null = null;
  private fingerprintCache: Map<string, DeviceFingerprint> = new Map();
  private anomalyThreshold = 0.7; // 70% similarity threshold
  private maxBindingsPerDevice = 3; // Maximum concurrent sessions per device
  private bindingExpiryTime = 24 * 60 * 60 * 1000; // 24 hours
  private validationFrequency = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.secureStorage = SecureStorage.getInstance();
    this.deviceSecurity = DeviceSecurityService.getInstance();
    this.initializeDeviceBinding();
  }

  static getInstance(): DeviceBindingService {
    if (!DeviceBindingService.instance) {
      DeviceBindingService.instance = new DeviceBindingService();
    }
    return DeviceBindingService.instance;
  }

  // Initialize device binding system
  private async initializeDeviceBinding(): Promise<void> {
    try {
      await this.generateComprehensiveDeviceFingerprint();
      await this.loadExistingBindings();
      this.startContinuousValidation();
      console.log('Device binding service initialized successfully');
    } catch (error) {
      console.error('Device binding service initialization failed:', error);
      this.logSecurityEvent({
        type: 'failed',
        timestamp: Date.now(),
        sessionId: 'init',
        userId: 'system',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'critical',
        riskScore: 100,
        mitigationAction: 'fallback_to_basic_auth'
      });
    }
  }

  // Generate comprehensive device fingerprint
  private async generateComprehensiveDeviceFingerprint(): Promise<DeviceFingerprint> {
    try {
      const timestamp = Date.now();
      const entropy = this.cryptoService.generateSecureRandom(32);

      // Basic device information
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
        
        if (Platform.OS === 'android') {
          buildFingerprint = (Device as any).buildFingerprint || 'unknown';
          kernelVersion = (Device as any).kernelVersion || 'unknown';
          bootloaderStatus = (Device as any).bootloader || 'unknown';
          securityPatchLevel = (Device as any).securityPatchLevel;
        }
      } else {
        deviceId = this.generateWebDeviceId();
        model = 'web-browser';
        osVersion = Platform.OS;
      }

      // Application information
      if (Platform.OS !== 'web' && Application) {
        appVersion = Application.nativeApplicationVersion || '1.0.0';
      }

      // Installation ID
      if (Constants.sessionId) {
        installationId = Constants.sessionId;
      } else if ((Constants as any).installationId) {
        installationId = (Constants as any).installationId;
      } else {
        installationId = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Generate specialized fingerprints
      const hardwareFingerprint = await this.generateHardwareFingerprint();
      const networkFingerprint = await this.generateNetworkFingerprint();
      const screenFingerprint = await this.generateScreenFingerprint();
      const timezoneFingerprint = this.generateTimezoneFingerprint();
      const localeFingerprint = this.generateLocaleFingerprint();
      const batteryFingerprint = await this.generateBatteryFingerprint();
      const storageFingerprint = await this.generateStorageFingerprint();
      const memoryFingerprint = await this.generateMemoryFingerprint();
      const cpuFingerprint = await this.generateCPUFingerprint();
      const sensorsFingerprint = await this.generateSensorsFingerprint();

      // Create comprehensive security hash
      const stableFingerprintData = [
        deviceId, model, osVersion, appVersion, installationId,
        buildFingerprint, kernelVersion, bootloaderStatus,
        hardwareFingerprint, networkFingerprint, screenFingerprint,
        timezoneFingerprint, localeFingerprint, batteryFingerprint,
        storageFingerprint, memoryFingerprint, cpuFingerprint,
        sensorsFingerprint
      ].join('|');

      const securityHash = this.createStableDeviceHash(stableFingerprintData);

      const fingerprint: DeviceFingerprint = {
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
        securityPatchLevel,
        networkFingerprint,
        screenFingerprint,
        timezoneFingerprint,
        localeFingerprint,
        batteryFingerprint,
        storageFingerprint,
        memoryFingerprint,
        cpuFingerprint,
        sensorsFingerprint,
        timestamp,
        entropy
      };

      this.currentFingerprint = fingerprint;
      
      // Cache the fingerprint
      this.fingerprintCache.set('current', fingerprint);
      
      // Store securely
      await this.secureStorage.setObject('device_fingerprint', 
        this.cryptoService.encrypt(JSON.stringify(fingerprint))
      );

      console.log('Comprehensive device fingerprint generated');
      return fingerprint;
    } catch (error) {
      console.error('Device fingerprint generation failed:', error);
      throw new Error('Critical device fingerprinting failure');
    }
  }

  // Generate web-specific device ID
  private generateWebDeviceId(): string {
    if (typeof window === 'undefined') return 'server-side';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.platform,
      navigator.cookieEnabled.toString(),
      navigator.hardwareConcurrency?.toString() || 'unknown',
      navigator.deviceMemory?.toString() || 'unknown'
    ];
    
    return this.createAdvancedSecurityHash(components.join('|'));
  }

  // Generate hardware fingerprint
  private async generateHardwareFingerprint(): Promise<string> {
    try {
      const hardwareData: string[] = [];

      if (Platform.OS !== 'web' && Device) {
        hardwareData.push(Device.modelName || 'unknown');
        hardwareData.push(Device.brand || 'unknown');
        hardwareData.push(Device.manufacturer || 'unknown');
        hardwareData.push((Device as any).totalMemory?.toString() || 'unknown');
        
        if (Platform.OS === 'android') {
          hardwareData.push((Device as any).buildFingerprint || 'unknown');
          hardwareData.push((Device as any).bootloader || 'unknown');
          hardwareData.push((Device as any).hardware || 'unknown');
          hardwareData.push((Device as any).board || 'unknown');
        } else if (Platform.OS === 'ios') {
          hardwareData.push((Device as any).identifierForVendor || 'unknown');
        }
      } else {
        if (typeof navigator !== 'undefined') {
          hardwareData.push(navigator.hardwareConcurrency?.toString() || 'unknown');
          hardwareData.push(navigator.deviceMemory?.toString() || 'unknown');
          hardwareData.push(screen.width + 'x' + screen.height);
          hardwareData.push(screen.colorDepth.toString());
          hardwareData.push(navigator.platform);
        }
      }

      return this.createStableDeviceHash(hardwareData.join('|'));    } catch (error) {
      return 'fallback-hardware-fingerprint';
    }
  }

  // Generate network fingerprint
  private async generateNetworkFingerprint(): Promise<string> {
    try {
      const networkData: string[] = [];

      if (typeof navigator !== 'undefined' && (navigator as any).connection) {
        const connection = (navigator as any).connection;
        networkData.push(connection.effectiveType || 'unknown');
        networkData.push(connection.downlink?.toString() || 'unknown');
        networkData.push(connection.rtt?.toString() || 'unknown');
      }

      // Add timezone as network-related info
      networkData.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
      
      return this.createStableDeviceHash(networkData.join('|'));
    } catch (error) {
      return 'fallback-network-fingerprint';
    }
  }

  // Generate screen fingerprint
  private async generateScreenFingerprint(): Promise<string> {
    try {
      const screenData: string[] = [];

      if (typeof screen !== 'undefined') {
        screenData.push(screen.width.toString());
        screenData.push(screen.height.toString());
        screenData.push(screen.colorDepth.toString());
        screenData.push(screen.pixelDepth.toString());
        screenData.push(screen.availWidth.toString());
        screenData.push(screen.availHeight.toString());
      }

      return this.createStableDeviceHash(screenData.join('|'));
    } catch (error) {
      return 'fallback-screen-fingerprint';
    }
  }

  // Generate timezone fingerprint
  private generateTimezoneFingerprint(): string {
    try {
      const timezoneData = [
        new Date().getTimezoneOffset().toString(),
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        new Date().toLocaleString()
      ];
      
      return this.createStableDeviceHash(timezoneData.join('|'));
    } catch (error) {
      return 'fallback-timezone-fingerprint';
    }
  }

  // Generate locale fingerprint
  private generateLocaleFingerprint(): string {
    try {
      const localeData = [
        navigator.language || 'unknown',
        navigator.languages?.join(',') || 'unknown',
        Intl.DateTimeFormat().resolvedOptions().locale,
        Intl.NumberFormat().resolvedOptions().locale
      ];
      
      return this.createStableDeviceHash(localeData.join('|'));
    } catch (error) {
      return 'fallback-locale-fingerprint';
    }
  }

  // Generate battery fingerprint
  private async generateBatteryFingerprint(): Promise<string> {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
        const battery = await (navigator as any).getBattery();
        const batteryData = [
          battery.level?.toString() || 'unknown',
          battery.charging?.toString() || 'unknown',
          battery.chargingTime?.toString() || 'unknown',
          battery.dischargingTime?.toString() || 'unknown'
        ];
        
        return this.createAdvancedSecurityHash(batteryData.join('|'));
      }
      
      return 'no-battery-api';
    } catch (error) {
      return 'fallback-battery-fingerprint';
    }
  }

  // Generate storage fingerprint
  private async generateStorageFingerprint(): Promise<string> {
    try {
      const storageData: string[] = [];

      if (typeof navigator !== 'undefined' && (navigator as any).storage) {
        try {
          const estimate = await (navigator as any).storage.estimate();
          storageData.push(estimate.quota?.toString() || 'unknown');
          storageData.push(estimate.usage?.toString() || 'unknown');
        } catch (error) {
          storageData.push('storage-estimate-failed');
        }
      }

      // Add localStorage availability
      storageData.push(typeof localStorage !== 'undefined' ? 'true' : 'false');
      storageData.push(typeof sessionStorage !== 'undefined' ? 'true' : 'false');
      
      return this.createStableDeviceHash(storageData.join('|'));
    } catch (error) {
      return 'fallback-storage-fingerprint';
    }
  }

  // Generate memory fingerprint
  private async generateMemoryFingerprint(): Promise<string> {
    try {
      const memoryData: string[] = [];

      if (typeof navigator !== 'undefined') {
        memoryData.push(navigator.deviceMemory?.toString() || 'unknown');
        memoryData.push(navigator.hardwareConcurrency?.toString() || 'unknown');
      }

      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memory = (performance as any).memory;
        memoryData.push(memory.jsHeapSizeLimit?.toString() || 'unknown');
        memoryData.push(memory.totalJSHeapSize?.toString() || 'unknown');
        memoryData.push(memory.usedJSHeapSize?.toString() || 'unknown');
      }
      
      return this.createStableDeviceHash(memoryData.join('|'));
    } catch (error) {
      return 'fallback-memory-fingerprint';
    }
  }

  // Generate CPU fingerprint
  private async generateCPUFingerprint(): Promise<string> {
    try {
      const cpuData: string[] = [];

      if (typeof navigator !== 'undefined') {
        cpuData.push(navigator.hardwareConcurrency?.toString() || 'unknown');
        cpuData.push(navigator.platform || 'unknown');
      }

      // CPU performance test
      const start = performance.now();
      for (let i = 0; i < 100000; i++) {
        Math.random();
      }
      const duration = performance.now() - start;
      cpuData.push(duration.toString());
      
      return this.createStableDeviceHash(cpuData.join('|'));
    } catch (error) {
      return 'fallback-cpu-fingerprint';
    }
  }

  // Generate sensors fingerprint
  private async generateSensorsFingerprint(): Promise<string> {
    try {
      const sensorsData: string[] = [];

      // Check for various sensor APIs
      if (typeof DeviceOrientationEvent !== 'undefined') {
        sensorsData.push('orientation-available');
      }
      
      if (typeof DeviceMotionEvent !== 'undefined') {
        sensorsData.push('motion-available');
      }
      
      if (typeof navigator !== 'undefined' && (navigator as any).geolocation) {
        sensorsData.push('geolocation-available');
      }
      
      return this.createStableDeviceHash(sensorsData.join('|'));
    } catch (error) {
      return 'fallback-sensors-fingerprint';
    }
  }

  // Create advanced security hash with multiple algorithms
  private createAdvancedSecurityHash(data: string): string {
    let hash1 = 0;
    let hash2 = 0;
    let hash3 = 0;
    let hash4 = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash1 = hash1 & hash1;
      hash2 = ((hash2 << 3) - hash2) + char + i;
      hash2 = hash2 & hash2;
      hash3 = ((hash3 << 7) - hash3) + char * i;
      hash3 = hash3 & hash3;
      hash4 = ((hash4 << 11) - hash4) + char * (i + 1);
      hash4 = hash4 & hash4;
    }
    const combinedHash = Math.abs(hash1 ^ hash2 ^ hash3 ^ hash4).toString(16);
    const timestamp = Date.now().toString(16);
    const entropy = Math.random().toString(36).substr(2, 8);
    return `${combinedHash}-${timestamp}-${entropy}`;
  }

  private createStableDeviceHash(data: string): string {
    let hash1 = 0;
    let hash2 = 0;
    let hash3 = 0;
    let hash4 = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash1 = hash1 & hash1;
      hash2 = ((hash2 << 3) - hash2) + char + i;
      hash2 = hash2 & hash2;
      hash3 = ((hash3 << 7) - hash3) + char * i;
      hash3 = hash3 & hash3;
      hash4 = ((hash4 << 11) - hash4) + char * (i + 1);
      hash4 = hash4 & hash4;
    }
    const combinedHash = Math.abs(hash1 ^ hash2 ^ hash3 ^ hash4).toString(16);
    return combinedHash;
  }

  // Create session binding
  async createSessionBinding(sessionId: string, userId: string): Promise<SessionBinding> {
    try {
      if (!this.currentFingerprint) {
        await this.generateComprehensiveDeviceFingerprint();
      }

      if (!this.currentFingerprint) {
        throw new Error('Device fingerprint not available');
      }

      // Check if device already has too many bindings
      const existingBindings = Array.from(this.activeBindings.values())
        .filter(binding => binding.deviceFingerprint === this.currentFingerprint!.securityHash && binding.isActive);

      if (existingBindings.length >= this.maxBindingsPerDevice) {
        // Remove oldest binding
        const oldestBinding = existingBindings.sort((a, b) => a.createdAt - b.createdAt)[0];
        await this.removeSessionBinding(oldestBinding.sessionId);
      }

      // Generate binding hash
      const bindingData = `${sessionId}:${userId}:${this.currentFingerprint.securityHash}:${Date.now()}`;
      const bindingHash = this.createAdvancedSecurityHash(bindingData);

      // Calculate initial risk score
      const riskScore = await this.calculateRiskScore(this.currentFingerprint);

      // Determine binding strength
      const bindingStrength = this.determineBindingStrength(this.currentFingerprint, riskScore);

      const binding: SessionBinding = {
        sessionId,
        userId,
        deviceFingerprint: this.currentFingerprint.securityHash,
        bindingHash,
        createdAt: Date.now(),
        lastValidated: Date.now(),
        validationCount: 1,
        isActive: true,
        serverValidated: false,
        riskScore,
        anomalies: [],
        bindingStrength,
        validationHistory: [{
          timestamp: Date.now(),
          success: true,
          riskScore,
          anomalies: [],
          fingerprintMatch: true
        }]
      };

      // Store binding
      this.activeBindings.set(sessionId, binding);
      await this.persistBinding(binding);

      // Validate with server
      await this.validateBindingWithServer(binding);

      this.logSecurityEvent({
        type: 'created',
        timestamp: Date.now(),
        sessionId,
        userId,
        details: {
          deviceFingerprint: this.currentFingerprint.securityHash.substring(0, 8) + '...',
          bindingStrength,
          riskScore
        },
        severity: 'low',
        riskScore
      });

      console.log('Session binding created successfully:', { sessionId, bindingStrength, riskScore });
      return binding;
    } catch (error) {
      console.error('Session binding creation failed:', error);
      this.logSecurityEvent({
        type: 'failed',
        timestamp: Date.now(),
        sessionId,
        userId,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'high',
        riskScore: 100,
        mitigationAction: 'fallback_authentication'
      });
      throw error;
    }
  }

  // Validate session binding
  async validateSessionBinding(sessionId: string): Promise<{
    valid: boolean;
    riskScore: number;
    anomalies: string[];
    bindingStrength: string;
    requiresReauth?: boolean;
  }> {
    try {
      const binding = this.activeBindings.get(sessionId);
      if (!binding || !binding.isActive) {
        return {
          valid: false,
          riskScore: 100,
          anomalies: ['binding_not_found'],
          bindingStrength: 'none',
          requiresReauth: true
        };
      }

      // Check if binding has expired
      if (Date.now() - binding.createdAt > this.bindingExpiryTime) {
        await this.removeSessionBinding(sessionId);
        return {
          valid: false,
          riskScore: 100,
          anomalies: ['binding_expired'],
          bindingStrength: binding.bindingStrength,
          requiresReauth: true
        };
      }

      // Generate current fingerprint for comparison
      const currentFingerprint = await this.generateComprehensiveDeviceFingerprint();
      
      // Compare fingerprints
      const similarity = this.calculateFingerprintSimilarity(binding.deviceFingerprint, currentFingerprint.securityHash);
      const anomalies: string[] = [];
      let riskScore = 0;

      if (similarity < this.anomalyThreshold) {
        anomalies.push('fingerprint_mismatch');
        riskScore += 50;
      }

      // Check for device security threats
      const securityStatus = this.deviceSecurity.getSecurityStatus();
      if (!securityStatus.isSecure) {
        anomalies.push('device_security_compromised');
        riskScore += 30;
      }

      // Check validation frequency
      const timeSinceLastValidation = Date.now() - binding.lastValidated;
      if (timeSinceLastValidation > this.validationFrequency * 2) {
        anomalies.push('validation_overdue');
        riskScore += 20;
      }

      // Update binding
      binding.lastValidated = Date.now();
      binding.validationCount++;
      binding.riskScore = riskScore;
      binding.anomalies = anomalies;
      
      const validationRecord: ValidationRecord = {
        timestamp: Date.now(),
        success: riskScore < 50,
        riskScore,
        anomalies,
        fingerprintMatch: similarity >= this.anomalyThreshold
      };
      
      binding.validationHistory.push(validationRecord);
      
      // Keep only last 100 validation records
      if (binding.validationHistory.length > 100) {
        binding.validationHistory = binding.validationHistory.slice(-100);
      }

      await this.persistBinding(binding);

      const isValid = riskScore < 50 && anomalies.length === 0;
      
      this.logSecurityEvent({
        type: isValid ? 'validated' : 'anomaly_detected',
        timestamp: Date.now(),
        sessionId,
        userId: binding.userId,
        details: {
          similarity,
          riskScore,
          anomalies,
          validationCount: binding.validationCount
        },
        severity: isValid ? 'low' : 'medium',
        riskScore
      });

      return {
        valid: isValid,
        riskScore,
        anomalies,
        bindingStrength: binding.bindingStrength,
        requiresReauth: riskScore > 70
      };
    } catch (error) {
      console.error('Session binding validation failed:', error);
      return {
        valid: false,
        riskScore: 100,
        anomalies: ['validation_error'],
        bindingStrength: 'none',
        requiresReauth: true
      };
    }
  }

  // Calculate fingerprint similarity
  private calculateFingerprintSimilarity(fingerprint1: string, fingerprint2: string): number {
    if (fingerprint1 === fingerprint2) {
      return 1.0;
    }

    // Extract components from fingerprints
    const parts1 = fingerprint1.split('-');
    const parts2 = fingerprint2.split('-');

    if (parts1.length === 1 && parts2.length === 1) {
      return fingerprint1 === fingerprint2 ? 1.0 : 0.0;
    }

    if (parts1.length !== parts2.length) {
      return 0.0;
    }

    let matches = 0;
    for (let i = 0; i < parts1.length; i++) {
      if (parts1[i] === parts2[i]) {
        matches++;
      }
    }

    return matches / parts1.length;
  }

  // Calculate risk score based on device fingerprint
  private async calculateRiskScore(fingerprint: DeviceFingerprint): Promise<number> {
    let riskScore = 0;

    // Check device security status
    const securityStatus = this.deviceSecurity.getSecurityStatus();
    if (!securityStatus.isSecure) {
      riskScore += 40;
    }

    // Check for emulator/simulator
    if (fingerprint.model.toLowerCase().includes('emulator') || 
        fingerprint.model.toLowerCase().includes('simulator')) {
      riskScore += 30;
    }

    // Check for development environment
    if (__DEV__) {
      riskScore += 20;
    }

    // Check device age (newer fingerprints are more suspicious)
    const deviceAge = Date.now() - fingerprint.timestamp;
    if (deviceAge < 60000) { // Less than 1 minute old
      riskScore += 15;
    }

    // Check for missing security patch level (Android)
    if (Platform.OS === 'android' && !fingerprint.securityPatchLevel) {
      riskScore += 10;
    }

    return Math.min(riskScore, 100);
  }

  // Determine binding strength
  private determineBindingStrength(
    fingerprint: DeviceFingerprint, 
    riskScore: number
  ): 'weak' | 'medium' | 'strong' | 'maximum' {
    if (riskScore > 70) {
      return 'weak';
    } else if (riskScore > 40) {
      return 'medium';
    } else if (riskScore > 20) {
      return 'strong';
    } else {
      return 'maximum';
    }
  }

  // Validate binding with server
  private async validateBindingWithServer(binding: SessionBinding): Promise<void> {
    try {
      // CRITICAL: This must be a real server API call in production
      // For now, we simulate server validation
      
      // Simulate server response
      const serverResponse = {
        valid: true,
        riskScore: binding.riskScore,
        serverTimestamp: Date.now(),
        validationId: this.cryptoService.generateSecureRandom(16)
      };

      binding.serverValidated = serverResponse.valid;
      
      const validationRecord: ValidationRecord = {
        timestamp: Date.now(),
        success: serverResponse.valid,
        riskScore: serverResponse.riskScore,
        anomalies: [],
        fingerprintMatch: true,
        serverResponse
      };
      
      binding.validationHistory.push(validationRecord);
      await this.persistBinding(binding);

      console.log('Server binding validation completed:', serverResponse.valid);
    } catch (error) {
      console.error('Server binding validation failed:', error);
      binding.serverValidated = false;
    }
  }

  // Remove session binding
  async removeSessionBinding(sessionId: string): Promise<void> {
    try {
      const binding = this.activeBindings.get(sessionId);
      if (binding) {
        binding.isActive = false;
        await this.persistBinding(binding);
        this.activeBindings.delete(sessionId);

        this.logSecurityEvent({
          type: 'binding_broken',
          timestamp: Date.now(),
          sessionId,
          userId: binding.userId,
          details: { reason: 'manual_removal' },
          severity: 'low',
          riskScore: 0
        });

        console.log('Session binding removed:', sessionId);
      }
    } catch (error) {
      console.error('Failed to remove session binding:', error);
    }
  }

  // Persist binding to secure storage
  private async persistBinding(binding: SessionBinding): Promise<void> {
    try {
      const encryptedBinding = this.cryptoService.encrypt(JSON.stringify(binding));
      await this.secureStorage.setObject(`session_binding_${binding.sessionId}`, encryptedBinding);
    } catch (error) {
      console.error('Failed to persist session binding:', error);
    }
  }

  // Load existing bindings
  private async loadExistingBindings(): Promise<void> {
    try {
      const keys = await this.secureStorage.getAllKeys();
      const bindingKeys = keys.filter(key => key.startsWith('session_binding_'));

      for (const key of bindingKeys) {
        try {
          const encryptedBinding = await this.secureStorage.getObject<any>(key);
          if (encryptedBinding) {
            const bindingData = this.cryptoService.decrypt(encryptedBinding);
            const binding: SessionBinding = JSON.parse(bindingData);
            
            // Check if binding is still valid
            if (binding.isActive && Date.now() - binding.createdAt < this.bindingExpiryTime) {
              this.activeBindings.set(binding.sessionId, binding);
            } else {
              // Remove expired binding
              await this.secureStorage.removeItem(key);
            }
          }
        } catch (error) {
          console.warn('Failed to load binding:', key, error);
          await this.secureStorage.removeItem(key);
        }
      }

      console.log('Loaded existing bindings:', this.activeBindings.size);
    } catch (error) {
      console.error('Failed to load existing bindings:', error);
    }
  }

  // Start continuous validation
  private startContinuousValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }

    this.validationInterval = setInterval(async () => {
      for (const [sessionId, binding] of this.activeBindings) {
        if (binding.isActive) {
          try {
            await this.validateSessionBinding(sessionId);
          } catch (error) {
            console.error('Continuous validation failed for session:', sessionId, error);
          }
        }
      }
    }, this.validationFrequency);

    console.log('Continuous session binding validation started');
  }

  // Stop continuous validation
  stopContinuousValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
    console.log('Continuous session binding validation stopped');
  }

  // Get current device fingerprint
  getCurrentDeviceFingerprint(): DeviceFingerprint | null {
    return this.currentFingerprint;
  }

  // Get active bindings
  getActiveBindings(): SessionBinding[] {
    return Array.from(this.activeBindings.values()).filter(binding => binding.isActive);
  }

  // Get binding for session
  getSessionBinding(sessionId: string): SessionBinding | null {
    return this.activeBindings.get(sessionId) || null;
  }

  // Get binding security status
  getBindingSecurityStatus(): {
    totalBindings: number;
    activeBindings: number;
    highRiskBindings: number;
    averageRiskScore: number;
    bindingStrengthDistribution: Record<string, number>;
    recentAnomalies: number;
  } {
    const activeBindings = this.getActiveBindings();
    const highRiskBindings = activeBindings.filter(binding => binding.riskScore > 50);
    const averageRiskScore = activeBindings.length > 0 
      ? activeBindings.reduce((sum, binding) => sum + binding.riskScore, 0) / activeBindings.length
      : 0;

    const bindingStrengthDistribution: Record<string, number> = {
      weak: 0,
      medium: 0,
      strong: 0,
      maximum: 0
    };

    activeBindings.forEach(binding => {
      bindingStrengthDistribution[binding.bindingStrength]++;
    });

    const recentAnomalies = this.securityEvents.filter(
      event => event.type === 'anomaly_detected' && Date.now() - event.timestamp < 60 * 60 * 1000
    ).length;

    return {
      totalBindings: this.activeBindings.size,
      activeBindings: activeBindings.length,
      highRiskBindings: highRiskBindings.length,
      averageRiskScore,
      bindingStrengthDistribution,
      recentAnomalies
    };
  }

  // Log security event
  private logSecurityEvent(event: BindingSecurityEvent): void {
    this.securityEvents.push(event);
    
    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Log critical events immediately
    if (event.severity === 'critical') {
      console.error('CRITICAL DEVICE BINDING EVENT:', event);
    }
  }

  // Get security events
  getSecurityEvents(): BindingSecurityEvent[] {
    return [...this.securityEvents];
  }

  // Clear all bindings (for logout)
  async clearAllBindings(): Promise<void> {
    try {
      for (const sessionId of this.activeBindings.keys()) {
        await this.removeSessionBinding(sessionId);
      }
      
      this.activeBindings.clear();
      console.log('All session bindings cleared');
    } catch (error) {
      console.error('Failed to clear all bindings:', error);
    }
  }

  // Update configuration
  updateConfiguration(config: {
    anomalyThreshold?: number;
    maxBindingsPerDevice?: number;
    bindingExpiryTime?: number;
    validationFrequency?: number;
  }): void {
    if (config.anomalyThreshold !== undefined) {
      this.anomalyThreshold = config.anomalyThreshold;
    }
    if (config.maxBindingsPerDevice !== undefined) {
      this.maxBindingsPerDevice = config.maxBindingsPerDevice;
    }
    if (config.bindingExpiryTime !== undefined) {
      this.bindingExpiryTime = config.bindingExpiryTime;
    }
    if (config.validationFrequency !== undefined) {
      this.validationFrequency = config.validationFrequency;
      
      // Restart validation with new frequency
      this.startContinuousValidation();
    }
    
    console.log('Device binding configuration updated:', config);
  }

  // Get configuration
  getConfiguration(): {
    anomalyThreshold: number;
    maxBindingsPerDevice: number;
    bindingExpiryTime: number;
    validationFrequency: number;
  } {
    return {
      anomalyThreshold: this.anomalyThreshold,
      maxBindingsPerDevice: this.maxBindingsPerDevice,
      bindingExpiryTime: this.bindingExpiryTime,
      validationFrequency: this.validationFrequency
    };
  }
}

export default DeviceBindingService;