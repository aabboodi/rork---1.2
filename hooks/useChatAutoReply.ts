import { useState, useEffect, useCallback } from 'react';
import ChatAutoReplyService, { 
  ThreadPersona, 
  ReplyCandidate, 
  AutoReplyGuards,
  StyleProfile 
} from '@/services/ai/ChatAutoReplyService';

export interface UseChatAutoReplyReturn {
  // Thread management
  threadPersona: ThreadPersona | null;
  createThreadPersona: (chatId: string, isGroup: boolean, messages?: any[]) => Promise<void>;
  updateThreadPreferences: (chatId: string, preferences: Partial<ThreadPersona['preferences']>) => Promise<void>;
  
  // Reply generation
  replySuggestions: ReplyCandidate[];
  generateSuggestions: (chatId: string, messageText: string, context?: any) => Promise<void>;
  autoSendReply: (chatId: string, messageText: string, context?: any) => Promise<string | null>;
  
  // Guards and safety
  guards: AutoReplyGuards | null;
  updateGuards: (guards: Partial<AutoReplyGuards>) => Promise<void>;
  emergencyStop: () => Promise<void>;
  resumeAfterStop: () => Promise<void>;
  
  // Style analysis
  extractStyleProfile: (content: string) => Promise<StyleProfile>;
  
  // State
  loading: boolean;
  error: string | null;
}

export function useChatAutoReply(chatId?: string): UseChatAutoReplyReturn {
  const [threadPersona, setThreadPersona] = useState<ThreadPersona | null>(null);
  const [replySuggestions, setReplySuggestions] = useState<ReplyCandidate[]>([]);
  const [guards, setGuards] = useState<AutoReplyGuards | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const service = ChatAutoReplyService.getInstance();

  // Load thread persona when chatId changes
  useEffect(() => {
    if (chatId) {
      loadThreadPersona(chatId);
    }
  }, [chatId, loadThreadPersona]);

  // Load guards on mount
  useEffect(() => {
    loadGuards();
  }, [loadGuards]);

  const loadThreadPersona = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const persona = await service.getThreadPersona(id);
      setThreadPersona(persona);
    } catch (err) {
      console.error('Failed to load thread persona:', err);
      setError('Failed to load thread persona');
    } finally {
      setLoading(false);
    }
  }, [service]);

  const loadGuards = useCallback(async () => {
    try {
      const currentGuards = await service.getAutoReplyGuards();
      setGuards(currentGuards);
    } catch (err) {
      console.error('Failed to load guards:', err);
      setError('Failed to load safety guards');
    }
  }, [service]);

  const createThreadPersona = useCallback(async (id: string, isGroup: boolean, messages: any[] = []) => {
    try {
      setLoading(true);
      setError(null);
      const persona = await service.createThreadPersona(id, isGroup, messages);
      setThreadPersona(persona);
      console.log('✅ Thread persona created for chat:', id);
    } catch (err) {
      console.error('Failed to create thread persona:', err);
      setError('Failed to create thread persona');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const updateThreadPreferences = useCallback(async (id: string, preferences: Partial<ThreadPersona['preferences']>) => {
    try {
      setLoading(true);
      setError(null);
      await service.updateThreadPreferences(id, preferences);
      
      // Reload persona to get updated data
      if (id === chatId) {
        await loadThreadPersona(id);
      }
      
      console.log('✅ Thread preferences updated for chat:', id);
    } catch (err) {
      console.error('Failed to update thread preferences:', err);
      setError('Failed to update preferences');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service, chatId, loadThreadPersona]);

  const generateSuggestions = useCallback(async (id: string, messageText: string, context: any = {}) => {
    try {
      setLoading(true);
      setError(null);
      const suggestions = await service.generateReplySuggestions(id, messageText, context);
      setReplySuggestions(suggestions);
      console.log(`✅ Generated ${suggestions.length} reply suggestions`);
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
      setError('Failed to generate reply suggestions');
      setReplySuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [service]);

  const autoSendReply = useCallback(async (id: string, messageText: string, context: any = {}): Promise<string | null> => {
    try {
      setError(null);
      const reply = await service.autoSendReply(id, messageText, context);
      
      if (reply) {
        console.log('🤖 Auto-reply sent:', reply);
      }
      
      return reply;
    } catch (err) {
      console.error('Failed to auto-send reply:', err);
      setError('Failed to send auto-reply');
      return null;
    }
  }, [service]);

  const updateGuards = useCallback(async (newGuards: Partial<AutoReplyGuards>) => {
    try {
      setLoading(true);
      setError(null);
      await service.updateAutoReplyGuards(newGuards);
      await loadGuards();
      console.log('✅ Auto-reply guards updated');
    } catch (err) {
      console.error('Failed to update guards:', err);
      setError('Failed to update safety guards');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service, loadGuards]);

  const emergencyStop = useCallback(async () => {
    try {
      setError(null);
      await service.emergencyStop();
      await loadGuards();
      console.log('🛑 Emergency stop activated');
    } catch (err) {
      console.error('Failed to activate emergency stop:', err);
      setError('Failed to activate emergency stop');
      throw err;
    }
  }, [service, loadGuards]);

  const resumeAfterStop = useCallback(async () => {
    try {
      setError(null);
      await service.resumeAfterStop();
      await loadGuards();
      console.log('▶️ Auto-reply resumed');
    } catch (err) {
      console.error('Failed to resume auto-reply:', err);
      setError('Failed to resume auto-reply');
      throw err;
    }
  }, [service, loadGuards]);

  const extractStyleProfile = useCallback(async (content: string): Promise<StyleProfile> => {
    try {
      setError(null);
      const profile = await service.extractStyleProfile(content);
      console.log('✅ Style profile extracted');
      return profile;
    } catch (err) {
      console.error('Failed to extract style profile:', err);
      setError('Failed to analyze writing style');
      throw err;
    }
  }, [service]);

  return {
    // Thread management
    threadPersona,
    createThreadPersona,
    updateThreadPreferences,
    
    // Reply generation
    replySuggestions,
    generateSuggestions,
    autoSendReply,
    
    // Guards and safety
    guards,
    updateGuards,
    emergencyStop,
    resumeAfterStop,
    
    // Style analysis
    extractStyleProfile,
    
    // State
    loading,
    error
  };
}

export default useChatAutoReply;