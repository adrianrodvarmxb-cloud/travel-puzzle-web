'use client';

import { useLanguage } from '@/lib/language-context';
import { Card, CardContent } from '@/components/ui/Card';
import { Tour } from '@/types';
import { safeDescriptionHtml } from '@/tours/lib/provider-html';

interface TourDescriptionProps {
    description: string;
}

export function TourDescription({ description }: TourDescriptionProps) {
    const { t } = useLanguage();

    return (
        <Card>
            <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4">{t('tours.description')}</h2>
                <div
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: safeDescriptionHtml(description) ?? '' }} /* REQ-10545 */
                />
            </CardContent>
        </Card>
    );
}

