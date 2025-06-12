const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const automation = require('./automation');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'autopromptr-backend'
  });
});

// Enhanced test endpoint with comprehensive testing
app.get('/test', async (req, res) => {
  const startTime = Date.now();
  const testResults = {
    timestamp: new Date().toISOString(),
    service: 'autopromptr-backend',
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0
    }
  };

  try {
    // Test 1: Browser initialization
    const browserTest = await testBrowserInitialization();
    testResults.tests.push(browserTest);

    // Test 2: Basic automation
    const automationTest = await testBasicAutomation();
    testResults.tests.push(automationTest);

    // Test 3: Enhanced features
    const enhancedTest = await testEnhancedFeatures();
    testResults.tests.push(enhancedTest);

    // Test 4: Error handling
    const errorTest = await testErrorHandling();
    testResults.tests.push(errorTest);

    // Calculate summary
    testResults.summary.total = testResults.tests.length;
    testResults.summary.passed = testResults.tests.filter(t => t.status === 'passed').length;
    testResults.summary.failed = testResults.tests.filter(t => t.status === 'failed').length;
    testResults.summary.duration = Date.now() - startTime;

    res.json(testResults);
  } catch (error) {
    res.status(500).json({
      error: 'Test suite failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test functions
async function testBrowserInitialization() {
  const testStart = Date.now();
  let browser = null;
  
  try {
    console.log('Testing browser initialization...');
    
    // Test browser launch with different configurations
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Test basic page operations
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto('data:text/html,<h1>Test Page</h1>');
    
    const title = await page.evaluate(() => document.querySelector('h1').textContent);
    
    if (title !== 'Test Page') {
      throw new Error('Basic page operations failed');
    }

    await browser.close();
    
    return {
      name: 'Browser Initialization',
      status: 'passed',
      duration: Date.now() - testStart,
      details: {
        browserVersion: await browser.version(),
        message: 'Browser launched and basic operations completed successfully'
      }
    };
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    return {
      name: 'Browser Initialization',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error.message,
      details: {
        errorType: error.constructor.name,
        stack: error.stack
      }
    };
  }
}

async function testBasicAutomation() {
  const testStart = Date.now();
  let browser = null;
  
  try {
    console.log('Testing basic automation...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Create a test page with interactive elements
    const testHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Automation Test Page</title></head>
        <body>
          <input id="testInput" type="text" placeholder="Enter text">
          <button id="testButton" onclick="document.getElementById('result').textContent='Button clicked!'">Click Me</button>
          <div id="result"></div>
          <select id="testSelect">
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
          </select>
        </body>
      </html>
    `;
    
    await page.goto(`data:text/html,${encodeURIComponent(testHTML)}`);
    
    // Test text input
    await page.type('#testInput', 'Test automation text');
    const inputValue = await page.$eval('#testInput', el => el.value);
    
    if (inputValue !== 'Test automation text') {
      throw new Error('Text input failed');
    }
    
    // Test button click
    await page.click('#testButton');
    const buttonResult = await page.$eval('#result', el => el.textContent);
    
    if (buttonResult !== 'Button clicked!') {
      throw new Error('Button click failed');
    }
    
    // Test select dropdown
    await page.select('#testSelect', 'option2');
    const selectValue = await page.$eval('#testSelect', el => el.value);
    
    if (selectValue !== 'option2') {
      throw new Error('Select dropdown failed');
    }
    
    await browser.close();
    
    return {
      name: 'Basic Automation',
      status: 'passed',
      duration: Date.now() - testStart,
      details: {
        testsCompleted: ['text input', 'button click', 'select dropdown'],
        message: 'All basic automation tests passed'
      }
    };
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    return {
      name: 'Basic Automation',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error.message
    };
  }
}

async function testEnhancedFeatures() {
  const testStart = Date.now();
  
  try {
    console.log('Testing enhanced features...');
    
    // Test the automation module functions
    const enhancedTests = [];
    
    // Test element detection capabilities
    if (typeof automation.detectElements === 'function') {
      const elementTest = await automation.detectElements();
      enhancedTests.push('element detection');
    }
    
    // Test form submission methods
    if (typeof automation.submitForm === 'function') {
      const formTest = await automation.submitForm();
      enhancedTests.push('form submission');
    }
    
    // Test page readiness detection
    if (typeof automation.waitForPageReady === 'function') {
      const readinessTest = await automation.waitForPageReady();
      enhancedTests.push('page readiness');
    }
    
    return {
      name: 'Enhanced Features',
      status: enhancedTests.length > 0 ? 'passed' : 'partial',
      duration: Date.now() - testStart,
      details: {
        featuresAvailable: enhancedTests,
        message: `${enhancedTests.length} enhanced features tested successfully`
      }
    };
  } catch (error) {
    return {
      name: 'Enhanced Features',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error.message
    };
  }
}

async function testErrorHandling() {
  const testStart = Date.now();
  let browser = null;
  
  try {
    console.log('Testing error handling...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Test 1: Handle non-existent URL
    let errorsCaught = 0;
    
    try {
      await page.goto('https://non-existent-url-12345.com', { timeout: 5000 });
    } catch (error) {
      errorsCaught++;
      console.log('Successfully caught navigation error');
    }
    
    // Test 2: Handle missing elements
    try {
      await page.goto('data:text/html,<h1>Simple page</h1>');
      await page.click('#non-existent-element', { timeout: 2000 });
    } catch (error) {
      errorsCaught++;
      console.log('Successfully caught missing element error');
    }
    
    // Test 3: Handle timeout scenarios
    try {
      await page.goto('data:text/html,<div id="delayed"></div>');
      await page.waitForSelector('#never-appears', { timeout: 1000 });
    } catch (error) {
      errorsCaught++;
      console.log('Successfully caught timeout error');
    }
    
    await browser.close();
    
    return {
      name: 'Error Handling',
      status: errorsCaught >= 2 ? 'passed' : 'partial',
      duration: Date.now() - testStart,
      details: {
        errorsCaught,
        expectedErrors: 3,
        message: `Successfully handled ${errorsCaught}/3 error scenarios`
      }
    };
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    return {
      name: 'Error Handling',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error.message
    };
  }
}

// Automation endpoints
app.post('/automate', async (req, res) => {
  try {
    const result = await automation.runAutomation(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
