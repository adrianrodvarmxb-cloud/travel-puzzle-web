'use client';

import { useLanguage } from '@/lib/language-context';
import { Card, CardContent } from '@/components/ui/Card';
import type { BeforeYouGoKey, BeforeYouGoView } from '@/tours/lib/practical-info';

const LABEL: Record<BeforeYouGoKey, string> = {
    whatToBring: 'tours.whatToBring',
    physicalRequirements: 'tours.physicalRequirements',
    difficulty: 'tours.difficulty',
    providerNotes: 'tours.providerNotes',
};

/**
 * REQ-10537: bloque «Antes de ir» tras la descripción: qué llevar, requisitos físicos, dificultad y notas.
 * Recibe solo los renglones que tienen dato, ya limpios (REQ-10540) y validados en el servidor.
 */
// REQ-10537
export function TourBeforeYouGo({ info }: { info: BeforeYouGoView }) {
    const { t } = useLanguage();

    return (
        <Card data-bloque="antes-de-ir">
            <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4">{t('tours.beforeYouGo')}</h2>
                <dl className="space-y-4">
                    {info.items.map((item) => (
                        <div key={item.key}>
                            <dt className="font-semibold">{t(LABEL[item.key])}</dt>
                            <dd className="mt-1 whitespace-pre-line text-muted-foreground">{item.text}</dd>
                        </div>
                    ))}
                </dl>
            </CardContent>
        </Card>
    );
}
