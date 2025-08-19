import { Platform, AccessibilityInfo, findNodeHandle } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AccessibilitySettings {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  highContrastEnabled: boolean;
  largeTextEnabled: boolean;
  boldTextEnabled: boolean;
  buttonShapesEnabled: boolean;
  reduceTransparencyEnabled: boolean;
  voiceOverEnabled: boolean;
  switchControlEnabled: boolean;
  grayscaleEnabled: boolean;
  invertColorsEnabled: boolean;
  announceNotifications: boolean;
  hapticFeedbackEnabled: boolean;
  audioDescriptionsEnabled: boolean;
}

export interface AccessibilityPreferences {
  fontSize: 'small' | 'medium' | 'large' | 'extraLarge';
  contrast: 'normal' | 'high' | 'extraHigh';
  motionPreference: 'full' | 'reduced' | 'none';
  soundPreference: 'full' | 'reduced' | 'none';
  navigationStyle: 'standard' | 'simplified' | 'voice';
  readingSpeed: 'slow' | 'normal' | 'fast';
  language: string;
  region: string;
}

interface AccessibilityState {
  settings: AccessibilitySettings;
  preferences: AccessibilityPreferences;
  isInitialized: boolean;
  
  // Actions
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  updatePreferences: (preferences: Partial<AccessibilityPreferences>) => void;
  initializeAccessibility: () => Promise<void>;
  announceForAccessibility: (message: string, priority?: 'low' | 'high') => void;
  focusAccessibilityElement: (element: any) => void;
  setAccessibilityFocus: (element: any) => void;
}

class AccessibilityService {
  private static instance: AccessibilityService;
  private listeners: (() => void)[] = [];
  
  private constructor() {}
  
