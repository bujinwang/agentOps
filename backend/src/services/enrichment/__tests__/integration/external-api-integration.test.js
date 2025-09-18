const PropertyDataProvider = require('../../providers/PropertyDataProvider');
const SocialMediaProvider = require('../../providers/SocialMediaProvider');
const CreditReportingProvider = require('../../providers/CreditReportingProvider');
const EnrichmentService = require('../../EnrichmentService');
const CacheService = require('../../CacheService');

// Mock external API responses
const mockPropertyApiResponse = {
  propertyValue: 450000,
  ownershipStatus: 'owner',
  mortgageBalance: 200000,
  transactionHistory: [
    { date: '2023-01-15', price: 400000 },
    { date: '2024-01-15', price: 450000 },
  ],
  confidence: 0.95,
  source: 'zillow_api',
};

const mockSocialApiResponse = {
  linkedinProfile: 'https://linkedin.com/in/johndoe',
  professionalTitle: 'Software Engineer',
  company: 'Tech Corp',
  connections: 500,
  emailVerified: true,
  confidence: 0.87,
  source: 'linkedin_api',
};

const mockCreditApiResponse = {
  creditScore: 750,
  creditRating: 'Good',
  paymentHistory: 'excellent',
  debtToIncomeRatio: 0.35,
  creditUtilization: 0.25,
  scoreVerified: true,
  confidence: 0.92,
  source: 'experian_api',
};

