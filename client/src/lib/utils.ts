import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get status badge color classes
 */
export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    Active: 'bg-green-100 text-green-700 border-green-200',
    Inactive: 'bg-gray-100 text-gray-700 border-gray-200',
    UnderMaintenance: 'bg-orange-100 text-orange-700 border-orange-200',
    Broken: 'bg-red-100 text-red-700 border-red-200',
    Reported: 'bg-blue-100 text-blue-700 border-blue-200',
    InProgress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Resolved: 'bg-green-100 text-green-700 border-green-200',
    Closed: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return statusMap[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * Get priority badge color classes
 */
export function getPriorityColor(priority: string): string {
  const priorityMap: Record<string, string> = {
    Low: 'bg-blue-100 text-blue-700 border-blue-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Critical: 'bg-red-100 text-red-700 border-red-200',
  };
  return priorityMap[priority] || 'bg-gray-100 text-gray-700 border-gray-200';
}

