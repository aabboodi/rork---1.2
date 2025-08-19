import { User, FamilyRelationship } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'john_doe',
    displayName: 'John Doe',
    phoneNumber: '+1234567890',
    profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    isOnline: true,
    lastSeen: Date.now(),
    bio: 'Software Engineer passionate about mobile development',
    workPlace: 'Tech Solutions Inc.',
    placeOfWork: 'Tech Solutions Inc.',
    // Enhanced for feed ranking
    socialGraph: {
      friends: ['2', '3', '4', '5'],
      friendsOfFriends: ['6', '7', '8', '9'],
      family: ['11', '12'], // Added family connections
      colleagues: ['2', '5'],
      influencers: ['10', '11'],
      groups: ['tech_group', 'mobile_dev'],
      mutualConnections: {
        '2': 3,
        '3': 2,
        '4': 1,
        '5': 4
      },
      connectionStrengths: {
        '2': {
          userId: '2',
          strength: 'strong',
          interactionFrequency: 5.2,
          mutualFriends: 3,
          relationshipType: 'colleague',
          connectionDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
          lastInteraction: Date.now() - 2 * 60 * 60 * 1000,
          affinityScore: 0.8
        },
        '3': {
          userId: '3',
          strength: 'medium',
          interactionFrequency: 2.1,
          mutualFriends: 2,
          relationshipType: 'friend',
          connectionDate: Date.now() - 180 * 24 * 60 * 60 * 1000,
          lastInteraction: Date.now() - 24 * 60 * 60 * 1000,
          affinityScore: 0.6
        }
      },
      lastUpdated: Date.now()
    },
    interactionHistory: {
      totalInteractions: 245,
      dailyInteractions: 12,
      weeklyInteractions: 84,
      monthlyInteractions: 360,
      favoriteAuthors: ['2', '4', '5'],
      preferredContentTypes: ['text', 'image'],
      peakActivityHours: [9, 13, 18, 21],
      averageSessionDuration: 18,
      engagementRate: 0.15,
      lastActivityTime: Date.now() - 30 * 60 * 1000
    },
    // Enhanced family relationships
    familyRelationships: [
      {
        userId: '11',
        relationshipType: 'sibling',
        confirmedBy: 'both',
        createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
        displayName: 'Sarah Doe',
        isPublic: true
      },
      {
        userId: '12',
        relationshipType: 'parent',
        confirmedBy: 'both',
        createdAt: Date.now() - 2 * 365 * 24 * 60 * 60 * 1000,
        displayName: 'Robert Doe',
        isPublic: false
      }
    ]
  },
  {
    id: '2',
    username: 'jane_smith',
    displayName: 'Jane Smith',
    phoneNumber: '+1234567891',
    profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    isOnline: false,
    lastSeen: Date.now() - 30 * 60 * 1000, // 30 minutes ago
    bio: 'Designer & Creative Director',
    workPlace: 'Creative Studio',
    placeOfWork: 'Creative Studio',
    // Enhanced for feed ranking
    socialGraph: {
      friends: ['1', '3', '4', '5'],
      friendsOfFriends: ['6', '7', '8'],
      family: ['13'], // Added family connections
      colleagues: ['1', '4'],
      influencers: ['13', '14'],
      groups: ['design_community', 'creative_minds'],
      mutualConnections: {
        '1': 3,
        '3': 4,
        '4': 2,
        '5': 3
      },
      connectionStrengths: {
        '1': {
          userId: '1',
          strength: 'strong',
          interactionFrequency: 4.8,
          mutualFriends: 3,
          relationshipType: 'colleague',
          connectionDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
          lastInteraction: Date.now() - 1 * 60 * 60 * 1000,
          affinityScore: 0.85
        }
      },
      lastUpdated: Date.now()
    },
    interactionHistory: {
      totalInteractions: 189,
      dailyInteractions: 8,
      weeklyInteractions: 56,
      monthlyInteractions: 240,
      favoriteAuthors: ['1', '3', '5'],
      preferredContentTypes: ['image', 'video'],
      peakActivityHours: [10, 14, 19, 22],
      averageSessionDuration: 22,
      engagementRate: 0.18,
      lastActivityTime: Date.now() - 45 * 60 * 1000
    },
    // Enhanced family relationships
    familyRelationships: [
      {
        userId: '13',
        relationshipType: 'spouse',
        confirmedBy: 'both',
        createdAt: Date.now() - 3 * 365 * 24 * 60 * 60 * 1000,
        displayName: 'Michael Smith',
        isPublic: true
      }
    ]
  },
  {
    id: '3',
    username: 'mike_wilson',
    displayName: 'Mike Wilson',
    phoneNumber: '+1234567892',
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    isOnline: true,
    lastSeen: Date.now(),
    bio: 'Product Manager at StartupXYZ',
    workPlace: 'StartupXYZ',
    placeOfWork: 'StartupXYZ',
    // Enhanced for feed ranking
    socialGraph: {
      friends: ['1', '2', '4', '5'],
      friendsOfFriends: ['6', '7'],
      family: ['14', '15'], // Added family connections
      colleagues: ['4'],
      influencers: ['15', '16'],
      groups: ['product_managers', 'startup_community'],
      mutualConnections: {
        '1': 2,
        '2': 4,
        '4': 3,
        '5': 2
      },
      connectionStrengths: {
        '2': {
          userId: '2',
          strength: 'very_strong',
          interactionFrequency: 6.1,
          mutualFriends: 4,
          relationshipType: 'friend',
          connectionDate: Date.now() - 500 * 24 * 60 * 60 * 1000,
          lastInteraction: Date.now() - 30 * 60 * 1000,
          affinityScore: 0.9
        }
      },
      lastUpdated: Date.now()
    },
    interactionHistory: {
      totalInteractions: 156,
      dailyInteractions: 6,
      weeklyInteractions: 42,
      monthlyInteractions: 180,
      favoriteAuthors: ['2', '4', '1'],
      preferredContentTypes: ['text', 'shared'],
      peakActivityHours: [8, 12, 17, 20],
      averageSessionDuration: 15,
      engagementRate: 0.12,
      lastActivityTime: Date.now() - 15 * 60 * 1000
    },
    // Enhanced family relationships
    familyRelationships: [
      {
        userId: '14',
        relationshipType: 'child',
        confirmedBy: 'both',
        createdAt: Date.now() - 5 * 365 * 24 * 60 * 60 * 1000,
        displayName: 'Emma Wilson',
        isPublic: true
      },
      {
        userId: '15',
        relationshipType: 'parent',
        confirmedBy: 'both',
        createdAt: Date.now() - 30 * 365 * 24 * 60 * 60 * 1000,
        displayName: 'David Wilson',
        isPublic: false
      }
    ]
  },
  {
    id: '4',
    username: 'sarah_johnson',
    displayName: 'Sarah Johnson',
    phoneNumber: '+1234567893',
    profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    isOnline: false,
    lastSeen: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    bio: 'Marketing Specialist',
    workPlace: 'Digital Agency',
    placeOfWork: 'Digital Agency',
    // Enhanced for feed ranking
    socialGraph: {
      friends: ['1', '2', '3', '5'],
      friendsOfFriends: ['6', '8', '9'],
      family: ['16', '17'], // Added family connections
      colleagues: ['2', '3'],
      influencers: ['18', '19'],
      groups: ['marketing_pros', 'digital_marketing'],
      mutualConnections: {
        '1': 1,
        '2': 2,
        '3': 3,
        '5': 1
      },
      connectionStrengths: {
        '3': {
          userId: '3',
          strength: 'strong',
          interactionFrequency: 3.7,
          mutualFriends: 3,
          relationshipType: 'colleague',
          connectionDate: Date.now() - 200 * 24 * 60 * 60 * 1000,
          lastInteraction: Date.now() - 3 * 60 * 60 * 1000,
          affinityScore: 0.75
        }
      },
      lastUpdated: Date.now()
    },
    interactionHistory: {
      totalInteractions: 203,
      dailyInteractions: 9,
      weeklyInteractions: 63,
      monthlyInteractions: 270,
      favoriteAuthors: ['3', '1', '2'],
      preferredContentTypes: ['text', 'image', 'video'],
      peakActivityHours: [9, 15, 18, 21],
      averageSessionDuration: 20,
      engagementRate: 0.16,
      lastActivityTime: Date.now() - 2 * 60 * 60 * 1000
    },
    // Enhanced family relationships
    familyRelationships: [
      {
        userId: '16',
        relationshipType: 'sibling',
        confirmedBy: 'both',
        createdAt: Date.now() - 2 * 365 * 24 * 60 * 60 * 1000,
        displayName: 'Mark Johnson',
        isPublic: true
      },
      {
        userId: '17',
        relationshipType: 'cousin',
        confirmedBy: 'both',
        createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
        displayName: 'Lisa Johnson',
        isPublic: true
      }
    ]
  },
  {
    id: '5',
    username: 'alex_brown',
    displayName: 'Alex Brown',
    phoneNumber: '+1234567894',
    profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    isOnline: true,
    lastSeen: Date.now(),
    bio: 'Full Stack Developer',
    workPlace: 'Freelancer',
    placeOfWork: 'Freelancer',
    // Enhanced for feed ranking
    socialGraph: {
      friends: ['1', '2', '3', '4'],
      friendsOfFriends: ['6', '7', '8'],
      family: ['18'], // Added family connections
      colleagues: ['1'],
      influencers: ['20', '21'],
      groups: ['developers', 'freelancers'],
      mutualConnections: {
        '1': 4,
        '2': 3,
        '3': 2,
        '4': 1
      },
      connectionStrengths: {
        '1': {
          userId: '1',
          strength: 'very_strong',
          interactionFrequency: 5.8,
          mutualFriends: 4,
          relationshipType: 'colleague',
          connectionDate: Date.now() - 400 * 24 * 60 * 60 * 1000,
          lastInteraction: Date.now() - 10 * 60 * 1000,
          affinityScore: 0.88
        }
      },
      lastUpdated: Date.now()
    },
    interactionHistory: {
      totalInteractions: 178,
      dailyInteractions: 7,
      weeklyInteractions: 49,
      monthlyInteractions: 210,
      favoriteAuthors: ['1', '2', '3'],
      preferredContentTypes: ['text', 'video'],
      peakActivityHours: [10, 16, 19, 23],
      averageSessionDuration: 25,
      engagementRate: 0.14,
      lastActivityTime: Date.now() - 5 * 60 * 1000
    },
    // Enhanced family relationships
    familyRelationships: [
      {
        userId: '18',
        relationshipType: 'grandparent',
        confirmedBy: 'both',
        createdAt: Date.now() - 25 * 365 * 24 * 60 * 60 * 1000,
        displayName: 'Eleanor Brown',
        isPublic: false
      }
    ]
  }
];

