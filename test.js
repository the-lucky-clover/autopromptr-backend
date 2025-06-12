const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testEndpoints() {
  console.log('🧪 Testing AutoPromptr Backend Endpoints...\n');

  // Test 1: Health Check
  try {
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }

  // Test 2: API Status
  try {
    console.log('\n2️⃣ Testing API status endpoint...');
    const statusResponse = await axios.get(`${BASE_URL}/api/status`);
    console.log('✅ API status check passed:', statusResponse.data);
  } catch (error) {
    console.error('❌ API status check failed:', error.message);
  }

  // Test 3: Batch Processing
  try {
    console.log('\n3️⃣ Testing batch processing endpoint...');
    
    const testBatch = {
      batch: {
        id: 'test-batch-' + Date.now(),
        name: 'Test Batch',
        targetUrl: 'https://example.com',
        prompts: [
          { id: '1', text: 'Hello World', order: 1 },
          { id: '2', text: 'Test Prompt', order: 2 }
        ]
      },
      platform: 'web',
      settings: {
        waitForIdle: true,
        maxRetries: 1,
        debugLevel: 'standard'
      }
    };

    const batchResponse = await axios.post(`${BASE_URL}/api/run-batch`, testBatch, {
      timeout: 30000
    });
    
    console.log('✅ Batch processing test passed:', batchResponse.data);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Batch processing failed:', error.response.status, error.response.data);
    } else {
      console.error('❌ Batch processing failed:', error.message);
    }
  }

  // Test 4: Invalid Endpoint
  try {
    console.log('\n4️⃣ Testing 404 handling...');
    await axios.get(`${BASE_URL}/nonexistent`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('✅ 404 handling works correctly:', error.response.data);
    } else {
      console.error('❌ Unexpected error for 404 test:', error.message);
    }
  }

  console.log('\n🏁 Testing completed!');
}

// Run tests
testEndpoints().catch(console.error);
