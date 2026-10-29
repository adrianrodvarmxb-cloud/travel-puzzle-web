'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useLanguage } from '@/lib/language-context';
import { AuthLayout, AuthHeader } from '@/components/auth';
import { FormField } from '@/components/forms';

export default function SignupPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details?.fieldErrors) {
          setFieldErrors(result.details.fieldErrors);
        } else {
          setError(result.error || t('auth.error.somethingWrong'));
        }
        return;
      }

      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError(t('auth.error.loginAfterSignup'));
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error: unknown) {
      console.error('Signup error:', error);
      setError(error instanceof Error ? error.message : t('auth.error.somethingWrong'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader 
        title={t('auth.signup.title')}
        subtitle={t('auth.signup.subtitle')}
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="space-y-4">
          <FormField
            id="name"
            name="name"
            type="text"
            label={t('auth.name')}
            placeholder="John Doe"
            autoComplete="name"
            required
            error={fieldErrors.name?.[0]}
          />

          <FormField
            id="email"
            name="email"
            type="email"
            label={t('auth.email')}
            placeholder="you@example.com"
            autoComplete="email"
            required
            error={fieldErrors.email?.[0]}
          />

          <FormField
            id="password"
            name="password"
            type="password"
            label={t('auth.password')}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            error={fieldErrors.password?.[0]}
            helperText={t('auth.passwordRequirements')}
          />

          <FormField
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label={t('auth.confirmPassword')}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            error={fieldErrors.confirmPassword?.[0]}
          />
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {t('auth.signup.button')}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {t('auth.signup.hasAccount')}{' '}
          </span>
          <Link href="/login" className="text-primary hover:underline font-medium">
            {t('auth.signup.loginLink')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
