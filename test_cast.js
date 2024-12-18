import axios from 'axios';

const CAST_URL = 'https://api.neynar.com/v2/farcaster/cast';
const NEYNAR_API_KEY = 'E5AB653B-64E7-426F-A41A-9B090DA464AA';
const FARCASTER_FID = '902862';
const SIGNER_UUID = '0a6e3853-20f0-413b-a9cc-eb8aafe07571';

async function testCast() {
  try {
    const payload = {
      text: 'This is a test cast to debug the token issue.',
      fid: FARCASTER_FID,
      signer_uuid: SIGNER_UUID,
    };
    
    console.log('Testing with payload:', payload);
    
    const response = await axios.post(
      CAST_URL,
      payload,
      {
        headers: {
          'api_key': NEYNAR_API_KEY,  // Changed from Authorization: Bearer
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('Cast sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending test cast:', error.response ? error.response.data : error.message);
  }
}

testCast();