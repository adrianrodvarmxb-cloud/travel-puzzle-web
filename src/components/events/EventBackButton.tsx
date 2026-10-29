'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ChevronLeftIcon } from '@/assets/svg';

interface EventBackButtonProps {
    backText: string;
}

export function EventBackButton({ backText }: EventBackButtonProps) {
    const router = useRouter();

    return (
        <Button
            variant="outline"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
            <ChevronLeftIcon className="w-4 h-4" />
            {backText}
        </Button>
    );
}

