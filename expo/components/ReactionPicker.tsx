import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions } from 'react-native';
import { Heart, Smile, Laugh, Frown, ThumbsUp, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

export type ReactionType = 'like' | 'love' | 'laugh' | 'sad' | 'angry';

interface ReactionPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelectReaction: (reaction: ReactionType) => void;
    currentReaction?: ReactionType;
}

interface ReactionOption {
    type: ReactionType;
    emoji: string;
    label: string;
    color: string;
    icon: React.ReactNode;
}

const reactionOptions: ReactionOption[] = [
    {
        type: 'like',
        emoji: '👍',
        label: 'إعجاب',
        color: Colors.primary,
        icon: <ThumbsUp size={28} color={Colors.primary} />,
    },
    {
        type: 'love',
        emoji: '❤️',
        label: 'حب',
        color: Colors.error,
        icon: <Heart size={28} color={Colors.error} />,
    },
    {
        type: 'laugh',
        emoji: '😂',
        label: 'ضحك',
        color: '#FFD700',
        icon: <Laugh size={28} color="#FFD700" />,
    },
    {
        type: 'sad',
        emoji: '😢',
        label: 'حزن',
        color: '#4A90E2',
        icon: <Frown size={28} color="#4A90E2" />,
    },
    {
        type: 'angry',
        emoji: '😡',
        label: 'غضب',
        color: '#FF6B6B',
        icon: <Frown size={28} color="#FF6B6B" />,
    },
];

export default function ReactionPicker({ visible, onClose, onSelectReaction, currentReaction }: ReactionPickerProps) {
    const [scaleAnims] = useState(
        reactionOptions.map(() => new Animated.Value(1))
    );

    const handleReactionPress = (reaction: ReactionType, index: number) => {
        // Animate the selected reaction
        Animated.sequence([
            Animated.timing(scaleAnims[index], {
                toValue: 1.5,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnims[index], {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();

        // Delay to show animation before closing
        setTimeout(() => {
            onSelectReaction(reaction);
            onClose();
        }, 200);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>اختر تفاعل</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={Colors.dark} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.reactionsGrid}>
                        {reactionOptions.map((option, index) => (
                            <Animated.View
                                key={option.type}
                                style={{
                                    transform: [{ scale: scaleAnims[index] }],
                                }}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.reactionButton,
                                        currentReaction === option.type && styles.reactionButtonActive,
                                    ]}
                                    onPress={() => handleReactionPress(option.type, index)}
                                >
                                    <Text style={styles.reactionEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.reactionLabel,
                                        currentReaction === option.type && { color: option.color },
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {currentReaction === option.type && (
                                        <View style={[styles.activeDot, { backgroundColor: option.color }]} />
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

interface ReactionCountsProps {
    reactions: {
        like: number;
        love: number;
        laugh: number;
        sad: number;
        angry: number;
    };
    userReaction?: ReactionType;
    onPress: () => void;
    compact?: boolean;
}

export function ReactionCounts({ reactions, userReaction, onPress, compact = false }: ReactionCountsProps) {
    const topReactions = Object.entries(reactions)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, compact ? 3 : 5);

    const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);

    if (totalReactions === 0) return null;

    return (
        <TouchableOpacity style={styles.reactionCountsContainer} onPress={onPress}>
            <View style={styles.reactionEmojis}>
                {topReactions.map(([type, _], index) => {
                    const option = reactionOptions.find(r => r.type === type);
                    return (
                        <Text
                            key={type}
                            style={[
                                styles.reactionEmojiSmall,
                                { marginLeft: index > 0 ? -6 : 0 },
                            ]}
                        >
                            {option?.emoji}
                        </Text>
                    );
                })}
            </View>
            <Text style={styles.reactionCountText}>
                {totalReactions > 999 ? `${(totalReactions / 1000).toFixed(1)}K` : totalReactions}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContainer: {
        backgroundColor: Colors.background,
        borderRadius: 24,
        width: width * 0.9,
        maxWidth: 400,
        padding: 20,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    pickerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.dark,
    },
    reactionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    reactionButton: {
        width: (width * 0.9 - 80) / 3,
        aspectRatio: 1,
        backgroundColor: Colors.secondary,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    reactionButtonActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    reactionEmoji: {
        fontSize: 40,
        marginBottom: 8,
    },
    reactionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.dark,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 4,
    },
    reactionCountsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
    },
    reactionEmojis: {
        flexDirection: 'row',
        marginRight: 6,
    },
    reactionEmojiSmall: {
        fontSize: 16,
        borderWidth: 2,
        borderColor: Colors.background,
        borderRadius: 10,
    },
    reactionCountText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.dark,
    },
});
