'use client';

import { useLanguage } from "@/lib/language-context";
import { ReasonCardsSections } from "./ReasonCardsSections";
import { ReasonMetricsSummary } from "./ReasonMetricsSummary";
import { useEffect, useRef, useState } from "react";

export function WhyChooseTravelPuzzle() {
    const { t } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current);
            }
        };
    }, []);

    return (
        <section
            ref={sectionRef}
            id="why-choose-us"
            className="py-16 bg-gray-50 relative"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div
                    className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        {t('home.whyChoose.title', 'Why Choose TravelPuzzle')}
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        {t('home.whyChoose.subtitle', "We're more than a travel agency. We're your adventure companions.")}
                    </p>
                </div>
                <ReasonCardsSections isVisible={isVisible} />
                <ReasonMetricsSummary isVisible={isVisible} />
                <div
                    className={`text-center mt-12 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                >
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        {t('home.whyChoose.cta.title')}
                    </h3>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                        {t('home.whyChoose.cta.subtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-semibold transition-colors">
                            {t('home.whyChoose.cta.planTrip')}
                        </button>
                        <button className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-3 rounded-full font-semibold transition-colors">
                            {t('home.whyChoose.cta.talkExpert')}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

