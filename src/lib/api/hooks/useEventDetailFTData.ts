import { useQuery } from "@tanstack/react-query";
import { IzFTEventDetail, zFTEventDetail } from "../schemas/FTEvent.Schema";

interface FreeTourEventDetailResponse {
    data: IzFTEventDetail;
    status: number;
}

export function useEventDetailFTData(eventId: string) {
    const { data, isLoading, error } = useQuery<FreeTourEventDetailResponse>({
        queryKey: ['event-detail-ft-data', eventId],
        queryFn: async () => {
            const response = await fetch(`/api/freetour/event/${eventId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.error || `Failed to fetch event detail: ${response.statusText}`);
                (error as any).status = response.status;
                throw error;
            }
            const responseData = await response.json();
            // The API route already parses the data, so we just return it
            return responseData;
        },
        enabled: !!eventId,
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
            // Don't retry on 404 (Not Found) or 400 (Bad Request) errors
            if (error?.status === 404 || error?.status === 400) {
                return false;
            }
            // Retry up to 2 times for other errors
            return failureCount < 2;
        },
        retryDelay: 250,
    });

    return { data, isLoading, error };
}