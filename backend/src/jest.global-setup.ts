import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
  const url = process.env.ZETADB_URL || 'http://127.0.0.1:8081';
  try {
    // Attempt a quick connection test
    await fetch(url, { signal: AbortSignal.timeout(3000) });
    console.log(`\n [*]ZetaDB connection check succeeded at ${url}. Running tests...`);
  } catch (err: any) {
    console.error(`\n [*]Error: ZetaDB is offline at ${url}. Skipping/failing all tests.`);
    throw new Error(`ZetaDB connection check failed: ${err.message}`);
  }
}

