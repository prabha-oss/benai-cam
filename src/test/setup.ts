// Test setup file
import { vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock fetch globally for API tests
global.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
});
