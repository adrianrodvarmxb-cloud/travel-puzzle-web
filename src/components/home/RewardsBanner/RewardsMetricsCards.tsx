'use client';

import React from 'react';
import { useLanguage } from "@/lib/language-context";
import { CoinsIcon, TrophyIcon, StarIcon } from "@/assets/svg";

interface MetricCard {
  icon: React.ReactElement;
  value: string;
  label: string;
  color: string;
}

export function RewardsMetricsCards() {
  const { t } = useLanguage();

  const metrics: MetricCard[] = [
    {
      icon: <CoinsIcon className="w-12 h-12" />,
      value: '€25',
      label: t('home.rewards.metrics.moneyEarned'),
      color: 'text-green-400'
    },
    {
      icon: <TrophyIcon className="w-12 h-12" />,
      value: '1',
      label: t('home.rewards.metrics.achievementsCompleted'),
      color: 'text-yellow-400'
    },
    {
      icon: <StarIcon className="w-12 h-12" />,
      value: '3',
      label: t('home.rewards.metrics.challengesAvailable'),
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
        >
          <div className={`${metric.color} v-center mx-auto mb-3`}>
            {metric.icon}
          </div>
          <div className={`text-3xl font-bold ${metric.color}`}>
            {metric.value}
          </div>
          <div className="text-white/80 mt-2">
            {metric.label}
          </div>
        </div>
      ))}
    </div>
  );
}

