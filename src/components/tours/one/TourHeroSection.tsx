'use client';

import { useLanguage } from '@/lib/language-context';
import { Badge } from '@/components/ui/Badge';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { Tour } from '@/types';

interface TourHeroSectionProps {
    tour: Tour;
}

export function TourHeroSection({ tour }: TourHeroSectionProps) {
    const { t } = useLanguage();

    return (
        <div className="relative w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden mb-8">
            {tour.images.length > 0 ? (
                <ImageCarousel
                    images={tour.images}
                    autoRotateInterval={5000}
                    showDots={true}
                    showOverlay={true}
                    overlayOpacity="bg-black/30"
                    className="w-full h-full"
                >
                    <div className="flex flex-col justify-end h-full p-8 text-white">
                        <div className="max-w-4xl">
                            {tour.price === 0 && (
                                <Badge variant="success" className="mb-4">
                                    {t('tours.free')}
                                </Badge>
                            )}
                            <h1 className="text-4xl md:text-5xl font-bold mb-4">{tour.title}</h1>
                            {tour.brief && (
                                <p className="text-lg md:text-xl opacity-90 line-clamp-2">{tour.brief}</p>
                            )}
                        </div>
                    </div>
                </ImageCarousel>
            ) : (
                <div className="w-full h-full bg-linear-to-br from-tp-blue-primary to-tp-blue-dark flex items-center justify-center">
                    <div className="text-center text-white">
                        <span className="text-6xl mb-4 block">🌍</span>
                        <h1 className="text-4xl font-bold">{tour.title}</h1>
                    </div>
                </div>
            )}
        </div>
    );
}

