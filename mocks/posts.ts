import { Post } from '@/types';
import { mockUsers } from './users';

export const mockPosts: Post[] = [
  {
    id: 'post_1',
    userId: 'user_1',
    user: mockUsers[0],
    content: 'استمتعت بيوم رائع في الحديقة مع الأصدقاء! الطقس كان مثالياً والجو كان مليء بالضحك والمرح. أحياناً أبسط اللحظات هي الأجمل 🌳☀️',
    mediaUrls: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop'
    ],
    likes: 127,
    comments: 23,
    shares: 8,
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    type: 'image',
    socialContext: {
      friendsWhoLiked: ['user_2', 'user_3', 'user_5'],
      friendsWhoCommented: ['user_2', 'user_4'],
      friendsWhoShared: [],
      mutualFriendEngagement: 0.75,
      socialProofScore: 0.8,
      viralityScore: 0.6
    },
    engagementMetrics: {
      totalEngagements: 158,
      engagementRate: 0.85,
      averageViewTime: 45000,
      shareToLikeRatio: 0.063,
      commentToLikeRatio: 0.181,
      qualityEngagementScore: 0.78,
      timeDecayedEngagement: 142,
      peakEngagementTime: Date.now() - 1.5 * 60 * 60 * 1000
    }
  },
  {
    id: 'post_2',
    userId: 'user_2',
    user: mockUsers[1],
    content: 'تعلمت اليوم وصفة جديدة للمعكرونة الإيطالية! النكهة كانت لا تُصدق والعائلة أحبتها جداً. سأشارككم الوصفة قريباً 🍝👨‍🍳',
    mediaUrls: [
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=800&h=600&fit=crop'
    ],
    likes: 89,
    comments: 31,
    shares: 12,
    timestamp: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
    type: 'image',
    socialContext: {
      friendsWhoLiked: ['user_1', 'user_3', 'user_4', 'user_6'],
      friendsWhoCommented: ['user_1', 'user_5', 'user_7'],
      friendsWhoShared: ['user_3'],
      mutualFriendEngagement: 0.65,
      socialProofScore: 0.7,
      viralityScore: 0.55
    },
    engagementMetrics: {
      totalEngagements: 132,
      engagementRate: 0.72,
      averageViewTime: 38000,
      shareToLikeRatio: 0.135,
      commentToLikeRatio: 0.348,
      qualityEngagementScore: 0.82,
      timeDecayedEngagement: 118,
      peakEngagementTime: Date.now() - 3.5 * 60 * 60 * 1000
    }
  },
  {
    id: 'post_3',
    userId: 'user_3',
    user: mockUsers[2],
    content: 'انتهيت للتو من قراءة كتاب "الخيميائي" لباولو كويلو. قصة ملهمة جداً عن اتباع الأحلام وإيجاد الهدف في الحياة. أنصح الجميع بقراءته! 📚✨',
    mediaUrls: [
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop'
    ],
    likes: 156,
    comments: 45,
    shares: 18,
    timestamp: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
    type: 'image',
    socialContext: {
      friendsWhoLiked: ['user_1', 'user_2', 'user_4', 'user_5', 'user_8'],
      friendsWhoCommented: ['user_2', 'user_6', 'user_7', 'user_9'],
      friendsWhoShared: ['user_1', 'user_4'],
      mutualFriendEngagement: 0.85,
      socialProofScore: 0.9,
      viralityScore: 0.75
    },
    engagementMetrics: {
      totalEngagements: 219,
      engagementRate: 0.91,
      averageViewTime: 52000,
      shareToLikeRatio: 0.115,
      commentToLikeRatio: 0.288,
      qualityEngagementScore: 0.88,
      timeDecayedEngagement: 195,
      peakEngagementTime: Date.now() - 5.5 * 60 * 60 * 1000
    }
  },
  {
    id: 'post_4',
    userId: 'user_4',
    user: mockUsers[3],
    content: 'صباح الخير جميعاً! بدأت يومي بجلسة تأمل وتمارين يوغا. أشعر بطاقة إيجابية رائعة! كيف تبدؤون أنتم يومكم؟ 🧘‍♀️🌅',
    likes: 203,
    comments: 67,
    shares: 25,
    timestamp: Date.now() - 8 * 60 * 60 * 1000, // 8 hours ago
    type: 'text',
    socialContext: {
      friendsWhoLiked: ['user_1', 'user_2', 'user_3', 'user_5', 'user_6', 'user_7'],
      friendsWhoCommented: [],
      friendsWhoShared: [],
      mutualFriendEngagement: 0.92,
      socialProofScore: 0.95,
      viralityScore: 0.82
    },
    engagementMetrics: {
      totalEngagements: 295,
      engagementRate: 0.98,
      averageViewTime: 28000,
      shareToLikeRatio: 0.123,
      commentToLikeRatio: 0.330,
      qualityEngagementScore: 0.92,
      timeDecayedEngagement: 265,
      peakEngagementTime: Date.now() - 7.5 * 60 * 60 * 1000
    }
  },
  {
    id: 'post_5',
    userId: 'user_5',
    user: mockUsers[4],
    content: 'شاهدت فيلماً رائعاً البارحة! "الحياة الجميلة" للمخرج روبرتو بينيني. فيلم يجمع بين الكوميديا والدراما بطريقة مؤثرة جداً. من أجمل الأفلام التي شاهدتها! 🎬❤️',
    mediaUrls: [
      'https://images.unsplash.com/photo-1489599735734-79b4169c2a78?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&h=600&fit=crop'
    ],
    likes: 134,
    comments: 28,
    shares: 15,
    timestamp: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
    type: 'image',
    socialContext: {
      friendsWhoLiked: ['user_2', 'user_3', 'user_4', 'user_6'],
      friendsWhoCommented: ['user_1', 'user_3', 'user_7'],
      friendsWhoShared: ['user_2', 'user_4'],
      mutualFriendEngagement: 0.68,
      socialProofScore: 0.72,
      viralityScore: 0.58
    },
    engagementMetrics: {
      totalEngagements: 177,
      engagementRate: 0.74,
      averageViewTime: 41000,
      shareToLikeRatio: 0.112,
      commentToLikeRatio: 0.209,
      qualityEngagementScore: 0.79,
      timeDecayedEngagement: 158,
      peakEngagementTime: Date.now() - 11.5 * 60 * 60 * 1000
    }
  },
  {
    id: 'post_6',
    userId: 'user_6',
    user: mockUsers[5],
    content: 'زرت معرض الفن المحلي اليوم وكان مذهلاً! الأعمال الفنية كانت متنوعة ومبدعة. دعم الفنانين المحليين مهم جداً لنمو المجتمع الثقافي 🎨🖼️',
    mediaUrls: [
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop'
    ],
    likes: 98,
    comments: 19,
    shares: 7,
    timestamp: Date.now() - 16 * 60 * 60 * 1000, // 16 hours ago
    type: 'image',
    socialContext: {
      friendsWhoLiked: ['user_1', 'user_3', 'user_5', 'user_7'],
      friendsWhoCommented: ['user_2', 'user_4', 'user_8'],
      friendsWhoShared: ['user_3'],
      mutualFriendEngagement: 0.58,
      socialProofScore: 0.62,
      viralityScore: 0.45
    },
    engagementMetrics: {
      totalEngagements: 124,
      engagementRate: 0.65,
      averageViewTime: 35000,
      shareToLikeRatio: 0.071,
      commentToLikeRatio: 0.194,
      qualityEngagementScore: 0.71,
      timeDecayedEngagement: 108,
      peakEngagementTime: Date.now() - 15.5 * 60 * 60 * 1000
    }
  },
  {
    id: 'post_7',
    userId: 'user_7',
    user: mockUsers[6],
    content: 'تحدي جديد! قررت أن أتعلم العزف على الجيتار. اشتريت جيتاراً جديداً وبدأت أول درس اليوم. الطريق طويل لكن متحمس جداً! 🎸🎵',
    likes: 176,
    comments: 52,
    shares: 21,
    timestamp: Date.now() - 20 * 60 * 60 * 1000, // 20 hours ago
    type: 'text',
    socialContext: {
      friendsWhoLiked: ['user_1', 'user_2', 'user_4', 'user_5', 'user_6', 'user_8'],
      friendsWhoCommented: ['user_3', 'user_5', 'user_9'],
      friendsWhoShared: ['user_2', 'user_4', 'user_6'],
      mutualFriendEngagement: 0.78,
      socialProofScore: 0.82,
      viralityScore: 0.69
    },
    engagementMetrics: {
      totalEngagements: 249,
      engagementRate: 0.83,
      averageViewTime: 32000,
      shareToLikeRatio: 0.119,
      commentToLikeRatio: 0.295,
      qualityEngagementScore: 0.85,
      timeDecayedEngagement: 218,
      peakEngagementTime: Date.now() - 19.5 * 60 * 60 * 1000
    }
  },
  {
    id: 'post_8',
    userId: 'user_8',
    user: mockUsers[7],
    content: 'رحلة تسوق ممتعة في السوق المحلي! اشتريت خضروات وفواكه طازجة من المزارعين المحليين. طعم الطبيعة الحقيقي لا يُضاهى! 🥕🍎🥬',
    mediaUrls: [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=800&h=600&fit=crop'
    ],
    likes: 112,
    comments: 24,
    shares: 9,
    timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    type: 'image',
    socialContext: {
      friendsWhoLiked: ['user_2', 'user_3', 'user_5', 'user_7'],
      friendsWhoCommented: ['user_1', 'user_4', 'user_6'],
      friendsWhoShared: ['user_3', 'user_5'],
      mutualFriendEngagement: 0.62,
      socialProofScore: 0.66,
      viralityScore: 0.48
    },
    engagementMetrics: {
      totalEngagements: 145,
      engagementRate: 0.69,
      averageViewTime: 39000,
      shareToLikeRatio: 0.080,
      commentToLikeRatio: 0.214,
      qualityEngagementScore: 0.73,
      timeDecayedEngagement: 125,
      peakEngagementTime: Date.now() - 23.5 * 60 * 60 * 1000
    }
  }
];