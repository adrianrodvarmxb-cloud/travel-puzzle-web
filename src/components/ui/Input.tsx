import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-(--tp-space-2) block text-sm font-medium text-(--tp-text-primary)">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "field-wrapper-style",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-(--tp-gray-400)",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-blue-primary focus-visible:ring-offset-1 focus-visible:border-tp-blue-primary",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-(--tp-gray-50)",
            error && "border-tp-red focus-visible:ring-tp-red",
            className
          )}
          ref={ref}
          {...props}
        />
        {helperText && !error && (
          <p className="mt-(--tp-space-1) tp-caption text-(--tp-text-secondary)">{helperText}</p>
        )}
        {error && (
          <p className="mt-(--tp-space-1) tp-caption text-tp-red font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };

