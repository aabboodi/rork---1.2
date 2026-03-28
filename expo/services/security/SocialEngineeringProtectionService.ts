import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface SuspiciousActivity {
  id: string;
  type: 'link' | 'file' | 'message' | 'contact_request';
  content: string;
  sender: {
    id: string;
    name: string;
    isContact: boolean;
    trustLevel: 'unknown' | 'low' | 'medium' | 'high';
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedPatterns: string[];
  timestamp: number;
}

export interface LinkAnalysis {
  url: string;
  isPhishing: boolean;
  isMalware: boolean;
  isShortened: boolean;
  actualDomain?: string;
  riskScore: number;
  warnings: string[];
}

export interface FileAnalysis {
  fileName: string;
  fileType: string;
  size: number;
  isSuspicious: boolean;
  riskScore: number;
  warnings: string[];
}

class SocialEngineeringProtectionService {
  private static instance: SocialEngineeringProtectionService;
  private phishingPatterns: RegExp[];
  private suspiciousFileTypes: string[];
  private trustedDomains: string[];
  private blockedDomains: string[];

  private constructor() {
    this.phishingPatterns = [
      /urgent.*action.*required/i,
      /verify.*account.*immediately/i,
      /suspended.*account/i,
      /click.*here.*now/i,
      /limited.*time.*offer/i,
      /congratulations.*winner/i,
      /free.*money/i,
      /inheritance.*million/i,
      /tax.*refund/i,
      /security.*alert/i
    ];

    this.suspiciousFileTypes = [
      '.exe', '.scr', '.bat', '.cmd', '.com', '.pif',
      '.vbs', '.js', '.jar', '.app', '.dmg', '.pkg'
    ];

    this.trustedDomains = [
      'google.com', 'apple.com', 'microsoft.com',
      'github.com', 'stackoverflow.com', 'wikipedia.org'
    ];

    this.blockedDomains = [];
    this.loadBlockedDomains();
  }

  static getInstance(): SocialEngineeringProtectionService {
    if (!SocialEngineeringProtectionService.instance) {
      SocialEngineeringProtectionService.instance = new SocialEngineeringProtectionService();
    }
    return SocialEngineeringProtectionService.instance;
  }

  private async loadBlockedDomains(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('blocked_domains');
      if (stored) {
        this.blockedDomains = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load blocked domains:', error);
    }
  }

  async analyzeLink(url: string, senderId: string): Promise<LinkAnalysis> {
    const analysis: LinkAnalysis = {
      url,
      isPhishing: false,
      isMalware: false,
      isShortened: false,
      riskScore: 0,
      warnings: []
    };

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // Check if domain is blocked
      if (this.blockedDomains.includes(domain)) {
        analysis.isPhishing = true;
        analysis.riskScore += 50;
        analysis.warnings.push('هذا الرابط من نطاق محظور');
      }

      // Check for URL shorteners
      const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly'];
      if (shorteners.some(s => domain.includes(s))) {
        analysis.isShortened = true;
        analysis.riskScore += 20;
        analysis.warnings.push('رابط مختصر - قد يخفي الوجهة الحقيقية');
      }

      // Check for suspicious patterns in URL
      if (this.containsSuspiciousPatterns(url)) {
        analysis.isPhishing = true;
        analysis.riskScore += 30;
        analysis.warnings.push('يحتوي على كلمات مشبوهة');
      }

      // Check if sender is trusted
      const senderTrust = await this.getSenderTrustLevel(senderId);
      if (senderTrust === 'unknown' || senderTrust === 'low') {
        analysis.riskScore += 25;
        analysis.warnings.push('مرسل من شخص غير موثوق');
      }

      // Check for HTTPS
      if (urlObj.protocol !== 'https:') {
        analysis.riskScore += 15;
        analysis.warnings.push('رابط غير مشفر (HTTP)');
      }

      // Determine final risk level
      if (analysis.riskScore >= 70) {
        analysis.isPhishing = true;
      }
      if (analysis.riskScore >= 50) {
        analysis.isMalware = true;
      }

    } catch (error) {
      analysis.riskScore = 100;
      analysis.warnings.push('رابط غير صالح أو مشبوه');
    }

    return analysis;
  }

  async analyzeFile(fileName: string, fileType: string, size: number, senderId: string): Promise<FileAnalysis> {
    const analysis: FileAnalysis = {
      fileName,
      fileType,
      size,
      isSuspicious: false,
      riskScore: 0,
      warnings: []
    };

    // Check file extension
    const extension = '.' + fileName.split('.').pop()?.toLowerCase();
    if (this.suspiciousFileTypes.includes(extension)) {
      analysis.isSuspicious = true;
      analysis.riskScore += 60;
      analysis.warnings.push('نوع ملف خطير قد يحتوي على برامج ضارة');
    }

    // Check file size (very large or very small files can be suspicious)
    if (size > 100 * 1024 * 1024) { // > 100MB
      analysis.riskScore += 20;
      analysis.warnings.push('ملف كبير الحجم - قد يكون مشبوه');
    } else if (size < 1024 && this.suspiciousFileTypes.includes(extension)) {
      analysis.riskScore += 30;
      analysis.warnings.push('ملف صغير جداً مع امتداد خطير');
    }

    // Check sender trust
    const senderTrust = await this.getSenderTrustLevel(senderId);
    if (senderTrust === 'unknown' || senderTrust === 'low') {
      analysis.riskScore += 25;
      analysis.warnings.push('ملف من شخص غير موثوق');
    }

    // Check for suspicious file names
    const suspiciousNames = [
      'invoice', 'receipt', 'document', 'photo', 'video',
      'update', 'patch', 'installer', 'setup'
    ];
    if (suspiciousNames.some(name => fileName.toLowerCase().includes(name))) {
      analysis.riskScore += 15;
      analysis.warnings.push('اسم ملف مشبوه');
    }

    analysis.isSuspicious = analysis.riskScore >= 50;

    return analysis;
  }

  private containsSuspiciousPatterns(text: string): boolean {
    return this.phishingPatterns.some(pattern => pattern.test(text));
  }

  private async getSenderTrustLevel(senderId: string): Promise<'unknown' | 'low' | 'medium' | 'high'> {
    try {
      // Check if sender is in contacts
      const contacts = await AsyncStorage.getItem('user_contacts');
      if (contacts) {
        const contactList = JSON.parse(contacts);
        if (contactList.includes(senderId)) {
          return 'high';
        }
      }

      // Check interaction history
      const interactions = await AsyncStorage.getItem(`interactions_${senderId}`);
      if (interactions) {
        const count = JSON.parse(interactions).count || 0;
        if (count > 50) return 'high';
        if (count > 10) return 'medium';
        if (count > 0) return 'low';
      }

      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  async reportSuspiciousActivity(activity: Omit<SuspiciousActivity, 'id' | 'timestamp'>): Promise<void> {
    const suspiciousActivity: SuspiciousActivity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: Date.now()
    };

    try {
      const stored = await AsyncStorage.getItem('suspicious_activities');
      const activities = stored ? JSON.parse(stored) : [];
      activities.push(suspiciousActivity);
      
      // Keep only last 100 activities
      if (activities.length > 100) {
        activities.splice(0, activities.length - 100);
      }
      
      await AsyncStorage.setItem('suspicious_activities', JSON.stringify(activities));
    } catch (error) {
      console.error('Failed to report suspicious activity:', error);
    }
  }

  async getSuspiciousActivities(): Promise<SuspiciousActivity[]> {
    try {
      const stored = await AsyncStorage.getItem('suspicious_activities');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get suspicious activities:', error);
      return [];
    }
  }

  async blockDomain(domain: string): Promise<void> {
    if (!this.blockedDomains.includes(domain)) {
      this.blockedDomains.push(domain);
      await AsyncStorage.setItem('blocked_domains', JSON.stringify(this.blockedDomains));
    }
  }

  async unblockDomain(domain: string): Promise<void> {
    this.blockedDomains = this.blockedDomains.filter(d => d !== domain);
    await AsyncStorage.setItem('blocked_domains', JSON.stringify(this.blockedDomains));
  }

  getBlockedDomains(): string[] {
    return [...this.blockedDomains];
  }

  // Educational content for users
  getSecurityTips(): string[] {
    return [
      'لا تنقر على روابط من أشخاص لا تعرفهم',
      'تحقق من عنوان الموقع قبل إدخال معلوماتك الشخصية',
      'لا تحمل ملفات من مصادر غير موثوقة',
      'كن حذراً من الرسائل التي تطلب معلومات شخصية',
      'استخدم كلمات مرور قوية ومختلفة لكل حساب',
      'فعل المصادقة الثنائية عند الإمكان'
    ];
  }
}

export default SocialEngineeringProtectionService;