import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { AppTheme, DEFAULT_LIGHT, DEFAULT_DARK } from '../constants/theme';

// واجهة السياق
type ThemeCtx = {
  theme: AppTheme;
  setMode: (m: AppTheme['mode']) => void;
  ready: boolean;
  toggleTheme: () => void;
};

// Create a safe fallback theme that's guaranteed to have all required properties
const SAFE_FALLBACK_THEME: AppTheme = {
  mode: 'light',
  colors: {
    background: '#FFFFFF',
    surface: '#F7F7F8',
    text: '#111827',
    primary: '#4F46E5',
    secondary: '#06B6D4',
    border: '#E5E7EB',
    danger: '#DC2626',
    success: '#16A34A',
    textSecondary: '#6B7280',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    accent: '#8B5CF6',
    link: '#2563EB',
    disabled: '#9CA3AF',
    placeholder: '#9CA3AF',
    overlay: 'rgba(0, 0, 0, 0.4)',
    modal: 'rgba(0, 0, 0, 0.5)',
    secure: '#10B981',
    encrypted: '#3B82F6',
    verified: '#10B981',
    pending: '#F59E0B',
    failed: '#EF4444',
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowLight: 'rgba(0, 0, 0, 0.05)',
    primaryLight: '#818CF8',
    primaryDark: '#3730A3',
    secondaryLight: '#67E8F9',
    secondaryDark: '#0891B2',
    backgroundSecondary: '#F9FAFB',
    backgroundTertiary: '#F3F4F6',
    surfaceSecondary: '#F9FAFB',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',
    borderLight: '#F3F4F6',
    divider: '#E5E7EB',
  },
};

// Validate that DEFAULT_LIGHT is properly defined
if (!DEFAULT_LIGHT || !DEFAULT_LIGHT.colors || !DEFAULT_LIGHT.colors.background) {
  console.error('DEFAULT_LIGHT theme is not properly defined!');
}

