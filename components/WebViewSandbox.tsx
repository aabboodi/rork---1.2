import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform, Alert, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useThemeStore } from '@/store/themeStore';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import AnimatedLoader from './AnimatedLoader';
import { AlertTriangle, WifiOff } from 'lucide-react-native';

export interface GameMetadata {
  id: string;
  name: string;
  url: string;
  category: string;
  thumbnail?: string;
  description?: string;
  version?: string;
  developer?: string;
  rating?: number;
  size?: number;
  lastUpdated?: string;
}

interface WebViewSandboxProps {
  game: GameMetadata;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  onMessage?: (message: any) => void;
  testId?: string;
}

const ALLOWED_ORIGINS = [
  'https://games.rork.com',
  'https://cdn.rork.com',
  'https://secure-games.rork.com',
  // Add more trusted CDN origins here
];

const BLOCKED_DOMAINS = [
  'ads.',
  'analytics.',
  'tracking.',
  'facebook.com',
  'google-analytics.com',
  'doubleclick.net',
];

export default function WebViewSandbox({
  game,
  onLoadStart,
  onLoadEnd,
  onError,
  onMessage,
  testId = 'webview-sandbox'
}: WebViewSandboxProps) {
  const { colors } = useThemeStore();
  const { language } = useAuthStore();
  const t = translations[language];
  const webViewRef = useRef<WebView>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<number>(0);

  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadStartTime: 0,
    loadEndTime: 0,
    memoryUsage: 0,
    crashCount: 0
  });
  
  // Use performance metrics for logging
  useEffect(() => {
    if (performanceMetrics.loadEndTime > 0) {
      const loadTime = performanceMetrics.loadEndTime - performanceMetrics.loadStartTime;
      console.log(`📊 Game ${game.name} loaded in ${loadTime}ms`);
    }
  }, [performanceMetrics, game.name]);

  useEffect(() => {
    // Monitor network connectivity
    if (Platform.OS === 'web') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const validateGameUrl = useCallback((url: string): boolean => {
    try {
      const gameUrl = new URL(url);
      
      // Check if origin is in allowed list
      const isAllowedOrigin = ALLOWED_ORIGINS.some(origin => 
        gameUrl.origin === origin || gameUrl.hostname.endsWith(origin.replace('https://', ''))
      );
      
      if (!isAllowedOrigin) {
        console.warn(`🚫 Game URL not in allowed origins: ${url}`);
        return false;
      }
      
      // Check for blocked domains
      const isBlockedDomain = BLOCKED_DOMAINS.some(blocked => 
        gameUrl.hostname.includes(blocked)
      );
      
      if (isBlockedDomain) {
        console.warn(`🚫 Game URL contains blocked domain: ${url}`);
        return false;
      }
      
      // Ensure HTTPS
      if (gameUrl.protocol !== 'https:') {
        console.warn(`🚫 Game URL must use HTTPS: ${url}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Invalid game URL:', error);
      return false;
    }
  }, []);

  const handleLoadStart = useCallback(() => {
    console.log(`🎮 Loading game: ${game.name}`);
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setLoadProgress(0);
    
    const startTime = Date.now();
    setPerformanceMetrics(prev => ({ ...prev, loadStartTime: startTime }));
    
    onLoadStart?.();
  }, [game.name, onLoadStart]);

  const handleLoadEnd = useCallback(() => {
    console.log(`✅ Game loaded successfully: ${game.name}`);
    setIsLoading(false);
    setLoadProgress(100);
    
    const endTime = Date.now();
    setPerformanceMetrics(prev => ({ 
      ...prev, 
      loadEndTime: endTime,
      memoryUsage: Platform.OS === 'web' ? (performance as any)?.memory?.usedJSHeapSize || 0 : 0
    }));
    
    onLoadEnd?.();
  }, [game.name, onLoadEnd]);

  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error(`❌ Game load error for ${game.name}:`, nativeEvent);
    
    setIsLoading(false);
    setHasError(true);
    setErrorMessage(nativeEvent.description || t.gameError);
    
    setPerformanceMetrics(prev => ({ ...prev, crashCount: prev.crashCount + 1 }));
    
    onError?.(nativeEvent);
  }, [game.name, t.gameError, onError]);

  const handleMessage = useCallback((event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('📨 Game message:', message);
      
      // Handle game-specific messages
      switch (message.type) {
        case 'game_ready':
          console.log('🎮 Game is ready');
          break;
        case 'game_score':
          console.log('🏆 Game score:', message.score);
          break;
        case 'game_error':
          console.error('🚫 Game reported error:', message.error);
          setHasError(true);
          setErrorMessage(message.error);
          break;
        case 'performance_metrics':
          console.log('📊 Game performance:', message.metrics);
          break;
        default:
          console.log('📝 Unknown game message:', message);
      }
      
      onMessage?.(message);
    } catch (error) {
      console.warn('⚠️ Failed to parse game message:', error);
    }
  }, [onMessage]);

  const handleLoadProgress = useCallback((event: any) => {
    const progress = event.nativeEvent.progress * 100;
    setLoadProgress(progress);
  }, []);

  const handleShouldStartLoadWithRequest = useCallback((request: any) => {
    const { url } = request;
    
    // Always allow the initial game URL
    if (url === game.url) {
      return true;
    }
    
    // Validate any additional URLs
    const isValid = validateGameUrl(url);
    
    if (!isValid) {
      console.warn(`🚫 Blocked navigation to: ${url}`);
      Alert.alert(
        t.securityWarning,
        `Navigation to ${url} was blocked for security reasons.`
      );
    }
    
    return isValid;
  }, [game.url, validateGameUrl, t.securityWarning]);

  // Validate game URL before rendering
  if (!validateGameUrl(game.url)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} testID={`${testId}-error`}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {t.gameUnavailable}
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            Invalid or untrusted game URL
          </Text>
        </View>
      </View>
    );
  }

  // Show offline message
  if (!isOnline) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} testID={`${testId}-offline`}>
        <View style={styles.errorContainer}>
          <WifiOff size={48} color={colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            No Internet Connection
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            Please check your connection and try again
          </Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} testID={`${testId}-error`}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {t.gameError}
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {errorMessage}
          </Text>
        </View>
      </View>
    );
  }

  const injectedJavaScript = `
    // Security and performance monitoring
    (function() {
      // Disable certain APIs for security
      if (typeof window !== 'undefined') {
        // Block access to sensitive APIs
        delete window.location.reload;
        delete window.history.pushState;
        delete window.history.replaceState;
        
        // Monitor performance
        const startTime = Date.now();
        
        // Send ready message
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'game_ready',
          timestamp: startTime,
          userAgent: navigator.userAgent
        }));
        
        // Monitor errors
        window.addEventListener('error', function(e) {
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            type: 'game_error',
            error: e.message,
            filename: e.filename,
            lineno: e.lineno
          }));
        });
        
        // Performance monitoring
        if (performance && performance.mark) {
          performance.mark('game-start');
          
          window.addEventListener('load', function() {
            performance.mark('game-loaded');
            performance.measure('game-load-time', 'game-start', 'game-loaded');
            
            const measures = performance.getEntriesByType('measure');
            const loadTime = measures.find(m => m.name === 'game-load-time');
            
            if (loadTime) {
              window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'performance_metrics',
                metrics: {
                  loadTime: loadTime.duration,
                  timestamp: Date.now()
                }
              }));
            }
          });
        }
      }
    })();
    true;
  `;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID={testId}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <AnimatedLoader size={40} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t.gameLoading}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: colors.primary,
                  width: `${loadProgress}%`
                }
              ]} 
            />
          </View>
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        source={{ uri: game.url }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onMessage={handleMessage}
        onLoadProgress={handleLoadProgress}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        // Security settings
        allowsBackForwardNavigationGestures={false}
        allowsLinkPreview={false}
        dataDetectorTypes="none"
        // Performance settings
        cacheEnabled={true}
        incognito={false}
        // Web-specific settings
        {...(Platform.OS === 'web' && {
          // Additional web-specific security settings
          sandbox: 'allow-scripts allow-same-origin allow-forms',
        })}
        testID={`${testId}-webview`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  progressBar: {
    width: 200,
    height: 4,
    marginTop: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});