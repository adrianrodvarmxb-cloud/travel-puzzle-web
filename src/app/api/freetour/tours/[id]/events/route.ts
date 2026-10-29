import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { freeTourClient } from '@/lib/api/freetour-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const tourId = resolvedParams.id;

    if (!tourId) {
      return NextResponse.json(
        { error: 'Tour ID is required' },
        { status: 400 }
      );
    }

    // Fetch events from FreeTour API (server-side, no CORS issues)
    const response = await freeTourClient.fetchEventsByTourId(tourId);

    return NextResponse.json(response);
  } catch (error) {
    console.error('FreeTour events API proxy error:', error);
    // Check if error has a status code (404, 400, etc.)
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      {
        error: 'Failed to fetch tour events from FreeTour API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status }
    );
  }
}

