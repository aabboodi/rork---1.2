import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PersonalizationSettings {
  replyAssistant: {
    enabled: boolean;
    scope: 'all' | 'dms_only' | 'groups_only';
    allowlist: string[]; // chatId array
    blocklist: string[]; // chatId array
    schedule: {
      enabled: boolean;
      from: string; // HH:MM format
      to: string; // HH:MM format
    };
  };
  trainer: {
    enabled: boolean;
    maxWords: number; // ≤10k words
    content: string;
    lastUpdated: number;
  };
  privacy: {
    dataCollection: boolean;
    shareInsights: boolean;
    localOnly: boolean;
  };
  consent: {
    given: boolean;
    timestamp: number;
    version: string;
  };
}

class PersonalizationSettingsService {
  private static instance: PersonalizationSettingsService;
  private readonly SETTINGS_KEY = 'personalization_settings';
  private readonly MAX_TRAINER_WORDS = 10000;

  private constructor() {}

  static getInstance(): PersonalizationSettingsService {
    if (!PersonalizationSettingsService.instance) {
      PersonalizationSettingsService.instance = new PersonalizationSettingsService();
    }
    return PersonalizationSettingsService.instance;
  }

  // Get current settings with defaults
  async getSettings(): Promise<PersonalizationSettings> {
    try {
      const stored = await this.getEncrypted(this.SETTINGS_KEY);
      
      const defaultSettings: PersonalizationSettings = {
        replyAssistant: {
          enabled: false,
          scope: 'dms_only',
          allowlist: [],
          blocklist: [],
          schedule: {
            enabled: false,
            from: '09:00',
            to: '17:00'
          }
        },
        trainer: {
          enabled: false,
          maxWords: this.MAX_TRAINER_WORDS,
          content: '',
          lastUpdated: 0
        },
        privacy: {
          dataCollection: false,
          shareInsights: false,
          localOnly: true
        },
        consent: {
          given: false,
          timestamp: 0,
          version: '1.0'
        }
      };

      return stored ? { ...defaultSettings, ...stored } : defaultSettings;
    } catch (error) {
      console.error('Failed to get personalization settings:', error);
      throw error;
    }
  }

  // Update settings
  async updateSettings(updates: Partial<PersonalizationSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...updates };
      
      // Validate trainer content word limit
      if (newSettings.trainer.content) {
        const wordCount = this.countWords(newSettings.trainer.content);
        if (wordCount > this.MAX_TRAINER_WORDS) {
          throw new Error(`Trainer content exceeds ${this.MAX_TRAINER_WORDS} words limit`);
        }
        newSettings.trainer.lastUpdated = Date.now();
      }

