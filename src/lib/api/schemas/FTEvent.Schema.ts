import { numericBoolean } from "@/lib/utils/zod-utils";
import z from "zod";

export const zFTEventDetail = z.object({
    id: z.number(),
    isAvailable: numericBoolean,
    minAdultsPerBooking: z.number(),
    availableAdultPlaces: z.number(),
    availableChildrenPlaces: z.number(),
    isPhoneRequired: numericBoolean,
    fullPricePerGroup: z.record(z.string(), z.number()),
    payableNowPricePerGroup: z.record(z.string(), z.number()),
    isPartiallyPaid: numericBoolean,
});

export type IzFTEventDetail = z.infer<typeof zFTEventDetail>;