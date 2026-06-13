import * as React from "react";
import { cn } from "@/lib/utils";
import { Dot } from "./Dot";

type BadgeVariant = "blue" | "green" | "yellow" | "red" | "gray";

const variantToColor: Record<BadgeVariant, "green" | "yellow" | "red" | "gray" | "blue"> = {
  blue: "blue",
  green: "green",
  yellow: "yellow",
  red: "red",
  gray: "gray",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "gray",
  dot = false,
  children,
  ...props
}) => {
  return (
    <span className={cn(`badge-${variant}`, className)} {...props}>
      {dot && <Dot color={variantToColor[variant]} size="sm" />}
      {children}
    </span>
  );
};

Badge.displayName = "Badge";

export { Badge };
