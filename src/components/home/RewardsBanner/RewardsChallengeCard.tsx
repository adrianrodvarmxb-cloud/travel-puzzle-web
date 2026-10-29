'use client';

import { CircleCheckIcon, LockIcon } from "@/assets/svg";
import { useLanguage } from "@/lib/language-context";

interface RewardsChallengeCardProps {
  emoji: string;
  title: string;
  description: string;
  progress: number;
  reward: string;
  isCompleted: boolean;
  emojiBg?: string;
}

export function RewardsChallengeCard({
  emoji,
  title,
  description,
  progress,
  reward,
  isCompleted,
  emojiBg = 'bg-white/10'
}: RewardsChallengeCardProps) {
  const { t } = useLanguage();
  const borderClass = isCompleted 
    ? 'border-green-400/50 bg-green-400/10' 
    : 'border-white/20 hover:bg-white/15';
  
  const progressBarColor = isCompleted ? 'bg-green-400' : 'bg-blue-400';

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 ${borderClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 grow">
          <div className={`text-4xl p-3 rounded-full ${emojiBg}`}>
            {emoji}
          </div>
          <div className="grow">
            <h4 className="text-xl font-bold mb-1">{title}</h4>
            <p className="text-white/80 mb-2">{description}</p>
            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${progressBarColor} transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-white/70">
              {`${t('home.rewards.progress')}: ${progress}%`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400 mb-2">
            {reward}
          </div>
          <div className={`flex items-center space-x-2 text-sm ${
            isCompleted ? 'text-green-400' : 'text-white/50'
          }`}>
            {isCompleted ? (
              <>
                <CircleCheckIcon className="w-4 h-4" />
                <span>{t('home.rewards.status.completed')}</span>
              </>
            ) : (
              <>
                <LockIcon className="w-4 h-4" />
                <span>{t('home.rewards.status.inProgress')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

