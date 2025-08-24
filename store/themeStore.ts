import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName, Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ColorScheme = 'light' | 'dark';
export type AdaptiveMode = 'system' | 'time' | 'location' | 'manual';
export type TimeBasedTheme = {
  enabled: boolean;
  lightStart: string; // HH:MM format
  darkStart: string; // HH:MM format
};

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceSecondary: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Border and divider colors
  border: string;
  borderLight: string;
  divider: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Interactive colors
  accent: string;
  link: string;
  disabled: string;
  placeholder: string;
  
  // Overlay colors
  overlay: string;
  modal: string;
  
  // Security colors
  secure: string;
  encrypted: string;
  verified: string;
  pending: string;
  failed: string;
  
  // Shadow colors
  shadow: string;
  shadowLight: string;
}

interface ThemeState {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  colors: ThemeColors;
  adaptiveMode: AdaptiveMode;
  timeBasedTheme: TimeBasedTheme;
  isAutoAdaptive: boolean;
  lastSystemCheck: number;
  
  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  updateColorScheme: (scheme: ColorScheme) => void;
  initializeTheme: () => void;
  setAdaptiveMode: (mode: AdaptiveMode) => void;
  updateTimeBasedTheme: (config: Partial<TimeBasedTheme>) => void;
  enableAutoAdaptive: (enabled: boolean) => void;
  checkAndUpdateTheme: () => void;
  getThemeRecommendation: () => Promise<ColorScheme>;
}

// Light theme colors with enhanced contrast ratios (≥4.5:1)
const lightColors: ThemeColors = {
  primary: '#0066CC', // Enhanced contrast from #007AFF
  primaryLight: '#4DA3FF',
  primaryDark: '#004499', // Darker for better contrast
  secondary: '#E3F2FD',
  secondaryLight: '#F5F9FF',
  secondaryDark: '#BBDEFB',
  
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8F9FA',
  
  text: '#1A1A1A', // Enhanced contrast from pure black
  textSecondary: '#4A4A4A', // Enhanced contrast from #6D6D80
  textTertiary: '#6A6A6A', // Enhanced contrast from #8E8E93
  textInverse: '#FFFFFF',
  
  border: '#D1D1D6', // Enhanced contrast
  borderLight: '#E5E5EA',
  divider: '#D1D1D6',
  
  success: '#28A745', // Enhanced contrast
  warning: '#DC6C00', // Enhanced contrast from #FF9500
  error: '#DC3545', // Enhanced contrast from #FF3B30
  info: '#0066CC',
  
  accent: '#E55100', // Enhanced contrast from #FF6B35
  link: '#0066CC',
  disabled: '#999999', // Enhanced contrast
  placeholder: '#757575', // Enhanced contrast
  
  overlay: 'rgba(0, 0, 0, 0.4)',
  modal: 'rgba(0, 0, 0, 0.5)',
  
  secure: '#00A040', // Enhanced contrast
  encrypted: '#1976D2', // Enhanced contrast
  verified: '#388E3C', // Enhanced contrast
  pending: '#F57C00', // Enhanced contrast
  failed: '#D32F2F', // Enhanced contrast
  
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowLight: 'rgba(0, 0, 0, 0.05)',
};

