/* ═══════════════════════════════════════════════════════════════
   EventList Organism — loading/empty/populated event list
   ═══════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { SkeletonList } from "@/atoms/Skeleton";
import { EmptyState } from "@/atoms/EmptyState";
import type { EventItem } from "@/molecules/EventCard";
import { EventCard } from "@/molecules/EventCard";

export type { EventItem };

interface EventListProps {
  events: EventItem[];
  /** Primary loading flag */
  isLoading?: boolean;
  /** @deprecated use isLoading — kept for backwards compat */
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  /** Render extra action(s) per event row */
  renderActions?: (event: EventItem) => ReactNode;
  onEventClick?: (event: EventItem) => void;
  skeletonCount?: number;
  variant?: "row" | "card";
  className?: string;
}

export function EventList({
  events,
  isLoading,
  loading,
  emptyTitle = "Chưa có sự kiện",
  emptyDescription,
  emptyIcon,
  emptyAction,
  renderActions,
  onEventClick,
  skeletonCount = 3,
  variant = "row",
  className,
}: EventListProps) {
  const showLoading = isLoading ?? loading ?? false;

  if (showLoading) {
    return <SkeletonList count={skeletonCount} />;
  }

  if (events.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }

  return (
    <div className={`card overflow-hidden ${className ?? ""}`}>
      {events.map((event, i) => (
        <EventCard
          key={event.id}
          event={event}
          onClick={onEventClick ? () => onEventClick(event) : undefined}
          actions={renderActions?.(event)}
          variant={variant}
          style={{ animationDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  );
}
