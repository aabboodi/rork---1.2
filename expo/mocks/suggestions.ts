import { FriendSuggestion, ProximitySuggestion, ColleagueSuggestion, ContactSuggestion, AlgorithmicSuggestion, User } from '@/types';
import { mockUsers } from './users';

export const mockProximitySuggestions: ProximitySuggestion[] = [
  {
    user: mockUsers[0],
    suggestionType: 'proximity',
    reason: 'على بعد 500 متر منك',
    confidence: 0.9,
    metadata: {
      distance: 500,
      lastSeen: Date.now() - 1800000, // 30 minutes ago
      frequentLocation: 'مقهى التكنولوجيا'
    }
  },
  {
    user: mockUsers[1],
    suggestionType: 'proximity',
    reason: 'على بعد 1.2 كم منك',
    confidence: 0.7,
    metadata: {
      distance: 1200,
      lastSeen: Date.now() - 3600000, // 1 hour ago
      frequentLocation: 'مركز التسوق'
    }
  },
  {
    user: mockUsers[2],
    suggestionType: 'proximity',
    reason: 'على بعد 800 متر منك',
    confidence: 0.8,
    metadata: {
      distance: 800,
      lastSeen: Date.now() - 900000, // 15 minutes ago
      frequentLocation: 'مكتبة الجامعة'
    }
  }
];

export const mockColleagueSuggestions: ColleagueSuggestion[] = [
  {
    user: mockUsers[3],
    suggestionType: 'colleagues',
    reason: 'يعمل في نفس الشركة',
    confidence: 0.95,
    metadata: {
      sharedWorkplace: 'شركة التقنيات المتقدمة',
      coLocationScore: 0.85,
      workScheduleOverlap: 0.9
    }
  },
  {
    user: mockUsers[4],
    suggestionType: 'colleagues',
    reason: 'خريج نفس الجامعة',
    confidence: 0.8,
    metadata: {
      sharedEducation: 'جامعة الملك سعود - علوم الحاسب',
      coLocationScore: 0.6,
      workScheduleOverlap: 0.7
    }
  }
];

export const mockContactSuggestions: ContactSuggestion[] = [
  {
    user: {
      id: '6',
      displayName: 'أحمد محمد',
      username: 'ahmed_m',
      phoneNumber: '+966501234567',
      profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isOnline: true,
      lastSeen: Date.now(),
      bio: 'مطور تطبيقات ومهتم بالتكنولوجيا',
      workPlace: 'شركة التقنيات المتقدمة',
      placeOfWork: 'شركة التقنيات المتقدمة'
    },
    suggestionType: 'contacts',
    reason: 'من جهات الاتصال',
    confidence: 1.0,
    metadata: {
      contactSource: 'phone',
      mutualFriends: 3,
      contactFrequency: 0.8
    }
  },
  {
    user: {
      id: '7',
      displayName: 'فاطمة علي',
      username: 'fatima_a',
      phoneNumber: '+966507654321',
      profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      isOnline: false,
      lastSeen: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      bio: 'مصممة ومديرة إبداعية',
      workPlace: 'استوديو الإبداع',
      placeOfWork: 'استوديو الإبداع'
    },
    suggestionType: 'contacts',
    reason: 'من جهات الاتصال - صلة عائلية محتملة',
    confidence: 0.9,
    metadata: {
      contactSource: 'phone',
      mutualFriends: 8,
      familyConnection: true,
      contactFrequency: 0.95
    }
  }
];

export const mockAlgorithmicSuggestions: AlgorithmicSuggestion[] = [
  {
    user: {
      id: '8',
      displayName: 'خالد الأحمد',
      username: 'khalid_a',
      phoneNumber: '+966509876543',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      isOnline: true,
      lastSeen: Date.now(),
      bio: 'مهندس برمجيات متخصص في الذكاء الاصطناعي',
      workPlace: 'شركة الابتكار التقني',
      placeOfWork: 'شركة الابتكار التقني'
    },
    suggestionType: 'algorithmic',
    reason: 'اهتمامات مشتركة في التكنولوجيا',
    confidence: 0.85,
    metadata: {
      interestSimilarity: 0.9,
      contentSimilarity: 0.8,
      behaviorSimilarity: 0.7,
      diversityScore: 0.3,
      mutualFriends: 2
    }
  },
  {
    user: {
      id: '9',
      displayName: 'نورا السالم',
      username: 'nora_s',
      phoneNumber: '+966502468135',
      profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      isOnline: false,
      lastSeen: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
      bio: 'فنانة ومصورة فوتوغرافية',
      workPlace: 'مستقلة',
      placeOfWork: 'مستقلة'
    },
    suggestionType: 'algorithmic',
    reason: 'تنوع في الاهتمامات - اكتشف شيئاً جديداً',
    confidence: 0.6,
    metadata: {
      interestSimilarity: 0.2,
      contentSimilarity: 0.3,
      behaviorSimilarity: 0.4,
      diversityScore: 0.9,
      mutualFriends: 1
    }
  },
  {
    user: {
      id: '10',
      displayName: 'عبدالله الزهراني',
      username: 'abdullah_z',
      phoneNumber: '+966505551234',
      profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      isOnline: true,
      lastSeen: Date.now(),
      bio: 'مدير مشاريع في قطاع التكنولوجيا المالية',
      workPlace: 'شركة الحلول المالية',
      placeOfWork: 'شركة الحلول المالية'
    },
    suggestionType: 'algorithmic',
    reason: 'أصدقاء مشتركون كثيرون',
    confidence: 0.75,
    metadata: {
      interestSimilarity: 0.6,
      contentSimilarity: 0.7,
      behaviorSimilarity: 0.8,
      diversityScore: 0.4,
      mutualFriends: 12
    }
  }
];

export const mockAllSuggestions: FriendSuggestion[] = [
  ...mockProximitySuggestions,
  ...mockColleagueSuggestions,
  ...mockContactSuggestions,
  ...mockAlgorithmicSuggestions
];