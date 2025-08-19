import * as Linking from 'expo-linking';

// Secure deep linking configuration
export const linkingConfig = {
  prefixes: [
    'com.madaclone.app://',
    'https://madaclone.app',
    'https://www.madaclone.app'
  ],
  config: {
    screens: {
      index: '',
      '(tabs)': {
        screens: {
          index: 'chats',
          feed: 'social',
          wallet: 'wallet',
          profile: 'profile',
          dashboard: 'dashboard'
        }
      },
      'auth/otp': 'auth/verify',
      'auth/permissions': 'auth/permissions',
      'auth/mfa': 'auth/mfa',
      'chat/[id]': 'chat/:id',
      'wallet/send': 'wallet/send',
      'wallet/receive': 'wallet/receive',
      'profile/edit': 'profile/edit',
      'profile/settings': 'profile/settings'
    }
  }
};

// Secure URL validation
export const validateDeepLink = (url: string): boolean => {
  try {
    const parsed = Linking.parse(url);
    
    // Only allow our secure schemes
    const allowedSchemes = ['com.madaclone.app', 'https'];
    const allowedHosts = ['madaclone.app', 'www.madaclone.app'];
    
    if (!allowedSchemes.includes(parsed.scheme || '')) {
      console.warn('Invalid scheme in deep link:', parsed.scheme);
      return false;
    }
    
    if (parsed.scheme === 'https' && !allowedHosts.includes(parsed.hostname || '')) {
      console.warn('Invalid hostname in deep link:', parsed.hostname);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating deep link:', error);
    return false;
  }
};

// Handle secure deep links
export const handleSecureDeepLink = (url: string) => {
  if (!validateDeepLink(url)) {
    console.warn('Rejected insecure deep link:', url);
    return false;
  }
  
  // Process the validated deep link
  console.log('Processing secure deep link:', url);
  return true;
};