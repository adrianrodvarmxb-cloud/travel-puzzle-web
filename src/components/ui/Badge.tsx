import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "secondary" | "purple" | "orange";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      // Primary Blue Badge
      default: "bg-tp-blue-primary text-white shadow-sm",
      // Success/Green Badge (Confirmed, Active)
      success: "bg-tp-green text-white shadow-sm",
      // Warning/Orange Badge (Pending, Attention)
      warning: "bg-tp-orange-primary text-white shadow-sm",
      // Error/Red Badge (Cancelled, Error)
      error: "bg-tp-red text-white shadow-sm",
      // Info/Light Blue Badge
      info: "bg-tp-blue-light text-white shadow-sm",
      // Secondary/Gray Badge
      secondary: "bg-[var(--tp-gray-200)] text-[var(--tp-gray-700)]",
      // Purple Badge (Premium, Special)
      purple: "bg-tp-purple text-white shadow-sm",
      // Orange Badge (Highlight)
      orange: "bg-tp-orange-light text-white shadow-sm",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-[var(--tp-space-3)] py-[var(--tp-space-1)] text-xs font-semibold tp-transition",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };

