'use client';

import { useLanguage } from "@/lib/language-context";
import { 
  ShieldIcon, 
  HeartIcon, 
  MedalIcon, 
  HeadphonesIcon, 
  MapPinIcon, 
  ClockIcon 
} from "@/assets/svg";
import React, { useEffect, useRef, useState } from "react";

interface ReasonCard {
  title: string;
  subtitle: string;
  icon: React.ReactElement;
}

interface ReasonCardsSectionsProps {
  isVisible: boolean;
}

export function ReasonCardsSections({ isVisible }: ReasonCardsSectionsProps) {
  const { t } = useLanguage();
  const [cardVisibilities, setCardVisibilities] = useState<boolean[]>(new Array(6).fill(false));
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!isVisible) return;

    const observers = cardRefs.current.map((ref, index) => {
      if (!ref) return null;
      
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setCardVisibilities(prev => {
              const newState = [...prev];
              newState[index] = true;
              return newState;
            });
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      
      observer.observe(ref);
      return observer;
    });

    return () => {
      observers.forEach(observer => observer?.disconnect());
    };
  }, [isVisible]);

  const reasons: ReasonCard[] = [
    {
      title: t('home.whyChoose.safeTravels.title'),
      subtitle: t('home.whyChoose.safeTravels.subtitle'),
      icon: <ShieldIcon className="w-6 h-6" />
    },
    {
      title: t('home.whyChoose.personalized.title'),
      subtitle: t('home.whyChoose.personalized.subtitle'),
      icon: <HeartIcon className="w-6 h-6" />
    },
    {
      title: t('home.whyChoose.bestPrice.title'),
      subtitle: t('home.whyChoose.bestPrice.subtitle'),
      icon: <MedalIcon className="w-6 h-6" />
    },
    {
      title: t('home.whyChoose.support.title'),
      subtitle: t('home.whyChoose.support.subtitle'),
      icon: <HeadphonesIcon className="w-6 h-6" />
    },
    {
      title: t('home.whyChoose.experience.title'),
      subtitle: t('home.whyChoose.experience.subtitle'),
      icon: <MapPinIcon className="w-6 h-6" />
    },
    {
      title: t('home.whyChoose.instantBooking.title'),
      subtitle: t('home.whyChoose.instantBooking.subtitle'),
      icon: <ClockIcon className="w-6 h-6" />
    }
  ];

  const iconColors = [
    'text-blue-600',
    'text-red-500',
    'text-yellow-500',
    'text-green-600',
    'text-purple-600',
    'text-orange-600'
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
      {reasons.map((reason, index) => (
        <div
          key={index}
          ref={(el) => { cardRefs.current[index] = el; }}
          className={`bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group ${
            cardVisibilities[index] 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          <div className="flex flex-col items-center text-center">
            <div className={`inline-flex p-3 rounded-full bg-gray-100 mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <div className={iconColors[index]}>
                {reason.icon}
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {reason.title}
            </h3>
            <p className="text-gray-600">
              {reason.subtitle}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

