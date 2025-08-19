import { Platform } from 'react-native';
import DeviceSecurityService from './DeviceSecurityService';
import SecureStorage from './SecureStorage';
import ScreenProtectionService from './ScreenProtectionService';
import CryptoService from './CryptoService';

// Mobile-specific security threats
interface MobileThreat {
  type: 'tapjacking' | 'overlay_attack' | 'insecure_storage' | 'code_injection' | 'ui_redressing' | 'clickjacking' | 'malicious_plugin';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected: boolean;
  details: string;
  timestamp: number;
  mitigationAction?: string;
  confidence: number;
  platform: string;
}

interface TapjackingConfig {
  enableOverlayDetection: boolean;
  enableUIRedressingProtection: boolean;
  enableClickjackingPrevention: boolean;
  enableTouchEventValidation: boolean;
  overlayDetectionSensitivity: 'low' | 'medium' | 'high';
  blockSuspiciousApps: boolean;
  requireUserConfirmation: boolean;
}

interface StorageSecurityConfig {
  enableAdvancedEncryption: boolean;
  enableIntegrityChecks: boolean;
  enableAntiTamperingProtection: boolean;
  enableSecureKeyDerivation: boolean;
  enableDataObfuscation: boolean;
  enableRuntimeValidation: boolean;
  maxStorageAge: number; // in milliseconds
}

interface CodeInjectionConfig {
  enablePluginValidation: boolean;
  enableScriptInjectionPrevention: boolean;
  enableDynamicCodeDetection: boolean;
  enableThirdPartyLibraryValidation: boolean;
  enableRuntimeCodeIntegrityChecks: boolean;
  blockUntrustedSources: boolean;
  enableCSPEnforcement: boolean;
}

class MobileSecurityService {
  private static instance: MobileSecurityService;
  private deviceSecurity: DeviceSecurityService;
  private secureStorage: SecureStorage;
  private screenProtection: ScreenProtectionService;
  private mobileThreats: MobileThreat[] = [];
  private isMonitoringActive = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  private tapjackingConfig: TapjackingConfig;
  private storageConfig: StorageSecurityConfig;
  private codeInjectionConfig: CodeInjectionConfig;
  
  // Overlay detection state
  private overlayDetectionActive = false;
  private suspiciousOverlays: Set<string> = new Set();
  private touchEventBuffer: Array<{ timestamp: number; x: number; y: number; type: string }> = [];
  
  // Storage security state
  private storageIntegrityHashes: Map<string, string> = new Map();
  private encryptionKeys: Map<string, string> = new Map();
  private cryptoService: CryptoService = CryptoService.getInstance();
  
  // Exclusion patterns for volatile or system-managed keys that naturally change
  private integrityExcludePatterns: RegExp[] = [
    /^key_metadata_/i,
    /^signal_session_/i,
    /^signal_(identity|prekey|onetime|session)_/i,
    /^security_test_cookie$/i,
    /^__tracked_secure_keys__$/i,
    /^quarantine_/i,
    /^storage_health_test$/i,
    /^test_secure_key$/i,
    /^CRYPTO_MASTER_KEY_V1$/i,
    /^encryption_key_/i,
  ];
  
  // Keys that are dynamic and whose value is expected to rotate frequently; we update baseline silently
  private integrityDynamicPatterns: RegExp[] = [
    /^key_metadata_/i,
    /_(timestamp|last_used|rotated_at|nonce|iv)$/i,
  ];
  
  // Code injection prevention state
  private trustedSources: Set<string> = new Set();
  private loadedScripts: Map<string, { hash: string; timestamp: number }> = new Map();
  private scriptMonitorInstalled = false;
  private cspViolations: Array<{ type: string; details: string; timestamp: number }> = [];

