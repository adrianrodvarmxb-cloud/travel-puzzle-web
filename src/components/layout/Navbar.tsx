'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useLanguage } from '@/lib/language-context';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { Logo } from '@/components/layout/Logo';
import { PlatformTextLogo } from '@/components/layout/PlatformTextLogo';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import {
  MenuIcon,
  CloseIcon,
} from '@/assets/svg';

export const Navbar = () => {
  const { data: session } = useSession();
  const user = session?.user;
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };

  // Navigation links based on auth state
  const publicLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/tours', label: t('nav.tours') },
    { href: '/how-it-works', label: t('nav.howItWorks') },
  ];

  const clientLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/tours', label: t('nav.tours') },
    { href: '/bookings', label: t('nav.myBookings') },
  ];

  const dashboardLinks = [
    { href: '/dashboard', label: t('nav.dashboard.overview'), icon: '📊' },
    { href: '/dashboard/tours', label: t('nav.dashboard.manageTours'), icon: '🏷️' },
    { href: '/dashboard/bookings', label: t('nav.dashboard.manageBookings'), icon: '📋' },
    { href: '/dashboard/users', label: t('nav.dashboard.manageUsers'), icon: '👥' },
    { href: '/dashboard/api-config', label: t('nav.dashboard.apiConfig'), icon: '⚙️' },
  ];

  const navLinks = user ? clientLinks : publicLinks;

  return (
    <nav className="sticky top-0 z-50 bg-tp-blue-primary border-b border-tp-blue-dark">
      <div className="container mx-auto py-2 px-4">
        <div className="flex items-center justify-between h-16">

          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Logo size="lg" shape="circle" />
              <PlatformTextLogo size="md" color="text-white" layout='inline' className="hidden sm:block" />
            </Link>
          </div>

          {/* Center: Nav Links (Desktop) */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${isActive(link.href)
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/80 hover:text-white'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Auth Buttons / User Menu + Language Switcher */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {!user ? (
              // Public: Login + Sign Up
              <>
                <Link href="/login" className="hidden md:block">
                  <Button variant="ghost" size="sm" className='text-white'>
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link href="/signup" className="hidden md:block">
                  <Button variant="primary" size="sm">
                    {t('nav.signup')}
                  </Button>
                </Link>
              </>
            ) : (
              // Authenticated: Dashboard Dropdown (Admin) + User Dropdown
              <>
                {/* Dashboard Dropdown (Admin Only) */}
                {user.role === 'ADMIN' && (
                  <Dropdown
                    classNameWrapper="hidden md:block"
                    dropdownClassName="w-56"
                    buttonContent={
                      <>
                        <span>🎛️</span>
                        <span className="text-white">{t('nav.dashboard.label')}</span>
                      </>
                    }
                  >
                    {dashboardLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
                      >
                        <span className="text-lg">{link.icon}</span>
                        {link.label}
                      </Link>
                    ))}
                  </Dropdown>
                )}

                {/* User Dropdown */}
                <Dropdown
                  classNameWrapper="hidden md:block py-6"
                  dropdownClassName="w-48"
                  buttonContent={
                    <>
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold backdrop-blur-sm">
                        {user.name?.charAt(0).toUpperCase() || ''}
                      </div>
                      <span className="hidden lg:block text-white">{user.name}</span>
                    </>
                  }
                >
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
                  >
                    <span>⚙️</span>
                    {t('nav.user.profile')}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  >
                    <span>🚪</span>
                    {t('nav.user.logout')}
                  </button>
                </Dropdown>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white hover:bg-white/10 rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-tp-blue-dark">
            {/* Mobile Nav Links */}
            <div className="flex flex-col gap-2 mb-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive(link.href)
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile Language Switcher */}
            <div className="px-4 py-2 mb-4">
              <LanguageSwitcher />
            </div>

            {/* Mobile Auth Buttons or User Menu */}
            {!user ? (
              <div className="flex flex-col gap-2 px-4">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    {t('nav.signup')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Mobile Dashboard Links (Admin Only) */}
                {user.role === 'ADMIN' && (
                  <div className="px-4 mb-2">
                    <p className="text-xs font-semibold text-white/60 uppercase mb-2">
                      {t('nav.dashboard.label')}
                    </p>
                    {dashboardLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded-md transition-colors"
                      >
                        <span>{link.icon}</span>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Mobile User Links */}
                <div className="px-4">
                  <p className="text-xs font-semibold text-white/60 uppercase mb-2">
                    {user.name}
                  </p>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded-md transition-colors"
                  >
                    <span>⚙️</span>
                    {t('nav.user.profile')}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-tp-red rounded-md transition-colors"
                  >
                    <span>🚪</span>
                    {t('nav.user.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

