import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { ZetaDBClient } from '../src/database/zetadb/zetadb.client.ts';
import type { UserProfile } from '../src/models/types/user.types.ts';

import { fileURLToPath } from 'url';

// Load environment variables reliably, regardless of where script is run from
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

if (!process.env.ZETADB_URL) {
  console.error(`Could not find ZETADB_URL in ${envPath}`);
  console.error(`Make sure you run this script from the backend/ directory or the .env file exists.`);
  process.exit(1);
}

async function makeAdmin(email: string) {
  const client = new ZetaDBClient();

  try {
    // 1. Get user ID from email index
    console.log(`Looking up user with email: ${email}`);
    const emailKey = `user:email:${email.toLowerCase()}`;
    const uidRes = await client.get<string>(emailKey);
    
    if (uidRes.status !== 'success' || !uidRes.data) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }
    
    const id = typeof uidRes.data === 'string' ? uidRes.data : (uidRes.data as any).value;
    
    // 2. Fetch the actual user profile
    const profileKey = `user:${id}`;
    const profileRes = await client.get<{ value: UserProfile }>(profileKey);
    
    if (profileRes.status !== 'success' || !profileRes.data) {
      console.error(`Could not fetch profile for ID ${id}.`);
      process.exit(1);
    }
    
    let profile = profileRes.data.value;
    
    // Check if it's stored as a string or object
    if (typeof profile === 'string') {
      profile = JSON.parse(profile);
    }

    if (profile.role === 'ADMIN') {
      console.log(`User ${email} is already an ADMIN.`);
      process.exit(0);
    }

    // 3. Update the role to ADMIN
    profile.role = 'ADMIN';
    profile.updatedAt = new Date();

    const updateRes = await client.put(profileKey, profile);
    
    if (updateRes.status === 'success') {
      console.log(`Successfully promoted ${email} to ADMIN!`);
    } else {
      console.error(`Failed to update profile:`, updateRes.error);
    }

  } catch (err) {
    console.error('Error occurred:', err);
  }
}

const targetEmail = process.argv[2];

if (!targetEmail || targetEmail === '--help' || targetEmail === '-h') {
  console.log(`
Usage:
  npx tsx scripts/make-admin.ts <user-email>

Description:
  Promotes an existing customer account to an ADMIN role in the database.
  The user must have already created an account via the storefront.

Example:
  npx tsx scripts/make-admin.ts my-admin@example.com
  `);
  process.exit(targetEmail ? 0 : 1);
}

makeAdmin(targetEmail);
