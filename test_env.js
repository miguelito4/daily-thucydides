import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Testing environment variables:');
console.log('API Key exists:', !!process.env.NEYNAR_API_KEY);
console.log('FID exists:', !!process.env.FARCASTER_FID);
console.log('Signer UUID exists:', !!process.env.SIGNER_UUID);

// Show last 4 characters of each to verify content without exposing full values
console.log('API Key (last 4):', process.env.NEYNAR_API_KEY?.slice(-4));
console.log('FID:', process.env.FARCASTER_FID);
console.log('Signer UUID (last 4):', process.env.SIGNER_UUID?.slice(-4));