// Date utility functions for the app

/**
 * Format a timestamp to a readable date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a timestamp to show time ago (e.g., "منذ 5 دقائق")
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) {
    return 'الآن';
  } else if (minutes < 60) {
    return `منذ ${minutes} دقيقة`;
  } else if (hours < 24) {
    return `منذ ${hours} ساعة`;
  } else if (days < 7) {
    return `منذ ${days} يوم`;
  } else {
    return formatDate(timestamp);
  }
}

/**
 * Format time for messages (e.g., "14:30")
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Check if a timestamp is today
 */
export function isToday(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);
  
  return today.toDateString() === date.toDateString();
}

/**
 * Check if a timestamp is yesterday
 */
export function isYesterday(timestamp: number): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(timestamp);
  
  return yesterday.toDateString() === date.toDateString();
}

/**
 * Format date for chat messages
 */
export function formatChatDate(timestamp: number): string {
  if (isToday(timestamp)) {
    return formatTime(timestamp);
  } else if (isYesterday(timestamp)) {
    return 'أمس';
  } else {
    return formatDate(timestamp);
  }
}

/**
 * Calculate exponential decay for engagement metrics
 */
export function exponentialDecay(value: number, timeElapsed: number, halfLife: number): number {
  return value * Math.pow(0.5, timeElapsed / halfLife);
}

/**
 * Calculate time-decayed engagement score
 */
export function calculateTimeDecayedEngagement(
  engagementScore: number,
  timestamp: number,
  halfLife: number = 24 * 60 * 60 * 1000 // 24 hours default
): number {
  const timeElapsed = Date.now() - timestamp;
  return exponentialDecay(engagementScore, timeElapsed, halfLife);
}

/**
 * Calculate recency score (0-1, where 1 is most recent)
 */
export function calculateRecencyScore(
  timestamp: number,
  maxAge: number = 7 * 24 * 60 * 60 * 1000 // 7 days default
): number {
  const age = Date.now() - timestamp;
  return Math.max(0, 1 - (age / maxAge));
}

/**
 * Calculate freshness score with bonus for very recent content
 */
export function calculateFreshnessScore(
  timestamp: number,
  freshnessWindow: number = 2 * 60 * 60 * 1000 // 2 hours default
): number {
  const age = Date.now() - timestamp;
  
  if (age < freshnessWindow) {
    // Bonus for very fresh content
    return 1 + (0.5 * (1 - age / freshnessWindow));
  } else {
    // Standard recency decay
    return calculateRecencyScore(timestamp);
  }
}

/**
 * Get time of day category
 */
export function getTimeOfDayCategory(timestamp: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date(timestamp).getHours();
  
  if (hour >= 6 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 17) {
    return 'afternoon';
  } else if (hour >= 17 && hour < 22) {
    return 'evening';
  } else {
    return 'night';
  }
}

/**
 * Get day of week in Arabic
 */
export function getDayOfWeekArabic(timestamp: number): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayIndex = new Date(timestamp).getDay();
  return days[dayIndex];
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
}

/**
 * Check if timestamp is within business hours
 */
export function isBusinessHours(timestamp: number): boolean {
  const hour = new Date(timestamp).getHours();
  return hour >= 9 && hour < 17; // 9 AM to 5 PM
}

/**
 * Check if timestamp is weekend
 */
export function isWeekend(timestamp: number): boolean {
  const day = new Date(timestamp).getDay();
  return day === 5 || day === 6; // Friday and Saturday in Saudi Arabia
}

/**
 * Get season from timestamp
 */
export function getSeason(timestamp: number): 'spring' | 'summer' | 'fall' | 'winter' {
  const month = new Date(timestamp).getMonth();
  
  if (month >= 2 && month <= 4) {
    return 'spring';
  } else if (month >= 5 && month <= 7) {
    return 'summer';
  } else if (month >= 8 && month <= 10) {
    return 'fall';
  } else {
    return 'winter';
  }
}

/**
 * Calculate optimal posting time score
 */
export function calculateOptimalTimingScore(timestamp: number): number {
  const hour = new Date(timestamp).getHours();
  const day = new Date(timestamp).getDay();
  
  let score = 0.5; // Base score
  
  // Peak hours bonus
  if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 22)) {
    score += 0.3;
  }
  
  // Weekend bonus
  if (day === 5 || day === 6) {
    score += 0.2;
  }
  
  // Late night penalty
  if (hour >= 23 || hour <= 5) {
    score -= 0.2;
  }
  
  return Math.max(0, Math.min(1, score));
}