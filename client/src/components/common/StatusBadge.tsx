import { cn } from '../../lib/utils';
import { getStatusColor, getPriorityColor } from '../../lib/utils';

interface StatusBadgeProps {
  status: string;
  type?: 'status' | 'priority';
  className?: string;
}

export default function StatusBadge({ status, type = 'status', className }: StatusBadgeProps) {
  const colorClass = type === 'status' ? getStatusColor(status) : getPriorityColor(status);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {status}
    </span>
  );
}

