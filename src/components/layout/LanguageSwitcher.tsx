'use client';

import { useLanguage } from '@/lib/language-context';
import { SupportedLanguage } from '@/types';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';

const languages = [
  { code: 'en' as SupportedLanguage, label: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'es' as SupportedLanguage, label: 'ES', flag: '🇪🇸', name: 'Español' },
  { code: 'pt' as SupportedLanguage, label: 'PT', flag: '🇵🇹', name: 'Português' },
  { code: 'de' as SupportedLanguage, label: 'DE', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'fr' as SupportedLanguage, label: 'FR', flag: '🇫🇷', name: 'Français' },
  { code: 'it' as SupportedLanguage, label: 'IT', flag: '🇮🇹', name: 'Italiano' },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  return (
    <Dropdown
      dropdownClassName="w-48 py-2"
      buttonContent={
        <>
          <span className="text-xl">{currentLanguage.flag}</span>
          <span className="font-medium text-sm">{currentLanguage.label}</span>
        </>
      }
    >
      {languages.map(({ code, label, flag, name }) => (
        <Button
          key={code}
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(code)}
          className={`w-full justify-start gap-3 rounded-none hover:bg-muted ${
            language === code ? 'bg-muted font-semibold' : ''
          }`}
        >
          <span className="text-xl">{flag}</span>
          <div className="flex flex-col items-start">
            <span className="text-sm">{name}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
          {language === code && (
            <svg className="w-4 h-4 ml-auto text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </Button>
      ))}
    </Dropdown>
  );
}

