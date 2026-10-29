'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useLanguage } from '@/lib/language-context';
import { AuthLayout, AuthHeader } from '@/components/auth';
import { FormField } from '@/components/forms';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const callbackUrl = searchParams.get('callbackUrl') || '/';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t('auth.error.invalidCredentials'));
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : t('auth.error.somethingWrong'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader 
        title={t('auth.login.title')}
        subtitle={t('auth.login.subtitle')}
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="space-y-4">
          <FormField
            id="email"
            name="email"
            type="email"
            label={t('auth.email')}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <FormField
            id="password"
            name="password"
            type="password"
            label={t('auth.password')}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {t('auth.login.button')}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {t('auth.login.noAccount')}{' '}
          </span>
          <Link href="/signup" className="text-primary hover:underline font-medium">
            {t('auth.login.signupLink')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AuthLayout>
        <AuthHeader 
          title="Loading..."
          subtitle="Please wait"
        />
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="h-11 bg-muted animate-pulse rounded-lg" />
            <div className="h-11 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="h-11 bg-muted animate-pulse rounded-lg" />
        </div>
      </AuthLayout>
    }>
      <LoginForm />
    </Suspense>
  );
}
