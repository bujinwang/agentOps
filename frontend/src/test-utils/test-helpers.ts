// Test utilities and helpers for React Native testing

import { ReactTestRenderer } from 'react-test-renderer';

// Mock setup helpers
export const mockFetchResponse = (data: any, ok = true) => ({
  ok,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  status: ok ? 200 : 400,
});

export const mockFetchError = (error: Error) => {
  throw error;
};

// Local storage mock helper
export const createLocalStorageMock = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
});

// API response helpers
export const createSuccessResponse = <T>(data: T) => ({
  success: true,
  data,
});

export const createErrorResponse = (message: string, code = 'ERROR') => ({
  success: false,
  error: {
    code,
    message,
  },
});

// Component testing helpers
export const findByTestId = (tree: ReactTestRenderer, testID: string) => {
  const found = tree.root.findAll((node) => node.props.testID === testID);
  return found.length > 0 ? found[0] : null;
};

export const findAllByTestId = (tree: ReactTestRenderer, testID: string) => {
  return tree.root.findAll((node) => node.props.testID === testID);
};

// Async helpers
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const waitForCondition = (condition: () => boolean, timeout = 1000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkCondition = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Condition not met within timeout'));
      } else {
        setTimeout(checkCondition, 10);
      }
    };

    checkCondition();
  });
};

// Mock data factories
export const createMockProperty = (overrides = {}) => ({
  id: 'prop-1',
  address: {
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345',
    latitude: 34.0522,
    longitude: -118.2437,
  },
  propertyType: 'Single Family',
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 2000,
  lotSize: 8000,
  yearBuilt: 1990,
  status: 'Active',
  listPrice: 500000,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'agent',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Navigation mock
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
};

// Redux store mock (if using Redux)
export const createMockStore = (initialState = {}) => ({
  getState: jest.fn(() => initialState),
  dispatch: jest.fn(),
  subscribe: jest.fn(),
  replaceReducer: jest.fn(),
});

// Async storage mock helper
export const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  mergeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  multiMerge: jest.fn(),
};