  static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
      AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
  }
  
  async initialize(): Promise<AccessibilitySettings> {
    try {
      console.log('🔍 Initializing Accessibility Service...');
      
      const settings: AccessibilitySettings = {
        screenReaderEnabled: false,
        reduceMotionEnabled: false,
        highContrastEnabled: false,
        largeTextEnabled: false,
        boldTextEnabled: false,
        buttonShapesEnabled: false,
        reduceTransparencyEnabled: false,
        voiceOverEnabled: false,
        switchControlEnabled: false,
        grayscaleEnabled: false,
        invertColorsEnabled: false,
        announceNotifications: true,
        hapticFeedbackEnabled: true,
        audioDescriptionsEnabled: false,
      };
      
      if (Platform.OS !== 'web') {
        // Check screen reader status
        const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        settings.screenReaderEnabled = screenReaderEnabled;
        
        // Check reduce motion
        const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        settings.reduceMotionEnabled = reduceMotionEnabled;
        
        // Check reduce transparency (iOS only)
        if (Platform.OS === 'ios') {
          try {
            const reduceTransparencyEnabled = await AccessibilityInfo.isReduceTransparencyEnabled();
            settings.reduceTransparencyEnabled = reduceTransparencyEnabled;
          } catch (error) {
            console.warn('Reduce transparency check failed:', error);
          }
        }
        
        // Check bold text (iOS only)
        if (Platform.OS === 'ios') {
          try {
            const boldTextEnabled = await AccessibilityInfo.isBoldTextEnabled();
            settings.boldTextEnabled = boldTextEnabled;
          } catch (error) {
            console.warn('Bold text check failed:', error);
          }
        }
        
        // Check grayscale (iOS only)
        if (Platform.OS === 'ios') {
          try {
            const grayscaleEnabled = await AccessibilityInfo.isGrayscaleEnabled();
            settings.grayscaleEnabled = grayscaleEnabled;
          } catch (error) {
            console.warn('Grayscale check failed:', error);
          }
        }
        
        // Check invert colors (iOS only)
        if (Platform.OS === 'ios') {
          try {
            const invertColorsEnabled = await AccessibilityInfo.isInvertColorsEnabled();
            settings.invertColorsEnabled = invertColorsEnabled;
          } catch (error) {
            console.warn('Invert colors check failed:', error);
          }
        }
        
        // Set up listeners for accessibility changes
        this.setupAccessibilityListeners();
      } else {
        // Web-specific accessibility detection
        this.detectWebAccessibilityFeatures(settings);
      }
      
      console.log('✅ Accessibility Service initialized:', settings);
      return settings;
      
    } catch (error) {
      console.error('💥 Accessibility Service initialization failed:', error);
      throw error;
    }
  }
  
  private setupAccessibilityListeners(): void {
    if (Platform.OS === 'web') return;
    
    try {
      // Screen reader change listener
      const screenReaderListener = AccessibilityInfo.addEventListener(
        'screenReaderChanged',
        (isEnabled: boolean) => {
          console.log('📱 Screen reader changed:', isEnabled);
          useAccessibilityStore.getState().updateSettings({ screenReaderEnabled: isEnabled });
        }
      );
      
      // Reduce motion change listener
      const reduceMotionListener = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        (isEnabled: boolean) => {
          console.log('🎭 Reduce motion changed:', isEnabled);
          useAccessibilityStore.getState().updateSettings({ reduceMotionEnabled: isEnabled });
        }
      );
      
      // iOS-specific listeners
      if (Platform.OS === 'ios') {
        const boldTextListener = AccessibilityInfo.addEventListener(
          'boldTextChanged',
          (isEnabled: boolean) => {
            console.log('📝 Bold text changed:', isEnabled);
            useAccessibilityStore.getState().updateSettings({ boldTextEnabled: isEnabled });
          }
        );
        
        const grayscaleListener = AccessibilityInfo.addEventListener(
          'grayscaleChanged',
          (isEnabled: boolean) => {
            console.log('🎨 Grayscale changed:', isEnabled);
            useAccessibilityStore.getState().updateSettings({ grayscaleEnabled: isEnabled });
          }
        );
        
        const invertColorsListener = AccessibilityInfo.addEventListener(
          'invertColorsChanged',
          (isEnabled: boolean) => {
            console.log('🔄 Invert colors changed:', isEnabled);
            useAccessibilityStore.getState().updateSettings({ invertColorsEnabled: isEnabled });
          }
        );
        
        const reduceTransparencyListener = AccessibilityInfo.addEventListener(
          'reduceTransparencyChanged',
          (isEnabled: boolean) => {
            console.log('👁️ Reduce transparency changed:', isEnabled);
            useAccessibilityStore.getState().updateSettings({ reduceTransparencyEnabled: isEnabled });
          }
        );
        
        this.listeners.push(
          () => boldTextListener?.remove(),
          () => grayscaleListener?.remove(),
          () => invertColorsListener?.remove(),
          () => reduceTransparencyListener?.remove()
        );
      }
      
      this.listeners.push(
        () => screenReaderListener?.remove(),
        () => reduceMotionListener?.remove()
      );
      
    } catch (error) {
      console.error('Failed to setup accessibility listeners:', error);
    }
  }
  
  private detectWebAccessibilityFeatures(settings: AccessibilitySettings): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Check for prefers-reduced-motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      settings.reduceMotionEnabled = prefersReducedMotion.matches;
      
      // Check for prefers-contrast
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
      settings.highContrastEnabled = prefersHighContrast.matches;
      
      // Check for prefers-reduced-transparency
      const prefersReducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
      settings.reduceTransparencyEnabled = prefersReducedTransparency.matches;
      
      // Check for inverted colors
      const prefersInvertedColors = window.matchMedia('(inverted-colors: inverted)');
      settings.invertColorsEnabled = prefersInvertedColors.matches;
      
      // Set up media query listeners
      prefersReducedMotion.addEventListener('change', (e) => {
        useAccessibilityStore.getState().updateSettings({ reduceMotionEnabled: e.matches });
      });
      
      prefersHighContrast.addEventListener('change', (e) => {
        useAccessibilityStore.getState().updateSettings({ highContrastEnabled: e.matches });
      });
      
      prefersReducedTransparency.addEventListener('change', (e) => {
        useAccessibilityStore.getState().updateSettings({ reduceTransparencyEnabled: e.matches });
      });
      
      prefersInvertedColors.addEventListener('change', (e) => {
        useAccessibilityStore.getState().updateSettings({ invertColorsEnabled: e.matches });
      });
      
    } catch (error) {
      console.error('Web accessibility detection failed:', error);
    }
  }
  
  announceForAccessibility(message: string, priority: 'low' | 'high' = 'low'): void {
    try {
      if (Platform.OS !== 'web') {
        AccessibilityInfo.announceForAccessibility(message);
      } else {
        // Web implementation using ARIA live regions
        this.announceForWeb(message, priority);
      }
    } catch (error) {
      console.error('Accessibility announcement failed:', error);
    }
  }
  
  private announceForWeb(message: string, priority: 'low' | 'high'): void {
    if (typeof document === 'undefined') return;
    
    try {
      let liveRegion = document.getElementById('accessibility-live-region');
      
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'accessibility-live-region';
        liveRegion.setAttribute('aria-live', priority === 'high' ? 'assertive' : 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
      }
      
      liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = '';
        }
      }, 1000);
      
    } catch (error) {
      console.error('Web accessibility announcement failed:', error);
    }
  }
  
  focusAccessibilityElement(element: any): void {
    try {
      if (Platform.OS !== 'web') {
        const reactTag = findNodeHandle(element);
        if (reactTag) {
          AccessibilityInfo.setAccessibilityFocus(reactTag);
        }
      } else {
        // Web implementation
        if (element && element.focus) {
          element.focus();
        }
      }
    } catch (error) {
      console.error('Accessibility focus failed:', error);
    }
  }
  
  cleanup(): void {
    this.listeners.forEach(removeListener => removeListener());
    this.listeners = [];
  }
}

