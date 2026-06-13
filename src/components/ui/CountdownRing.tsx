import { cn } from "@/lib/utils";

interface CountdownRingProps {
  /** Total duration of the countdown (seconds). */
  duration: number;
  /** Remaining time (seconds). */
  remaining: number;
  /** SVG viewport size in px. */
  size?: number;
  /** Ring stroke width in px. */
  strokeWidth?: number;
}

/**
 * Circular countdown timer rendered as an SVG ring.
 *
 * Color thresholds:
 * - > 10s → primary (#0061fe)
 * - 5–10s → warning (#f5a623)
 * - < 5s  → danger (#e5484d)
 *
 * Uses `stroke-dashoffset` with a CSS transition for smooth animation.
 */
export function CountdownRing({
  duration,
  remaining,
  size = 200,
  strokeWidth = 4,
}: CountdownRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = duration > 0 ? remaining / duration : 0;
  const dashOffset = circumference * (1 - progress);

  // Determine color based on remaining time
  let strokeColor: string;
  let textColorClass: string;

  if (remaining > 10) {
    strokeColor = "var(--color-primary)";
    textColorClass = "text-primary";
  } else if (remaining > 5) {
    strokeColor = "#f5a623"; // warning
    textColorClass = "text-warning";
  } else {
    strokeColor = "#e5484d"; // danger
    textColorClass = "text-danger";
  }

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="timer"
      aria-label={`${remaining} giây còn lại`}
      aria-valuenow={remaining}
      aria-valuemin={0}
      aria-valuemax={duration}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[#3d3530] dark:text-[#3d3530]"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-normal ease-linear"
        />
      </svg>

      {/* Center label */}
      <span className={cn("absolute font-ui text-data-lg tabular-nums", textColorClass)}>
        {remaining}
      </span>
    </div>
  );
}
