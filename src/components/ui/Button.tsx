import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "outline" | "ghost" | "destructive" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  pill?: boolean; // For rounded-full style (like search buttons in mockup)
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, pill = false, children, disabled, ...props }, ref) => {
    // Using Travel Puzzle design system classes
    const baseStyles = "inline-flex items-center justify-center font-medium tp-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

    const variants = {
      // Primary Blue Button (Main CTAs)
      primary: "bg-tp-blue-primary text-white hover:bg-[var(--tp-blue-primary-hover)] active:bg-[var(--tp-blue-primary-active)] shadow-[var(--tp-shadow-blue)] hover:shadow-lg hover:-translate-y-0.5",
      // Orange Accent Button (Search, Book Now)
      accent: "bg-tp-orange-primary text-white hover:bg-[var(--tp-orange-hover)] shadow-[var(--tp-shadow-orange)] hover:shadow-lg hover:-translate-y-0.5",
      // Secondary Gray Button
      secondary: "bg-[var(--tp-gray-200)] text-[var(--tp-gray-700)] hover:bg-[var(--tp-gray-300)]",
      // Outline Button (inherits text color from parent, or defaults to primary)
      outline: "border-2 border-tp-blue-primary bg-transparent hover:bg-tp-blue-primary/10 text-tp-blue-primary",
      // Ghost Button
      ghost: "hover:bg-white/10 text-[var(--tp-text-primary)]",
      // Destructive/Error Button (Admin actions)
      destructive: "bg-tp-red text-white hover:bg-[var(--tp-red-hover)] shadow-[var(--tp-shadow-red)]",
      // Success/Green Button
      success: "bg-tp-green text-white hover:bg-[var(--tp-green-hover)] shadow-[var(--tp-shadow-green)]",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-13 px-8 text-lg",
    };

    const radiusClass = pill ? "rounded-full" : "rounded-[var(--tp-radius-lg)]";

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], radiusClass, className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="tp-spin mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };

