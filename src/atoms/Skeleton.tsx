import * as React from 'react';
import { cn } from '@/lib/utils';

// ─── Base Skeleton ─────────────────────────────────────────────────────────
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circle' | 'rect';
}

const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rect', ...props }) => {
  return (
    <div
      className={cn(
        'skeleton',
        variant === 'circle' && 'rounded-full',
        variant === 'text'   && 'h-4 rounded',
        variant === 'rect'   && 'rounded-md',
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';

// ─── Skeleton Text (multiple lines) ──────────────────────────────────────────
export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, className }) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 && 'w-3/4'
          )}
        />
      ))}
    </div>
  );
};

SkeletonText.displayName = 'SkeletonText';

// ─── Skeleton Card (avatar + text lines) ─────────────────────────────────────
const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex items-start gap-3 p-4', className)}>
      <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton variant="text" className="h-4 w-2/3" />
        <Skeleton variant="text" className="h-3 w-full" />
        <Skeleton variant="text" className="h-3 w-1/2" />
      </div>
    </div>
  );
};

SkeletonCard.displayName = 'SkeletonCard';

// ─── Skeleton List ────────────────────────────────────────────────────────────
export interface SkeletonListProps {
  count?: number;
  className?: string;
}

const SkeletonList: React.FC<SkeletonListProps> = ({ count = 3, className }) => {
  return (
    <div
      className={cn('divide-y divide-border-1', className)}
      aria-busy="true"
      aria-label="Đang tải…"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

SkeletonList.displayName = 'SkeletonList';

export { Skeleton, SkeletonText, SkeletonCard, SkeletonList };
