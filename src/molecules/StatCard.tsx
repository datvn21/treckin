import * as React from "react";
import { cn } from "@/lib/utils";

type StatColor = "blue" | "green" | "yellow" | "red";

const colorIconBg: Record<StatColor, string> = {
  blue: "bg-primary-muted text-primary-text",
  green: "bg-success-bg   text-success",
  yellow: "bg-warning-bg   text-warning",
  red: "bg-danger-bg    text-danger",
};

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  color?: StatColor;
}

const StatCard: React.FC<StatCardProps> = ({
  className,
  label,
  value,
  icon,
  trend,
  color = "blue",
  ...props
}) => {
  const isPositive = trend?.startsWith("+");
  const isNegative = trend?.startsWith("-");

  return (
    <div className={cn("card p-4 flex flex-col gap-3", className)} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="stat-label">{label}</span>
        {icon && (
          <span
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              colorIconBg[color],
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      {/* Value + trend */}
      <div className="flex items-end gap-2">
        <span className="stat-value">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium mb-0.5",
              isPositive && "text-success",
              isNegative && "text-danger",
              !isPositive && !isNegative && "text-ink-3",
            )}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

StatCard.displayName = "StatCard";

export { StatCard };
