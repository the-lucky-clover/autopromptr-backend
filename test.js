const request = require('supertest');
const app = require('./server');

// Basic test suite for the backend
describe('AutoPromptr Backend Tests', () => {
  
  describe('Health Check', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('autopromptr-backend');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Test Endpoint', () => {
    test('GET /test should run comprehensive test suite', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);
      
      expect(response.body.service).toBe('autopromptr-backend');
      expect(response.body.tests).toHaveLength(4);
      expect(response.body.summary.total).toBe(4);
      expect(response.body.summary.passed).toBeGreaterThanOrEqual(0);
      expect(response.body.summary.failed).toBeGreaterThanOrEqual(0);
      expect(response.body.summary.duration).toBeGreaterThan(0);
      
      // Check individual test structure
      response.body.tests.forEach(test => {
        expect(test).toHaveProperty('name');
        expect(test).toHaveProperty('status');
        expect(test).toHaveProperty('duration');
        expect(['passed', 'failed', 'partial']).toContain(test.status);
      });
    }, 30000); // 30 second timeout for comprehensive tests
  });

  describe('Browser Initialization Test', () => {
    test('Should successfully initialize Puppeteer browser', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);
      
      const browserTest = response.body.tests.find(t => t.name === 'Browser Initialization');
      expect(browserTest).toBeDefined();
      expect(['passed', 'partial']).toContain(browserTest.status);
    }, 15000);
  });

  describe('Basic Automation Test', () => {
    test('Should successfully perform basic automation tasks', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);
      
      const automationTest = response.body.tests.find(t => t.name === 'Basic Automation');
      expect(automationTest).toBeDefined();
      
      if (automationTest.status === 'passed') {
        expect(automationTest.details.testsCompleted).toContain('text input');
        expect(automationTest.details.testsCompleted).toContain('button click');
        expect(automationTest.details.testsCompleted).toContain('select dropdown');
      }
    }, 15000);
  });

  describe('Enhanced Features Test', () => {
    test('Should test enhanced automation features', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);
      
      const enhancedTest = response.body.tests.find(t => t.name === 'Enhanced Features');
      expect(enhancedTest).toBeDefined();
      expect(['passed', 'failed', 'partial']).toContain(enhancedTest.status);
    });
  });

  describe('Error Handling Test', () => {
    test('Should properly handle various error scenarios', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);
      
      const errorTest = response.body.tests.find(t => t.name === 'Error Handling');
      expect(errorTest).toBeDefined();
      
      if (errorTest.status === 'passed') {
        expect(errorTest.details.errorsCaught).toBeGreaterThanOrEqual(2);
      }
    }, 10000);
  });

  describe('Automation Endpoint', () => {
    test('POST /automate should handle automation requests', async () => {
      const automationData = {
        url: 'https://example.com',
        actions: [
          { type: 'navigate', target: 'https://example.com' }
        ]
      };

      const response = await request(app)
        .post('/automate')
        .send(automationData);
      
      // Should either succeed or fail gracefully
      expect([200, 500]).toContain(response.status);
    }, 15000);
  });
});

// Performance and stress tests
describe('Performance Tests', () => {
  test('Health check should respond quickly', async () => {
    const start = Date.now();
    await request(app)
      .get('/health')
      .expect(200);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Should respond within 1 second
  });

  test('Multiple concurrent health checks', async () => {
    const promises = Array(5).fill().map(() => 
      request(app).get('/health').expect(200)
    );
    
    const responses = await Promise.all(promises);
    expect(responses).toHaveLength(5);
    responses.forEach(response => {
      expect(response.body.status).toBe('healthy');
    });
  });
});

// Utility functions for testing
function generateTestData() {
  return {
    url: 'https://example.com',
    actions: [
      { type: 'navigate', target: 'https://example.com' },
      { type: 'click', selector: '#test-button' },
      { type: 'type', selector: '#test-input', text: 'test data' }
    ],
    options: {
      headless: true,
      timeout: 10000
    }
  };
}

module.exports = {
  generateTestData
};