// Zustand store for accessibility state
export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set, get) => ({
      settings: {
        screenReaderEnabled: false,
        reduceMotionEnabled: false,
        highContrastEnabled: false,
        largeTextEnabled: false,
        boldTextEnabled: false,
        buttonShapesEnabled: false,
        reduceTransparencyEnabled: false,
        voiceOverEnabled: false,
        switchControlEnabled: false,
        grayscaleEnabled: false,
        invertColorsEnabled: false,
        announceNotifications: true,
        hapticFeedbackEnabled: true,
        audioDescriptionsEnabled: false,
      },
      preferences: {
        fontSize: 'medium',
        contrast: 'normal',
        motionPreference: 'full',
        soundPreference: 'full',
        navigationStyle: 'standard',
        readingSpeed: 'normal',
        language: 'ar',
        region: 'SA',
      },
      isInitialized: false,
      
      updateSettings: (newSettings: Partial<AccessibilitySettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
      
      updatePreferences: (newPreferences: Partial<AccessibilityPreferences>) => {
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        }));
      },
      
      initializeAccessibility: async () => {
        try {
          const accessibilityService = AccessibilityService.getInstance();
          const settings = await accessibilityService.initialize();
          
          set({
            settings,
            isInitialized: true,
          });
          
          console.log('✅ Accessibility store initialized');
        } catch (error) {
          console.error('💥 Accessibility store initialization failed:', error);
          set({ isInitialized: true }); // Set as initialized even on error
        }
      },
      
      announceForAccessibility: (message: string, priority: 'low' | 'high' = 'low') => {
        const accessibilityService = AccessibilityService.getInstance();
        accessibilityService.announceForAccessibility(message, priority);
      },
      
      focusAccessibilityElement: (element: any) => {
        const accessibilityService = AccessibilityService.getInstance();
        accessibilityService.focusAccessibilityElement(element);
      },
      
      setAccessibilityFocus: (element: any) => {
        const accessibilityService = AccessibilityService.getInstance();
        accessibilityService.focusAccessibilityElement(element);
      },
    }),
    {
      name: 'accessibility-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        preferences: state.preferences,
        settings: {
          announceNotifications: state.settings.announceNotifications,
          hapticFeedbackEnabled: state.settings.hapticFeedbackEnabled,
          audioDescriptionsEnabled: state.settings.audioDescriptionsEnabled,
        },
      }),
    }
  )
);

export default AccessibilityService;