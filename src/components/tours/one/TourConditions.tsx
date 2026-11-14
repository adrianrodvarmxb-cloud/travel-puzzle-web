'use client';

import { useLanguage } from '@/lib/language-context';
import { Card, CardContent } from '@/components/ui/Card';
import { CloseIcon, ClockIcon } from '@/assets/svg';
import type { ConditionsView } from '@/tours/lib/practical-info';

/**
 * REQ-10536: bloque «Condiciones» bajo «Qué incluye»: qué no incluye, política de cancelación y horas para cancelar
 * sin cargo. Recibe el bloque ya armado y validado en el servidor (`practicalInfo`); no sabe de qué proveedor viene.
 * Sin Intl ni fechas (INC-001): la plantilla solo sustituye `{hours}`.
 */
// REQ-10536
export function TourConditions({ conditions }: { conditions: ConditionsView }) {
    const { t } = useLanguage();
    const free = conditions.freeCancellation;
    const freeText = free ? t(free.varies ? 'tours.freeCancelVaries' : 'tours.freeCancel').replace('{hours}', String(free.hours)) : null;

    return (
        <Card data-bloque="condiciones">
            <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4">{t('tours.conditions')}</h2>
                {conditions.excludes.length > 0 && (
                    <div className="mb-5">
                        <h3 className="mb-2 font-semibold">{t('tours.notIncluded')}</h3>
                        <ul className="space-y-2">
                            {conditions.excludes.map((item, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <CloseIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                                    <span className="text-muted-foreground">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {(freeText || conditions.cancellationPolicy) && (
                    <div>
                        <h3 className="mb-2 font-semibold">{t('tours.cancellationPolicy')}</h3>
                        {freeText && (
                            <p className="mb-2 flex items-start gap-2 text-muted-foreground">
                                <ClockIcon className="w-5 h-5 text-tp-green mt-0.5 shrink-0" />
                                <span>{freeText}</span>
                            </p>
                        )}
                        {conditions.cancellationPolicy && <p className="whitespace-pre-line text-muted-foreground">{conditions.cancellationPolicy}</p>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
