import Link from '@/components/i18n/LocalizedLink';

/** REQ-100: migas visibles (acompañan al BreadcrumbList del JSON-LD). Sin hooks: sirve en servidor y cliente. */
export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
    return (
        <nav aria-label="Migas de pan" className="text-sm text-[#A9B6D6]">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {items.map((c, i) => (
                    <li key={c.href} className="flex min-w-0 items-center gap-2">
                        {i > 0 && <span aria-hidden className="text-[#5E6E96]">›</span>}
                        {i === items.length - 1 ? (
                            <span aria-current="page" className="truncate text-[#E3E9F7]">{c.name}</span>
                        ) : (
                            <Link href={c.href} className="hover:text-white hover:underline">{c.name}</Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
