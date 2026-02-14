/**
 * Format a timestamp as relative time ("just now", "2 hours ago", etc.)
 */
export function timeAgo(date: Date | string | number): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return days === 1 ? 'yesterday' : `${days}d ago`;
  }
  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800);
    return `${weeks}w ago`;
  }
  
  // Older than a month - show date
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Format deadline as "X days left" or "X weeks left"
 */
export function formatDeadline(deadline: Date | string): string {
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expired';
  
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (days === 1) return '1 day left';
  if (days < 7) return `${days} days left`;
  if (days < 14) return '1 week left';
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} weeks left`;
  }
  if (days < 60) return '1 month left';
  
  const months = Math.floor(days / 30);
  return `${months} months left`;
}

/**
 * Get urgency level for deadline coloring
 * Returns: 'urgent' (<= 3 days), 'warning' (4-7 days), 'safe' (> 7 days), 'expired'
 */
export function getDeadlineUrgency(deadline: Date | string): 'expired' | 'urgent' | 'warning' | 'safe' {
  const now = new Date();
  const end = new Date(deadline);
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days <= 0) return 'expired';
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'warning';
  return 'safe';
}

/**
 * Get Tailwind classes for deadline text based on urgency
 */
export function getDeadlineColor(deadline: Date | string): string {
  const urgency = getDeadlineUrgency(deadline);
  switch (urgency) {
    case 'expired': return 'text-gray-500';
    case 'urgent': return 'text-red-600';
    case 'warning': return 'text-amber-600';
    case 'safe': return 'text-emerald-600';
  }
}

/**
 * Get Tailwind classes for deadline badge background
 */
export function getDeadlineBgColor(deadline: Date | string): string {
  const urgency = getDeadlineUrgency(deadline);
  switch (urgency) {
    case 'expired': return 'bg-gray-100 text-gray-600';
    case 'urgent': return 'bg-red-100 text-red-700';
    case 'warning': return 'bg-amber-100 text-amber-700';
    case 'safe': return 'bg-emerald-100 text-emerald-700';
  }
}
