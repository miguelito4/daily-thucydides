import { post } from 'axios';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Setup directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize constants AFTER environment variables are loaded
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const CAST_URL = 'https://api.neynar.com/v2/farcaster/cast';
const PASSAGES_FILE = path.join(__dirname, 'thucydides.json');
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const FARCASTER_FID = process.env.FARCASTER_FID;
const SIGNER_UUID = process.env.SIGNER_UUID;
const MAX_CHARACTERS = 824;

// Quick environment check
console.log('Environment check:', {
    apiKeyExists: !!NEYNAR_API_KEY,
    fidExists: !!FARCASTER_FID,
    signerExists: !!SIGNER_UUID
});

function loadPassages() {
    try {
        const data = readFileSync(PASSAGES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading passages:', error);
        process.exit(1);
    }
}

function loadProgress() {
    try {
        if (existsSync(PROGRESS_FILE)) {
            const data = readFileSync(PROGRESS_FILE, 'utf-8');
            return JSON.parse(data).last_index || -1;
        }
        return -1;
    } catch (error) {
        console.error('Error loading progress:', error);
        return -1;
    }
}

function saveProgress(index) {
    try {
        writeFileSync(PROGRESS_FILE, JSON.stringify({ last_index: index }));
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

function clipText(text, maxLength = MAX_CHARACTERS) {
    if (!text) return '';
    
    if (text.length <= maxLength) return text;
    
    // Try to find the last sentence ending
    const textToCheck = text.slice(0, maxLength);
    let lastBreak = textToCheck.lastIndexOf('. ');
    
    if (lastBreak !== -1) {
        return text.slice(0, lastBreak + 1);
    }
    
    // Try other punctuation
    for (const punct of ['; ', '! ', '? ', ', ']) {
        lastBreak = textToCheck.lastIndexOf(punct);
        if (lastBreak !== -1) {
            return text.slice(0, lastBreak + 1) + '...';
        }
    }
    
    // Try breaking at last space
    lastBreak = textToCheck.lastIndexOf(' ');
    if (lastBreak !== -1) {
        return text.slice(0, lastBreak) + '...';
    }
    
    // Last resort: hard break
    return text.slice(0, maxLength - 3) + '...';
}

function formatPassage(passage, index, total) {
    const header = `${passage.book} - ${passage.chapter} (${index + 1}/${total})\n\n`;
    const remainingChars = MAX_CHARACTERS - header.length;
    const clippedText = clipText(passage.text, remainingChars);
    return header + clippedText;
}

async function sendCast(text) {
    if (!text) {
        throw new Error('Cannot send empty cast');
    }
    
    try {
        const payload = {
            text,
            fid: FARCASTER_FID,
            signer_uuid: SIGNER_UUID,
        };
        
        console.log('Sending cast with payload:', {
            ...payload,
            text_length: text.length,
        });
        
        const response = await post(CAST_URL, payload, {
            headers: {
                'api_key': NEYNAR_API_KEY,
                'Content-Type': 'application/json',
            },
        });
        
        console.log('Cast sent successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending cast:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
}

async function main() {
    try {
        const passages = loadPassages();
        if (!passages.length) {
            throw new Error('No passages found');
        }
        
        let lastIndex = loadProgress();
        const nextIndex = (lastIndex + 1) % passages.length;
        const passage = passages[nextIndex];
        
        if (!passage || !passage.text) {
            throw new Error(`Invalid passage at index ${nextIndex}`);
        }
        
        const formattedText = formatPassage(passage, nextIndex, passages.length);
        await sendCast(formattedText);
        saveProgress(nextIndex);
        
        console.log(`Successfully posted passage ${nextIndex + 1}/${passages.length}`);
    } catch (error) {
        console.error('Bot execution failed:', error);
        process.exit(1);
    }
}

// Run the main function
main().catch(console.error);