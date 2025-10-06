/**
 * MLS Sync Service Tests
 */

import { MLSSyncService } from '../../services/mls/mls-sync.service';
import { MockMLSProvider } from '../../services/mls/mock-mls-provider';

describe('MLSSyncService', () => {
  let syncService: MLSSyncService;

  beforeEach(() => {
    syncService = new MLSSyncService({
      providerId: 'test_provider',
      providerName: 'Test MLS Provider',
      providerType: 'MOCK',
      loginUrl: 'https://test.mls.com',
      credentials: {
        username: 'test',
        password: 'test',
      },
      fieldMapping: {},
    });
  });

  describe('initialize', () => {
    it('should initialize mock provider successfully', async () => {
      await expect(syncService.initialize()).resolves.not.toThrow();
    });

    it('should throw error for unsupported provider type', async () => {
      const invalidService = new MLSSyncService({
        providerId: 'invalid',
        providerName: 'Invalid',
        providerType: 'REST_API' as any,
        loginUrl: 'https://test.com',
        credentials: { username: 'test', password: 'test' },
        fieldMapping: {},
      });

      await expect(invalidService.initialize()).rejects.toThrow('Unsupported provider type');
    });
  });

  describe('performFullSync', () => {
    it('should throw error if not initialized', async () => {
      await expect(syncService.performFullSync()).rejects.toThrow('Provider not initialized');
    });

    // Note: Full integration tests require database setup
    // This is a unit test suite - integration tests should be in separate file
  });

  describe('performIncrementalSync', () => {
    it('should throw error if not initialized', async () => {
      await expect(syncService.performIncrementalSync()).rejects.toThrow('Provider not initialized');
    });
  });
});

describe('MockMLSProvider', () => {
  let provider: MockMLSProvider;

  beforeEach(() => {
    provider = new MockMLSProvider({
      providerId: 'mock_provider',
      providerName: 'Mock MLS',
      providerType: 'RETS',
      loginUrl: 'https://mock.mls.com',
      credentials: {
        username: 'test',
        password: 'test',
      },
      fieldMapping: {},
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await expect(provider.connect()).resolves.not.toThrow();
      expect(provider.isConnected()).toBe(true);
    });
  });

  describe('fetchProperties', () => {
    it('should fetch mock properties', async () => {
      await provider.connect();
      
      const properties = await provider.fetchProperties({
        syncType: 'full',
        includeMedia: false,
      });

      expect(properties).toBeDefined();
      expect(Array.isArray(properties)).toBe(true);
      expect(properties.length).toBeGreaterThan(0);
      expect(properties.length).toBeLessThanOrEqual(50);
    });

    it('should include media when requested', async () => {
      await provider.connect();
      
      const properties = await provider.fetchProperties({
        syncType: 'full',
        includeMedia: true,
      });

      const propertiesWithMedia = properties.filter(p => p.media && p.media.length > 0);
      expect(propertiesWithMedia.length).toBeGreaterThan(0);
    });

    it('should respect batch size', async () => {
      await provider.connect();
      
      const properties = await provider.fetchProperties({
        syncType: 'full',
        batchSize: 10,
      });

      expect(properties.length).toBeLessThanOrEqual(10);
    });
  });

  describe('fetchPropertyById', () => {
    it('should return null for non-existent property', async () => {
      await provider.connect();
      
      const property = await provider.fetchPropertyById('NONEXISTENT');
      expect(property).toBeNull();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when connected', async () => {
      await provider.connect();
      
      const health = await provider.healthCheck();
      expect(health.healthy).toBe(true);
    });

    it('should return unhealthy when not connected', async () => {
      const health = await provider.healthCheck();
      expect(health.healthy).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await provider.connect();
      await expect(provider.disconnect()).resolves.not.toThrow();
      expect(provider.isConnected()).toBe(false);
    });
  });
});
