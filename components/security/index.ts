// Security Components Export
export { default as SecurityDashboard } from '../SecurityDashboard';
export { default as SecurityExplainer } from '../SecurityExplainer';
export { default as SecurityTooltip } from '../SecurityTooltip';
export { default as SecurityStatusIndicator } from '../SecurityStatusIndicator';
export { default as SecurityOnboarding } from '../SecurityOnboarding';
export { default as SecurityTipsCarousel } from '../SecurityTipsCarousel';
export { default as SecurityNotificationBanner, useSecurityNotifications } from '../SecurityNotificationBanner';
export { default as SecurityHealthWidget } from '../SecurityHealthWidget';
export { default as E2EESecurityDashboard } from '../E2EESecurityDashboard';
export { default as UEBADashboard } from '../UEBADashboard';
export { default as AccessControlDashboard } from '../AccessControlDashboard';

// Security Component Types
export interface SecurityFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  benefits: string[];
  howItWorks: string;
  userImpact: string;
  examples: string[];
}

export interface SecurityNotification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'security';
  title: string;
  message: string;
  action?: {
    text: string;
    onPress: () => void;
  };
  autoHide?: boolean;
  duration?: number;
}

export interface SecurityTip {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  actionText: string;
  importance: 'high' | 'medium' | 'low';
}

export interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  maxValue: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
  description: string;
}