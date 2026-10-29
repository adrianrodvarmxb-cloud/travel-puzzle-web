import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { Logo } from '@/components/layout/Logo';
import { PlatformTextLogo } from '@/components/layout/PlatformTextLogo';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  showBackButton?: boolean;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ 
  title, 
  subtitle,
  showBackButton = true 
}) => {
  const { t } = useLanguage();

  return (
    <>
      {/* Back to Home Link */}
      {showBackButton && (
        <div className="text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <span>←</span>
            <span>{t('common.backToHome')}</span>
          </Link>
        </div>
      )}

      {/* Logo + Brand */}
      <div className="text-center space-y-4">
        <div className="flex justify-center gap-4">
          <Logo size="xl" shape="circle" />
          <PlatformTextLogo 
            size="lg" 
            layout="stacked" 
            className="my-auto" 
            color="text-[var(--tp-blue-primary)]" 
          />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
    </>
  );
};

