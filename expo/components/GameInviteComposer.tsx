import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { GamesService } from '@/services/GamesService';
import { GameMetadata } from '@/components/WebViewSandbox';
import { GameSession } from '@/services/GamesSessionService';
import { GameInvite } from '@/services/GamesInviteService';
import { Gamepad2, Users, Share, X, Copy, Send } from 'lucide-react-native';

export interface GameInviteComposerProps {
  visible: boolean;
  onClose: () => void;
  onSendInvite: (inviteText: string, deepLink: string) => void;
  recipientName?: string;
  isGroupChat?: boolean;
}

export default function GameInviteComposer({
  visible,
  onClose,
  onSendInvite,
  recipientName,
  isGroupChat = false
}: GameInviteComposerProps) {
  const { colors } = useThemeStore();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const [games, setGames] = useState<GameMetadata[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameMetadata | null>(null);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<GameInvite | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [step, setStep] = useState<'select_game' | 'create_session' | 'share_invite'>('select_game');

  const gamesService = GamesService.getInstance();

  const loadGames = useCallback(async () => {
    try {
      setIsLoading(true);
      await gamesService.initialize();
      
      const featureFlags = gamesService.getFeatureFlags();
      if (!featureFlags.games || !featureFlags.multiplayerGames) {
        Alert.alert('Feature Disabled', 'Multiplayer games are not available.');
        onClose();
        return;
      }

      const response = await gamesService.getGames({ limit: 20 });
      setGames(response.games);
      
    } catch (error) {
      console.error('❌ Failed to load games:', error);
      Alert.alert('Error', 'Failed to load games. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [gamesService, onClose]);

  const handleGameSelect = useCallback(async (game: GameMetadata) => {
    try {
      setSelectedGame(game);
      setIsLoading(true);
      
      // Mock user data - in real app, get from auth
      const userId = 'user_123';
      const userName = 'Player 1';
      
      // Create session
      const sessionResponse = await gamesService.createGameSession(game.id, userId, {
        maxPlayers: 4
      });
      
      setCurrentSession(sessionResponse.session);
      
      // Create invite
      const scope = isGroupChat ? 'followers' : 'private';
      const customMessage = isGroupChat 
        ? `Let's play ${game.name} together!`
        : `Hey ${recipientName}, want to play ${game.name}?`;
        
      const inviteResponse = await gamesService.createGameInvite(
        sessionResponse.session.id,
        userId,
        userName,
        scope,
        customMessage
      );
      
      setGeneratedInvite(inviteResponse.invite);
      setStep('share_invite');
      
      console.log(`🎮 Created session and invite for ${game.name}`);
      
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      Alert.alert('Error', 'Failed to create game session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [gamesService, isGroupChat, recipientName]);

  const handleSendInvite = useCallback(() => {
    if (!generatedInvite) return;
    
    const shareText = gamesService.generateGameInviteShareText(
      generatedInvite, 
      isGroupChat ? 'social' : 'chat'
    );
    
    onSendInvite(shareText, generatedInvite.deepLink);
    handleClose();
  }, [generatedInvite, gamesService, isGroupChat, onSendInvite]);

  const handleCopyLink = useCallback(() => {
    if (!generatedInvite) return;
    
    // In real app, copy to clipboard
    console.log('📋 Copied invite link:', generatedInvite.deepLink);
    Alert.alert('Copied!', 'Invite link copied to clipboard.');
  }, [generatedInvite]);

  const handleClose = useCallback(() => {
    setStep('select_game');
    setSelectedGame(null);
    setCurrentSession(null);
    setGeneratedInvite(null);
    setGames([]);
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    if (visible) {
      loadGames();
    }
  }, [visible, loadGames]);

  const renderGameSelection = () => (
    <View style={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>
        Choose a Game
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {isGroupChat 
          ? 'Select a game to play with the group'
          : `Select a game to play with ${recipientName}`
        }
      </Text>
      
      <ScrollView style={styles.gamesList} showsVerticalScrollIndicator={false}>
        {games.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={[styles.gameItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleGameSelect(game)}
            disabled={isLoading}
          >
            <View style={styles.gameItemContent}>
              <View style={[styles.gameIcon, { backgroundColor: colors.primary + '20' }]}>
                <Gamepad2 size={24} color={colors.primary} />
              </View>
              <View style={styles.gameInfo}>
                <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={1}>
                  {game.name}
                </Text>
                <Text style={[styles.gameCategory, { color: colors.textSecondary }]} numberOfLines={1}>
                  {game.category} • {game.developer}
                </Text>
                {game.description && (
                  <Text style={[styles.gameDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {game.description}
                  </Text>
                )}
              </View>
              <View style={styles.gameRating}>
                <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                  ⭐ {game.rating?.toFixed(1) || 'N/A'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderInviteShare = () => (
    <View style={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>
        Game Invite Ready!
      </Text>
      
      {selectedGame && currentSession && (
        <View style={[styles.sessionInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sessionHeader}>
            <Gamepad2 size={20} color={colors.primary} />
            <Text style={[styles.sessionGameName, { color: colors.text }]}>
              {selectedGame.name}
            </Text>
          </View>
          <View style={styles.sessionDetails}>
            <View style={styles.sessionDetail}>
              <Users size={16} color={colors.textSecondary} />
              <Text style={[styles.sessionDetailText, { color: colors.textSecondary }]}>
                {currentSession.currentPlayers.length}/{currentSession.maxPlayers} players
              </Text>
            </View>
            <View style={styles.sessionDetail}>
              <Text style={[styles.roomCodeLabel, { color: colors.textSecondary }]}>Room:</Text>
              <Text style={[styles.roomCode, { color: colors.primary }]}>
                {currentSession.roomCode}
              </Text>
            </View>
          </View>
        </View>
      )}
      
      {generatedInvite && (
        <View style={[styles.invitePreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.invitePreviewTitle, { color: colors.text }]}>
            Invite Message:
          </Text>
          <Text style={[styles.invitePreviewText, { color: colors.textSecondary }]}>
            {generatedInvite.shareMessage}
          </Text>
        </View>
      )}
      
      <View style={styles.shareActions}>
        <TouchableOpacity
          style={[styles.copyButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleCopyLink}
        >
          <Copy size={20} color={colors.text} />
          <Text style={[styles.copyButtonText, { color: colors.text }]}>
            Copy Link
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={handleSendInvite}
        >
          <Send size={20} color={colors.background} />
          <Text style={[styles.sendButtonText, { color: colors.background }]}>
            Send Invite
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Game Invite
            </Text>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.error }]}
              onPress={handleClose}
            >
              <X size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {step === 'select_game' ? 'Loading games...' : 'Creating session...'}
            </Text>
          </View>
        ) : (
          <>
            {step === 'select_game' && renderGameSelection()}
            {step === 'share_invite' && renderInviteShare()}
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  gamesList: {
    flex: 1,
  },
  gameItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  gameItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  gameCategory: {
    fontSize: 12,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  gameRating: {
    alignItems: 'flex-end',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionInfo: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sessionGameName: {
    fontSize: 18,
    fontWeight: '600',
  },
  sessionDetails: {
    gap: 8,
  },
  sessionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDetailText: {
    fontSize: 14,
  },
  roomCodeLabel: {
    fontSize: 14,
  },
  roomCode: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  invitePreview: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  invitePreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  invitePreviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  shareActions: {
    flexDirection: 'row',
    gap: 12,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});