// Dark theme colors with enhanced contrast ratios (≥4.5:1)
const darkColors: ThemeColors = {
  primary: '#409CFF', // Enhanced contrast from #0A84FF
  primaryLight: '#66B3FF',
  primaryDark: '#1976D2',
  secondary: '#1C2128',
  secondaryLight: '#2D3748',
  secondaryDark: '#0D1117',
  
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  backgroundTertiary: '#2C2C2E',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  
  text: '#FFFFFF',
  textSecondary: '#E0E0E0', // Enhanced contrast from #AEAEB2
  textTertiary: '#BDBDBD', // Enhanced contrast from #8E8E93
  textInverse: '#000000',
  
  border: '#4A4A4A', // Enhanced contrast from #38383A
  borderLight: '#5A5A5A', // Enhanced contrast
  divider: '#4A4A4A',
  
  success: '#4CAF50', // Enhanced contrast
  warning: '#FF9800', // Enhanced contrast
  error: '#F44336', // Enhanced contrast
  info: '#2196F3', // Enhanced contrast
  
  accent: '#FF7043', // Enhanced contrast
  link: '#409CFF',
  disabled: '#757575', // Enhanced contrast
  placeholder: '#9E9E9E', // Enhanced contrast
  
  overlay: 'rgba(0, 0, 0, 0.6)',
  modal: 'rgba(0, 0, 0, 0.8)',
  
  secure: '#4CAF50',
  encrypted: '#2196F3',
  verified: '#4CAF50',
  pending: '#FF9800',
  failed: '#F44336',
  
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowLight: 'rgba(0, 0, 0, 0.2)',
};

const getColorsForScheme = (scheme: ColorScheme): ThemeColors => {
  return scheme === 'dark' ? darkColors : lightColors;
};

const getSystemColorScheme = (): ColorScheme => {
  const systemScheme = Appearance.getColorScheme();
  return systemScheme === 'dark' ? 'dark' : 'light';
};

const getTimeBasedTheme = (timeConfig: TimeBasedTheme): ColorScheme => {
  if (!timeConfig.enabled) return getSystemColorScheme();
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const [lightHour, lightMin] = timeConfig.lightStart.split(':').map(Number);
  const [darkHour, darkMin] = timeConfig.darkStart.split(':').map(Number);
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const lightStartMinutes = lightHour * 60 + lightMin;
  const darkStartMinutes = darkHour * 60 + darkMin;
  
  if (lightStartMinutes < darkStartMinutes) {
    // Normal day cycle (e.g., light at 06:00, dark at 18:00)
    return currentMinutes >= lightStartMinutes && currentMinutes < darkStartMinutes ? 'light' : 'dark';
  } else {
    // Overnight cycle (e.g., light at 22:00, dark at 06:00)
    return currentMinutes >= lightStartMinutes || currentMinutes < darkStartMinutes ? 'light' : 'dark';
  }
};

const getLocationBasedTheme = async (): Promise<ColorScheme> => {
  // In a real app, this would use location and sunrise/sunset APIs
  // For now, we'll simulate based on time zones
  try {
    const now = new Date();
    const hour = now.getHours();
    
    // Simple heuristic: dark theme between 6 PM and 6 AM
    return (hour >= 18 || hour < 6) ? 'dark' : 'light';
  } catch (error) {
    console.warn('Location-based theme detection failed:', error);
    return getSystemColorScheme();
  }
};

const getAdaptiveTheme = async (mode: AdaptiveMode, timeConfig: TimeBasedTheme): Promise<ColorScheme> => {
  switch (mode) {
    case 'system':
      return getSystemColorScheme();
    case 'time':
      return getTimeBasedTheme(timeConfig);
    case 'location':
      return await getLocationBasedTheme();
    case 'manual':
    default:
      return getSystemColorScheme();
  }
};

// Create a safe getter for colors that always returns valid colors
const getSafeColors = (scheme?: ColorScheme): ThemeColors => {
  try {
    return getColorsForScheme(scheme || getSystemColorScheme());
  } catch (error) {
    console.warn('Failed to get colors, using light theme fallback:', error);
    return lightColors;
  }
};

// Hook to safely get theme colors with fallback
export const useThemeColors = () => {
  try {
    const store = useThemeStore();
    // Always ensure we have valid colors
    if (!store || !store.colors || typeof store.colors !== 'object' || !store.colors?.background) {
      return getSafeColors();
    }
    return store.colors;
  } catch (error) {
    return getSafeColors();
  }
};

// Safe hook that never returns undefined colors
export const useSafeThemeColors = (): ThemeColors => {
  try {
    const store = useThemeStore();
    if (!store || !store.colors || typeof store.colors !== 'object' || !store.colors?.background) {
      return getSafeColors();
    }
    return store.colors;
  } catch (error) {
    return getSafeColors();
  }
};

