import { datelikeToDate, numericBoolean } from "@/lib/utils/zod-utils";
import { buildSchemaFormBuilder, SchemaErrorsMap, ExtractSchemaHandlers } from "@/lib/utils/forms/buildSchemaFormBuilder";
import z from "zod";


export const zFTBooking = z.object({
    refNumber: z.string(),
    eventId: z.number(),
    customerId: z.string(),
    status: z.string(),
    canBeCanceled: numericBoolean,
    canBeEdited: numericBoolean,
    createdAt: datelikeToDate,
});
export type IzFTBooking = z.infer<typeof zFTBooking>;


export const zFTBookingDTO = z.object({
    eventId: z.number()
        .min(1, 'Event ID is required')
        .describe('This should be auto inserted by the system'),
    adults: z.number()
        .min(1, 'Adults is required')
        .describe('booking.form.adults'),
    children: z.number()
        .default(0)
        .describe('booking.form.children'),
    price: z.number()
        .default(0)
        .describe('booking.form.price'),
    customer: z.object({
        email: z.string()
            .email('Invalid email address')
            .describe('booking.form.customer.email'),
        firstName: z.string()
            .min(1, 'First name is required')
            .describe('booking.form.customer.firstName'),
        lastName: z.string()
            .min(1, 'Last name is required')
            .describe('booking.form.customer.lastName'),
        phone: z.string()
            .min(1, 'Phone is required')
            .optional()
            .describe('booking.form.customer.phone'),
    }),
});
export type IzFTBookingDTO = z.infer<typeof zFTBookingDTO>;

// Re-export types for convenience (optional, can be inferred from buildFTBookingDTO)
export type FTBookingErrorsMap = SchemaErrorsMap<IzFTBookingDTO>;
export type FTBookingHandlers = ExtractSchemaHandlers<ReturnType<typeof buildFTBookingDTO>>;

/**
 * Builds the form builder for FTBooking DTO using the reusable schema builder
 * 
 * @example
 * ```ts
 * const bookingBuilder = buildFTBookingDTO();
 * const { form, errors, handlers, validateForm } = useFormBuilder({ builderService: bookingBuilder });
 * ```
 */
export function buildFTBookingDTO() {
    return buildSchemaFormBuilder(zFTBookingDTO, { nestedForm: true });
}