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

// سياق بقيم افتراضية سليمة (لا undefined)
const ThemeContext = createContext<ThemeCtx>({
  theme: DEFAULT_LIGHT,
  setMode: () => {},
  ready: true,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sys = useColorScheme();
  const [mode, setModeState] = useState<AppTheme['mode']>('system');
  const [ready, setReady] = useState(true); // Start as ready with defaults

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
    const effective = mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode;
    const selectedTheme = effective === 'dark' ? DEFAULT_DARK : DEFAULT_LIGHT;
    
    // Ensure theme always has valid colors
    if (!selectedTheme || !selectedTheme.colors || !selectedTheme.colors.background) {
      console.warn('Invalid theme detected, using DEFAULT_LIGHT fallback');
      return DEFAULT_LIGHT;
    }
    
    return selectedTheme;
  }, [mode, sys]);

  // ضبط خلفية النظام لمنع وميض أبيض/أسود
  useEffect(() => {
    if (theme?.colors?.background) {
      SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
    }
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
  
  // Always ensure we have a valid theme
  if (!context || !context.theme || !context.theme.colors || !context.theme.colors.background) {
    console.warn('useThemeSafe: Invalid context, returning DEFAULT_LIGHT fallback');
    return {
      theme: DEFAULT_LIGHT,
      setMode: () => {},
      ready: true,
      toggleTheme: () => {},
    };
  }
  
  return context;
}