// سياق بقيم افتراضية سليمة (لا undefined) - Always provide valid theme
const ThemeContext = createContext<ThemeCtx>({
  theme: SAFE_FALLBACK_THEME,
  setMode: () => {},
  ready: true,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sys = useColorScheme();
  const [mode, setModeState] = useState<AppTheme['mode']>('system');
  const [ready, setReady] = useState(true); // Start as ready with default theme to prevent undefined errors
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  // Initialize theme from storage
  useEffect(() => {
    let isMounted = true;
    
    const initializeTheme = async () => {
      if (isInitializing) return; // Prevent multiple initializations
      
      try {
        setIsInitializing(true);
        // Try to get persisted theme mode from AsyncStorage
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        const storedMode = await AsyncStorage.default.getItem('theme-mode');
        if (isMounted && storedMode && ['light', 'dark', 'system'].includes(storedMode)) {
          setModeState(storedMode as AppTheme['mode']);
        }
      } catch (error) {
        console.warn('Failed to load theme from storage:', error);
        // Ensure we always have a valid mode even if storage fails
        if (isMounted) {
          setModeState('system');
        }
      } finally {
        // Theme is already ready with defaults, just ensure it stays ready
        if (isMounted) {
          setReady(true);
          setIsInitializing(false);
        }
      }
    };
    
    // Only initialize once
    if (!isInitializing) {
      initializeTheme();
    }
    
    return () => {
      isMounted = false;
    };
  }, [isInitializing]);

  const theme = useMemo<AppTheme>(() => {
    try {
      // Always ensure we have a valid fallback first
      if (!isMounted) {
        return SAFE_FALLBACK_THEME;
      }
      
      const effective = mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode;
      let selectedTheme;
      
      // Safely get the theme with fallback
      try {
        selectedTheme = effective === 'dark' ? DEFAULT_DARK : DEFAULT_LIGHT;
      } catch (themeError) {
        console.warn('Error accessing theme constants, using fallback:', themeError);
        return SAFE_FALLBACK_THEME;
      }
      
      // Ensure theme always has valid colors with comprehensive validation
      if (!selectedTheme || !selectedTheme.colors || !selectedTheme.colors.background) {
        console.warn('Invalid theme detected, using SAFE_FALLBACK_THEME');
        return SAFE_FALLBACK_THEME;
      }
      
      // Additional validation for all required color properties
      const requiredColors = ['background', 'surface', 'text', 'primary', 'secondary', 'border', 'textSecondary', 'warning', 'error', 'success', 'textInverse'];
      for (const colorKey of requiredColors) {
        if (!selectedTheme.colors[colorKey as keyof typeof selectedTheme.colors]) {
          console.warn(`Missing color ${colorKey}, using SAFE_FALLBACK_THEME`);
          return SAFE_FALLBACK_THEME;
        }
      }
      
      return selectedTheme;
    } catch (error) {
      console.error('Error computing theme:', error);
      return SAFE_FALLBACK_THEME;
    }
  }, [mode, sys, isMounted]);
  
  // Handle error state separately to avoid state updates during render
  useEffect(() => {
    if (!theme || !theme.colors || !theme.colors.background) {
      setInitError('Theme validation failed - using fallback');
    } else if (initError) {
      setInitError(null);
    }
  }, [theme, initError]);

  // ضبط خلفية النظام لمنع وميض أبيض/أسود
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const updateSystemUI = async () => {
      // Only update if component is mounted, theme is ready, and background color exists
      if (isMounted && ready && theme?.colors?.background && !isInitializing) {
        try {
          // Add a small delay to ensure the theme is fully initialized
          timeoutId = setTimeout(async () => {
            if (isMounted && theme?.colors?.background) {
              await SystemUI.setBackgroundColorAsync(theme.colors.background);
            }
          }, 100);
        } catch {
          // Silently ignore SystemUI errors
        }
      }
    };
    
    updateSystemUI();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [theme?.colors?.background, ready, isInitializing]);

  const setMode = useCallback(async (newMode: AppTheme['mode']) => {
    try {
      setModeState(newMode);
      // Persist to storage
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem('theme-mode', newMode);
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    if (mode === 'system') {
      setMode('light');
    } else if (mode === 'light') {
      setMode('dark');
    } else {
      setMode('system');
    }
  }, [mode, setMode]);

  const value = useMemo(() => ({ theme, setMode, ready, toggleTheme }), [theme, setMode, ready, toggleTheme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// هوك آمن لا يُرجع undefined أبدًا
export function useThemeSafe() {
  const context = useContext(ThemeContext);
  
  // Always ensure we have a valid theme with comprehensive checks
  if (!context || !context.theme || !context.theme.colors || !context.theme.colors.background) {
    console.warn('useThemeSafe: Invalid context, returning SAFE_FALLBACK_THEME');
    return {
      theme: SAFE_FALLBACK_THEME,
      setMode: () => {},
      ready: false, // Not ready if we're using fallback
      toggleTheme: () => {},
    };
  }
  
  // Additional safety check for theme structure
  if (!context.theme.colors || typeof context.theme.colors !== 'object') {
    console.warn('useThemeSafe: Invalid theme colors, returning SAFE_FALLBACK_THEME');
    return {
      theme: SAFE_FALLBACK_THEME,
      setMode: () => {},
      ready: true,
      toggleTheme: () => {},
    };
  }
  
  // Validate critical color properties exist
  const criticalColors = ['background', 'text', 'primary'];
  for (const colorKey of criticalColors) {
    if (!context.theme.colors[colorKey as keyof typeof context.theme.colors]) {
      console.warn(`useThemeSafe: Missing critical color ${colorKey}, returning SAFE_FALLBACK_THEME`);
      return {
        theme: SAFE_FALLBACK_THEME,
        setMode: () => {},
        ready: true,
        toggleTheme: () => {},
      };
    }
  }
  
  return context;
}

// Export a hook that provides theme colors with guaranteed fallbacks
export function useThemeColors() {
  const { theme } = useThemeSafe();
  
  // Return theme colors with additional safety checks
  return React.useMemo(() => {
    const colors = theme?.colors || SAFE_FALLBACK_THEME.colors;
    
    // Ensure all colors have fallback values
    return {
      background: colors.background || '#FFFFFF',
      surface: colors.surface || '#F7F7F8',
      text: colors.text || '#111827',
      primary: colors.primary || '#4F46E5',
      secondary: colors.secondary || '#06B6D4',
      border: colors.border || '#E5E7EB',
      textSecondary: colors.textSecondary || '#6B7280',
      warning: colors.warning || '#F59E0B',
      error: colors.error || '#EF4444',
      success: colors.success || '#16A34A',
      textInverse: colors.textInverse || '#FFFFFF',
      ...colors, // Include all other colors
    };
  }, [theme]);
}