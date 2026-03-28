import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { StatusBar, Platform } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useAccessibilityStore } from '@/services/accessibility/AccessibilityService';

interface AccessibilityContextType {
  announceForAccessibility: (message: string, priority?: 'low' | 'high') => void;
  focusElement: (element: any) => void;
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isHighContrastEnabled: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const { colorScheme, initializeTheme, checkAndUpdateTheme } = useThemeStore();
  const { 
    settings, 
    initializeAccessibility, 
    announceForAccessibility, 
    focusAccessibilityElement,
    isInitialized 
  } = useAccessibilityStore();
  
  useEffect(() => {
    // Initialize theme and accessibility services
    const initializeServices = async () => {
      try {
        console.log('🎨 Initializing enhanced theme and accessibility services...');
        
        // Initialize theme with auto-adaptive features
        const themeCleanup = initializeTheme();
        
        // Initialize accessibility
        if (!isInitialized) {
          await initializeAccessibility();
        }
        
        // Start auto-adaptive theme checking
        checkAndUpdateTheme();
        
        console.log('✅ Enhanced theme and accessibility services initialized');
        return themeCleanup;
      } catch (error) {
        console.error('Failed to initialize accessibility services:', error);
      }
    };
    
    const cleanup = initializeServices();
    
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => cleanupFn?.());
      } else if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);
  
  // Update status bar based on theme
  useEffect(() => {
    if (Platform.OS !== 'web') {
      StatusBar.setBarStyle(
        colorScheme === 'dark' ? 'light-content' : 'dark-content',
        true
      );
      
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(
          colorScheme === 'dark' ? '#000000' : '#FFFFFF',
          true
        );
      }
    }
  }, [colorScheme]);
  
  const contextValue: AccessibilityContextType = {
    announceForAccessibility,
    focusElement: focusAccessibilityElement,
    isScreenReaderEnabled: settings.screenReaderEnabled,
    isReduceMotionEnabled: settings.reduceMotionEnabled,
    isHighContrastEnabled: settings.highContrastEnabled,
  };
  
  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};