  private constructor() {
    this.deviceSecurity = DeviceSecurityService.getInstance();
    this.secureStorage = SecureStorage.getInstance();
    this.screenProtection = ScreenProtectionService.getInstance();
    
    // Initialize configurations
    this.tapjackingConfig = {
      enableOverlayDetection: true,
      enableUIRedressingProtection: true,
      enableClickjackingPrevention: true,
      enableTouchEventValidation: true,
      overlayDetectionSensitivity: 'high',
      blockSuspiciousApps: true,
      requireUserConfirmation: true
    };
    
    this.storageConfig = {
      enableAdvancedEncryption: true,
      enableIntegrityChecks: true,
      enableAntiTamperingProtection: true,
      enableSecureKeyDerivation: true,
      enableDataObfuscation: true,
      enableRuntimeValidation: true,
      maxStorageAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    
    this.codeInjectionConfig = {
      enablePluginValidation: true,
      enableScriptInjectionPrevention: true,
      enableDynamicCodeDetection: true,
      enableThirdPartyLibraryValidation: true,
      enableRuntimeCodeIntegrityChecks: true,
      blockUntrustedSources: true,
      enableCSPEnforcement: true
    };
    
    // Initialize trusted sources
    this.initializeTrustedSources();
    
    this.initializeMobileSecurity();
  }

  static getInstance(): MobileSecurityService {
    if (!MobileSecurityService.instance) {
      MobileSecurityService.instance = new MobileSecurityService();
    }
    return MobileSecurityService.instance;
  }

  // Initialize mobile security systems
  private async initializeMobileSecurity(): Promise<void> {
    try {
      console.log('Initializing mobile-specific security protections...');
      
      // Initialize tapjacking protection
      if (this.tapjackingConfig.enableOverlayDetection) {
        await this.initializeTapjackingProtection();
      }
      
      // Initialize storage security
      if (this.storageConfig.enableAdvancedEncryption) {
        await this.initializeStorageSecurity();
      }
      
      // Initialize code injection prevention
      if (this.codeInjectionConfig.enablePluginValidation) {
        await this.initializeCodeInjectionPrevention();
      }
      
      // Start monitoring
      this.startMobileSecurityMonitoring();
      
      console.log('Mobile security protections initialized successfully');
    } catch (error) {
      console.error('Mobile security initialization failed:', error);
      this.logMobileThreat({
        type: 'insecure_storage',
        severity: 'critical',
        detected: true,
        details: 'Mobile security initialization failure',
        timestamp: Date.now(),
        mitigationAction: 'security_init_failed',
        confidence: 100,
        platform: Platform.OS
      });
    }
  }

  // CRITICAL: Initialize Tapjacking Protection
  private async initializeTapjackingProtection(): Promise<void> {
    try {
      console.log('Initializing tapjacking protection...');
      
      if (Platform.OS === 'web') {
        await this.initializeWebTapjackingProtection();
      } else {
        await this.initializeNativeTapjackingProtection();
      }
      
      this.overlayDetectionActive = true;
      console.log('Tapjacking protection initialized');
    } catch (error) {
      console.error('Tapjacking protection initialization failed:', error);
      throw error;
    }
  }

  // Initialize web-specific tapjacking protection
  private async initializeWebTapjackingProtection(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      // Prevent iframe embedding (clickjacking) - but handle safely
      if (window.top !== window.self) {
        this.logMobileThreat({
          type: 'clickjacking',
          severity: 'high',
          detected: true,
          details: 'Application loaded in iframe - potential clickjacking attack',
          timestamp: Date.now(),
          mitigationAction: 'block_iframe_embedding',
          confidence: 100,
          platform: 'web'
        });

        const shieldId = 'antiClickjackShield';
        if (!document.getElementById(shieldId)) {
          const shield = document.createElement('div');
          shield.id = shieldId;
          shield.setAttribute('data-testid', 'antiClickjackShield');
          Object.assign(shield.style, {
            position: 'fixed',
            top: '0px',
            left: '0px',
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            zIndex: '2147483647',
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          } as CSSStyleDeclaration);
          shield.innerText = 'Security protection: This app cannot run inside an embedded frame. Open it in a new tab.';
          document.body.appendChild(shield);
        }

        try {
          window.parent?.postMessage({ type: 'antiClickjack', action: 'request-unembed' }, '*');
        } catch {}
        return;
      }
      
      // Set X-Frame-Options equivalent
      const meta = document.createElement('meta');
      meta.httpEquiv = 'X-Frame-Options';
      meta.content = 'DENY';
      document.head.appendChild(meta);
      
      // Monitor for overlay elements
      this.startWebOverlayDetection();
      
      // Monitor touch/click events for suspicious patterns
      this.startWebTouchEventMonitoring();
      
      console.log('Web tapjacking protection initialized');
    } catch (error) {
      console.error('Web tapjacking protection failed:', error);
    }
  }

  // Initialize native tapjacking protection
  private async initializeNativeTapjackingProtection(): Promise<void> {
    try {
      // Enable screen protection to prevent overlay attacks
      await this.screenProtection.enableGlobalProtection();
      
      // Start overlay detection monitoring
      this.startNativeOverlayDetection();
      
      // Monitor for suspicious app installations
      this.startSuspiciousAppMonitoring();
      
      console.log('Native tapjacking protection initialized');
    } catch (error) {
      console.error('Native tapjacking protection failed:', error);
    }
  }

  // Start web overlay detection
  private startWebOverlayDetection(): void {
    if (typeof window === 'undefined') return;
    
    // Monitor for suspicious DOM elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            this.checkForSuspiciousOverlay(element);
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // Check existing elements
    document.querySelectorAll('*').forEach(element => {
      this.checkForSuspiciousOverlay(element);
    });
  }

  // Check for suspicious overlay elements
  private checkForSuspiciousOverlay(element: Element): void {
    try {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      // Check for overlay characteristics
      const isOverlay = (
        style.position === 'fixed' || style.position === 'absolute'
      ) && (
        style.zIndex && parseInt(style.zIndex) > 1000
      ) && (
        rect.width > window.innerWidth * 0.8 || rect.height > window.innerHeight * 0.8
      );
      
      const isTransparent = (
        style.opacity && parseFloat(style.opacity) < 0.1
      ) || (
        style.backgroundColor === 'transparent'
      );
      
      const isSuspicious = isOverlay && (isTransparent || style.pointerEvents === 'none');
      
      if (isSuspicious) {
        const elementId = element.id || element.className || element.tagName;
        this.suspiciousOverlays.add(elementId);
        
        this.logMobileThreat({
          type: 'overlay_attack',
          severity: 'high',
          detected: true,
          details: `Suspicious overlay detected: ${elementId}`,
          timestamp: Date.now(),
          mitigationAction: 'remove_overlay',
          confidence: 85,
          platform: 'web'
        });
        
        // Remove suspicious overlay
        if (this.tapjackingConfig.blockSuspiciousApps) {
          element.remove();
        }
      }
    } catch (error) {
      console.error('Overlay check failed:', error);
    }
  }

