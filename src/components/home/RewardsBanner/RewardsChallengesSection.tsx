'use client';

import { useLanguage } from "@/lib/language-context";
import { RewardsChallengeCard } from "./RewardsChallengeCard";

interface Challenge {
  emoji: string;
  titleKey: string;
  descriptionKey: string;
  progress: number;
  reward: string;
  isCompleted: boolean;
  emojiBg?: string;
}

export function RewardsChallengesSection() {
  const { t } = useLanguage();

  const challenges: Challenge[] = [
    {
      emoji: '🎯',
      titleKey: 'home.rewards.challenges.firstTrip.title',
      descriptionKey: 'home.rewards.challenges.firstTrip.description',
      progress: 100,
      reward: '€25',
      isCompleted: true,
      emojiBg: 'bg-green-400/20'
    },
    {
      emoji: '🏙️',
      titleKey: 'home.rewards.challenges.cityExplorer.title',
      descriptionKey: 'home.rewards.challenges.cityExplorer.description',
      progress: 60,
      reward: '€50',
      isCompleted: false
    },
    {
      emoji: '🍽️',
      titleKey: 'home.rewards.challenges.gastronomicAdventurer.title',
      descriptionKey: 'home.rewards.challenges.gastronomicAdventurer.description',
      progress: 30,
      reward: '€75',
      isCompleted: false
    },
    {
      emoji: '🧩',
      titleKey: 'home.rewards.challenges.puzzleMaster.title',
      descriptionKey: 'home.rewards.challenges.puzzleMaster.description',
      progress: 15,
      reward: '€100',
      isCompleted: false
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-center mb-6">
        {t('home.rewards.challenges.title')}
      </h3>
      {challenges.map((challenge, index) => (
        <RewardsChallengeCard
          key={index}
          emoji={challenge.emoji}
          title={t(challenge.titleKey)}
          description={t(challenge.descriptionKey)}
          progress={challenge.progress}
          reward={challenge.reward}
          isCompleted={challenge.isCompleted}
          emojiBg={challenge.emojiBg}
        />
      ))}
    </div>
  );
}

