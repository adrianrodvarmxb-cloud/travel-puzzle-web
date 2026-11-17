import type { TransferCardView } from '@/trips/lib/transfer-card';

/**
 * REQ-10753: tarjeta de traslado desde el aeropuerto (Kiwitaxi, afiliado) bajo la franja de transporte.
 * Enlace externo: otra pestaña, `rel="sponsored nofollow noopener"`. Todo llega calculado del servidor.
 */
export function TransferCard({ card }: { card: TransferCardView | null | undefined }) {
    if (!card) return null;
    return (
        <a
            href={card.url}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            data-testid="transfer-card"
            className="mt-2 flex items-center gap-3 rounded-2xl border border-[#7CC4FF]/35 bg-[#0E1838] p-3 transition-colors hover:border-[#7CC4FF]/70"
        >
            <span aria-hidden className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-lg bg-[#1B2A5E] text-2xl">🚕</span>
            <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm font-semibold leading-snug text-white">{card.title}</span>
                <span className="block text-xs text-[#A9B6D6]">{card.by}</span>
            </span>
            <span aria-hidden className="text-lg text-[#EAF54F]">↗</span>
        </a>
    );
}
