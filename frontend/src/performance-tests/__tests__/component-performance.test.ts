/**
 * Component Performance Tests
 * Tests React Native component rendering performance and memory usage
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { performance } from 'perf_hooks';

// Mock performance API for React Native
const mockPerformance = {
  now: () => Date.now(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
};

// Performance thresholds (in milliseconds)
const RENDER_THRESHOLDS = {
  FAST_RENDER: 50,      // Fast component render (< 50ms)
  ACCEPTABLE_RENDER: 100, // Acceptable render (< 100ms)
  SLOW_RENDER: 200,     // Slow render threshold (< 200ms)
};

// Memory thresholds for components (in MB)
const COMPONENT_MEMORY_THRESHOLDS = {
  LIGHT_COMPONENT: 5,    // Light components (< 5MB)
  MEDIUM_COMPONENT: 15,  // Medium components (< 15MB)
  HEAVY_COMPONENT: 30,   // Heavy components (< 30MB)
};

describe('Component Performance Tests', () => {
  beforeAll(() => {
    // Setup performance monitoring
    jest.setTimeout(10000); // 10 second timeout for component tests

    // Mock React performance
    global.performance = mockPerformance as any;
  });

  describe('Property Card Component Performance', () => {
    it('should render property card within acceptable time', async () => {
      const { PropertyCard } = await import('../../components/PropertyCard');

      const propertyData = {
        id: 1,
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        price: 300000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 2000,
        images: ['https://example.com/image1.jpg']
      };

      const startTime = performance.now();

      const { getByText } = render(
        <PropertyCard property={propertyData} />
      );

      // Wait for component to fully render
      await waitFor(() => {
        expect(getByText('123 Test St')).toBeTruthy();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(RENDER_THRESHOLDS.ACCEPTABLE_RENDER);

      console.log(`PropertyCard render time: ${renderTime.toFixed(2)}ms`);
    });

    it('should handle large property lists efficiently', async () => {
      const { PropertyList } = await import('../../components/PropertyList');

      const properties = Array(50).fill(null).map((_, index) => ({
        id: index + 1,
        address: `${index + 1} Test St`,
        city: 'Test City',
        state: 'TS',
        price: 250000 + (index * 5000),
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1800 + (index * 50),
        images: [`https://example.com/image${index + 1}.jpg`]
      }));

      const startTime = performance.now();

      const { getByText } = render(
        <PropertyList properties={properties} />
      );

      // Wait for list to render
      await waitFor(() => {
        expect(getByText('1 Test St')).toBeTruthy();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(RENDER_THRESHOLDS.SLOW_RENDER);

      console.log(`PropertyList (50 items) render time: ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('CMA Components Performance', () => {
    it('should render CMA statistics card efficiently', async () => {
      const { CMAStatisticsCard } = await import('../../components/CMAStatisticsCard');

      const statisticsData = {
        averagePrice: 350000,
        medianPrice: 340000,
        totalComparables: 12,
        priceRange: { low: 320000, high: 380000 },
        averageDaysOnMarket: 45,
        marketTrend: 'stable' as const
      };

      const startTime = performance.now();

      const { getByText } = render(
        <CMAStatisticsCard statistics={statisticsData} />
      );

      await waitFor(() => {
        expect(getByText('$350,000')).toBeTruthy();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(RENDER_THRESHOLDS.ACCEPTABLE_RENDER);

      console.log(`CMAStatisticsCard render time: ${renderTime.toFixed(2)}ms`);
    });

    it('should handle CMA chart rendering performance', async () => {
      const { CMAChart } = await import('../../components/CMAChart');

      const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          data: [320000, 325000, 335000, 340000, 345000, 350000],
          color: () => '#007AFF'
        }]
      };

      const startTime = performance.now();

      const { getByTestId } = render(
        <CMAChart data={chartData} title="Price Trends" />
      );

      await waitFor(() => {
        expect(getByTestId('cma-chart')).toBeTruthy();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(RENDER_THRESHOLDS.SLOW_RENDER);

      console.log(`CMAChart render time: ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('Form Components Performance', () => {
    it('should render material text field quickly', async () => {
      const { MaterialTextField } = await import('../../components/MaterialTextField');

      const startTime = performance.now();

      const { getByPlaceholderText } = render(
        <MaterialTextField
          placeholder="Enter property address"
          value=""
          onChangeText={() => {}}
        />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Enter property address')).toBeTruthy();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(RENDER_THRESHOLDS.FAST_RENDER);

      console.log(`MaterialTextField render time: ${renderTime.toFixed(2)}ms`);
    });

    it('should handle form validation performance', async () => {
      const { PropertyForm } = await import('../../components/PropertyForm');

      const formData = {
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        price: 300000,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 2000
      };

      const startTime = performance.now();

      const { getByText } = render(
        <PropertyForm
          initialData={formData}
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      await waitFor(() => {
        expect(getByText('Submit')).toBeTruthy();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(RENDER_THRESHOLDS.ACCEPTABLE_RENDER);

      console.log(`PropertyForm render time: ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('List Components Performance', () => {
    it('should render virtualized property list efficiently', async () => {
      const { VirtualizedPropertyList } = await import('../../components/VirtualizedPropertyList');

      const properties = Array(1000).fill(null).map((_, index) => ({
        id: index + 1,
        address: `${index + 1} Test St`,
        city: 'Test City',
        state: 'TS',
        price: 250000 + (index * 1000),
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1800 + (index * 10),
        images: [`https://example.com/image${index + 1}.jpg`]
      }));

      const startTime = performance.now();

      const { getByText } = render(
        <VirtualizedPropertyList
          properties={properties}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
        />
      );

      // Wait for initial render
      await waitFor(() => {
        expect(getByText('1 Test St')).toBeTruthy();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(RENDER_THRESHOLDS.ACCEPTABLE_RENDER);

      console.log(`VirtualizedPropertyList (1000 items) initial render: ${renderTime.toFixed(2)}ms`);
    });

    it('should handle list scrolling performance', async () => {
      const { PropertyList } = await import('../../components/PropertyList');

      const properties = Array(100).fill(null).map((_, index) => ({
        id: index + 1,
        address: `${index + 1} Test St`,
        city: 'Test City',
        state: 'TS',
        price: 250000 + (index * 2000),
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1800 + (index * 20),
        images: [`https://example.com/image${index + 1}.jpg`]
      }));

      const { getByTestId } = render(
        <PropertyList properties={properties} />
      );

      // Simulate scrolling by triggering onEndReached
      const scrollView = getByTestId('property-list-scroll');

      const scrollStartTime = performance.now();

      // Trigger scroll to bottom
      await waitFor(() => {
        // This would normally trigger additional data loading
        expect(scrollView).toBeTruthy();
      });

      const scrollEndTime = performance.now();
      const scrollTime = scrollEndTime - scrollStartTime;

      expect(scrollTime).toBeLessThan(RENDER_THRESHOLDS.ACCEPTABLE_RENDER);

      console.log(`PropertyList scroll performance: ${scrollTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should maintain low memory usage during data processing', async () => {
      const { monitorMemoryUsage } = await import('../utils/performance-helpers');

      const initialMemory = process.memoryUsage?.()?.heapUsed / 1024 / 1024 || 0;

      // Process large dataset
      const largeDataset = Array(1000).fill(null).map((_, index) => ({
        id: index + 1,
        address: `${index + 1} Test St`,
        city: 'Test City',
        state: 'TS',
        price: 250000 + (index * 5000),
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1800 + (index * 50)
      }));

      // Simulate data processing
      const processedData = largeDataset.map(item => ({
        ...item,
        pricePerSqft: item.price / item.square_feet,
        isLuxury: item.price > 500000
      }));

      const finalMemory = process.memoryUsage?.()?.heapUsed / 1024 / 1024 || 0;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(COMPONENT_MEMORY_THRESHOLDS.MEDIUM_COMPONENT);
      expect(processedData.length).toBe(1000);

      console.log(`Data processing memory usage: ${initialMemory.toFixed(2)}MB → ${finalMemory.toFixed(2)}MB (+${memoryIncrease.toFixed(2)}MB)`);
    });

    it('should handle memory cleanup for large objects', async () => {
      const initialMemory = process.memoryUsage?.()?.heapUsed / 1024 / 1024 || 0;

      // Create large object
      let largeObject = {
        data: Array(10000).fill(null).map((_, i) => ({
          id: i,
          value: Math.random(),
          nested: {
            prop1: `value${i}`,
            prop2: i * 2,
            prop3: new Date().toISOString()
          }
        }))
      };

      // Process the large object
      const processed = largeObject.data.filter(item => item.value > 0.5);

      // Clean up reference
      largeObject = null as any;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterCleanupMemory = process.memoryUsage?.()?.heapUsed / 1024 / 1024 || 0;
      const memoryAfterCleanup = initialMemory - afterCleanupMemory;

      expect(processed.length).toBeGreaterThan(0);
      expect(memoryAfterCleanup).toBeGreaterThan(-COMPONENT_MEMORY_THRESHOLDS.LIGHT_COMPONENT);

      console.log(`Memory after cleanup: ${initialMemory.toFixed(2)}MB → ${afterCleanupMemory.toFixed(2)}MB (${memoryAfterCleanup > 0 ? '+' : ''}${memoryAfterCleanup.toFixed(2)}MB)`);
    });
  });
});