describe('External API Integration Tests', () => {
  let enrichmentService;
  let mockPropertyProvider;
  let mockSocialProvider;
  let mockCreditProvider;

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
    jest.clearAllMocks();

    // Setup mock providers with realistic API behavior
    mockPropertyProvider = {
      doEnrich: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue({
        status: 'healthy',
        responseTime: 250,
        lastChecked: new Date(),
      }),
    };

    mockSocialProvider = {
      doEnrich: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue({
        status: 'healthy',
        responseTime: 180,
        lastChecked: new Date(),
      }),
    };

    mockCreditProvider = {
      doEnrich: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue({
        status: 'healthy',
        responseTime: 320,
        lastChecked: new Date(),
      }),
    };

    // Mock the provider constructors
    PropertyDataProvider.mockImplementation(() => mockPropertyProvider);
    SocialMediaProvider.mockImplementation(() => mockSocialProvider);
    CreditReportingProvider.mockImplementation(() => mockCreditProvider);

    enrichmentService = new EnrichmentService();
  });

  describe('Property Data API Integration', () => {
    it('should successfully integrate with property data APIs', async () => {
      // Setup successful API response
      mockPropertyProvider.doEnrich.mockResolvedValue(mockPropertyApiResponse);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
      });

      expect(mockPropertyProvider.doEnrich).toHaveBeenCalledWith(mockLead);
      expect(result.data.property).toEqual(mockPropertyApiResponse);
      expect(result.sources).toContain('property');
      expect(result.qualityScore).toBeGreaterThan(80);
    });

    it('should handle property API rate limiting', async () => {
      // Simulate rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.statusCode = 429;
      rateLimitError.retryAfter = 60;

      mockPropertyProvider.doEnrich.mockRejectedValue(rateLimitError);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
      });

      expect(result.data.property).toBeUndefined();
      expect(result.errors).toContain('Property API rate limit exceeded');
      expect(result.sources).not.toContain('property');
    });

    it('should handle property API authentication failures', async () => {
      const authError = new Error('Invalid API key');
      authError.statusCode = 401;

      mockPropertyProvider.doEnrich.mockRejectedValue(authError);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
      });

      expect(result.data.property).toBeUndefined();
      expect(result.errors).toContain('Property API authentication failed');
    });

    it('should handle property API service unavailability', async () => {
      const serviceError = new Error('Service temporarily unavailable');
      serviceError.statusCode = 503;

      mockPropertyProvider.doEnrich.mockRejectedValue(serviceError);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
      });

      expect(result.data.property).toBeUndefined();
      expect(result.errors).toContain('Property API service unavailable');
    });

    it('should validate property data accuracy', async () => {
      const inaccurateData = {
        ...mockPropertyApiResponse,
        propertyValue: -50000, // Invalid negative value
        confidence: 0.95,
      };

      mockPropertyProvider.doEnrich.mockResolvedValue(inaccurateData);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
      });

      expect(result.data.property.propertyValue).toBeUndefined(); // Should be corrected or removed
      expect(result.validationErrors).toContain('propertyValue must be a positive number');
    });
  });

  describe('Social Media API Integration', () => {
    it('should successfully integrate with social media APIs', async () => {
      mockSocialProvider.doEnrich.mockResolvedValue(mockSocialApiResponse);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['social'],
      });

      expect(mockSocialProvider.doEnrich).toHaveBeenCalledWith(mockLead);
      expect(result.data.social).toEqual(mockSocialApiResponse);
      expect(result.sources).toContain('social');
    });

    it('should handle LinkedIn API access restrictions', async () => {
      const accessError = new Error('Profile not accessible');
      accessError.statusCode = 403;

      mockSocialProvider.doEnrich.mockRejectedValue(accessError);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['social'],
      });

      expect(result.data.social).toBeUndefined();
      expect(result.errors).toContain('Social profile not accessible');
    });

    it('should handle email verification failures', async () => {
      const verificationFailedData = {
        ...mockSocialApiResponse,
        emailVerified: false,
        confidence: 0.3, // Lower confidence due to failed verification
      };

      mockSocialProvider.doEnrich.mockResolvedValue(verificationFailedData);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['social'],
      });

      expect(result.data.social.emailVerified).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should validate social media data completeness', async () => {
      const incompleteData = {
        linkedinProfile: 'https://linkedin.com/in/johndoe',
        // Missing professionalTitle, company, etc.
        confidence: 0.87,
      };

      mockSocialProvider.doEnrich.mockResolvedValue(incompleteData);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['social'],
      });

      expect(result.data.social.professionalTitle).toBeUndefined();
      expect(result.qualityScore).toBeLessThan(80);
    });
  });

  describe('Credit Reporting API Integration', () => {
    it('should successfully integrate with credit reporting APIs', async () => {
      mockCreditProvider.doEnrich.mockResolvedValue(mockCreditApiResponse);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['credit'],
      });

      expect(mockCreditProvider.doEnrich).toHaveBeenCalledWith(mockLead);
      expect(result.data.credit).toEqual(mockCreditApiResponse);
      expect(result.sources).toContain('credit');
    });

    it('should handle credit API compliance restrictions', async () => {
      const complianceError = new Error('FCRA compliance check failed');
      complianceError.statusCode = 403;

      mockCreditProvider.doEnrich.mockRejectedValue(complianceError);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['credit'],
      });

      expect(result.data.credit).toBeUndefined();
      expect(result.errors).toContain('Credit data access not permitted');
    });

    it('should handle credit score verification failures', async () => {
      const unverifiedData = {
        ...mockCreditApiResponse,
        scoreVerified: false,
        confidence: 0.4, // Lower confidence due to unverified score
      };

      mockCreditProvider.doEnrich.mockResolvedValue(unverifiedData);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['credit'],
      });

      expect(result.data.credit.scoreVerified).toBe(false);
      expect(result.confidence).toBeLessThan(0.6);
    });

    it('should validate credit data ranges', async () => {
      const invalidData = {
        ...mockCreditApiResponse,
        creditScore: 900, // Invalid range (should be 300-850)
        debtToIncomeRatio: 2.5, // Invalid ratio (should be 0-1)
      };

      mockCreditProvider.doEnrich.mockResolvedValue(invalidData);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['credit'],
      });

      expect(result.validationErrors).toContain('creditScore must be between 300 and 850');
      expect(result.validationErrors).toContain('debtToIncomeRatio cannot exceed 1.0');
    });
  });

  describe('Multi-API Integration Scenarios', () => {
    it('should handle successful multi-API enrichment', async () => {
      mockPropertyProvider.doEnrich.mockResolvedValue(mockPropertyApiResponse);
      mockSocialProvider.doEnrich.mockResolvedValue(mockSocialApiResponse);
      mockCreditProvider.doEnrich.mockResolvedValue(mockCreditApiResponse);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property', 'social', 'credit'],
      });

      expect(result.sources).toHaveLength(3);
      expect(result.sources).toEqual(['property', 'social', 'credit']);
      expect(result.data).toHaveProperty('property');
      expect(result.data).toHaveProperty('social');
      expect(result.data).toHaveProperty('credit');
      expect(result.qualityScore).toBeGreaterThan(90);
    });

    it('should handle partial API failures gracefully', async () => {
      mockPropertyProvider.doEnrich.mockResolvedValue(mockPropertyApiResponse);
      mockSocialProvider.doEnrich.mockRejectedValue(new Error('API timeout'));
      mockCreditProvider.doEnrich.mockResolvedValue(mockCreditApiResponse);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property', 'social', 'credit'],
      });

      expect(result.sources).toHaveLength(2);
      expect(result.sources).toEqual(['property', 'credit']);
      expect(result.data).toHaveProperty('property');
      expect(result.data).not.toHaveProperty('social');
      expect(result.data).toHaveProperty('credit');
      expect(result.errors).toContain('Social API timeout');
    });

    it('should handle complete API failure scenario', async () => {
      mockPropertyProvider.doEnrich.mockRejectedValue(new Error('Network error'));
      mockSocialProvider.doEnrich.mockRejectedValue(new Error('Rate limited'));
      mockCreditProvider.doEnrich.mockRejectedValue(new Error('Auth failed'));

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property', 'social', 'credit'],
      });

      expect(result.sources).toHaveLength(0);
      expect(result.qualityScore).toBe(0);
      expect(result.errors).toHaveLength(3);
      expect(result.data).toEqual({});
    });
  });

  describe('API Performance and Reliability', () => {
    it('should handle API response timeouts', async () => {
      mockPropertyProvider.doEnrich.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPropertyApiResponse), 35000))
      );

      const startTime = Date.now();
      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
        timeout: 30000, // 30 second timeout
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(35000); // Should timeout before 35 seconds
      expect(result.errors).toContain('Property API request timeout');
    });

    it('should implement circuit breaker pattern', async () => {
      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        mockPropertyProvider.doEnrich.mockRejectedValue(new Error('Service unavailable'));
        await enrichmentService.enrichLead(mockLead.id, { sources: ['property'] });
      }

      // Next call should be blocked by circuit breaker
      const result = await enrichmentService.enrichLead(mockLead.id, { sources: ['property'] });

      expect(result.errors).toContain('Circuit breaker open for Property API');
      expect(mockPropertyProvider.doEnrich).not.toHaveBeenCalledTimes(6); // Should not call again
    });

    it('should handle API response format changes', async () => {
      const malformedResponse = {
        value: 450000, // Different field name than expected
        status: 'owner',
        // Missing other expected fields
      };

      mockPropertyProvider.doEnrich.mockResolvedValue(malformedResponse);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
      });

      // Should handle gracefully and still provide some data
      expect(result.data.property).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
    });
  });

  describe('Data Consistency and Cross-Validation', () => {
    it('should detect and handle data inconsistencies', async () => {
      const inconsistentPropertyData = {
        ...mockPropertyApiResponse,
        propertyValue: 100000, // Low value
        mortgageBalance: 80000, // Mortgage > property value (impossible)
      };

      mockPropertyProvider.doEnrich.mockResolvedValue(inconsistentPropertyData);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
      });

      expect(result.anomalies).toContain('Mortgage balance exceeds property value');
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should validate data freshness', async () => {
      const staleData = {
        ...mockPropertyApiResponse,
        lastUpdated: '2020-01-01', // Very old data
      };

      mockPropertyProvider.doEnrich.mockResolvedValue(staleData);

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
      });

      expect(result.warnings).toContain('Property data is stale');
      expect(result.confidence).toBeLessThan(0.9);
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    it('should fallback to cached data when API fails', async () => {
      // Setup cache with previous successful data
      const cacheService = require('../../CacheService');
      cacheService.set(`enrichment:${mockLead.id}`, {
        enrichmentId: 'cached-123',
        qualityScore: 85,
        data: { property: mockPropertyApiResponse },
      });

      // API fails
      mockPropertyProvider.doEnrich.mockRejectedValue(new Error('API down'));

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property'],
        allowCacheFallback: true,
      });

      expect(result.enrichmentId).toBe('cached-123');
      expect(result.fromCache).toBe(true);
    });

    it('should degrade gracefully with partial data', async () => {
      mockPropertyProvider.doEnrich.mockResolvedValue({
        propertyValue: 450000,
        // Missing other fields
      });

      mockSocialProvider.doEnrich.mockRejectedValue(new Error('API error'));

      const result = await enrichmentService.enrichLead(mockLead.id, {
        sources: ['property', 'social'],
      });

      expect(result.sources).toEqual(['property']);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.data.property).toBeDefined();
      expect(result.data.social).toBeUndefined();
    });
  });
});