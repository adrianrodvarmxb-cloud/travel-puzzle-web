import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { transformFTTourToUITour } from "@/lib/db/tour-transformer";
import { useLanguage } from "@/lib/language-context";
import { Tour, TourAPI } from "@/types";

interface FreeTourTourResponse {
    data: TourAPI;
    status: number;
}

export function useToursFTData(tourId: string | null | undefined) {
    const { language } = useLanguage();

    const { data, isLoading, error } = useQuery<FreeTourTourResponse>({
        queryKey: ['tours-ft-data', tourId],
        queryFn: async () => {
            // Call our Next.js API route instead of FreeTour API directly
            const response = await fetch(`/api/freetour/tours/${tourId}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.error || `Failed to fetch tour: ${response.statusText}`);
                // Attach status code to error for retry logic
                (error as any).status = response.status;
                throw error;
            }
            
            return response.json();
        },
        enabled: !!tourId,
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
            // Don't retry on 404 (Not Found) or 400 (Bad Request) errors
            if (error?.status === 404 || error?.status === 400) {
                return false;
            }
            // Retry up to 2 times for other errors
            return failureCount < 2;
        },
        retryDelay: 1000, // Wait 1 second between retries
    });

    const tour = useMemo<Tour | null>(() => {
        if (!data?.data) return null;
        return transformFTTourToUITour(data?.data as TourAPI, language);
    }, [data?.data, language]);

    return { data: tour, isLoading, error };
}