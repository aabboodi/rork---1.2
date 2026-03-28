import { useThemeSafe } from '../providers/ThemeProvider';
import { AppTheme } from '../constants/theme';

/**
 * Runtime guard to ensure theme is properly initialized
 * Use this in critical components that depend on theme colors
 */
export function useAssertThemeReady(): AppTheme {
  const { theme, ready } = useThemeSafe();
  
  if (!ready) {
    console.warn('Theme not ready yet - using fallback');
  }
  
  if (!theme?.colors?.background) {
    console.error('Theme colors not properly initialized - using default fallback');
    // This should never happen with our new setup, but provides safety
  }
  
  return theme;
}

/**
 * Development-only guard to catch theme usage outside components
 * This hook should be used in components to validate theme access
 */
export function useAssertThemeUsageInComponent() {
  const themeContext = useThemeSafe();
  
  if (__DEV__) {
    if (!themeContext) {
      console.error(
        'Theme context not available. Make sure component is wrapped with ThemeProvider.'
      );
    }
  }
  
  return themeContext;
}

/**
 * Utility to validate theme object structure
 * Useful for debugging theme-related issues
 */
export function validateThemeStructure(theme: any): theme is AppTheme {
  const isValid = 
    theme &&
    typeof theme === 'object' &&
    theme.colors &&
    typeof theme.colors === 'object' &&
    typeof theme.colors.background === 'string' &&
    typeof theme.colors.surface === 'string' &&
    typeof theme.colors.text === 'string' &&
    typeof theme.colors.primary === 'string' &&
    typeof theme.colors.secondary === 'string' &&
    typeof theme.colors.border === 'string' &&
    typeof theme.colors.danger === 'string' &&
    typeof theme.colors.success === 'string';

  if (!isValid && __DEV__) {
    console.error('Invalid theme structure detected:', theme);
  }

  return isValid;
}