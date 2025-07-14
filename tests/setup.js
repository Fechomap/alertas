// Jest setup file
require('dotenv').config({ path: '.env.test' });

// Mock console methods in tests if needed
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Setup test database or mocks
beforeAll(async () => {
  // Setup test environment
});

afterAll(async () => {
  // Cleanup test environment
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});