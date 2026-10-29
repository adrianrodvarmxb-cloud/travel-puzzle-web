'use client';

import { useLanguage } from "@/lib/language-context";
import { useEffect, useRef, useState } from "react";

interface Metric {
  value: string;
  label: string;
}

interface ReasonMetricsSummaryProps {
  isVisible: boolean;
}

export function ReasonMetricsSummary({ isVisible }: ReasonMetricsSummaryProps) {
  const { t } = useLanguage();
  const [metricVisibilities, setMetricVisibilities] = useState<boolean[]>(new Array(4).fill(false));
  const metricsRef = useRef<HTMLDivElement>(null);

  const metrics: Metric[] = [
    {
      value: '50,000+',
      label: t('home.whyChoose.metrics.happyTravelers')
    },
    {
      value: '500+',
      label: t('home.whyChoose.metrics.destinations')
    },
    {
      value: '15',
      label: t('home.whyChoose.metrics.yearsExperience')
    },
    {
      value: '98%',
      label: t('home.whyChoose.metrics.satisfaction')
    }
  ];

  useEffect(() => {
    if (!isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Animate metrics one by one
          for (let index = 0; index < metrics.length; index++) {
            setTimeout(() => {
              setMetricVisibilities(prev => {
                const newState = [...prev];
                newState[index] = true;
                return newState;
              });
            }, index * 150);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (metricsRef.current) {
      observer.observe(metricsRef.current);
    }

    return () => {
      if (metricsRef.current) {
        observer.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  return (
    <div ref={metricsRef} className="bg-white rounded-2xl shadow-lg p-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`text-center transition-all duration-500 ${
              metricVisibilities[index]
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90'
            }`}
            style={{ transitionDelay: `${index * 150}ms` }}
          >
            <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
              {metric.value}
            </div>
            <div className="text-gray-600 font-medium">
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

