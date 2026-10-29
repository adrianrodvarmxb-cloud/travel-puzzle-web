'use client';

import { useLanguage } from "@/lib/language-context";

export function RecentReviews() {
  const { t } = useLanguage();

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold mb-6 text-center">
          {t('home.recentReviews.title') || 'Recent Reviews'}
        </h2>
        {/* RecentReviews content will go here */}
      </div>
    </section>
  );
}