export const currentUser: User = {
  id: '0',
  username: 'current_user',
  displayName: 'أحمد محمد',
  phoneNumber: '+966501234567',
  profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  isOnline: true,
  lastSeen: Date.now(),
  bio: 'مطور تطبيقات ومهتم بالتكنولوجيا',
  workPlace: 'شركة التقنيات المتقدمة',
  placeOfWork: 'شركة التقنيات المتقدمة',
  // Enhanced for feed ranking
  socialGraph: {
    friends: ['1', '2', '3', '4', '5'],
    friendsOfFriends: ['6', '7', '8', '9', '10'],
    family: ['19', '20', '21'], // Enhanced family connections
    colleagues: ['1', '2', '5'],
    influencers: ['13', '14', '15'],
    groups: ['tech_enthusiasts', 'mobile_developers', 'arabic_developers'],
    mutualConnections: {
      '1': 4,
      '2': 3,
      '3': 2,
      '4': 2,
      '5': 4
    },
    connectionStrengths: {
      '1': {
        userId: '1',
        strength: 'very_strong',
        interactionFrequency: 6.2,
        mutualFriends: 4,
        relationshipType: 'colleague',
        connectionDate: Date.now() - 600 * 24 * 60 * 60 * 1000,
        lastInteraction: Date.now() - 5 * 60 * 1000,
        affinityScore: 0.92
      },
      '2': {
        userId: '2',
        strength: 'strong',
        interactionFrequency: 4.5,
        mutualFriends: 3,
        relationshipType: 'colleague',
        connectionDate: Date.now() - 400 * 24 * 60 * 60 * 1000,
        lastInteraction: Date.now() - 20 * 60 * 1000,
        affinityScore: 0.78
      },
      '3': {
        userId: '3',
        strength: 'medium',
        interactionFrequency: 2.8,
        mutualFriends: 2,
        relationshipType: 'friend',
        connectionDate: Date.now() - 250 * 24 * 60 * 60 * 1000,
        lastInteraction: Date.now() - 60 * 60 * 1000,
        affinityScore: 0.65
      },
      '4': {
        userId: '4',
        strength: 'medium',
        interactionFrequency: 3.1,
        mutualFriends: 2,
        relationshipType: 'friend',
        connectionDate: Date.now() - 300 * 24 * 60 * 60 * 1000,
        lastInteraction: Date.now() - 4 * 60 * 60 * 1000,
        affinityScore: 0.68
      },
      '5': {
        userId: '5',
        strength: 'very_strong',
        interactionFrequency: 5.9,
        mutualFriends: 4,
        relationshipType: 'colleague',
        connectionDate: Date.now() - 500 * 24 * 60 * 60 * 1000,
        lastInteraction: Date.now() - 15 * 60 * 1000,
        affinityScore: 0.89
      }
    },
    lastUpdated: Date.now()
  },
  interactionHistory: {
    totalInteractions: 312,
    dailyInteractions: 15,
    weeklyInteractions: 105,
    monthlyInteractions: 450,
    favoriteAuthors: ['1', '2', '5', '4'],
    preferredContentTypes: ['text', 'image', 'video'],
    peakActivityHours: [8, 12, 18, 21],
    averageSessionDuration: 28,
    engagementRate: 0.19,
    lastActivityTime: Date.now()
  },
  // Enhanced family relationships with Arabic names
  familyRelationships: [
    {
      userId: '19',
      relationshipType: 'sibling',
      confirmedBy: 'both',
      createdAt: Date.now() - 2 * 365 * 24 * 60 * 60 * 1000,
      displayName: 'فاطمة محمد',
      isPublic: true
    },
    {
      userId: '20',
      relationshipType: 'parent',
      confirmedBy: 'both',
      createdAt: Date.now() - 30 * 365 * 24 * 60 * 60 * 1000,
      displayName: 'محمد علي',
      isPublic: false
    },
    {
      userId: '21',
      relationshipType: 'spouse',
      confirmedBy: 'both',
      createdAt: Date.now() - 5 * 365 * 24 * 60 * 60 * 1000,
      displayName: 'نورا أحمد',
      isPublic: true
    },
    {
      userId: '22',
      relationshipType: 'child',
      confirmedBy: 'both',
      createdAt: Date.now() - 3 * 365 * 24 * 60 * 60 * 1000,
      displayName: 'عبدالله أحمد',
      isPublic: true
    },
    {
      userId: '23',
      relationshipType: 'cousin',
      confirmedBy: 'both',
      createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
      displayName: 'خالد محمد',
      isPublic: true
    }
  ]
};