  // Start web touch event monitoring
  private startWebTouchEventMonitoring(): void {
    if (typeof window === 'undefined') return;
    
    const events = ['click', 'touchstart', 'touchend', 'mousedown', 'mouseup'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        this.analyzeTouchEvent(event);
      }, { capture: true, passive: false });
    });
  }

  // Analyze touch events for suspicious patterns
  private analyzeTouchEvent(event: Event): void {
    try {
      const timestamp = Date.now();
      let x = 0, y = 0;
      
      if (event instanceof MouseEvent) {
        x = event.clientX;
        y = event.clientY;
      } else if (event instanceof TouchEvent && event.touches.length > 0) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
      }
      
      // Add to buffer
      this.touchEventBuffer.push({
        timestamp,
        x,
        y,
        type: event.type
      });
      
      // Keep only recent events (last 5 seconds)
      this.touchEventBuffer = this.touchEventBuffer.filter(
        e => timestamp - e.timestamp < 5000
      );
      
      // Analyze for suspicious patterns
      this.detectSuspiciousTouchPatterns();
    } catch (error) {
      console.error('Touch event analysis failed:', error);
    }
  }

  // Detect suspicious touch patterns
  private detectSuspiciousTouchPatterns(): void {
    if (this.touchEventBuffer.length < 3) return;
    
    try {
      const recentEvents = this.touchEventBuffer.slice(-10);
      
      // Check for rapid-fire clicks (potential bot)
      const rapidClicks = recentEvents.filter(
        (event, index) => {
          if (index === 0) return false;
          const prevEvent = recentEvents[index - 1];
          return event.timestamp - prevEvent.timestamp < 50; // Less than 50ms
        }
      );
      
      if (rapidClicks.length > 3) {
        this.logMobileThreat({
          type: 'tapjacking',
          severity: 'medium',
          detected: true,
          details: 'Rapid-fire click pattern detected - potential automated attack',
          timestamp: Date.now(),
          mitigationAction: 'require_user_confirmation',
          confidence: 70,
          platform: Platform.OS
        });
      }
      
      // Check for impossible touch patterns (multiple simultaneous touches in different areas)
      const simultaneousEvents = recentEvents.filter(
        event => recentEvents.some(
          other => Math.abs(event.timestamp - other.timestamp) < 10 &&
                  Math.abs(event.x - other.x) > 200 &&
                  Math.abs(event.y - other.y) > 200
        )
      );
      
      if (simultaneousEvents.length > 0) {
        this.logMobileThreat({
          type: 'tapjacking',
          severity: 'high',
          detected: true,
          details: 'Impossible touch pattern detected - potential overlay attack',
          timestamp: Date.now(),
          mitigationAction: 'block_suspicious_touches',
          confidence: 90,
          platform: Platform.OS
        });
      }
    } catch (error) {
      console.error('Touch pattern detection failed:', error);
    }
  }

  // Start native overlay detection
  private startNativeOverlayDetection(): void {
    // In a real implementation, this would use native APIs to detect overlay apps
    // For React Native, we implement what we can
    
    setInterval(() => {
      this.checkForNativeOverlays();
    }, 5000); // Check every 5 seconds
  }

  // Check for native overlays
  private async checkForNativeOverlays(): Promise<void> {
    try {
      // Check if screen protection is still active
      const isProtected = this.screenProtection.isScreenProtected();
      
      if (!isProtected && this.overlayDetectionActive) {
        this.logMobileThreat({
          type: 'overlay_attack',
          severity: 'high',
          detected: true,
          details: 'Screen protection bypassed - potential overlay attack',
          timestamp: Date.now(),
          mitigationAction: 'restore_screen_protection',
          confidence: 80,
          platform: Platform.OS
        });
        
        // Try to restore protection
        await this.screenProtection.enableGlobalProtection();
      }
    } catch (error) {
      console.error('Native overlay detection failed:', error);
    }
  }

  // Start suspicious app monitoring
  private startSuspiciousAppMonitoring(): void {
    // Monitor for apps that might perform overlay attacks
    setInterval(() => {
      this.checkForSuspiciousApps();
    }, 30000); // Check every 30 seconds
  }

  // Check for suspicious apps
  private async checkForSuspiciousApps(): Promise<void> {
    try {
      // In a real implementation, this would check running apps
      // For React Native, we do basic device security checks
      
      const deviceStatus = this.deviceSecurity.getSecurityStatus();
      
      if (!deviceStatus.isSecure) {
        this.logMobileThreat({
          type: 'overlay_attack',
          severity: 'medium',
          detected: true,
          details: 'Device security compromised - potential for overlay attacks',
          timestamp: Date.now(),
          mitigationAction: 'warn_user',
          confidence: 60,
          platform: Platform.OS
        });
      }
    } catch (error) {
      console.error('Suspicious app monitoring failed:', error);
    }
  }

  // CRITICAL: Initialize Storage Security
  private async initializeStorageSecurity(): Promise<void> {
    try {
      console.log('Initializing advanced storage security...');
      
      // Initialize encryption keys
      await this.initializeStorageEncryption();
      
      // Set up integrity monitoring
      await this.initializeStorageIntegrityChecks();
      
      // Start storage validation
      this.startStorageValidation();
      
      console.log('Storage security initialized');
    } catch (error) {
      console.error('Storage security initialization failed:', error);
      throw error;
    }
  }

  // Initialize storage encryption
  private async initializeStorageEncryption(): Promise<void> {
    try {
      // Generate storage-specific encryption keys
      const masterKey = await this.generateStorageKey('master');
      const integrityKey = await this.generateStorageKey('integrity');
      const obfuscationKey = await this.generateStorageKey('obfuscation');
      
      this.encryptionKeys.set('master', masterKey);
      this.encryptionKeys.set('integrity', integrityKey);
      this.encryptionKeys.set('obfuscation', obfuscationKey);
      
      console.log('Storage encryption keys initialized');
    } catch (error) {
      console.error('Storage encryption initialization failed:', error);
      throw error;
    }
  }

  // Generate storage-specific encryption key
  private async generateStorageKey(purpose: string): Promise<string> {
    try {
      const deviceFingerprint = this.deviceSecurity.getDeviceFingerprint();
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36);
      
      const keyMaterial = `${purpose}-${deviceFingerprint?.securityHash || 'fallback'}-${timestamp}-${random}`;
      
      // Simple key derivation (in production, use proper PBKDF2/scrypt)
      let hash = 0;
      for (let i = 0; i < keyMaterial.length; i++) {
        const char = keyMaterial.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(16).padStart(32, '0');
    } catch (error) {
      console.error('Storage key generation failed:', error);
      return 'fallback-key-' + Date.now();
    }
  }

  // Initialize storage integrity checks
  private async initializeStorageIntegrityChecks(): Promise<void> {
    try {
      // Get all stored keys and generate integrity hashes
      const keys = await this.secureStorage.getAllKeys();
      
      for (const key of keys) {
        if (!this.shouldCheckKey(key)) {
          continue;
        }
        const data = await this.secureStorage.getItem(key, { encrypt: false });
        if (data) {
          const hash = await this.generateIntegrityHash(data);
          this.storageIntegrityHashes.set(key, hash);
        }
      }
      
      console.log('Storage integrity hashes initialized for', keys.length, 'keys');
    } catch (error) {
      console.error('Storage integrity initialization failed:', error);
    }
  }

  // Generate integrity hash
  private async generateIntegrityHash(data: string): Promise<string> {
    try {
      const integrityKey = this.encryptionKeys.get('integrity') || 'fallback';
      const combined = `${integrityKey}:${data}`;
      const stableHash = await this.cryptoService.hash(combined);
      return stableHash;
    } catch (error) {
      console.error('Integrity hash generation failed:', error);
      return 'fallback-hash';
    }
  }

  // Start storage validation
  private startStorageValidation(): void {
    setInterval(() => {
      this.validateStorageIntegrity();
    }, 60000); // Check every minute
  }

  // Validate storage integrity
  private async validateStorageIntegrity(): Promise<void> {
    try {
      const keys = await this.secureStorage.getAllKeys();
      const corruptedKeys: string[] = [];
      
      for (const key of keys) {
        if (!this.shouldCheckKey(key)) {
          continue;
        }
        const data = await this.secureStorage.getItem(key, { encrypt: false });
        if (data) {
          const currentHash = await this.generateIntegrityHash(data);
          const storedHash = this.storageIntegrityHashes.get(key);
          
          if (!storedHash) {
            this.storageIntegrityHashes.set(key, currentHash);
            continue;
          }
          
          if (currentHash !== storedHash) {
            if (this.isDynamicKey(key)) {
              this.storageIntegrityHashes.set(key, currentHash);
              console.log('Storage integrity baseline updated for dynamic key:', key);
            } else {
              corruptedKeys.push(key);
            }
          }
        }
      }
      
      if (corruptedKeys.length > 0) {
        this.logMobileThreat({
          type: 'insecure_storage',
          severity: 'high',
          detected: true,
          details: `Storage integrity mismatch for keys: ${corruptedKeys.join(', ')}`,
          timestamp: Date.now(),
          mitigationAction: 'quarantine_corrupted_data',
          confidence: 90,
          platform: Platform.OS
        });
        
        await this.quarantineCorruptedData(corruptedKeys);
      }
    } catch (error) {
      console.error('Storage integrity validation failed:', error);
    }
  }

  // Quarantine corrupted data
  private async quarantineCorruptedData(keys: string[]): Promise<void> {
    try {
      for (const key of keys) {
        if (!this.shouldCheckKey(key)) {
          continue;
        }
        const data = await this.secureStorage.getItem(key, { encrypt: false });
        if (data) {
          await this.secureStorage.setItem(`quarantine_${key}_${Date.now()}`, data, { keyPrefix: '' });
        }
        await this.secureStorage.removeItem(key);
        this.storageIntegrityHashes.delete(key);
      }
      console.log('Corrupted data quarantined:', keys);
    } catch (error) {
      console.error('Data quarantine failed:', error);
    }
  }

  // CRITICAL: Initialize Code Injection Prevention
  private async initializeCodeInjectionPrevention(): Promise<void> {
    try {
      console.log('Initializing code injection prevention...');
      
      // Initialize trusted sources
      this.initializeTrustedSources();
      
      // Set up script monitoring
      if (Platform.OS === 'web') {
        this.initializeWebCodeInjectionPrevention();
      } else {
        this.initializeNativeCodeInjectionPrevention();
      }
      
      // Start runtime monitoring
      this.startCodeInjectionMonitoring();
      
      console.log('Code injection prevention initialized');
    } catch (error) {
      console.error('Code injection prevention initialization failed:', error);
      throw error;
    }
  }

  // Initialize trusted sources
  private initializeTrustedSources(): void {
    const trustedDomains = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'expo.dev',
      'expo.io',
      'exp.host',
      'exp.direct',
      'reactnative.dev',
    ];

    trustedDomains.forEach(domain => {
      this.trustedSources.add(domain);
    });

    if (typeof window !== 'undefined') {
      try {
        const currentHost = window.location.hostname;
        if (currentHost) {
          this.trustedSources.add(currentHost);
        }
      } catch {}
    }
  }

  // Initialize web code injection prevention
  private initializeWebCodeInjectionPrevention(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Set up CSP violation reporting
      document.addEventListener('securitypolicyviolation', (event) => {
        this.handleCSPViolation(event);
      });
      
      // Monitor script loading
      this.monitorScriptLoading();
      
      // Prevent eval and Function constructor
      this.preventDynamicCodeExecution();
      
      console.log('Web code injection prevention initialized');
    } catch (error) {
      console.error('Web code injection prevention failed:', error);
    }
  }

  // Handle CSP violations
  private handleCSPViolation(event: SecurityPolicyViolationEvent): void {
    const violation = {
      type: 'csp_violation',
      details: `CSP violation: ${event.violatedDirective} - ${event.blockedURI}`,
      timestamp: Date.now()
    };
    
    this.cspViolations.push(violation);
    
    this.logMobileThreat({
      type: 'code_injection',
      severity: 'high',
      detected: true,
      details: violation.details,
      timestamp: Date.now(),
      mitigationAction: 'block_untrusted_script',
      confidence: 95,
      platform: 'web'
    });
  }

  // Monitor script loading
  private monitorScriptLoading(): void {
    if (typeof window === 'undefined') return;
    
    if (this.scriptMonitorInstalled) return;

    const originalCreateElement = document.createElement;
    const self = this;
    document.createElement = function(tagName: string) {
      const element = originalCreateElement.call(this, tagName);

      if (typeof tagName === 'string' && tagName.toLowerCase() === 'script') {
        const script = element as HTMLScriptElement;
        const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src')?.set;

        if (originalSrcSetter) {
          Object.defineProperty(script, 'src', {
            set: function(value: string) {
              try {
                self.validateScriptSource(value);
              } catch (e) {
                console.warn('Blocked untrusted script src:', value);
                throw e;
              }
              originalSrcSetter.call(this, value);
            },
            get: function() {
              return (this as HTMLScriptElement).getAttribute('src') || '';
            }
          });
        }
      }

      return element;
    } as typeof document.createElement;

    this.scriptMonitorInstalled = true;
  }

  // Validate script source
  private validateScriptSource(src: string): void {
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const url = new URL(src, base);
      const hostname = url.hostname;

      const isSameOrigin = typeof window !== 'undefined' && url.origin === window.location.origin;
      const isIpHost = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
      const isExpoTunnel = hostname.endsWith('.exp.direct') || hostname.endsWith('.exp.host');

      const isTrusted = isSameOrigin || isIpHost || isExpoTunnel || this.trustedSources.has(hostname);

      if (!isTrusted && this.codeInjectionConfig.blockUntrustedSources) {
        const threat = {
          type: 'code_injection' as const,
          severity: __DEV__ ? 'high' as const : 'critical' as const,
          detected: true,
          details: `Untrusted script source detected: ${src}`,
          timestamp: Date.now(),
          mitigationAction: 'block_untrusted_script',
          confidence: 100,
          platform: 'web'
        };
        this.logMobileThreat(threat);

        if (!__DEV__) {
          throw new Error('Untrusted script source blocked');
        } else {
          console.warn('[DEV] Allowing untrusted script during development:', src);
        }
      }

      this.loadedScripts.set(src, {
        hash: this.generateScriptHash(src),
        timestamp: Date.now()
      });
    } catch (error) {
      if (error instanceof TypeError) {
        this.logMobileThreat({
          type: 'code_injection',
          severity: 'high',
          detected: true,
          details: `Invalid script URL detected: ${src}`,
          timestamp: Date.now(),
          mitigationAction: 'block_invalid_script',
          confidence: 90,
          platform: 'web'
        });
      }
      if (!__DEV__) {
        throw error;
      } else {
        console.warn('[DEV] Script validation error suppressed:', error);
      }
    }
  }

  // Generate script hash
  private generateScriptHash(src: string): string {
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
      const char = src.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // Prevent dynamic code execution
  private preventDynamicCodeExecution(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Only override eval in production and not in development
      // Also check if we're in Metro bundler environment
      const isMetroEnvironment = typeof (global as any).__METRO_GLOBAL_PREFIX__ !== 'undefined' || 
                                 typeof (global as any).__BUNDLE_START_TIME__ !== 'undefined' ||
                                 typeof (global as any).__DEV__ !== 'undefined';
      
      if (process.env.NODE_ENV === 'production' && Platform.OS === 'web' && !__DEV__ && !isMetroEnvironment) {
        // Store original eval for legitimate use cases
        const originalEval = window.eval;
        
        // Override eval with security checks
        (window as any).eval = function(code: string) {
          // Allow eval for specific legitimate cases (like JSON parsing fallbacks)
          if (typeof code === 'string' && code.trim().startsWith('{') && code.trim().endsWith('}')) {
            try {
              return originalEval.call(this, code);
            } catch (e) {
              // If it fails, it might be malicious
            }
          }
          
          MobileSecurityService.getInstance().logMobileThreat({
            type: 'code_injection',
            severity: 'critical',
            detected: true,
            details: 'eval() usage detected - potential code injection',
            timestamp: Date.now(),
            mitigationAction: 'block_eval',
            confidence: 100,
            platform: 'web'
          });
          throw new Error('eval() is disabled for security reasons');
        };
        
        // Override Function constructor
        const OriginalFunction = Function;
        (window as any).Function = function(...args: any[]) {
          // Allow Function constructor for specific legitimate cases
          const lastArg = args[args.length - 1];
          if (typeof lastArg === 'string' && lastArg.includes('return')) {
            // This might be a legitimate function creation
            try {
              return OriginalFunction.apply(this, args);
            } catch (e) {
              // If it fails, log and block
            }
          }
          
          MobileSecurityService.getInstance().logMobileThreat({
            type: 'code_injection',
            severity: 'critical',
            detected: true,
            details: 'Function constructor usage detected - potential code injection',
            timestamp: Date.now(),
            mitigationAction: 'block_function_constructor',
            confidence: 100,
            platform: 'web'
          });
          throw new Error('Function constructor is disabled for security reasons');
        };
      } else {
        console.log('Dynamic code execution prevention disabled in development mode or non-web platform');
      }
    } catch (error) {
      console.error('Dynamic code execution prevention failed:', error);
    }
  }

  // Initialize native code injection prevention
  private initializeNativeCodeInjectionPrevention(): void {
    // For React Native, focus on preventing malicious plugins and libraries
    this.validateLoadedModules();
  }

  // Validate loaded modules
  private validateLoadedModules(): void {
    try {
      // In a real implementation, this would check loaded native modules
      // For React Native, we do basic validation
      
      const suspiciousModules = [
        'eval', 'vm', 'child_process', 'fs', 'net', 'http', 'https'
      ];
      
      suspiciousModules.forEach(moduleName => {
        try {
          if (require.resolve(moduleName)) {
            this.logMobileThreat({
              type: 'malicious_plugin',
              severity: 'high',
              detected: true,
              details: `Potentially dangerous module detected: ${moduleName}`,
              timestamp: Date.now(),
              mitigationAction: 'warn_dangerous_module',
              confidence: 70,
              platform: Platform.OS
            });
          }
        } catch (error) {
          // Module not found, which is good
        }
      });
    } catch (error) {
      console.error('Module validation failed:', error);
    }
  }

  // Start code injection monitoring
  private startCodeInjectionMonitoring(): void {
    setInterval(() => {
      this.monitorCodeIntegrity();
    }, 30000); // Check every 30 seconds
  }

  // Monitor code integrity
  private async monitorCodeIntegrity(): Promise<void> {
    try {
      // Check for runtime code modifications
      if (Platform.OS === 'web') {
        this.checkWebCodeIntegrity();
      }
      
      // Clean up old script tracking data
      this.cleanupOldScriptData();
    } catch (error) {
      console.error('Code integrity monitoring failed:', error);
    }
  }

  // Check web code integrity
  private checkWebCodeIntegrity(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Check if critical functions have been modified
      const criticalFunctions = ['eval', 'Function', 'setTimeout', 'setInterval'];
      
      criticalFunctions.forEach(funcName => {
        const func = (window as any)[funcName];
        if (func && func.toString().includes('MobileSecurityService')) {
          // Our security override is in place
          return;
        }
        
        if (func && func.toString().length < 50) {
          // Function might have been modified
          this.logMobileThreat({
            type: 'code_injection',
            severity: 'medium',
            detected: true,
            details: `Critical function ${funcName} may have been modified`,
            timestamp: Date.now(),
            mitigationAction: 'monitor_function_changes',
            confidence: 60,
            platform: 'web'
          });
        }
      });
    } catch (error) {
      console.error('Web code integrity check failed:', error);
    }
  }

  // Clean up old script data
  private cleanupOldScriptData(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [src, data] of this.loadedScripts.entries()) {
      if (now - data.timestamp > maxAge) {
        this.loadedScripts.delete(src);
      }
    }
  }

  // Start mobile security monitoring
  private startMobileSecurityMonitoring(): void {
    if (this.isMonitoringActive) return;
    
    this.isMonitoringActive = true;
    
    this.monitoringInterval = setInterval(() => {
      this.performMobileSecurityCheck();
    }, 15000); // Check every 15 seconds
    
    console.log('Mobile security monitoring started');
  }

  // Perform comprehensive mobile security check
  private async performMobileSecurityCheck(): Promise<void> {
    try {
      // Check tapjacking threats
      if (this.tapjackingConfig.enableOverlayDetection) {
        await this.checkTapjackingThreats();
      }
      
      // Check storage security
      if (this.storageConfig.enableRuntimeValidation) {
        await this.checkStorageSecurity();
      }
      
      // Check code injection threats
      if (this.codeInjectionConfig.enableRuntimeCodeIntegrityChecks) {
        await this.checkCodeInjectionThreats();
      }
    } catch (error) {
      console.error('Mobile security check failed:', error);
    }
  }

  // Check tapjacking threats
  private async checkTapjackingThreats(): Promise<void> {
    try {
      // Check if overlay detection is still active
      if (!this.overlayDetectionActive) {
        this.logMobileThreat({
          type: 'tapjacking',
          severity: 'high',
          detected: true,
          details: 'Overlay detection disabled - potential security bypass',
          timestamp: Date.now(),
          mitigationAction: 'restore_overlay_detection',
          confidence: 80,
          platform: Platform.OS
        });
        
        // Try to restore overlay detection
        await this.initializeTapjackingProtection();
      }
    } catch (error) {
      console.error('Tapjacking threat check failed:', error);
    }
  }

  // Check storage security
  private async checkStorageSecurity(): Promise<void> {
    try {
      // Validate encryption keys are still available
      const masterKey = this.encryptionKeys.get('master');
      if (!masterKey) {
        this.logMobileThreat({
          type: 'insecure_storage',
          severity: 'critical',
          detected: true,
          details: 'Storage encryption keys missing - potential security breach',
          timestamp: Date.now(),
          mitigationAction: 'regenerate_encryption_keys',
          confidence: 100,
          platform: Platform.OS
        });
        
        // Regenerate keys
        await this.initializeStorageEncryption();
      }
    } catch (error) {
      console.error('Storage security check failed:', error);
    }
  }

  // Check code injection threats
  private async checkCodeInjectionThreats(): Promise<void> {
    try {
      // Check for new untrusted scripts
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
          const src = script.getAttribute('src');
          if (src && !this.loadedScripts.has(src)) {
            this.validateScriptSource(src);
          }
        });
      }
    } catch (error) {
      console.error('Code injection threat check failed:', error);
    }
  }

  // Log mobile threat
  private logMobileThreat(threat: MobileThreat): void {
    this.mobileThreats.push(threat);
    
    // Keep only last 1000 threats
    if (this.mobileThreats.length > 1000) {
      this.mobileThreats = this.mobileThreats.slice(-1000);
    }
    
    // Log critical threats immediately with proper serialization
    if (threat.severity === 'critical') {
      console.error('CRITICAL MOBILE SECURITY THREAT:', JSON.stringify(threat, null, 2));
    }
    
    // Handle threat based on severity
    this.handleMobileThreat(threat);
  }

  // Handle mobile threat
  private async handleMobileThreat(threat: MobileThreat): Promise<void> {
    try {
      switch (threat.severity) {
        case 'critical':
          await this.handleCriticalThreat(threat);
          break;
        case 'high':
          await this.handleHighThreat(threat);
          break;
        case 'medium':
          await this.handleMediumThreat(threat);
          break;
        case 'low':
          this.handleLowThreat(threat);
          break;
      }
    } catch (error) {
      console.error('Mobile threat handling failed:', error);
    }
  }

  // Handle critical threat
  private async handleCriticalThreat(threat: MobileThreat): Promise<void> {
    console.error('HANDLING CRITICAL MOBILE THREAT:', JSON.stringify(threat, null, 2));
    
    switch (threat.type) {
      case 'tapjacking':
      case 'overlay_attack':
        await this.blockSuspiciousOverlays();
        break;
      case 'insecure_storage':
        await this.secureStorageEmergency();
        break;
      case 'code_injection':
      case 'malicious_plugin':
        await this.blockMaliciousCode();
        break;
    }
  }

  // Handle high threat
  private async handleHighThreat(threat: MobileThreat): Promise<void> {
    console.warn('HANDLING HIGH MOBILE THREAT:', JSON.stringify(threat, null, 2));
    
    // Increase monitoring frequency
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = setInterval(() => {
        this.performMobileSecurityCheck();
      }, 5000); // Check every 5 seconds
    }
  }

  // Handle medium threat
  private async handleMediumThreat(threat: MobileThreat): Promise<void> {
    console.warn('HANDLING MEDIUM MOBILE THREAT:', JSON.stringify(threat, null, 2));
    
    // Log for analysis
    await this.logThreatForAnalysis(threat);
  }

  // Handle low threat
  private handleLowThreat(threat: MobileThreat): void {
    console.log('HANDLING LOW MOBILE THREAT:', JSON.stringify(threat, null, 2));
    // Just log for monitoring
  }

  // Block suspicious overlays
  private async blockSuspiciousOverlays(): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        // Remove all suspicious overlays
        this.suspiciousOverlays.forEach(overlayId => {
          const elements = document.querySelectorAll(`#${overlayId}, .${overlayId}, ${overlayId}`);
          elements.forEach(element => element.remove());
        });
        this.suspiciousOverlays.clear();
      }
      
      // Re-enable screen protection
      await this.screenProtection.enableGlobalProtection();
    } catch (error) {
      console.error('Failed to block suspicious overlays:', error);
    }
  }

  // Secure storage emergency
  private async secureStorageEmergency(): Promise<void> {
    try {
      // Clear potentially compromised data
      await this.secureStorage.cleanupCorruptedData();
      
      // Regenerate encryption keys
      await this.initializeStorageEncryption();
      
      // Reinitialize integrity checks
      await this.initializeStorageIntegrityChecks();
    } catch (error) {
      console.error('Storage emergency procedure failed:', error);
    }
  }

  // Block malicious code
  private async blockMaliciousCode(): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        // Remove untrusted scripts
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
          const src = script.getAttribute('src');
          if (src) {
            try {
              const url = new URL(src, window.location.origin);
              if (!this.trustedSources.has(url.hostname)) {
                script.remove();
              }
            } catch (error) {
              // Invalid URL, remove it
              script.remove();
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to block malicious code:', error);
    }
  }

  // Log threat for analysis
  private async logThreatForAnalysis(threat: MobileThreat): Promise<void> {
    try {
      // Store threat data for analysis
      await this.secureStorage.setObject(`threat_${Date.now()}`, threat, {
        encrypt: true,
        useSecureEnclave: false
      });
    } catch (error) {
      console.error('Failed to log threat for analysis:', error);
    }
  }

  // Key integrity helpers
  private shouldCheckKey(key: string): boolean {
    if (this.integrityExcludePatterns.some((re) => re.test(key))) {
      return false;
    }
    return true;
  }

  private isDynamicKey(key: string): boolean {
    return this.integrityDynamicPatterns.some((re) => re.test(key));
  }

  // Public API methods
  
  // Get mobile security status
  getMobileSecurityStatus(): {
    tapjackingProtection: boolean;
    storageSecurityActive: boolean;
    codeInjectionPrevention: boolean;
    threatsDetected: number;
    criticalThreats: number;
    lastCheck: number;
    monitoringActive: boolean;
  } {
    const criticalThreats = this.mobileThreats.filter(t => t.severity === 'critical').length;
    
    return {
      tapjackingProtection: this.overlayDetectionActive,
      storageSecurityActive: this.encryptionKeys.size > 0,
      codeInjectionPrevention: this.trustedSources.size > 0,
      threatsDetected: this.mobileThreats.length,
      criticalThreats,
      lastCheck: Date.now(),
      monitoringActive: this.isMonitoringActive
    };
  }

  // Get mobile threats
  getMobileThreats(severity?: 'low' | 'medium' | 'high' | 'critical'): MobileThreat[] {
    if (severity) {
      return this.mobileThreats.filter(threat => threat.severity === severity);
    }
    return [...this.mobileThreats];
  }

  // Force mobile security check
  async forceMobileSecurityCheck(): Promise<MobileThreat[]> {
    await this.performMobileSecurityCheck();
    return this.getMobileThreats();
  }

  // Update configurations
  updateTapjackingConfig(config: Partial<TapjackingConfig>): void {
    this.tapjackingConfig = { ...this.tapjackingConfig, ...config };
    console.log('Tapjacking config updated:', this.tapjackingConfig);
  }

  updateStorageConfig(config: Partial<StorageSecurityConfig>): void {
    this.storageConfig = { ...this.storageConfig, ...config };
    console.log('Storage security config updated:', this.storageConfig);
  }

  updateCodeInjectionConfig(config: Partial<CodeInjectionConfig>): void {
    this.codeInjectionConfig = { ...this.codeInjectionConfig, ...config };
    console.log('Code injection config updated:', this.codeInjectionConfig);
  }

  // Add trusted source
  addTrustedSource(source: string): void {
    this.trustedSources.add(source);
    console.log('Trusted source added:', source);
  }

  // Remove trusted source
  removeTrustedSource(source: string): void {
    this.trustedSources.delete(source);
    console.log('Trusted source removed:', source);
  }

  // Get trusted sources
  getTrustedSources(): string[] {
    return Array.from(this.trustedSources);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoringActive = false;
    console.log('Mobile security monitoring stopped');
  }

  // Get CSP violations
  getCSPViolations(): Array<{ type: string; details: string; timestamp: number }> {
    return [...this.cspViolations];
  }

  // Clear threat history
  clearThreatHistory(): void {
    this.mobileThreats = [];
    this.cspViolations = [];
    console.log('Mobile threat history cleared');
  }
}

export default MobileSecurityService;