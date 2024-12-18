import axios from 'axios';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { execSync } from 'child_process';

// Setup directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize constants AFTER environment variables are loaded
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const GITHUB_TOKEN = process.env.BOT_TOKEN;
const CAST_URL = 'https://api.neynar.com/v2/farcaster/cast';
const PASSAGES_FILE = path.join(__dirname, 'thucydides.json');
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const FARCASTER_FID = process.env.FARCASTER_FID;
const SIGNER_UUID = process.env.SIGNER_UUID;
const MAX_CHARACTERS = 824;

async function configureGit() {
    try {
        execSync('git config user.name "GitHub Actions Bot"');
        execSync('git config user.email "actions@github.com"');
    } catch (error) {
        console.error('Error configuring git:', error);
        throw error;
    }
}

async function commitAndPushProgress() {
    try {
        execSync('git add progress.json');
        execSync('git commit -m "Update progress.json [skip ci]"');
        execSync(`git push https://${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git HEAD:main`);
        console.log('Successfully committed and pushed progress update');
    } catch (error) {
        console.error('Error committing and pushing:', error);
        throw error;
    }
}

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
    const partInfo = passage.part ? ` [${passage.part}]` : '';
    const header = `${passage.book} - ${passage.chapter}${partInfo}\n\n`;
    const remainingChars = MAX_CHARACTERS - header.length;
    const clippedText = passage.text.substring(0, remainingChars);
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
        
        const response = await axios.post(CAST_URL, payload, {
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
        // Configure git first
        await configureGit();
        
        // Load and verify passages
        const passages = loadPassages();
        console.log(`Loaded ${passages.length} passages`);
        
        // Load and verify progress
        let lastIndex = loadProgress();
        console.log('Current progress (last_index):', lastIndex);
        
        // Calculate and verify next index
        const nextIndex = (lastIndex + 1) % passages.length;
        console.log('Next index to post:', nextIndex);
        
        // Get and verify passage
        const passage = passages[nextIndex];
        console.log('Selected passage:', {
            index: nextIndex,
            book: passage.book,
            chapter: passage.chapter,
            textPreview: passage.text.substring(0, 50) + '...'
        });
        
        // Format and verify text
        const formattedText = formatPassage(passage, nextIndex, passages.length);
        console.log('Formatted text length:', formattedText.length);
        
        // Send cast
        await sendCast(formattedText);
        console.log('Cast sent successfully');
        
        // Save progress locally
        saveProgress(nextIndex);
        console.log('Saved new progress locally. Next last_index will be:', nextIndex);
        
        // Commit and push the updated progress
        await commitAndPushProgress();
        console.log('Progress committed and pushed to repository');
        
    } catch (error) {
        console.error('Bot execution failed:', error);
        process.exit(1);
    }
}

// Run the main function
main().catch(console.error);