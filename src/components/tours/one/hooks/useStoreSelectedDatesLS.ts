import { LS_KEYS } from "@/globals";
import { ILSSelectedDate } from "@/types/ILocalStorageTypes";
import { useEffect } from "react";

export function useStoreSelectedDatesLS(item: ILSSelectedDate | null) {
    useEffect(() => {
        // Only save to localStorage if item is not null
        // This prevents overwriting existing values during initial load
        if (item !== null) {
            localStorage.setItem(LS_KEYS.selectedDates, JSON.stringify(item));
        }
    }, [item]);
}