import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
  title?: string;
  icon?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", title, icon, children, ...props }, ref) => {
    const variants = {
      // Default gray alert
      default: "bg-[var(--tp-gray-50)] border-[var(--tp-gray-300)] text-[var(--tp-text-primary)]",
      // Success green alert
      success: "bg-tp-green/10 border-tp-green text-tp-green",
      // Warning orange alert
      warning: "bg-tp-orange-primary/10 border-tp-orange-primary text-tp-orange-primary",
      // Error red alert
      error: "bg-tp-red/10 border-tp-red text-tp-red",
      // Info blue alert
      info: "bg-tp-blue-primary/10 border-tp-blue-primary text-tp-blue-primary",
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-[var(--tp-radius-lg)] border-2 p-[var(--tp-space-4)] tp-transition",
          variants[variant],
          className
        )}
        {...props}
      >
        <div className="flex gap-[var(--tp-space-3)]">
          {icon && (
            <div className="flex-shrink-0">{icon}</div>
          )}
          <div className="flex-1">
            {title && (
              <h5 className="mb-[var(--tp-space-1)] font-semibold leading-none tracking-tight">{title}</h5>
            )}
            <div className="tp-body-sm [&_p]:leading-relaxed">{children}</div>
          </div>
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

export { Alert };