      await this.storeEncrypted(this.SETTINGS_KEY, newSettings);
      console.log('✅ Personalization settings updated');
    } catch (error) {
      console.error('Failed to update personalization settings:', error);
      throw error;
    }
  }

  // Update reply assistant settings
  async updateReplyAssistant(settings: Partial<PersonalizationSettings['replyAssistant']>): Promise<void> {
    try {
      const current = await this.getSettings();
      await this.updateSettings({
        replyAssistant: {
          ...current.replyAssistant,
          ...settings
        }
      });
    } catch (error) {
      console.error('Failed to update reply assistant settings:', error);
      throw error;
    }
  }

  // Add chat to allowlist
  async addToAllowlist(chatId: string): Promise<void> {
    try {
      const settings = await this.getSettings();
      const allowlist = [...new Set([...settings.replyAssistant.allowlist, chatId])];
      const blocklist = settings.replyAssistant.blocklist.filter(id => id !== chatId);
      
      await this.updateReplyAssistant({ allowlist, blocklist });
    } catch (error) {
      console.error('Failed to add to allowlist:', error);
      throw error;
    }
  }

  // Add chat to blocklist
  async addToBlocklist(chatId: string): Promise<void> {
    try {
      const settings = await this.getSettings();
      const blocklist = [...new Set([...settings.replyAssistant.blocklist, chatId])];
      const allowlist = settings.replyAssistant.allowlist.filter(id => id !== chatId);
      
      await this.updateReplyAssistant({ allowlist, blocklist });
    } catch (error) {
      console.error('Failed to add to blocklist:', error);
      throw error;
    }
  }

  // Remove chat from both lists
  async removeChatFromLists(chatId: string): Promise<void> {
    try {
      const settings = await this.getSettings();
      const allowlist = settings.replyAssistant.allowlist.filter(id => id !== chatId);
      const blocklist = settings.replyAssistant.blocklist.filter(id => id !== chatId);
      
      await this.updateReplyAssistant({ allowlist, blocklist });
    } catch (error) {
      console.error('Failed to remove chat from lists:', error);
      throw error;
    }
  }

  // Update trainer content
  async updateTrainerContent(content: string): Promise<void> {
    try {
      const wordCount = this.countWords(content);
      if (wordCount > this.MAX_TRAINER_WORDS) {
        throw new Error(`Content exceeds ${this.MAX_TRAINER_WORDS} words limit (current: ${wordCount})`);
      }

      await this.updateSettings({
        trainer: {
          enabled: content.length > 0,
          maxWords: this.MAX_TRAINER_WORDS,
          content,
          lastUpdated: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to update trainer content:', error);
      throw error;
    }
  }

  // Give consent
  async giveConsent(): Promise<void> {
    try {
      await this.updateSettings({
        consent: {
          given: true,
          timestamp: Date.now(),
          version: '1.0'
        }
      });
    } catch (error) {
      console.error('Failed to give consent:', error);
      throw error;
    }
  }

  // Revoke consent and clear data
  async revokeConsent(): Promise<void> {
    try {
      await this.updateSettings({
        consent: {
          given: false,
          timestamp: Date.now(),
          version: '1.0'
        },
        replyAssistant: {
          enabled: false,
          scope: 'dms_only',
          allowlist: [],
          blocklist: [],
          schedule: {
            enabled: false,
            from: '09:00',
            to: '17:00'
          }
        },
        trainer: {
          enabled: false,
          maxWords: this.MAX_TRAINER_WORDS,
          content: '',
          lastUpdated: 0
        }
      });
      
      // Also clear signals
      const signalsService = await import('./PersonalizationSignalsService');
      await signalsService.default.getInstance().clearAllSignals();
      
      console.log('🗑️ Consent revoked and data cleared');
    } catch (error) {
      console.error('Failed to revoke consent:', error);
      throw error;
    }
  }

  // Check if reply assistant should be active for a chat
  async shouldAssistInChat(chatId: string, isGroup: boolean = false): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      
      if (!settings.consent.given || !settings.replyAssistant.enabled) {
        return false;
      }

      // Check schedule
      if (settings.replyAssistant.schedule.enabled) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const { from, to } = settings.replyAssistant.schedule;
        
        if (currentTime < from || currentTime > to) {
          return false;
        }
      }

      // Check blocklist
      if (settings.replyAssistant.blocklist.includes(chatId)) {
        return false;
      }

      // Check scope and allowlist
      switch (settings.replyAssistant.scope) {
        case 'all':
          return true;
        case 'dms_only':
          return !isGroup;
        case 'groups_only':
          return isGroup;
        default:
          return settings.replyAssistant.allowlist.includes(chatId);
      }
    } catch (error) {
      console.error('Failed to check if should assist in chat:', error);
      return false;
    }
  }

  // Get trainer content for AI processing
  async getTrainerContent(): Promise<string> {
    try {
      const settings = await this.getSettings();
      return settings.trainer.enabled ? settings.trainer.content : '';
    } catch (error) {
      console.error('Failed to get trainer content:', error);
      return '';
    }
  }

  // Clear all settings
  async clearAllSettings(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(this.SETTINGS_KEY);
      } else {
        await SecureStore.deleteItemAsync(this.SETTINGS_KEY);
      }
      console.log('🗑️ All personalization settings cleared');
    } catch (error) {
      console.error('Failed to clear settings:', error);
      throw error;
    }
  }

  // Private helper methods
  private async storeEncrypted(key: string, data: any): Promise<void> {
    const jsonData = JSON.stringify(data);
    
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, jsonData);
    } else {
      await SecureStore.setItemAsync(key, jsonData);
    }
  }

  private async getEncrypted(key: string): Promise<any> {
    let jsonData: string | null;
    
    if (Platform.OS === 'web') {
      jsonData = await AsyncStorage.getItem(key);
    } else {
      jsonData = await SecureStore.getItemAsync(key);
    }
    
    return jsonData ? JSON.parse(jsonData) : null;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

export default PersonalizationSettingsService;