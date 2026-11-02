import { notFound } from 'next/navigation';
import { ACCOUNTS_ENABLED } from '@/lib/features';

/** Iniciar sesión y registro quedan ocultos hasta que existan las cuentas de cliente. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    if (!ACCOUNTS_ENABLED) notFound();
    return <>{children}</>;
}
