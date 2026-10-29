import React from 'react';
import { Input } from '@/components/ui/Input';

interface FormFieldProps {
  id: string;
  name: string;
  type: 'text' | 'email' | 'password';
  label: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  name,
  type,
  label,
  placeholder,
  autoComplete,
  required = false,
  error,
  helperText,
}) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-2">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
      />
      {error && (
        <p className="text-error text-sm mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
      )}
    </div>
  );
};

