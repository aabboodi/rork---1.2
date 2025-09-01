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

// سياق بقيم افتراضية سليمة (لا undefined) - Always provide valid theme
const ThemeContext = createContext<ThemeCtx>({
  theme: DEFAULT_LIGHT,
  setMode: () => {},
  ready: true,
  toggleTheme: () => {},
});

// Validate that DEFAULT_LIGHT is properly defined
if (!DEFAULT_LIGHT || !DEFAULT_LIGHT.colors || !DEFAULT_LIGHT.colors.background) {
  console.error('DEFAULT_LIGHT theme is not properly defined!');
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sys = useColorScheme();
  const [mode, setModeState] = useState<AppTheme['mode']>('system');
  const [ready] = useState(true); // Start as ready with defaults

  // Initialize theme from storage
  useEffect(() => {
    let isMounted = true;
    
    const initializeTheme = async () => {
      try {
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
      }
    };
    
    initializeTheme();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const theme = useMemo<AppTheme>(() => {
    try {
      const effective = mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode;
      const selectedTheme = effective === 'dark' ? DEFAULT_DARK : DEFAULT_LIGHT;
      
      // Ensure theme always has valid colors with comprehensive validation
      if (!selectedTheme || !selectedTheme.colors || !selectedTheme.colors.background) {
        console.warn('Invalid theme detected, using DEFAULT_LIGHT fallback');
        return DEFAULT_LIGHT;
      }
      
      // Additional validation for all required color properties
      const requiredColors = ['background', 'surface', 'text', 'primary', 'secondary', 'border'];
      for (const colorKey of requiredColors) {
        if (!selectedTheme.colors[colorKey as keyof typeof selectedTheme.colors]) {
          console.warn(`Missing color ${colorKey}, using DEFAULT_LIGHT fallback`);
          return DEFAULT_LIGHT;
        }
      }
      
      return selectedTheme;
    } catch (error) {
      console.error('Error computing theme:', error);
      return DEFAULT_LIGHT;
    }
  }, [mode, sys]);

  // ضبط خلفية النظام لمنع وميض أبيض/أسود
  useEffect(() => {
    let isMounted = true;
    
    const updateSystemUI = async () => {
      if (isMounted && theme?.colors?.background) {
        try {
          await SystemUI.setBackgroundColorAsync(theme.colors.background);
        } catch {
          // Silently ignore SystemUI errors
        }
      }
    };
    
    updateSystemUI();
    
    return () => {
      isMounted = false;
    };
  }, [theme?.colors?.background]);

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
    console.warn('useThemeSafe: Invalid context, returning DEFAULT_LIGHT fallback');
    return {
      theme: DEFAULT_LIGHT,
      setMode: () => {},
      ready: true,
      toggleTheme: () => {},
    };
  }
  
  // Additional safety check for theme structure
  if (!context.theme.colors || typeof context.theme.colors !== 'object') {
    console.warn('useThemeSafe: Invalid theme colors, returning DEFAULT_LIGHT fallback');
    return {
      theme: DEFAULT_LIGHT,
      setMode: () => {},
      ready: true,
      toggleTheme: () => {},
    };
  }
  
  return context;
}