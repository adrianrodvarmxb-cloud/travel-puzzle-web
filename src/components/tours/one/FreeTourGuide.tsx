'use client';

import type { TipGuide } from '@/tours/lib/tip-guide';

/** Cómo funciona un free tour: propina voluntaria, monto sugerido del destino y consejos. Solo presenta. */
export function FreeTourGuide({ guide }: { guide: TipGuide }) {
    return (
        <div className="mt-3 rounded-xl border border-[#008DFF]/25 bg-[#008DFF]/5 p-4 text-sm">
            <p className="font-semibold">{guide.title}</p>
            <p className="mt-1 text-muted-foreground">{guide.intro}</p>
            {guide.amount && (
                <p className="mt-2">
                    <span className="text-muted-foreground">{guide.amountLabel}: </span>
                    <span className="font-semibold">{guide.amount}</span>
                </p>
            )}
            <ul className="mt-2 space-y-1 text-muted-foreground">
                {guide.tips.map((tip) => <li key={tip}>• {tip}</li>)}
            </ul>
        </div>
    );
}
