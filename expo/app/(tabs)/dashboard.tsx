import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function Dashboard() {
  const router = useRouter();

  const QuickAction = ({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) => (
    <TouchableOpacity onPress={onPress} style={styles.quickActionContainer}>
      <LinearGradient
        colors={[color, color + '80']}
        style={styles.quickActionIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon as any} size={24} color="white" />
      </LinearGradient>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const RecentChat = ({ name, message, time, avatar }: { name: string; message: string; time: string; avatar: string }) => (
    <TouchableOpacity style={styles.recentChatContainer} onPress={() => router.push('/chat')}>
      <Image source={{ uri: avatar }} style={styles.avatar} />
      <View style={styles.chatContent}>
        <Text style={styles.chatName}>{name}</Text>
        <Text style={styles.chatMessage} numberOfLines={1}>{message}</Text>
      </View>
      <Text style={styles.chatTime}>{time}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good Evening,</Text>
              <Text style={styles.username}>Alex Doe</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=11' }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>

          {/* Wallet Card */}
          <BlurView intensity={80} tint="dark" style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <Text style={styles.walletLabel}>Total Balance</Text>
              <Ionicons name="eye-off-outline" size={20} color="rgba(255,255,255,0.6)" />
            </View>
            <Text style={styles.balance}>$12,450.00</Text>
            <View style={styles.walletActions}>
              <TouchableOpacity style={styles.walletButton}>
                <Ionicons name="arrow-up" size={20} color="white" />
                <Text style={styles.walletButtonText}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.walletButton}>
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.walletButtonText}>Top Up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.walletButton}>
                <Ionicons name="qr-code" size={20} color="white" />
                <Text style={styles.walletButtonText}>Scan</Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction icon="chatbubble-ellipses" label="New Chat" color="#4facfe" onPress={() => router.push('/chat')} />
            <QuickAction icon="people" label="Groups" color="#00f260" onPress={() => router.push('/groups')} />
            <QuickAction icon="videocam" label="Live" color="#f093fb" onPress={() => router.push('/feed')} />
            <QuickAction icon="game-controller" label="Games" color="#ff9a9e" onPress={() => { }} />
          </View>

          {/* Recent Chats */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Chats</Text>
            <TouchableOpacity onPress={() => router.push('/chat')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <BlurView intensity={50} tint="dark" style={styles.recentChatsList}>
            <RecentChat
              name="Sarah Williams"
              message="Hey! Are we still on for dinner?"
              time="2m ago"
              avatar="https://i.pravatar.cc/150?img=5"
            />
            <View style={styles.divider} />
            <RecentChat
              name="Crypto Group"
              message="John: Bitcoin is rallying again! 🚀"
              time="15m ago"
              avatar="https://i.pravatar.cc/150?img=8"
            />
            <View style={styles.divider} />
            <RecentChat
              name="Mom"
              message="Call me when you're free."
              time="1h ago"
              avatar="https://i.pravatar.cc/150?img=9"
            />
          </BlurView>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }),
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  walletCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balance: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  walletButtonText: {
    color: 'white',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  quickActionContainer: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  quickActionLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAll: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  recentChatsList: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  recentChatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  chatContent: {
    flex: 1,
  },
  chatName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  chatMessage: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  chatTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 80,
  },
});