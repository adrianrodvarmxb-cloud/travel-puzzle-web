'use client';

import type { ShownPolicy as NoticePolicy } from '@/tours/lib/paid-policy';

/** Pago, cancelación y no presentarse de un tour con costo (antes de reservar). Solo presenta. */
export function PaidPolicyNotice({ policy, className = '' }: { policy: NoticePolicy; className?: string }) {
    return (
        <ul className={`space-y-1 rounded-xl border border-[#C12909]/25 bg-[#C12909]/5 p-4 text-sm ${className}`}>
            {policy.payment && <li className="font-semibold">{policy.payment}</li>}
            <li>{policy.cancel}</li>
            {policy.noShow && <li>{policy.noShow}</li>}
            {policy.chargeNote && <li className="text-xs opacity-80">{policy.chargeNote}</li>}
        </ul>
    );
}
