// constants/theme.ts
export type AppColors = {
  background: string;
  surface: string;
  text: string;
  primary: string;
  secondary: string;
  border: string;
  danger: string;
  success: string;
  textSecondary: string;
  warning: string;
  error: string;
  info: string;
  accent: string;
  link: string;
  disabled: string;
  placeholder: string;
  overlay: string;
  modal: string;
  secure: string;
  encrypted: string;
  verified: string;
  pending: string;
  failed: string;
  shadow: string;
  shadowLight: string;
  primaryLight: string;
  primaryDark: string;
  secondaryLight: string;
  secondaryDark: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surfaceSecondary: string;
  textTertiary: string;
  textInverse: string;
  borderLight: string;
  divider: string;
};

export type AppTheme = {
  mode: 'light'|'dark'|'system';
  colors: AppColors;
};

export const DEFAULT_LIGHT: AppTheme = {
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

export const DEFAULT_DARK: AppTheme = {
  mode: 'dark',
  colors: {
    background: '#0B0F14',
    surface: '#0F172A',
    text: '#E5E7EB',
    primary: '#6366F1',
    secondary: '#22D3EE',
    border: '#1F2937',
    danger: '#F87171',
    success: '#34D399',
    textSecondary: '#9CA3AF',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    accent: '#A78BFA',
    link: '#60A5FA',
    disabled: '#6B7280',
    placeholder: '#6B7280',
    overlay: 'rgba(0, 0, 0, 0.6)',
    modal: 'rgba(0, 0, 0, 0.8)',
    secure: '#34D399',
    encrypted: '#60A5FA',
    verified: '#34D399',
    pending: '#FBBF24',
    failed: '#F87171',
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowLight: 'rgba(0, 0, 0, 0.2)',
    primaryLight: '#818CF8',
    primaryDark: '#4338CA',
    secondaryLight: '#67E8F9',
    secondaryDark: '#0891B2',
    backgroundSecondary: '#1F2937',
    backgroundTertiary: '#374151',
    surfaceSecondary: '#1F2937',
    textTertiary: '#6B7280',
    textInverse: '#111827',
    borderLight: '#374151',
    divider: '#1F2937',
  },
};

// Validate that themes are properly defined at module load time
if (!DEFAULT_LIGHT || !DEFAULT_LIGHT.colors || !DEFAULT_LIGHT.colors.background) {
  console.error('DEFAULT_LIGHT theme is not properly defined!', DEFAULT_LIGHT);
  // Don't throw error, just log it to prevent app crashes
}

if (!DEFAULT_DARK || !DEFAULT_DARK.colors || !DEFAULT_DARK.colors.background) {
  console.error('DEFAULT_DARK theme is not properly defined!', DEFAULT_DARK);
  // Don't throw error, just log it to prevent app crashes
}

// لا تصدّر أي شيء يقرأ من Zustand هنا. هذا الملف يجب يبقى نقيًا من الاعتمادات.