'use client';

import type { PaidPolicy } from '@/tours/lib/paid-policy';

/** Pago, cancelación y no presentarse de un tour con costo (antes de reservar). Solo presenta. */
export function PaidPolicyNotice({ policy, className = '' }: { policy: PaidPolicy; className?: string }) {
    return (
        <ul className={`space-y-1 rounded-xl border border-[#C12909]/25 bg-[#C12909]/5 p-4 text-sm ${className}`}>
            {policy.payment && <li className="font-semibold">{policy.payment}</li>}
            <li>{policy.cancel}</li>
            <li>{policy.noShow}</li>
        </ul>
    );
}
