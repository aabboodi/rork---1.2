import React, { useEffect, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { MessageCircle, Users, Wallet, User, BarChart3, Gamepad2 } from 'lucide-react-native';
import SecurityNotificationBell from '@/components/SecurityNotificationBell';
import { useThemeSafe } from '@/providers/ThemeProvider';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { APISecurityMiddleware } from '@/services/security/APISecurityMiddleware';
import { WAFService } from '@/services/security/WAFService';

export default function TabLayout() {
  const { language } = useAuthStore();
  const themeContext = useThemeSafe();
  
  // Ensure theme is available before rendering
  if (!themeContext || !themeContext.theme || !themeContext.theme.colors) {
    return (
      <React.Fragment>
        {/* Minimal placeholder to satisfy navigator while theme loads */}
      </React.Fragment>
    );
  }
  
  const { theme } = themeContext;
  const colors = theme.colors;
  const t = translations[language];
  
  // Colors are now guaranteed to be safe from useSafeThemeColors
  const safeColors = useMemo(() => {
    // Double-check colors are valid before using them
    if (!colors || typeof colors !== 'object' || !colors.background) {
      console.warn('Invalid colors in TabLayout, using fallback');
      return {
        primary: '#0066CC',
        textSecondary: '#6A6A6A',
        background: '#FFFFFF',
        border: '#D1D1D6',
        shadow: 'rgba(0, 0, 0, 0.1)',
        text: '#1A1A1A'
      };
    }
    return colors;
  }, [colors]);

  useEffect(() => {
    // Initialize route-specific security for tabs
    const timeoutId = setTimeout(() => {
      initializeTabSecurity();
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const initializeTabSecurity = async () => {
    try {
      if (Platform.OS === 'web') {
        // Initialize security services with proper error handling
        let apiMiddleware: any = null;
        let cspMiddleware: any = null;
        
        try {
          apiMiddleware = APISecurityMiddleware.getInstance();
        } catch (error) {
          return;
        }
        
        try {
          cspMiddleware = apiMiddleware?.getCSPMiddleware?.();
        } catch (error) {
          return;
        }
        
        if (!cspMiddleware || typeof cspMiddleware.addRouteConfiguration !== 'function') {
          return;
        }

        // Add custom CSP configurations for tab routes
        await cspMiddleware.addRouteConfiguration({
          route: '/tabs/chats',
          pattern: /^\/tabs\/chats$/,
          policy: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'nonce-{nonce}'"],
            'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'https:', 'blob:'],
            'connect-src': ["'self'", 'https://toolkit.rork.com', 'wss:', 'ws:'],
            'font-src': ["'self'"],
            'object-src': ["'none'"],
            'media-src': ["'self'", 'blob:', 'data:'],
            'frame-src': ["'none'"],
            'child-src': ["'none'"],
            'worker-src': ["'self'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'frame-ancestors': ["'none'"],
            'upgrade-insecure-requests': true,
            'block-all-mixed-content': true,
            'report-uri': ['/api/csp-report']
          },
          nonce: true,
          reportOnly: false,
          priority: 7,
          description: 'Chat list tab with messaging support',
          riskLevel: 'medium'
        });

        await cspMiddleware.addRouteConfiguration({
          route: '/tabs/feed',
          pattern: /^\/tabs\/feed$/,
          policy: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'nonce-{nonce}'"],
            'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'https:', 'blob:'],
            'connect-src': ["'self'", 'https://toolkit.rork.com'],
            'font-src': ["'self'"],
            'object-src': ["'none'"],
            'media-src': ["'self'", 'blob:', 'data:', 'https:'],
            'frame-src': ["'none'"],
            'child-src': ["'none'"],
            'worker-src': ["'self'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'frame-ancestors': ["'none'"],
            'upgrade-insecure-requests': true,
            'report-uri': ['/api/csp-report']
          },
          nonce: true,
          reportOnly: false,
          priority: 6,
          description: 'Social feed tab with media content',
          riskLevel: 'medium'
        });

        await cspMiddleware.addRouteConfiguration({
          route: '/tabs/wallet',
          pattern: /^\/tabs\/wallet$/,
          policy: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'nonce-{nonce}'"],
            'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:'],
            'connect-src': ["'self'", 'https://toolkit.rork.com'],
            'font-src': ["'self'"],
            'object-src': ["'none'"],
            'media-src': ["'none'"],
            'frame-src': ["'none'"],
            'child-src': ["'none'"],
            'worker-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'frame-ancestors': ["'none'"],
            'upgrade-insecure-requests': true,
            'block-all-mixed-content': true,
            'report-uri': ['/api/csp-report']
          },
          nonce: true,
          reportOnly: false,
          priority: 10,
          description: 'Financial wallet tab with strict security',
          riskLevel: 'critical'
        });

        await cspMiddleware.addRouteConfiguration({
          route: '/tabs/profile',
          pattern: /^\/tabs\/profile$/,
          policy: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'nonce-{nonce}'"],
            'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'https:', 'blob:'],
            'connect-src': ["'self'", 'https://toolkit.rork.com'],
            'font-src': ["'self'"],
            'object-src': ["'none'"],
            'media-src': ["'self'", 'blob:', 'data:'],
            'frame-src': ["'none'"],
            'child-src': ["'none'"],
            'worker-src': ["'self'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'frame-ancestors': ["'none'"],
            'upgrade-insecure-requests': true,
            'report-uri': ['/api/csp-report']
          },
          nonce: true,
          reportOnly: false,
          priority: 6,
          description: 'Profile tab with image upload support',
          riskLevel: 'medium'
        });

        await cspMiddleware.addRouteConfiguration({
          route: '/tabs/dashboard',
          pattern: /^\/tabs\/dashboard$/,
          policy: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'nonce-{nonce}'"],
            'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:'],
            'connect-src': ["'self'", 'https://toolkit.rork.com'],
            'font-src': ["'self'"],
            'object-src': ["'none'"],
            'media-src': ["'none'"],
            'frame-src': ["'none'"],
            'child-src': ["'none'"],
            'worker-src': ["'self'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'frame-ancestors': ["'none'"],
            'upgrade-insecure-requests': true,
            'block-all-mixed-content': true,
            'report-uri': ['/api/csp-report']
          },
          nonce: true,
          reportOnly: false,
          priority: 8,
          description: 'Dashboard tab with monitoring capabilities',
          riskLevel: 'high'
        });

        await cspMiddleware.addRouteConfiguration({
          route: '/tabs/games',
          pattern: /^\/tabs\/games$/,
          policy: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'nonce-{nonce}'"],
            'style-src': ["'self'", "'nonce-{nonce}'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'https://games.rork.com', 'https://cdn.rork.com', 'https://secure-games.rork.com'],
            'connect-src': ["'self'", 'https://toolkit.rork.com', 'https://games.rork.com', 'https://cdn.rork.com'],
            'font-src': ["'self'"],
            'object-src': ["'none'"],
            'media-src': ["'self'", 'https://games.rork.com', 'https://cdn.rork.com'],
            'frame-src': ['https://games.rork.com', 'https://cdn.rork.com', 'https://secure-games.rork.com'],
            'child-src': ['https://games.rork.com', 'https://cdn.rork.com', 'https://secure-games.rork.com'],
            'worker-src': ["'self'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'frame-ancestors': ["'none'"],
            'upgrade-insecure-requests': true,
            'report-uri': ['/api/csp-report']
          },
          nonce: true,
          reportOnly: false,
          priority: 5,
          description: 'Games tab with WebView sandbox for HTML5 games',
          riskLevel: 'medium'
        });

        console.log('Tab-specific CSP configurations initialized');
      }
    } catch (error) {
      console.error('Tab security initialization failed:', error);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: safeColors.primary,
        tabBarInactiveTintColor: safeColors.textSecondary,
        tabBarStyle: {
          borderTopColor: safeColors.border,
          backgroundColor: safeColors.background,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          elevation: 8,
          shadowColor: safeColors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerStyle: {
          backgroundColor: safeColors.background,
          borderBottomColor: safeColors.border,
          elevation: 4,
          shadowColor: safeColors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTitleStyle: {
          color: safeColors.text,
          fontWeight: '600',
          fontSize: 18,
        },
        headerRight: () => (
          <SecurityNotificationBell size={20} color={safeColors.text} />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        // Enhanced accessibility
        tabBarAccessibilityLabel: 'شريط التنقل',
        headerShown: false, // Let individual tabs handle their headers
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: t.chats,
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="feed"
        options={{
          title: t.social,
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="wallet"
        options={{
          title: t.wallet,
          tabBarIcon: ({ color, size }) => (
            <Wallet size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile,
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="games"
        options={{
          title: t.games,
          tabBarIcon: ({ color, size }) => (
            <Gamepad2 size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}