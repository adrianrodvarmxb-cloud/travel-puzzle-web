'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';

interface TourErrorStateProps {
    tour: boolean; // true if tour exists but error, false if tour not found
}

export function TourErrorState({ tour }: TourErrorStateProps) {
    const router = useRouter();
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <h1 className="text-2xl font-bold mb-4">{t('common.error')}</h1>
                    <p className="text-muted-foreground mb-6">
                        {tour ? 'Tour not found' : 'Failed to load tour details'}
                    </p>
                    <Button onClick={() => router.back()}>
                        {t('common.back')} | {t('tours.title')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

