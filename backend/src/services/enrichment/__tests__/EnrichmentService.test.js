const EnrichmentService = require('../EnrichmentService');
const PropertyDataProvider = require('../providers/PropertyDataProvider');
const SocialMediaProvider = require('../providers/SocialMediaProvider');
const CreditReportingProvider = require('../providers/CreditReportingProvider');
const ValidationService = require('../ValidationService');
const CacheService = require('../CacheService');
const ComplianceService = require('../ComplianceService');

// Mock all dependencies
jest.mock('../providers/PropertyDataProvider');
jest.mock('../providers/SocialMediaProvider');
jest.mock('../providers/CreditReportingProvider');
jest.mock('../ValidationService');
jest.mock('../CacheService');
jest.mock('../ComplianceService');

describe('EnrichmentService', () => {
  let enrichmentService;
  let mockPropertyProvider;
  let mockSocialProvider;
  let mockCreditProvider;
  let mockValidationService;
  let mockCacheService;
  let mockComplianceService;

  const mockLead = {
    id: 123,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+1234567890',
    address: '123 Main St, Anytown, USA',
    enrichmentConsent: true,
    creditDataConsent: true,
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockPropertyProvider = {
      doEnrich: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
    };

    mockSocialProvider = {
      doEnrich: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
    };

    mockCreditProvider = {
      doEnrich: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue({ status: 'healthy' }),
    };

    mockValidationService = {
      validateEnrichmentData: jest.fn(),
      calculateQualityScore: jest.fn(),
      calculateConfidence: jest.fn(),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      getStats: jest.fn().mockResolvedValue({ hits: 10, misses: 5 }),
    };

    mockComplianceService = {
      validateConsent: jest.fn(),
      logEnrichmentEvent: jest.fn(),
    };

    // Mock the constructor implementations
    PropertyDataProvider.mockImplementation(() => mockPropertyProvider);
    SocialMediaProvider.mockImplementation(() => mockSocialProvider);
    CreditReportingProvider.mockImplementation(() => mockCreditProvider);
    ValidationService.mockImplementation(() => mockValidationService);
    CacheService.mockImplementation(() => mockCacheService);
    ComplianceService.mockImplementation(() => mockComplianceService);

    enrichmentService = new EnrichmentService();
  });

  describe('enrichLead', () => {
    it('should successfully enrich a lead with all data sources', async () => {
      // Setup mock responses
      mockComplianceService.validateConsent.mockResolvedValue({
        approved: true,
        gdprCompliant: true,
        ccpaCompliant: true,
      });

      mockCacheService.get.mockResolvedValue(null); // Cache miss

      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 450000,
        ownershipStatus: 'owner',
        confidence: 0.95,
      });

      mockSocialProvider.doEnrich.mockResolvedValue({
        professionalTitle: 'Software Engineer',
        company: 'Tech Corp',
        confidence: 0.87,
      });

      mockCreditProvider.doEnrich.mockResolvedValue({
        creditScore: 750,
        paymentHistory: 'excellent',
        confidence: 0.92,
      });

      mockValidationService.validateEnrichmentData.mockReturnValue({
        isValid: true,
        corrections: [],
      });

      mockValidationService.calculateQualityScore.mockReturnValue(92);
      mockValidationService.calculateConfidence.mockReturnValue(0.91);

      // Execute enrichment
      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property', 'social', 'credit'],
      });

      // Verify result structure
      expect(result).toHaveProperty('enrichmentId');
      expect(result.qualityScore).toBe(92);
      expect(result.confidence).toBe(0.91);
      expect(result.sources).toEqual(['property', 'social', 'credit']);
      expect(result.data).toHaveProperty('property');
      expect(result.data).toHaveProperty('social');
      expect(result.data).toHaveProperty('credit');

      // Verify cache was checked
      expect(mockCacheService.get).toHaveBeenCalledWith(`enrichment:${mockLead.id}`);

      // Verify all providers were called
      expect(mockPropertyProvider.doEnrich).toHaveBeenCalledWith(mockLead);
      expect(mockSocialProvider.doEnrich).toHaveBeenCalledWith(mockLead);
      expect(mockCreditProvider.doEnrich).toHaveBeenCalledWith(mockLead);

      // Verify validation was called
      expect(mockValidationService.validateEnrichmentData).toHaveBeenCalled();

      // Verify cache was set
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        enrichmentId: 'cached-123',
        qualityScore: 88,
        confidence: 0.85,
        sources: ['property'],
        data: { property: { propertyValue: 400000 } },
        cached: true,
      };

      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await enrichmentService.enrichLead(mockLead.id);

      expect(result).toEqual(cachedResult);
      expect(mockPropertyProvider.doEnrich).not.toHaveBeenCalled();
      expect(mockSocialProvider.doEnrich).not.toHaveBeenCalled();
      expect(mockCreditProvider.doEnrich).not.toHaveBeenCalled();
    });

    it('should handle compliance failure', async () => {
      mockComplianceService.validateConsent.mockResolvedValue({
        approved: false,
        reason: 'GDPR consent required',
      });

      await expect(enrichmentService.enrichLead(mockLead.id))
        .rejects
        .toThrow('Compliance check failed');

      expect(mockPropertyProvider.doEnrich).not.toHaveBeenCalled();
    });

    it('should handle partial enrichment when some providers fail', async () => {
      mockComplianceService.validateConsent.mockResolvedValue({
        approved: true,
      });

      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 450000,
        confidence: 0.95,
      });

      mockSocialProvider.doEnrich.mockRejectedValue(new Error('API rate limit'));
      mockCreditProvider.doEnrich.mockRejectedValue(new Error('Invalid credentials'));

      mockValidationService.calculateQualityScore.mockReturnValue(75);
      mockValidationService.calculateConfidence.mockReturnValue(0.65);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property', 'social', 'credit'],
      });

      expect(result.qualityScore).toBe(75);
      expect(result.sources).toEqual(['property']); // Only successful source
      expect(result.data).toHaveProperty('property');
      expect(result.data).not.toHaveProperty('social');
      expect(result.data).not.toHaveProperty('credit');
    });

    it('should respect source filtering', async () => {
      mockComplianceService.validateConsent.mockResolvedValue({
        approved: true,
      });

      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 450000,
      });

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'], // Only property data
      });

      expect(mockPropertyProvider.doEnrich).toHaveBeenCalled();
      expect(mockSocialProvider.doEnrich).not.toHaveBeenCalled();
      expect(mockCreditProvider.doEnrich).not.toHaveBeenCalled();
      expect(result.sources).toEqual(['property']);
    });

    it('should handle validation failures gracefully', async () => {
      mockComplianceService.validateConsent.mockResolvedValue({
        approved: true,
      });

      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 'invalid_value', // Invalid data
      });

      mockValidationService.validateEnrichmentData.mockReturnValue({
        isValid: false,
        corrections: ['propertyValue must be a number'],
      });

      mockValidationService.calculateQualityScore.mockReturnValue(45);

      const result = await enrichmentService.enrichLead(mockLead.id);

      expect(result.qualityScore).toBe(45);
      expect(result).toHaveProperty('validationErrors');
    });

    it('should force refresh when requested', async () => {
      const cachedResult = {
        enrichmentId: 'cached-123',
        qualityScore: 88,
      };

      mockCacheService.get.mockResolvedValue(cachedResult);
      mockComplianceService.validateConsent.mockResolvedValue({
        approved: true,
      });

      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 500000,
      });

      const result = await enrichmentService.enrichLead(mockLead.id, {
        forceRefresh: true,
      });

      // Should not return cached result
      expect(result.enrichmentId).not.toBe('cached-123');
      expect(mockPropertyProvider.doEnrich).toHaveBeenCalled();
    });
  });

  describe('enrichLeadsBatch', () => {
    it('should process multiple leads in batch', async () => {
      const leadIds = [123, 124, 125];

      mockComplianceService.validateConsent.mockResolvedValue({
        approved: true,
      });

      mockPropertyProvider.doEnrich
        .mockResolvedValueOnce({ propertyValue: 400000 })
        .mockResolvedValueOnce({ propertyValue: 500000 })
        .mockResolvedValueOnce({ propertyValue: 600000 });

      const result = await enrichmentService.enrichLeadsBatch(leadIds, {
        sources: ['property'],
      });

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should handle partial batch failures', async () => {
      const leadIds = [123, 124, 125];

      mockComplianceService.validateConsent
        .mockResolvedValueOnce({ approved: true })
        .mockResolvedValueOnce({ approved: false })
        .mockResolvedValueOnce({ approved: true });

      mockPropertyProvider.doEnrich
        .mockResolvedValueOnce({ propertyValue: 400000 })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ propertyValue: 600000 });

      const result = await enrichmentService.enrichLeadsBatch(leadIds);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should respect batch size limits', async () => {
      const leadIds = Array.from({ length: 60 }, (_, i) => i + 1); // 60 leads

      await expect(enrichmentService.enrichLeadsBatch(leadIds))
        .rejects
        .toThrow('Maximum 50 leads can be processed in a single batch');
    });
  });

  describe('getEnrichmentStatus', () => {
    it('should return enrichment status for a lead', async () => {
      mockCacheService.get.mockResolvedValue({
        enrichmentId: 'test-123',
        status: 'completed',
        qualityScore: 85,
      });

      const status = await enrichmentService.getEnrichmentStatus(mockLead.id);

      expect(status.enrichmentId).toBe('test-123');
      expect(status.status).toBe('completed');
      expect(status.qualityScore).toBe(85);
    });

    it('should return not_found for non-existent enrichment', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const status = await enrichmentService.getEnrichmentStatus(mockLead.id);

      expect(status.status).toBe('not_found');
    });
  });

  describe('getProviderHealth', () => {
    it('should return health status for all providers', async () => {
      const health = await enrichmentService.getProviderHealth();

      expect(health).toHaveProperty('property');
      expect(health).toHaveProperty('social');
      expect(health).toHaveProperty('credit');

      expect(health.property.status).toBe('healthy');
      expect(health.social.status).toBe('healthy');
      expect(health.credit.status).toBe('healthy');
    });

    it('should handle provider health check failures', async () => {
      mockPropertyProvider.getHealthStatus.mockRejectedValue(new Error('Connection failed'));

      const health = await enrichmentService.getProviderHealth();

      expect(health.property.status).toBe('error');
      expect(health.property.error).toBe('Connection failed');
    });
  });

  describe('getEnrichmentStats', () => {
    it('should return comprehensive enrichment statistics', async () => {
      const stats = await enrichmentService.getEnrichmentStats();

      expect(stats).toHaveProperty('totalEnrichments');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageQualityScore');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('cacheStats');
      expect(stats).toHaveProperty('providerStats');
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockComplianceService.validateConsent.mockResolvedValue({
        approved: true,
      });

      mockPropertyProvider.doEnrich.mockRejectedValue(
        new Error('Timeout: Request took longer than 30000ms')
      );

      const result = await enrichmentService.enrichLead(mockLead.id);

      expect(result).toHaveProperty('error');
      expect(result.qualityScore).toBe(0);
      expect(result.sources).toEqual([]);
    });

    it('should handle invalid lead data', async () => {
      const invalidLead = { id: null };

      await expect(enrichmentService.enrichLead(invalidLead.id))
        .rejects
        .toThrow('Invalid lead data');
    });

    it('should handle cache service failures', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Redis connection failed'));
      mockComplianceService.validateConsent.mockResolvedValue({
        approved: true,
      });

      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 450000,
      });

      // Should still work even if cache fails
      const result = await enrichmentService.enrichLead(mockLead.id);
      expect(result).toHaveProperty('qualityScore');
    });
  });
});