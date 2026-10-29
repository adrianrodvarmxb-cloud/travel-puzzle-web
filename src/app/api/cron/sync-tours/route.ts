import { NextResponse } from 'next/server';
import { freeTourClient } from '@/lib/api/freetour-client';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tours = await freeTourClient.fetchAllTours();

    const DATA_DIR = path.join(process.cwd(), 'data');
    const TOURS_FILE = path.join(DATA_DIR, 'tours.json');

    await fs.mkdir(DATA_DIR, { recursive: true });

    const data = {
      lastUpdated: new Date().toISOString(),
      totalTours: tours.length,
      tours,
    };

    await fs.writeFile(TOURS_FILE, JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      toursCount: tours.length,
      lastUpdated: data.lastUpdated,
    });
  } catch (error) {
    console.error('Cron sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

