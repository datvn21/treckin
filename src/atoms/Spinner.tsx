import * as React from "react";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";
type SpinnerColor = "primary" | "white" | "muted";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: SpinnerSize;
  color?: SpinnerColor;
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const colorMap: Record<SpinnerColor, string> = {
  primary: "text-primary",
  white: "text-white",
  muted: "text-ink-4",
};

const Spinner: React.FC<SpinnerProps> = ({
  className,
  size = "md",
  color = "primary",
  ...props
}) => {
  return (
    <svg
      className={cn("animate-spin", sizeMap[size], colorMap[color], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      role="status"
      {...props}
    >
      {/* Track */}
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      {/* Arc */}
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
};

Spinner.displayName = "Spinner";

export { Spinner };
