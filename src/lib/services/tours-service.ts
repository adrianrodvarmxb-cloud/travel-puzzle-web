import fs from 'fs/promises';
import path from 'path';
import { TourAPI } from '@/types';

const TOURS_FILE = path.join(process.cwd(), 'data', 'tours.json');

interface ToursData {
  lastUpdated: string;
  totalTours: number;
  tours: TourAPI[];
}

export async function getAllTours(): Promise<TourAPI[]> {
  try {
    const fileContent = await fs.readFile(TOURS_FILE, 'utf-8');
    const data: ToursData = JSON.parse(fileContent);
    return data.tours;
  } catch (error) {
    console.error('Failed to read tours file:', error);
    return [];
  }
}

export async function getToursMetadata() {
  try {
    const fileContent = await fs.readFile(TOURS_FILE, 'utf-8');
    const data: ToursData = JSON.parse(fileContent);
    return {
      lastUpdated: data.lastUpdated,
      totalTours: data.totalTours,
    };
  } catch (error) {
    return {
      lastUpdated: null,
      totalTours: 0,
    };
  }
}

