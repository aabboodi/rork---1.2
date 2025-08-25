import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { AppTheme, DEFAULT_LIGHT, DEFAULT_DARK } from '../constants/theme';

// واجهة السياق
type ThemeCtx = {
  theme: AppTheme;
  setMode: (m: AppTheme['mode']) => void;
  ready: boolean;
};

// سياق بقيم افتراضية سليمة (لا undefined)
const ThemeContext = createContext<ThemeCtx>({
  theme: DEFAULT_LIGHT,
  setMode: () => {},
  ready: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sys = useColorScheme();
  const [mode, setMode] = useState<AppTheme['mode']>('system');
  const [ready] = useState(true); // لو لديك Persist حقيقي، ابدأ بـ false ثم setReady(true) بعد التحميل.

  const theme = useMemo<AppTheme>(() => {
    const effective = mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode;
    return effective === 'dark' ? DEFAULT_DARK : DEFAULT_LIGHT;
  }, [mode, sys]);

  // ضبط خلفية النظام لمنع وميض أبيض/أسود
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
  }, [theme.colors.background]);

  const value = useMemo(() => ({ theme, setMode, ready }), [theme, setMode, ready]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// هوك آمن لا يُرجع undefined أبدًا
export function useThemeSafe() {
  return useContext(ThemeContext); // دائمًا يحوي DEFAULT_* حتى أثناء التحميل
}