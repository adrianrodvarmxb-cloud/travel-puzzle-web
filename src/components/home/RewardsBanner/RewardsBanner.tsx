'use client';

import { useLanguage } from "@/lib/language-context";
import { GiftIcon, CoinsIcon, ArrowRightIcon } from "@/assets/svg";
import { RewardsMetricsCards } from "./RewardsMetricsCards";
import { RewardsChallengesSection } from "./RewardsChallengesSection";
import { useEffect, useRef, useState } from "react";

// Pattern background SVG
const patternBg = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;

export function RewardsBanner() {
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
            id="travel-rewards"
            className="py-16 bg-linear-to-br from-green-50 to-blue-50 relative"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        🎁 {t('home.rewards.title')}
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        {t('home.rewards.subtitle')}
                    </p>
                </div>

                {/* Main Dark Container */}
                <div className="bg-linear-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden">
                    {/* Pattern Background */}
                    <div className="absolute inset-0 opacity-10">
                        <div
                            className="absolute inset-0"
                            style={{ backgroundImage: `url("${patternBg}")` }}
                        />
                    </div>

                    <div className="relative z-10">
                        {/* Inner Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-4">
                                <GiftIcon className="h-6 w-6 text-yellow-400" />
                                <span className="text-xl font-bold">{t('home.rewards.badge')}</span>
                                <CoinsIcon className="h-6 w-6 text-green-400" />
                            </div>
                            <h2 className="text-4xl font-bold mb-4">
                                {t('home.rewards.innerTitle')}
                            </h2>
                            <p className="text-xl text-white/80 max-w-2xl mx-auto">
                                {t('home.rewards.innerSubtitle')}
                            </p>
                        </div>

                        {/* Metrics Cards */}
                        <RewardsMetricsCards />

                        {/* Challenges Section */}
                        <RewardsChallengesSection />

                        {/* CTA Button */}
                        <div className="text-center mt-8">
                            <button className="bg-linear-to-r from-green-400 to-blue-500 text-black px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 mx-auto">
                                <GiftIcon className="h-6 w-6" />
                                <span>{t('home.rewards.cta.viewMore')}</span>
                                <ArrowRightIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