// Additional family members for enhanced suggestions
export const mockFamilyMembers: User[] = [
  {
    id: '19',
    username: 'fatima_m',
    displayName: 'فاطمة محمد',
    phoneNumber: '+966501234568',
    profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    isOnline: true,
    lastSeen: Date.now(),
    bio: 'مصممة جرافيك ومهتمة بالفنون',
    workPlace: 'استوديو الإبداع',
    placeOfWork: 'استوديو الإبداع',
    socialGraph: {
      friends: ['family_friend_1', 'family_friend_2', 'family_friend_3'],
      friendsOfFriends: [],
      family: ['0', '20', '21'],
      colleagues: ['colleague_1', 'colleague_2'],
      influencers: [],
      groups: ['design_community_ar'],
      mutualConnections: {},
      connectionStrengths: {},
      lastUpdated: Date.now()
    },
    interactionHistory: {
      totalInteractions: 89,
      dailyInteractions: 5,
      weeklyInteractions: 35,
      monthlyInteractions: 150,
      favoriteAuthors: ['0', 'family_friend_1'],
      preferredContentTypes: ['image', 'video'],
      peakActivityHours: [10, 14, 19, 22],
      averageSessionDuration: 20,
      engagementRate: 0.16,
      lastActivityTime: Date.now() - 30 * 60 * 1000
    },
    familyRelationships: [
      {
        userId: '0',
        relationshipType: 'sibling',
        confirmedBy: 'both',
        createdAt: Date.now() - 2 * 365 * 24 * 60 * 60 * 1000,
        displayName: 'أحمد محمد',
        isPublic: true
      }
    ]
  },
  {
    id: '20',
    username: 'mohammed_ali',
    displayName: 'محمد علي',
    phoneNumber: '+966501234569',
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    isOnline: false,
    lastSeen: Date.now() - 2 * 60 * 60 * 1000,
    bio: 'مهندس مدني متقاعد',
    workPlace: 'متقاعد',
    placeOfWork: 'متقاعد',
    socialGraph: {
      friends: ['old_friend_1', 'old_friend_2'],
      friendsOfFriends: [],
      family: ['0', '19', '21'],
      colleagues: [],
      influencers: [],
      groups: ['retirees_group'],
      mutualConnections: {},
      connectionStrengths: {},
      lastUpdated: Date.now()
    },
    interactionHistory: {
      totalInteractions: 45,
      dailyInteractions: 2,
      weeklyInteractions: 14,
      monthlyInteractions: 60,
      favoriteAuthors: ['0', '19'],
      preferredContentTypes: ['text'],
      peakActivityHours: [8, 12, 16, 20],
      averageSessionDuration: 15,
      engagementRate: 0.12,
      lastActivityTime: Date.now() - 2 * 60 * 60 * 1000
    },
    familyRelationships: [
      {
        userId: '0',
        relationshipType: 'child',
        confirmedBy: 'both',
        createdAt: Date.now() - 30 * 365 * 24 * 60 * 60 * 1000,
        displayName: 'أحمد محمد',
        isPublic: false
      }
    ]
  }
];