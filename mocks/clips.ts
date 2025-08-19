import { Clip } from '@/types';
import { mockUsers, currentUser } from './users';

export const mockClips: Clip[] = [
  {
    id: '1',
    userId: '1',
    user: mockUsers[0],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=600&auto=format&fit=crop',
    caption: 'تطوير تطبيقات الهاتف المحمول 📱',
    description: 'نصائح سريعة لتطوير تطبيقات React Native',
    music: {
      id: 'music_1',
      title: 'Tech Vibes',
      artist: 'Digital Sounds',
      url: 'https://example.com/music1.mp3'
    },
    likes: 1250,
    comments: 89,
    shares: 45,
    views: 12500,
    timestamp: Date.now() - 3600000,
    duration: 30,
    hashtags: ['#تطوير', '#تكنولوجيا', '#برمجة'],
    mentions: ['@john_doe'],
    effects: ['Speed Ramp', 'Color Grading']
  },
  {
    id: '2',
    userId: '2',
    user: mockUsers[1],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=600&auto=format&fit=crop',
    caption: 'تصميم إبداعي جديد 🎨',
    description: 'عملية التصميم من البداية للنهاية',
    music: {
      id: 'music_2',
      title: 'Creative Flow',
      artist: 'Art Beats',
      url: 'https://example.com/music2.mp3'
    },
    likes: 2100,
    comments: 156,
    shares: 78,
    views: 18900,
    timestamp: Date.now() - 7200000,
    duration: 45,
    hashtags: ['#تصميم', '#إبداع', '#فن'],
    mentions: ['@jane_smith'],
    effects: ['Transition', 'Text Animation']
  },
  {
    id: '3',
    userId: '0',
    user: currentUser,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-urban-landscape-seen-from-a-moving-vehicle-34049-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=600&auto=format&fit=crop',
    caption: 'رحلة عمل في المدينة 🏙️',
    description: 'استكشاف الفرص الجديدة في عالم التكنولوجيا',
    music: {
      id: 'music_3',
      title: 'City Lights',
      artist: 'Urban Sounds',
      url: 'https://example.com/music3.mp3'
    },
    likes: 890,
    comments: 67,
    shares: 23,
    views: 8900,
    timestamp: Date.now() - 10800000,
    duration: 25,
    hashtags: ['#عمل', '#مدينة', '#تكنولوجيا'],
    mentions: [],
    effects: ['Slow Motion', 'Color Filter']
  },
  {
    id: '4',
    userId: '3',
    user: mockUsers[2],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-typing-on-smartphone-screen-4335-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?q=80&w=600&auto=format&fit=crop',
    caption: 'نصائح ريادة الأعمال 💼',
    description: 'كيف تبدأ مشروعك التقني الناجح',
    music: {
      id: 'music_4',
      title: 'Success Story',
      artist: 'Business Beats',
      url: 'https://example.com/music4.mp3'
    },
    likes: 1560,
    comments: 234,
    shares: 89,
    views: 15600,
    timestamp: Date.now() - 14400000,
    duration: 60,
    hashtags: ['#ريادة_أعمال', '#نجاح', '#استثمار'],
    mentions: ['@mike_wilson'],
    effects: ['Text Overlay', 'Zoom Effect']
  },
  {
    id: '5',
    userId: '4',
    user: mockUsers[3],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-doctor-giving-a-vaccine-to-a-little-girl-40185-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop',
    caption: 'نصائح صحية يومية 🏥',
    description: 'أهمية الفحوصات الدورية والوقاية',
    music: {
      id: 'music_5',
      title: 'Healthy Life',
      artist: 'Wellness Sounds',
      url: 'https://example.com/music5.mp3'
    },
    likes: 3200,
    comments: 445,
    shares: 156,
    views: 32000,
    timestamp: Date.now() - 18000000,
    duration: 40,
    hashtags: ['#صحة', '#طب', '#وقاية'],
    mentions: ['@sarah_johnson'],
    effects: ['Health Icons', 'Smooth Transition']
  },
  {
    id: '6',
    userId: '5',
    user: mockUsers[4],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    caption: 'برمجة متقدمة 💻',
    description: 'تقنيات حديثة في تطوير الويب',
    music: {
      id: 'music_6',
      title: 'Code Symphony',
      artist: 'Dev Sounds',
      url: 'https://example.com/music6.mp3'
    },
    likes: 1890,
    comments: 178,
    shares: 67,
    views: 18900,
    timestamp: Date.now() - 21600000,
    duration: 35,
    hashtags: ['#برمجة', '#ويب', '#تطوير'],
    mentions: ['@alex_brown'],
    effects: ['Code Animation', 'Syntax Highlight']
  }
];