import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ACCOUNTS_ENABLED } from '@/lib/features';

export const metadata: Metadata = { title: 'Mi cuenta', robots: { index: false, follow: false } };

/** REQ-1593/1594: las páginas de cuenta solo existen con ACCOUNTS_ENABLED. */
export default function AccountLayout({ children }: { children: ReactNode }) {
    if (!ACCOUNTS_ENABLED) notFound();
    return children;
}
