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

// Initialize constants
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const CAST_URL = 'https://api.neynar.com/v2/farcaster/cast';
const PASSAGES_FILE = path.join(__dirname, 'thucydides.json');
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const HASH_FILE = path.join(__dirname, 'last_hash.json');
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
        const passages = JSON.parse(data);
        console.log('First few passages parts:', passages.slice(0, 5).map(p => p.part));
        console.log(`Loaded ${passages.length} total passages`);
        return passages;
    } catch (error) {
        console.error('Error loading passages:', error);
        throw error;
    }
}

function loadProgress() {
    try {
        if (existsSync(PROGRESS_FILE)) {
            const data = readFileSync(PROGRESS_FILE, 'utf-8');
            const parsed = JSON.parse(data);
            return parsed.last_index === undefined ? -1 : parsed.last_index;
        }
        return -1;
    } catch (error) {
        console.error('Error loading progress:', error);
        return -1;
    }
}

function loadLastHash() {
    try {
        if (existsSync(HASH_FILE)) {
            const data = readFileSync(HASH_FILE, 'utf-8');
            const parsed = JSON.parse(data);
            console.log('Loaded last hash:', parsed);
            return parsed.hash;
        }
        return null;
    } catch (error) {
        console.error('Error loading last hash:', error);
        return null;
    }
}

function saveLastHash(hash) {
    try {
        writeFileSync(HASH_FILE, JSON.stringify({ hash }, null, 2));
        console.log('Saved new hash:', hash);
    } catch (error) {
        console.error('Error saving last hash:', error);
    }
}

function formatPassage(passage) {
    const header = `${passage.book} - ${passage.chapter} [${passage.part}]\n\n`;
    return header + passage.text;
}

async function sendCast(text, passage) {
    if (!text) {
        throw new Error('Cannot send empty cast');
    }
    
    try {
        const lastHash = loadLastHash();
        const isFirstPartOfChapter = passage.part.startsWith('1/');
        
        console.log('Threading debug:', {
            lastHash,
            isFirstPartOfChapter,
            currentPart: passage.part
        });

        const payload = {
            text,
            fid: FARCASTER_FID,
            signer_uuid: SIGNER_UUID
        };

        // Add target_cast_id for replies
        if (lastHash && !isFirstPartOfChapter) {
            payload.target_cast_hash = lastHash;
        }
        
        console.log('Sending cast with payload:', {
            ...payload,
            signer_uuid: '***',
            text_length: text.length,
        });

        const response = await axios.post(CAST_URL, payload, {
            headers: {
                'api_key': NEYNAR_API_KEY,
                'Content-Type': 'application/json',
            },
        });
        
        if (response.data.cast && response.data.cast.hash) {
            saveLastHash(response.data.cast.hash);
            console.log('Successfully saved hash for threading:', response.data.cast.hash);
        }

        console.log('Cast sent successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending cast:', error),
        throw error;
    }
}

async function configureGit(index) {
    try {
        // Write the progress file first
        writeFileSync(PROGRESS_FILE, JSON.stringify({ last_index: index }, null, 2));
        
        execSync('git config user.name "GitHub Actions Bot"');
        execSync('git config user.email "actions@github.com"');
        execSync('git add progress.json last_hash.json');
        
        // Check if there are changes to commit
        const status = execSync('git status --porcelain').toString();
        if (status) {
            execSync('git commit -m "Update progress and hash tracking [skip ci]"');
            execSync('git push');
            console.log('Successfully committed and pushed updates');
        } else {
            console.log('No changes to commit');
        }
    } catch (error) {
        console.error('Error in git operations:', error);
        throw error;
    }
}

async function main() {
    try {
        // Load and verify passages
        const passages = loadPassages();
        
        // Load and verify progress
        let lastIndex = loadProgress();
        console.log('Current progress (last_index):', lastIndex);
        
        // Calculate and verify next index
        const nextIndex = (lastIndex + 1) % passages.length;
        console.log('Next index to post:', nextIndex);
        
        // Debug current state
        console.log('DEBUG - Current state:', {
            progressFileContent: JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')),
            lastHash: loadLastHash(),
            lastIndex: lastIndex,
            nextIndex: nextIndex,
            totalPassages: passages.length,
            currentPart: passages[nextIndex].part
        });
        
        // Get and verify passage
        const passage = passages[nextIndex];
        console.log('Selected passage:', {
            index: nextIndex,
            book: passage.book,
            chapter: passage.chapter,
            part: passage.part,
            textPreview: passage.text.substring(0, 50) + '...'
        });
        
        // Format and verify text
        const formattedText = formatPassage(passage);
        console.log('Formatted text length:', formattedText.length);
        
        if (formattedText.length > MAX_CHARACTERS) {
            console.error('Warning: Formatted text exceeds maximum character limit');
        }
        
        // Send cast
        await sendCast(formattedText, passage);
        console.log('Cast sent successfully');
        
        // Configure git and push changes
        await configureGit(nextIndex);
        
        // Verify final state
        const finalProgress = loadProgress();
        console.log('Final progress state:', finalProgress);
        
    } catch (error) {
        console.error('Bot execution failed:', error);
        process.exit(1);
    }
}

// Run the main function
main().catch(console.error);