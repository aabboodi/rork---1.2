/**
 * Date utility functions for formatting timestamps
 */

/**
 * Format timestamp to human-readable "time ago" format
 */
export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return 'الآن';
  } else if (minutes < 60) {
    return `${minutes}د`;
  } else if (hours < 24) {
    return `${hours}س`;
  } else if (days < 7) {
    return `${days}ي`;
  } else if (weeks < 4) {
    return `${weeks}أ`;
  } else if (months < 12) {
    return `${months}ش`;
  } else {
    return `${years}سنة`;
  }
};

/**
 * Format timestamp to full date and time
 */
export const formatFullDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format timestamp to time only
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format timestamp to date only
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Check if timestamp is today
 */
export const isToday = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if timestamp is yesterday
 */
export const isYesterday = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const yesterday = new Date(Date.now() - 86400000);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Format timestamp for chat messages
 */
export const formatChatTime = (timestamp: number): string => {
  if (isToday(timestamp)) {
    return formatTime(timestamp);
  } else if (isYesterday(timestamp)) {
    return 'أمس';
  } else {
    return formatDate(timestamp);
  }
};