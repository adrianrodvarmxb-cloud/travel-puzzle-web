import { NextRequest, NextResponse } from 'next/server';
import { zFTBookingDTO } from '@/lib/api/schemas/FTBooking.Schema';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Validate the request body with Zod schema
        const parsed = zFTBookingDTO.safeParse(body);
        
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: 'Invalid booking data',
                    details: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        const bookingData = parsed.data;

        // TODO: Implement actual booking submission to FreeTour API
        // For now, just return success
        // You can integrate with FreeTourClient here when the booking endpoint is available

        return NextResponse.json(
            {
                success: true,
                message: 'Booking submitted successfully',
                data: bookingData,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Booking submission error:', error);
        return NextResponse.json(
            {
                error: 'Failed to process booking',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

