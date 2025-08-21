import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { MessageCircle, Users, Wallet, User, BarChart3, Brain } from 'lucide-react-native';
import SecurityNotificationBell from '@/components/SecurityNotificationBell';
import { useThemeStore } from '@/store/themeStore';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { APISecurityMiddleware } from '@/services/security/APISecurityMiddleware';
import { WAFService } from '@/services/security/WAFService';

export default function TabLayout() {
  const { language } = useAuthStore();
  const { colors } = useThemeStore();
  const t = translations[language];

  useEffect(() => {
    // Initialize route-specific security for tabs
    initializeTabSecurity();
  }, []);

  const initializeTabSecurity = async () => {
    try {
      if (Platform.OS === 'web') {
        const apiMiddleware = APISecurityMiddleware.getInstance();
        const wafService = WAFService.getInstance();
        const cspMiddleware = apiMiddleware.getCSPMiddleware();

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

        console.log('Tab-specific CSP configurations initialized');
      }
    } catch (error) {
      console.error('Tab security initialization failed:', error);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          elevation: 4,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '600',
          fontSize: 18,
        },
        headerRight: () => (
          <SecurityNotificationBell size={20} color={colors.text} />
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
        name="edge-ai"
        options={{
          title: 'Edge AI',
          tabBarIcon: ({ color, size }) => (
            <Brain size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}