import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { StatusBar, Platform } from 'react-native';
import { useColorScheme } from '@/store/themeStore';
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
  const colorScheme = useColorScheme();
  const { 
    settings, 
    initializeAccessibility, 
    announceForAccessibility, 
    focusAccessibilityElement,
    isInitialized 
  } = useAccessibilityStore();
  
  useEffect(() => {
    // Initialize accessibility services only (theme is initialized in _layout.tsx)
    let timeoutId: NodeJS.Timeout | null = null;
    let rafId: number | null = null;
    
    const initializeServices = () => {
      try {
        console.log('🔍 Initializing Accessibility Service...');
        
        // Initialize accessibility only if not already initialized
        if (!isInitialized) {
          // Use requestAnimationFrame + setTimeout to avoid state updates during render
          rafId = requestAnimationFrame(() => {
            timeoutId = setTimeout(async () => {
              try {
                await initializeAccessibility();
                console.log('✅ Accessibility Service initialized:', settings);
              } catch (error) {
                console.error('Failed to initialize accessibility services:', error);
              }
            }, 150); // Longer delay to ensure component is fully mounted
          });
        } else {
          console.log('✅ Accessibility Service already initialized:', settings);
        }
      } catch (error) {
        console.error('Failed to initialize accessibility services:', error);
      }
    };
    
    initializeServices();
    
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [isInitialized, initializeAccessibility]);
  
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