// Hook to safely get color scheme with fallback
export const useColorScheme = () => {
  try {
    const store = useThemeStore();
    if (!store || !store.colorScheme) {
      return getSystemColorScheme();
    }
    return store.colorScheme;
  } catch (error) {
    console.warn('Error accessing color scheme, using fallback:', error);
    return getSystemColorScheme();
  }
};

// Initialize with safe defaults immediately
const initialColorScheme = getSystemColorScheme();
const initialColors = getSafeColors(initialColorScheme);

// Ensure colors are always valid
const ensureValidColors = (colors: any): ThemeColors => {
  if (!colors || typeof colors !== 'object' || !colors.background) {
    console.warn('Invalid colors detected, using safe fallback');
    return getSafeColors();
  }
  return colors;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'auto',
      colorScheme: initialColorScheme,
      colors: initialColors,
      adaptiveMode: 'system',
      timeBasedTheme: {
        enabled: false,
        lightStart: '06:00',
        darkStart: '18:00'
      },
      isAutoAdaptive: true,
      lastSystemCheck: 0,
      
      setThemeMode: (mode: ThemeMode) => {
        const newColorScheme = mode === 'auto' ? getSystemColorScheme() : mode as ColorScheme;
        set({
          mode,
          colorScheme: newColorScheme,
          colors: getSafeColors(newColorScheme),
        });
      },
      
      toggleTheme: () => {
        const { mode } = get();
        if (mode === 'auto') {
          set({
            mode: 'light',
            colorScheme: 'light',
            colors: getSafeColors('light'),
          });
        } else if (mode === 'light') {
          set({
            mode: 'dark',
            colorScheme: 'dark',
            colors: getSafeColors('dark'),
          });
        } else {
          set({
            mode: 'auto',
            colorScheme: getSystemColorScheme(),
            colors: getSafeColors(getSystemColorScheme()),
          });
        }
      },
      
      updateColorScheme: (scheme: ColorScheme) => {
        set({
          colorScheme: scheme,
          colors: getSafeColors(scheme),
        });
      },
      
      initializeTheme: () => {
        try {
          // Ensure colors are always set first with safe fallback
          const currentState = get();
          const currentScheme = currentState.colorScheme || getSystemColorScheme();
          const safeColors = getSafeColors(currentScheme);
          
          // Always ensure colors are set and valid immediately
          set({
            colorScheme: currentScheme,
            colors: safeColors,
          });
          
          // Return cleanup function immediately to prevent state update during render
          let subscription: any = null;
          let intervalId: any = null;
          let timeoutId: any = null;
          
          // Defer all async operations to avoid state updates during render
          timeoutId = setTimeout(() => {
            try {
              const state = get();
              const { mode, isAutoAdaptive } = state;
              
              // Initialize theme based on current settings
              if (mode === 'auto' && isAutoAdaptive) {
                get().checkAndUpdateTheme();
              } else if (mode === 'auto') {
                const systemScheme = getSystemColorScheme();
                // Only update if scheme actually changed
                if (get().colorScheme !== systemScheme) {
                  set({
                    colorScheme: systemScheme,
                    colors: getSafeColors(systemScheme),
                  });
                }
              }
              
              // Listen for system theme changes
              subscription = Appearance.addChangeListener(({ colorScheme }) => {
                try {
                  const currentState = get();
                  const { mode, isAutoAdaptive, adaptiveMode } = currentState;
                  if (mode === 'auto' && (!isAutoAdaptive || adaptiveMode === 'system')) {
                    const newScheme = colorScheme === 'dark' ? 'dark' : 'light';
                    // Only update if scheme actually changed
                    if (currentState.colorScheme !== newScheme) {
                      set({
                        colorScheme: newScheme,
                        colors: getSafeColors(newScheme),
                      });
                    }
                  }
                } catch (error) {
                  // Silent error handling
                }
              });
              
              // Set up periodic theme checking for auto-adaptive modes
              intervalId = setInterval(() => {
                try {
                  const currentState = get();
                  const { mode, isAutoAdaptive } = currentState;
                  if (mode === 'auto' && isAutoAdaptive) {
                    get().checkAndUpdateTheme();
                  }
                } catch (error) {
                  // Silent error handling
                }
              }, 60000); // Check every minute
              
            } catch (error) {
              // Silent error handling
            }
          }, 0); // Immediate execution to avoid render blocking
          
          return () => {
            try {
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              if (subscription?.remove) {
                subscription.remove();
              }
              if (intervalId) {
                clearInterval(intervalId);
              }
            } catch (error) {
              // Silent cleanup error handling
            }
          };
        } catch (error) {
          // Ensure we always have colors even on error
          const fallbackScheme = getSystemColorScheme();
          const fallbackColors = getSafeColors(fallbackScheme);
          set({
            colorScheme: fallbackScheme,
            colors: fallbackColors,
          });
          // Return a no-op cleanup function on error
          return () => {};
        }
      },
      
      setAdaptiveMode: (mode: AdaptiveMode) => {
        set({ adaptiveMode: mode });
        // Immediately update theme if in auto mode
        const { mode: themeMode, isAutoAdaptive } = get();
        if (themeMode === 'auto' && isAutoAdaptive) {
          get().checkAndUpdateTheme();
        }
      },
      
      updateTimeBasedTheme: (config: Partial<TimeBasedTheme>) => {
        const { timeBasedTheme } = get();
        const newConfig = { ...timeBasedTheme, ...config };
        set({ timeBasedTheme: newConfig });
        
        // Update theme if time-based mode is active
        const { mode, isAutoAdaptive, adaptiveMode } = get();
        if (mode === 'auto' && isAutoAdaptive && adaptiveMode === 'time') {
          get().checkAndUpdateTheme();
        }
      },
      
      enableAutoAdaptive: (enabled: boolean) => {
        set({ isAutoAdaptive: enabled });
        
        // Update theme immediately based on new setting
        const { mode } = get();
        if (mode === 'auto') {
          if (enabled) {
            get().checkAndUpdateTheme();
          } else {
            // Fall back to system theme
            const systemScheme = getSystemColorScheme();
            set({
              colorScheme: systemScheme,
              colors: getSafeColors(systemScheme),
            });
          }
        }
      },
      
      checkAndUpdateTheme: async () => {
        try {
          const { mode, isAutoAdaptive, adaptiveMode, timeBasedTheme, lastSystemCheck } = get();
          
          if (mode !== 'auto' || !isAutoAdaptive) return;
          
          // Throttle checks to avoid excessive updates
          const now = Date.now();
          if (now - lastSystemCheck < 30000) return; // 30 seconds throttle
          
          const recommendedScheme = await getAdaptiveTheme(adaptiveMode, timeBasedTheme);
          const { colorScheme: currentScheme } = get();
          
          if (recommendedScheme !== currentScheme) {
            set({
              colorScheme: recommendedScheme,
              colors: getSafeColors(recommendedScheme),
              lastSystemCheck: now
            });
            
            console.log(`🎨 Auto-adaptive theme changed to ${recommendedScheme} (mode: ${adaptiveMode})`);
          } else {
            set({ lastSystemCheck: now });
          }
        } catch (error) {
          console.error('Auto-adaptive theme update failed:', error);
          // Fall back to system theme on error
          const systemScheme = getSystemColorScheme();
          const now = Date.now();
          set({
            colorScheme: systemScheme,
            colors: getSafeColors(systemScheme),
            lastSystemCheck: now
          });
        }
      },
      
      getThemeRecommendation: async (): Promise<ColorScheme> => {
        const { adaptiveMode, timeBasedTheme } = get();
        return await getAdaptiveTheme(adaptiveMode, timeBasedTheme);
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        mode: state.mode,
        adaptiveMode: state.adaptiveMode,
        timeBasedTheme: state.timeBasedTheme,
        isAutoAdaptive: state.isAutoAdaptive
      }),
    }
  )
);