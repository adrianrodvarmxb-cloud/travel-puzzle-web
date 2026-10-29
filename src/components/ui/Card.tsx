import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated";
  hover?: boolean; // Enable hover effect
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hover = false, ...props }, ref) => {
    const variants = {
      // Standard card with shadow
      default: "rounded-[var(--tp-radius-xl)] border border-[var(--tp-border-light)] bg-[var(--tp-bg-primary)] shadow-[var(--tp-shadow-md)]",
      // Glassmorphism effect (from mockup)
      glass: "tp-glass-card rounded-[var(--tp-radius-2xl)]",
      // Elevated card with larger shadow
      elevated: "rounded-[var(--tp-radius-xl)] border-0 bg-[var(--tp-bg-primary)] shadow-[var(--tp-shadow-lg)]",
    };

    const hoverClass = hover ? "tp-hover-lift tp-transition" : "";

    return (
      <div
        ref={ref}
        className={cn(variants[variant], hoverClass, className)}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-[var(--tp-space-2)] p-[var(--tp-space-6)]", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("tp-h3 text-[var(--tp-text-primary)]", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("tp-body-sm text-[var(--tp-text-secondary)]", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn("p-[var(--tp-space-6)] pt-0", className)} 
      {...props} 
    />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-[var(--tp-space-6)] pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };

