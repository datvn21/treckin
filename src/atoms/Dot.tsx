import * as React from "react";
import { cn } from "@/lib/utils";

type DotColor = "green" | "yellow" | "red" | "gray" | "blue";
type DotSize = "sm" | "md";

export interface DotProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: DotColor;
  size?: DotSize;
  animated?: boolean;
}

const sizeMap: Record<DotSize, string> = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
};

const Dot: React.FC<DotProps> = ({
  className,
  color = "gray",
  size = "md",
  animated = false,
  ...props
}) => {
  return (
    <span
      className={cn(
        "dot",
        `dot-${color}`,
        sizeMap[size],
        animated && "animate-pulse-dot",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
};

Dot.displayName = "Dot";

export { Dot };
