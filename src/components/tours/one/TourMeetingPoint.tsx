'use client';

import { useLanguage } from '@/lib/language-context';
import { Card, CardContent } from '@/components/ui/Card';
import { MapPinIcon } from '@/assets/svg';
import { MeetingPoint } from '@/types';

interface TourMeetingPointProps {
    meetingPoint: MeetingPoint;
}

export function TourMeetingPoint({ meetingPoint }: TourMeetingPointProps) {
    const { t } = useLanguage();

    return (
        <Card>
            <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4">{t('tours.meetingPoint')}</h2>
                <div className="space-y-2">
                    <div className="flex items-start gap-2">
                        <MapPinIcon className="w-5 h-5 text-tp-blue-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium">{meetingPoint.title}</p>
                            {meetingPoint.coordinates && (
                                <p className="text-sm text-muted-foreground">
                                    {meetingPoint.coordinates}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

