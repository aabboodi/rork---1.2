import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatPreview {
    id: string;
    name: string;
    avatar: string;
    lastMessage: string;
    time: string;
    unreadCount: number;
    isOnline: boolean;
}

const MOCK_CHATS: ChatPreview[] = [
    {
        id: '1',
        name: 'Sarah Williams',
        avatar: 'https://i.pravatar.cc/150?img=5',
        lastMessage: 'Hey! Are we still on for dinner tonight?',
        time: '10:30 AM',
        unreadCount: 2,
        isOnline: true,
    },
    {
        id: '2',
        name: 'Crypto Group',
        avatar: 'https://i.pravatar.cc/150?img=8',
        lastMessage: 'John: Bitcoin is rallying again! 🚀',
        time: '9:15 AM',
        unreadCount: 5,
        isOnline: false,
    },
    {
        id: '3',
        name: 'Mom',
        avatar: 'https://i.pravatar.cc/150?img=9',
        lastMessage: 'Call me when you\'re free.',
        time: 'Yesterday',
        unreadCount: 0,
        isOnline: false,
    },
    {
        id: '4',
        name: 'Alex Johnson',
        avatar: 'https://i.pravatar.cc/150?img=12',
        lastMessage: 'Sent a photo',
        time: 'Yesterday',
        unreadCount: 0,
        isOnline: true,
    },
];

export default function ChatList() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const renderItem = ({ item }: { item: ChatPreview }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push(`/chat/${item.id}`)}
        >
            <View style={styles.avatarContainer}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                {item.isOnline && <View style={styles.onlineBadge} />}
            </View>

            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                </View>

                <View style={styles.chatFooter}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.lastMessage}
                    </Text>
                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Chats</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="camera-outline" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="create-outline" size={24} color="#007AFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#8E8E93" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#8E8E93"
                    />
                </View>
            </View>

            <View style={styles.listContainer}>
                <FlashList
                    data={MOCK_CHATS}
                    renderItem={renderItem}
                    estimatedItemSize={76}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                />
            </View>

            {/* Floating Action Button for New Chat */}
            <TouchableOpacity style={styles.fab} onPress={() => { }}>
                <Ionicons name="chatbubble-ellipses" size={24} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#000',
    },
    headerActions: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: 20,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        paddingHorizontal: 8,
        height: 36,
    },
    searchInput: {
        flex: 1,
        marginLeft: 6,
        fontSize: 16,
        color: '#000',
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 80,
    },
    chatItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E1E1E1',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#34C759',
        borderWidth: 2,
        borderColor: '#fff',
    },
    chatContent: {
        flex: 1,
        justifyContent: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#C6C6C8',
        paddingBottom: 10,
        height: '100%',
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        flex: 1,
    },
    time: {
        fontSize: 14,
        color: '#8E8E93',
        marginLeft: 8,
    },
    chatFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 15,
        color: '#8E8E93',
        flex: 1,
        marginRight: 8,
    },
    unreadBadge: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
});
