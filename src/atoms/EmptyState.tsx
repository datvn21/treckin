import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?:        React.ReactNode;
  title:        string;
  description?: string;
  action?:      React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  className,
  icon,
  title,
  description,
  action,
  ...props
}) => {
  return (
    <div className={cn('empty animate-fade-in-up', className)} {...props}>
      <div className="empty-icon">
        {icon ?? <Inbox size={24} aria-hidden="true" />}
      </div>
      <div className="flex flex-col items-center gap-1">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

export { EmptyState };
