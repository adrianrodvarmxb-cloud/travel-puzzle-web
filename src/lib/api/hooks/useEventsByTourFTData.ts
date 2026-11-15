import { useQuery } from "@tanstack/react-query";
import { TourEvent } from "@/lib/api/freetour-client";
import { LIVE_TIMEOUT_MS, TIMEOUT_STATUS } from "@/lib/api/lib/live-timeout";

interface FreeTourEventsResponse {
    data: TourEvent[];
    status: number;
}

export function useEventsByTourFTData(tourId: string | number | null | undefined) {
    const { data, isLoading, error } = useQuery<FreeTourEventsResponse>({
        queryKey: ['tour-events-ft-data', tourId],
        queryFn: async () => {
            // Call our Next.js API route instead of FreeTour API directly
            // REQ-10664 (INC-024): tope en el navegador; si vence, la ficha se queda con lo del sync y la red queda en reposo.
            const response = await fetch(`/api/freetour/tours/${tourId}/events`, { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.error || `Failed to fetch tour events: ${response.statusText}`);
                // Attach status code to error for retry logic
                (error as any).status = response.status;
                throw error;
            }

            return response.json();
        },
        enabled: !!tourId,
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
            // Don't retry on 404 (Not Found) or 400 (Bad Request) errors, ni un tiempo vencido (REQ-10664: 504 o aborto)
            if (error?.status === 404 || error?.status === 400 || error?.status === TIMEOUT_STATUS || error?.name === "TimeoutError" || error?.name === "AbortError") {
                return false;
            }
            // Retry up to 2 times for other errors
            return failureCount < 2;
        },
        retryDelay: 1000, // Wait 1 second between retries
    });

    return {
        data: data?.data || [],
        isLoading,
        error
    };
}

