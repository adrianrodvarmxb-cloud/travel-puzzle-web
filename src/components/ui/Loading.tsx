import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "accent" | "white";
  text?: string;
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size = "md", variant = "primary", text, ...props }, ref) => {
    const sizes = {
      sm: "h-4 w-4 border-2",
      md: "h-8 w-8 border-3",
      lg: "h-12 w-12 border-4",
      xl: "h-16 w-16 border-4",
    };

    const variants = {
      primary: "border-tp-blue-primary border-t-transparent",
      accent: "border-tp-orange-primary border-t-transparent",
      white: "border-white border-t-transparent",
    };

    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center gap-(--tp-space-3)", className)}
        {...props}
      >
        <div
          className={cn(
            "tp-spin rounded-full",
            sizes[size],
            variants[variant]
          )}
        />
        {text && (
          <p className="tp-body-sm text-(--tp-text-secondary)">{text}</p>
        )}
      </div>
    );
  }
);

Loading.displayName = "Loading";

export { Loading };

