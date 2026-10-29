'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export const QuickSignUp = () => {
    const { data: session } = useSession();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        setTimeout(() => {
            setIsOpen(true);
        }, 1000);
    }, []);

    // Don't show if user is logged in
    if (session) {
        return null;
    }

    const handleGoogleSignIn = async () => {
        setIsOpen(false);
        await signIn('google', { callbackUrl: '/' });
    };

    return (
        <div ref={dropdownRef} className="fixed top-4 right-4 z-60">
            {/* Floating Circular Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-14 h-14 rounded-full bg-tp-blue-primary text-white',
                    'shadow-lg hover:shadow-xl',
                    'flex items-center justify-center',
                    'transition-all duration-200',
                    'hover:scale-110 active:scale-95',
                    'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-tp-blue-primary'
                )}
                aria-label={t('auth.quickSignUp.title')}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                </svg>
            </button>

            {/* Dropdown Popup */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute top-16 right-0',
                        'w-64 bg-white rounded-lg shadow-2xl',
                        'border border-gray-200',
                        'p-4',
                        'tp-fade-in tp-slide-in-down'
                    )}
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {t('auth.quickSignUp.title')}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {t('auth.quickSignUp.subtitle')}
                    </p>

                    <div className="space-y-2">
                        {/* Google Sign-In Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-center gap-2"
                            onClick={handleGoogleSignIn}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            {t('auth.quickSignUp.google')}
                        </Button>

                        {/* Facebook Button Placeholder (for future) */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-center gap-2 opacity-50 cursor-not-allowed"
                            disabled
                        >
                            <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            {t('auth.quickSignUp.facebook')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

