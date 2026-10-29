import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { freeTourClient } from '@/lib/api/freetour-client';
import { zFTEventDetail } from '@/lib/api/schemas/FTEvent.Schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const eventId = resolvedParams.id;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Fetch event detail from FreeTour API (server-side, no CORS issues)
    const response = await freeTourClient.fetchEventDetailById(eventId);

    // Parse and transform the response using the schema
    const parsedData = zFTEventDetail.parse(response.data);

    return NextResponse.json({
      data: parsedData,
      status: response.status,
    });
  } catch (error) {
    console.error('FreeTour event detail API proxy error:', error);
    // Check if error has a status code (404, 400, etc.)
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      {
        error: 'Failed to fetch event detail from FreeTour API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status }
    );
  }
}

