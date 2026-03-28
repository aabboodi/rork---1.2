import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Heart, MessageCircle, Share2, Bookmark, MoreVertical, Wallet, Music, Send, X } from 'lucide-react-native';
import { Reel } from '@/types';
import Colors from '@/constants/colors';
import { useWalletStore } from '@/store/walletStore';
import { useAuthStore } from '@/store/authStore';
import { translations } from '@/constants/i18n';

interface ReelItemProps {
  reel: Reel;
}

const { width, height } = Dimensions.get('window');

export default function ReelItem({ reel }: ReelItemProps) {
  const { language, userId } = useAuthStore();
  const { balances, updateBalance, addTransaction } = useWalletStore();
  const t = translations[language];
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes);
  const [commentsCount, setCommentsCount] = useState(reel.comments);
  const [sharesCount, setSharesCount] = useState(reel.shares);
  const [showComments, setShowComments] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
  };

  const handleComment = () => {
    setShowComments(true);
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    
    const newComment = {
      id: Date.now().toString(),
      userId: userId || '0',
      user: {
        id: userId || '0',
        displayName: 'أنت',
        profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      content: commentText,
      timestamp: Date.now(),
      likes: 0
    };
    
    setComments([...comments, newComment]);
    setCommentsCount(prev => prev + 1);
    setCommentText('');
    Alert.alert('تم إرسال التعليق', 'تم إضافة تعليقك بنجاح');
  };

  const handleShare = () => {
    setShowShareOptions(true);
  };

  const handleShareOption = (option: string) => {
    setShowShareOptions(false);
    setSharesCount(prev => prev + 1);
    
    switch (option) {
      case 'copy':
        Alert.alert('تم النسخ', 'تم نسخ رابط المقطع');
        break;
      case 'whatsapp':
        Alert.alert('واتساب', 'سيتم فتح واتساب لمشاركة المقطع');
        break;
      case 'telegram':
        Alert.alert('تيليجرام', 'سيتم فتح تيليجرام لمشاركة المقطع');
        break;
      case 'twitter':
        Alert.alert('تويتر', 'سيتم فتح تويتر لمشاركة المقطع');
        break;
      case 'facebook':
        Alert.alert('فيسبوك', 'سيتم فتح فيسبوك لمشاركة المقطع');
        break;
      case 'instagram':
        Alert.alert('إنستجرام', 'سيتم فتح إنستجرام لمشاركة المقطع');
        break;
      default:
        Alert.alert('مشاركة', 'تم مشاركة المقطع');
    }
  };
  
  const handleDonate = () => {
    Alert.alert(
      'تبرع للمقطع',
      'اختر المبلغ الذي تريد التبرع به',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: '5 ريال', onPress: () => processDonation(5, 'SAR') },
        { text: '10 ريال', onPress: () => processDonation(10, 'SAR') },
        { text: '20 ريال', onPress: () => processDonation(20, 'SAR') },
      ]
    );
  };
  
  const processDonation = async (amount: number, currency: string) => {
    try {
      const balance = balances.find(b => b.currency === currency);
      if (!balance || balance.amount < amount) {
        Alert.alert('خطأ', 'رصيد غير كافٍ');
        return;
      }

      // Deduct money from user's balance
      await updateBalance(currency, -amount);

      // Add transaction record
      await addTransaction({
        id: Date.now().toString(),
        senderId: userId || '0',
        receiverId: reel.userId,
        amount,
        currency,
        timestamp: Date.now(),
        status: 'completed',
        type: 'donation',
        note: `تبرع للمقطع: ${reel.caption?.substring(0, 50) || 'مقطع فيديو'}...`,
      });

      // Send notification to the recipient
      Alert.alert(
        'شكراً لك!', 
        `تم التبرع بمبلغ ${amount} ${currency} بنجاح

سيتم إرسال إشعار للمستخدم ${reel.user.displayName} بأنه تلقى تبرعاً منك.`
      );

      // Simulate sending notification to recipient
      setTimeout(() => {
        // This would normally be sent through a notification service
        console.log(`Notification sent to ${reel.user.displayName}: You received a donation of ${amount} ${currency} from a user. Thank you!`);
      }, 1000);

    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال التبرع');
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}د`;
    } else if (hours < 24) {
      return `${hours}س`;
    } else {
      return `${days}ي`;
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Video Player */}
      <TouchableOpacity 
        activeOpacity={1} 
        style={styles.videoContainer} 
        onPress={togglePlayback}
      >
        <Video
          source={{ uri: reel.videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isPlaying}
          isLooping
          isMuted={false}
        />
        
        {/* Play/Pause Indicator */}
        {!isPlaying && (
          <View style={styles.playIndicator}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
      
      {/* TikTok-like Overlay */}
      <View style={styles.overlay}>
        {/* Bottom Content */}
        <View style={styles.bottomContent}>
          {/* User Info */}
          <View style={styles.userSection}>
            <View style={styles.userInfo}>
              <Image source={{ uri: reel.user.profilePicture }} style={styles.avatar} />
              <View style={styles.userDetails}>
                <Text style={styles.username}>@{reel.user.username}</Text>
                <Text style={styles.displayName}>{reel.user.displayName}</Text>
              </View>
              <TouchableOpacity style={styles.followButton}>
                <Text style={styles.followText}>متابعة</Text>
              </TouchableOpacity>
            </View>
            
            {/* Caption */}
            {reel.caption && (
              <View style={styles.captionContainer}>
                <Text style={styles.caption} numberOfLines={3}>
                  {reel.caption}
                </Text>
              </View>
            )}
            
            {/* Music Info */}
            <View style={styles.musicInfo}>
              <Music size={14} color="white" />
              <Text style={styles.musicText}>الصوت الأصلي - {reel.user.displayName}</Text>
            </View>
          </View>
        </View>
        
        {/* Right Side Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Heart 
              size={32} 
              color="white" 
              fill={liked ? "white" : "none"}
            />
            <Text style={styles.actionCount}>
              {likesCount > 1000 ? `${(likesCount/1000).toFixed(1)}k` : likesCount}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
            <MessageCircle size={32} color="white" />
            <Text style={styles.actionCount}>
              {commentsCount > 1000 ? `${(commentsCount/1000).toFixed(1)}k` : commentsCount}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={32} color="white" />
            <Text style={styles.actionCount}>
              {sharesCount > 1000 ? `${(sharesCount/1000).toFixed(1)}k` : sharesCount}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setSaved(!saved)}
          >
            <Bookmark 
              size={32} 
              color="white" 
              fill={saved ? "white" : "none"}
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <MoreVertical size={32} color="white" />
          </TouchableOpacity>
          
          {/* Donate Button */}
          <TouchableOpacity 
            style={styles.donateActionButton}
            onPress={handleDonate}
          >
            <Wallet size={28} color="white" />
            <Text style={styles.donateActionText}>{t.donate}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.commentsModal}>
          <View style={styles.commentsHeader}>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <X size={24} color={Colors.dark} />
            </TouchableOpacity>
            <Text style={styles.commentsTitle}>التعليقات ({commentsCount})</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.commentsList}>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Image source={{ uri: comment.user.profilePicture }} style={styles.commentAvatar} />
                <View style={styles.commentContent}>
                  <Text style={styles.commentUserName}>{comment.user.displayName}</Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  <Text style={styles.commentTime}>{formatTimeAgo(comment.timestamp)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.commentInput}>
            <TextInput
              style={styles.commentTextInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="اكتب تعليقاً..."
              placeholderTextColor={Colors.medium}
              multiline
            />
            <TouchableOpacity onPress={handleAddComment} style={styles.commentSendButton}>
              <Send size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share Options Modal */}
      <Modal
        visible={showShareOptions}
        animationType="slide"
        transparent
        onRequestClose={() => setShowShareOptions(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModal}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareTitle}>مشاركة المقطع</Text>
              <TouchableOpacity onPress={() => setShowShareOptions(false)}>
                <X size={24} color={Colors.dark} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.shareOptions}>
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('copy')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>🔗</Text>
                </View>
                <Text style={styles.shareOptionText}>نسخ الرابط</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('whatsapp')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>📱</Text>
                </View>
                <Text style={styles.shareOptionText}>واتساب</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('telegram')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>✈️</Text>
                </View>
                <Text style={styles.shareOptionText}>تيليجرام</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('twitter')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>🐦</Text>
                </View>
                <Text style={styles.shareOptionText}>تويتر</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('facebook')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>📘</Text>
                </View>
                <Text style={styles.shareOptionText}>فيسبوك</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('instagram')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>📷</Text>
                </View>
                <Text style={styles.shareOptionText}>إنستجرام</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height: height - 120, // Adjust for tab bar and header
    backgroundColor: 'black',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  playIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: 'white',
    fontSize: 32,
    marginLeft: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  bottomContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 100,
    paddingLeft: 16,
    paddingRight: 80,
  },
  userSection: {
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'white',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  displayName: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  followButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  followText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  captionContainer: {
    marginBottom: 12,
  },
  caption: {
    color: 'white',
    fontSize: 15,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  musicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  musicText: {
    color: 'white',
    fontSize: 13,
    marginLeft: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  actionsContainer: {
    alignItems: 'center',
    paddingRight: 16,
    paddingBottom: 100,
    justifyContent: 'flex-end',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionCount: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  donateActionButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  donateActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  // Comments Modal Styles
  commentsModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: Colors.medium,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 14,
    color: Colors.dark,
  },
  commentSendButton: {
    padding: 8,
  },
  // Share Modal Styles
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  shareOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  shareOption: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  shareOptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shareOptionEmoji: {
    fontSize: 24,
  },
  shareOptionText: {
    fontSize: 12,
    color: Colors.dark,
    textAlign: 'center',
  },
});