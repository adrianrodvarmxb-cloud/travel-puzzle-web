'use client';

import { useLanguage } from '@/lib/language-context';
import { Card, CardContent } from '@/components/ui/Card';
import { ShieldIcon } from '@/assets/svg';

interface TourIncludesProps {
    includes: string[];
}

export function TourIncludes({ includes }: TourIncludesProps) {
    const { t } = useLanguage();

    return (
        <Card>
            <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4">{t('tours.includes')}</h2>
                <ul className="space-y-2">
                    {includes.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <ShieldIcon className="w-5 h-5 text-tp-green mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

