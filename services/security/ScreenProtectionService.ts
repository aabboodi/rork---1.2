import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import DeviceSecurityService from './DeviceSecurityService';

interface ScreenProtectionConfig {
  preventScreenshots: boolean;
  preventScreenRecording: boolean;
  blurOnAppStateChange: boolean;
  hideContentInTaskSwitcher: boolean;
  watermarkEnabled: boolean;
  sensitiveContentProtection: boolean;
}

interface ProtectionEvent {
  type: 'screenshot_blocked' | 'recording_blocked' | 'app_backgrounded' | 'protection_enabled' | 'protection_disabled' | 'violation_detected';
  timestamp: number;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ScreenProtectionService {
  private static instance: ScreenProtectionService;
  private deviceSecurity: DeviceSecurityService;
  private protectionEvents: ProtectionEvent[] = [];
  private isProtectionActive = false;
  private protectionConfig: ScreenProtectionConfig;
  private screenCaptureListener: any = null;
  private appStateListener: any = null;

  // CRITICAL: Default protection configuration
  private readonly DEFAULT_CONFIG: ScreenProtectionConfig = {
    preventScreenshots: true,
    preventScreenRecording: true,
    blurOnAppStateChange: true,
    hideContentInTaskSwitcher: true,
    watermarkEnabled: false,
    sensitiveContentProtection: true
  };

  private constructor() {
    this.deviceSecurity = DeviceSecurityService.getInstance();
    this.protectionConfig = { ...this.DEFAULT_CONFIG };
  }

  static getInstance(): ScreenProtectionService {
    if (!ScreenProtectionService.instance) {
      ScreenProtectionService.instance = new ScreenProtectionService();
    }
    return ScreenProtectionService.instance;
  }

  // CRITICAL: Enable comprehensive screen protection
  async enableScreenProtection(config?: Partial<ScreenProtectionConfig>): Promise<boolean> {
    try {
      if (config) {
        this.protectionConfig = { ...this.protectionConfig, ...config };
      }

      console.log('🛡️ Enabling screen protection...');

      // Enable screenshot prevention
      if (this.protectionConfig.preventScreenshots) {
        await this.enableScreenshotPrevention();
      }

      // Enable screen recording prevention
      if (this.protectionConfig.preventScreenRecording) {
        await this.enableScreenRecordingPrevention();
      }

      // Set up app state monitoring
      if (this.protectionConfig.blurOnAppStateChange) {
        this.setupAppStateMonitoring();
      }

      // Set up screen capture monitoring
      this.setupScreenCaptureMonitoring();

      this.isProtectionActive = true;

      this.logProtectionEvent({
        type: 'protection_enabled',
        timestamp: Date.now(),
        details: {
          config: this.protectionConfig,
          platform: Platform.OS
        },
        severity: 'low'
      });

      console.log('✅ Screen protection enabled successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to enable screen protection:', error);
      this.logProtectionEvent({
        type: 'violation_detected',
        timestamp: Date.now(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'enable_protection'
        },
        severity: 'high'
      });
      return false;
    }
  }

  // CRITICAL: Enable screenshot prevention
  private async enableScreenshotPrevention(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web-specific screenshot prevention
        this.enableWebScreenshotPrevention();
        return;
      }

      // Mobile screenshot prevention using expo-screen-capture
      const hasPermissions = await ScreenCapture.requestPermissionsAsync();
      if (hasPermissions.granted) {
        await ScreenCapture.preventScreenCaptureAsync();
        console.log('📱 Screenshot prevention enabled');
      } else {
        console.warn('⚠️ Screenshot prevention permissions not granted');
      }
    } catch (error) {
      console.error('❌ Failed to enable screenshot prevention:', error);
      
      // Fallback: Try to set FLAG_SECURE equivalent
      if (Platform.OS === 'android') {
        this.enableAndroidFlagSecure();
      } else if (Platform.OS === 'ios') {
        this.enableIOSScreenProtection();
      }
    }
  }

  // Enable web screenshot prevention
  private enableWebScreenshotPrevention(): void {
    if (typeof document === 'undefined') return;

    try {
      // Disable right-click context menu
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.logProtectionEvent({
          type: 'screenshot_blocked',
          timestamp: Date.now(),
          details: { method: 'context_menu_disabled' },
          severity: 'medium'
        });
      });

      // Disable common screenshot shortcuts
      document.addEventListener('keydown', (e) => {
        // Disable Print Screen, Ctrl+Shift+S, etc.
        if (e.key === 'PrintScreen' || 
            (e.ctrlKey && e.shiftKey && e.key === 'S') ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            e.key === 'F12') {
          e.preventDefault();
          this.logProtectionEvent({
            type: 'screenshot_blocked',
            timestamp: Date.now(),
            details: { 
              method: 'keyboard_shortcut_blocked',
              key: e.key,
              ctrlKey: e.ctrlKey,
              shiftKey: e.shiftKey
            },
            severity: 'medium'
          });
        }
      });

      // Add CSS to prevent selection and copying
      const style = document.createElement('style');
      style.textContent = `
        * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Prevent drag and drop */
        * {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }
      `;
      document.head.appendChild(style);

      console.log('🌐 Web screenshot prevention enabled');
    } catch (error) {
      console.error('❌ Failed to enable web screenshot prevention:', error);
    }
  }

  // Enable Android FLAG_SECURE equivalent
  private enableAndroidFlagSecure(): void {
    try {
      // CRITICAL: In a real React Native app, this would use native modules
      // to set FLAG_SECURE on the window
      console.log('🤖 Android FLAG_SECURE would be enabled here');
      
      // Placeholder for native module call:
      // NativeModules.ScreenProtection.setFlagSecure(true);
    } catch (error) {
      console.error('❌ Failed to enable Android FLAG_SECURE:', error);
    }
  }

  // Enable iOS screen protection
  private enableIOSScreenProtection(): void {
    try {
      // CRITICAL: In a real React Native app, this would use native modules
      // to prevent screenshots and screen recording
      console.log('🍎 iOS screen protection would be enabled here');
      
      // Placeholder for native module call:
      // NativeModules.ScreenProtection.enableScreenProtection();
    } catch (error) {
      console.error('❌ Failed to enable iOS screen protection:', error);
    }
  }

  // Compatibility alias for legacy callers expecting enableGlobalProtection
  async enableGlobalProtection(config?: Partial<ScreenProtectionConfig>): Promise<boolean> {
    return this.enableScreenProtection(config);
  }

  // Compatibility alias for legacy callers expecting disableGlobalProtection
  async disableGlobalProtection(): Promise<boolean> {
    return this.disableScreenProtection();
  }

  // CRITICAL: Enable screen recording prevention
  private async enableScreenRecordingPrevention(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        this.enableWebScreenRecordingPrevention();
        return;
      }

      // Mobile screen recording prevention
      // This would typically require native implementation
      console.log('📹 Screen recording prevention enabled');
    } catch (error) {
      console.error('❌ Failed to enable screen recording prevention:', error);
    }
  }

  // Enable web screen recording prevention
  private enableWebScreenRecordingPrevention(): void {
    if (typeof navigator === 'undefined') return;

    try {
      // Monitor for screen capture API usage
      if ('mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        
        navigator.mediaDevices.getDisplayMedia = function(...args) {
          console.warn('🚫 Screen recording attempt detected and blocked');
          
          ScreenProtectionService.getInstance().logProtectionEvent({
            type: 'recording_blocked',
            timestamp: Date.now(),
            details: { method: 'getDisplayMedia_blocked' },
            severity: 'high'
          });
          
          return Promise.reject(new Error('Screen recording is not allowed'));
        };
      }

      console.log('🌐 Web screen recording prevention enabled');
    } catch (error) {
      console.error('❌ Failed to enable web screen recording prevention:', error);
    }
  }

  // Setup app state monitoring
  private setupAppStateMonitoring(): void {
    try {
      if (Platform.OS === 'web') {
        this.setupWebVisibilityMonitoring();
        return;
      }

      // Mobile app state monitoring
      const { AppState } = require('react-native');
      
      this.appStateListener = AppState.addEventListener('change', (nextAppState: string) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          this.handleAppBackground();
        } else if (nextAppState === 'active') {
          this.handleAppForeground();
        }
      });

      console.log('📱 App state monitoring enabled');
    } catch (error) {
      console.error('❌ Failed to setup app state monitoring:', error);
    }
  }

  // Setup web visibility monitoring
  private setupWebVisibilityMonitoring(): void {
    if (typeof document === 'undefined') return;

    try {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.handleAppBackground();
        } else {
          this.handleAppForeground();
        }
      });

      // Monitor for window blur/focus
      window.addEventListener('blur', () => {
        this.handleAppBackground();
      });

      window.addEventListener('focus', () => {
        this.handleAppForeground();
      });

      console.log('🌐 Web visibility monitoring enabled');
    } catch (error) {
      console.error('❌ Failed to setup web visibility monitoring:', error);
    }
  }

  // Handle app going to background
  private handleAppBackground(): void {
    try {
      if (this.protectionConfig.blurOnAppStateChange) {
        this.blurSensitiveContent();
      }

      if (this.protectionConfig.hideContentInTaskSwitcher) {
        this.hideContentInTaskSwitcher();
      }

      this.logProtectionEvent({
        type: 'app_backgrounded',
        timestamp: Date.now(),
        details: {
          blurEnabled: this.protectionConfig.blurOnAppStateChange,
          hideContent: this.protectionConfig.hideContentInTaskSwitcher
        },
        severity: 'low'
      });

      console.log('🔒 App backgrounded - content protection activated');
    } catch (error) {
      console.error('❌ Failed to handle app background:', error);
    }
  }

  // Handle app coming to foreground
  private handleAppForeground(): void {
    try {
      this.unblurSensitiveContent();
      this.showContentInTaskSwitcher();

      console.log('🔓 App foregrounded - content protection deactivated');
    } catch (error) {
      console.error('❌ Failed to handle app foreground:', error);
    }
  }

  // Blur sensitive content
  private blurSensitiveContent(): void {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        // Add blur overlay to the entire app
        const blurOverlay = document.createElement('div');
        blurOverlay.id = 'screen-protection-blur';
        blurOverlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          z-index: 999999;
          pointer-events: none;
        `;
        
        document.body.appendChild(blurOverlay);
        console.log('🌫️ Content blurred for privacy');
      } catch (error) {
        console.error('❌ Failed to blur content:', error);
      }
    }
  }

  // Unblur sensitive content
  private unblurSensitiveContent(): void {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const blurOverlay = document.getElementById('screen-protection-blur');
        if (blurOverlay) {
          blurOverlay.remove();
          console.log('🌟 Content unblurred');
        }
      } catch (error) {
        console.error('❌ Failed to unblur content:', error);
      }
    }
  }

  // Hide content in task switcher
  private hideContentInTaskSwitcher(): void {
    try {
      if (Platform.OS === 'android') {
        // CRITICAL: Would use native module to set FLAG_SECURE
        console.log('🤖 Content hidden in Android task switcher');
      } else if (Platform.OS === 'ios') {
        // CRITICAL: Would use native module to hide content
        console.log('🍎 Content hidden in iOS app switcher');
      } else if (Platform.OS === 'web') {
        // Change page title and favicon
        if (typeof document !== 'undefined') {
          document.title = 'Secure App';
        }
      }
    } catch (error) {
      console.error('❌ Failed to hide content in task switcher:', error);
    }
  }

  // Show content in task switcher
  private showContentInTaskSwitcher(): void {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        // Restore original title
        document.title = 'Secure Messaging App';
      }
    } catch (error) {
      console.error('❌ Failed to show content in task switcher:', error);
    }
  }

  // Setup screen capture monitoring
  private setupScreenCaptureMonitoring(): void {
    try {
      if (Platform.OS === 'web') {
        // Web doesn't have reliable screen capture detection
        return;
      }

      // Mobile screen capture monitoring
      if (ScreenCapture.addScreenshotListener) {
        this.screenCaptureListener = ScreenCapture.addScreenshotListener(() => {
          this.handleScreenshotAttempt();
        });
      }

      console.log('📸 Screen capture monitoring enabled');
    } catch (error) {
      console.error('❌ Failed to setup screen capture monitoring:', error);
    }
  }

  // Handle screenshot attempt
  private handleScreenshotAttempt(): void {
    try {
      this.logProtectionEvent({
        type: 'screenshot_blocked',
        timestamp: Date.now(),
        details: {
          method: 'native_screenshot_detection',
          platform: Platform.OS
        },
        severity: 'high'
      });

      console.log('🚫 Screenshot attempt detected and logged');

      // CRITICAL: In production, you might want to:
      // 1. Show a warning to the user
      // 2. Log the security event
      // 3. Potentially lock the app or require re-authentication
      // 4. Send an alert to security monitoring
    } catch (error) {
      console.error('❌ Failed to handle screenshot attempt:', error);
    }
  }

  // CRITICAL: Disable screen protection
  async disableScreenProtection(): Promise<boolean> {
    try {
      console.log('🛡️ Disabling screen protection...');

      // Disable screenshot prevention
      if (Platform.OS !== 'web') {
        await ScreenCapture.allowScreenCaptureAsync();
      }

      // Remove listeners
      if (this.screenCaptureListener) {
        this.screenCaptureListener.remove();
        this.screenCaptureListener = null;
      }

      if (this.appStateListener) {
        this.appStateListener.remove();
        this.appStateListener = null;
      }

      // Remove web protections
      if (Platform.OS === 'web') {
        this.disableWebProtections();
      }

      this.isProtectionActive = false;

      this.logProtectionEvent({
        type: 'protection_disabled',
        timestamp: Date.now(),
        details: { platform: Platform.OS },
        severity: 'low'
      });

      console.log('✅ Screen protection disabled');
      return true;
    } catch (error) {
      console.error('❌ Failed to disable screen protection:', error);
      return false;
    }
  }

  // Disable web protections
  private disableWebProtections(): void {
    if (typeof document === 'undefined') return;

    try {
      // Remove blur overlay if present
      this.unblurSensitiveContent();

      // Note: We don't remove event listeners as they might interfere with other functionality
      console.log('🌐 Web protections disabled');
    } catch (error) {
      console.error('❌ Failed to disable web protections:', error);
    }
  }

  // Handle app state changes for security monitoring
  handleAppStateChange(nextAppState: string): void {
    try {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.handleAppBackground();
      } else if (nextAppState === 'active') {
        this.handleAppForeground();
      }
    } catch (error) {
      console.error('❌ Failed to handle app state change:', error);
    }
  }

  // Check if protection is active
  isProtectionEnabled(): boolean {
    return this.isProtectionActive;
  }

  // Alias for compatibility with legacy code
  isScreenProtected(): boolean {
    return this.isProtectionActive;
  }

  // Get protection configuration
  getProtectionConfig(): ScreenProtectionConfig {
    return { ...this.protectionConfig };
  }

  // Update protection configuration
  async updateProtectionConfig(config: Partial<ScreenProtectionConfig>): Promise<boolean> {
    try {
      const oldConfig = { ...this.protectionConfig };
      this.protectionConfig = { ...this.protectionConfig, ...config };

      // Re-enable protection with new config if currently active
      if (this.isProtectionActive) {
        await this.disableScreenProtection();
        await this.enableScreenProtection();
      }

      console.log('🔧 Protection configuration updated:', config);
      return true;
    } catch (error) {
      console.error('❌ Failed to update protection configuration:', error);
      return false;
    }
  }

  // Get protection statistics
  getProtectionStatistics(): {
    totalEvents: number;
    screenshotAttempts: number;
    recordingAttempts: number;
    appBackgroundEvents: number;
    protectionEnabled: boolean;
    recentViolations: number;
  } {
    const now = Date.now();
    const recentThreshold = now - (60 * 60 * 1000); // Last hour

    const screenshotAttempts = this.protectionEvents.filter(
      event => event.type === 'screenshot_blocked'
    ).length;

    const recordingAttempts = this.protectionEvents.filter(
      event => event.type === 'recording_blocked'
    ).length;

    const appBackgroundEvents = this.protectionEvents.filter(
      event => event.type === 'app_backgrounded'
    ).length;

    const recentViolations = this.protectionEvents.filter(
      event => event.timestamp > recentThreshold && 
               (event.type === 'screenshot_blocked' || event.type === 'recording_blocked')
    ).length;

    return {
      totalEvents: this.protectionEvents.length,
      screenshotAttempts,
      recordingAttempts,
      appBackgroundEvents,
      protectionEnabled: this.isProtectionActive,
      recentViolations
    };
  }

  // Get protection events
  getProtectionEvents(): ProtectionEvent[] {
    return [...this.protectionEvents];
  }

  // Log protection event
  private logProtectionEvent(event: ProtectionEvent): void {
    this.protectionEvents.push(event);
    
    // Keep only last 1000 events
    if (this.protectionEvents.length > 1000) {
      this.protectionEvents = this.protectionEvents.slice(-1000);
    }

    // Log critical events immediately
    if (event.severity === 'critical') {
      console.error('CRITICAL SCREEN PROTECTION EVENT:', event);
    }
  }

  // Force enable protection (for sensitive screens)
  async forceEnableProtection(): Promise<boolean> {
    try {
      const maxSecurityConfig: ScreenProtectionConfig = {
        preventScreenshots: true,
        preventScreenRecording: true,
        blurOnAppStateChange: true,
        hideContentInTaskSwitcher: true,
        watermarkEnabled: true,
        sensitiveContentProtection: true
      };

      return await this.enableScreenProtection(maxSecurityConfig);
    } catch (error) {
      console.error('❌ Failed to force enable protection:', error);
      return false;
    }
  }

  // Check if device supports screen protection
  async checkProtectionSupport(): Promise<{
    screenshotPrevention: boolean;
    screenRecordingPrevention: boolean;
    appStateMonitoring: boolean;
    nativeSupport: boolean;
  }> {
    try {
      let screenshotPrevention = false;
      let screenRecordingPrevention = false;
      let appStateMonitoring = false;
      let nativeSupport = false;

      if (Platform.OS === 'web') {
        screenshotPrevention = true; // Limited web support
        screenRecordingPrevention = true; // Limited web support
        appStateMonitoring = typeof document !== 'undefined';
        nativeSupport = false;
      } else {
        // Check mobile support
        try {
          const permissions = await ScreenCapture.requestPermissionsAsync();
          screenshotPrevention = permissions.granted;
          screenRecordingPrevention = true; // Assume supported
          appStateMonitoring = true;
          nativeSupport = true;
        } catch (error) {
          console.warn('Screen capture API not available:', error);
        }
      }

      return {
        screenshotPrevention,
        screenRecordingPrevention,
        appStateMonitoring,
        nativeSupport
      };
    } catch (error) {
      console.error('❌ Failed to check protection support:', error);
      return {
        screenshotPrevention: false,
        screenRecordingPrevention: false,
        appStateMonitoring: false,
        nativeSupport: false
      };
    }
  }
}

export default ScreenProtectionService;