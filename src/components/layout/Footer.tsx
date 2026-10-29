'use client';

import { useLanguage } from "@/lib/language-context";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border py-8 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl text-center text-sm text-muted-foreground">
        <p>{t('footer.copyright')}</p>
        <div className="flex gap-4 justify-center mt-4">
          <a href="#" className="hover:text-primary">{t('footer.about')}</a>
          <a href="#" className="hover:text-primary">{t('footer.contact')}</a>
          <a href="#" className="hover:text-primary">{t('footer.terms')}</a>
          <a href="#" className="hover:text-primary">{t('footer.privacy')}</a>
        </div>
      </div>
    </footer>
  );
}

