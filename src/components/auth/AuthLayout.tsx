import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-background px-4 py-12 ${className}`}>
      <div className="w-full max-w-md space-y-8">
        {children}
      </div>
    </div>
  );
};

