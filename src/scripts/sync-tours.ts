import dotenv from 'dotenv';
import path from 'path';
import { syncToursFromAPI } from '@/lib/db/sync/tour-sync';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  let startPage = 1;
  let maxPages: number | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start-page' && args[i + 1]) {
      startPage = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i].startsWith('--start-page=')) {
      startPage = parseInt(args[i].split('=')[1], 10);
    } else if (args[i] === '--max-pages' && args[i + 1]) {
      maxPages = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i].startsWith('--max-pages=')) {
      maxPages = parseInt(args[i].split('=')[1], 10);
    }
  }

  console.log('🚀 Starting tour sync from FreeTour API to MySQL...');
  if (startPage > 1) {
    console.log(`📄 Resuming from page ${startPage}\n`);
  } else {
    console.log('');
  }

  try {
    const result = await syncToursFromAPI(maxPages, startPage);

    if (result.success) {
      console.log('\n✅ Sync completed successfully!');
      console.log(`   Duration: ${result.duration.toFixed(2)}s`);
      console.log(`   Tours synced: ${result.toursCount}`);
      console.log(`   Countries: ${result.countriesCount}`);
      console.log(`   Cities: ${result.citiesCount}`);
      process.exit(0);
    } else {
      console.error('\n❌ Sync failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error during sync:', error);
    process.exit(1);
  }
}

main();

