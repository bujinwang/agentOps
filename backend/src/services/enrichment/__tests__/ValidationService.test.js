const ValidationService = require('../ValidationService');

describe('ValidationService', () => {
  let validationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('validateEnrichmentData', () => {
    it('should validate property data correctly', () => {
      const propertyData = {
        propertyValue: 450000,
        ownershipStatus: 'owner',
        mortgageBalance: 200000,
        transactionHistory: [
          { date: '2023-01-15', price: 400000 },
          { date: '2024-01-15', price: 450000 },
        ],
        confidence: 0.95,
      };

      const result = validationService.validateEnrichmentData(propertyData, 'property');

      expect(result.isValid).toBe(true);
      expect(result.corrections).toHaveLength(0);
      expect(result.confidence).toBe(0.95);
    });

    it('should detect and correct invalid property values', () => {
      const invalidData = {
        propertyValue: 'invalid_price',
        ownershipStatus: 'invalid_status',
        mortgageBalance: -50000,
      };

      const result = validationService.validateEnrichmentData(invalidData, 'property');

      expect(result.isValid).toBe(false);
      expect(result.corrections).toContain('propertyValue must be a positive number');
      expect(result.corrections).toContain('ownershipStatus must be one of: owner, renter, investor');
      expect(result.corrections).toContain('mortgageBalance cannot be negative');
    });

    it('should validate social media data', () => {
      const socialData = {
        linkedinProfile: 'https://linkedin.com/in/johndoe',
        professionalTitle: 'Software Engineer',
        company: 'Tech Corp',
        connections: 500,
        emailVerified: true,
        confidence: 0.87,
      };

      const result = validationService.validateEnrichmentData(socialData, 'social');

      expect(result.isValid).toBe(true);
      expect(result.corrections).toHaveLength(0);
    });

    it('should detect invalid social media data', () => {
      const invalidData = {
        linkedinProfile: 'invalid-url',
        connections: -100,
        emailVerified: 'not_boolean',
      };

      const result = validationService.validateEnrichmentData(invalidData, 'social');

      expect(result.isValid).toBe(false);
      expect(result.corrections).toContain('linkedinProfile must be a valid URL');
      expect(result.corrections).toContain('connections cannot be negative');
      expect(result.corrections).toContain('emailVerified must be a boolean');
    });

    it('should validate credit data with proper security checks', () => {
      const creditData = {
        creditScore: 750,
        creditRating: 'Good',
        paymentHistory: 'excellent',
        debtToIncomeRatio: 0.35,
        creditUtilization: 0.25,
        scoreVerified: true,
        confidence: 0.92,
      };

      const result = validationService.validateEnrichmentData(creditData, 'credit');

      expect(result.isValid).toBe(true);
      expect(result.corrections).toHaveLength(0);
      expect(result.securityValidated).toBe(true);
    });

    it('should reject invalid credit scores', () => {
      const invalidData = {
        creditScore: 900, // Invalid range
        debtToIncomeRatio: 1.5, // Too high
        creditUtilization: 1.2, // Over 100%
      };

      const result = validationService.validateEnrichmentData(invalidData, 'credit');

      expect(result.isValid).toBe(false);
      expect(result.corrections).toContain('creditScore must be between 300 and 850');
      expect(result.corrections).toContain('debtToIncomeRatio cannot exceed 1.0');
      expect(result.corrections).toContain('creditUtilization cannot exceed 1.0');
    });

    it('should handle missing data gracefully', () => {
      const emptyData = {};

      const result = validationService.validateEnrichmentData(emptyData, 'property');

      expect(result.isValid).toBe(true);
      expect(result.corrections).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('should validate confidence scores', () => {
      const data = {
        confidence: 1.5, // Invalid range
      };

      const result = validationService.validateEnrichmentData(data, 'property');

      expect(result.isValid).toBe(false);
      expect(result.corrections).toContain('confidence must be between 0 and 1');
    });
  });

  describe('calculateQualityScore', () => {
    it('should calculate high quality score for complete data', () => {
      const enrichmentResult = {
        data: {
          property: {
            propertyValue: 450000,
            ownershipStatus: 'owner',
            confidence: 0.95,
          },
          social: {
            professionalTitle: 'Software Engineer',
            company: 'Tech Corp',
            confidence: 0.87,
          },
          credit: {
            creditScore: 750,
            paymentHistory: 'excellent',
            confidence: 0.92,
          },
        },
        sources: ['property', 'social', 'credit'],
      };

      const score = validationService.calculateQualityScore(enrichmentResult);

      expect(score).toBeGreaterThan(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate lower score for incomplete data', () => {
      const enrichmentResult = {
        data: {
          property: {
            propertyValue: 450000,
            confidence: 0.6, // Lower confidence
          },
        },
        sources: ['property'],
      };

      const score = validationService.calculateQualityScore(enrichmentResult);

      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThan(80);
    });

    it('should handle missing data', () => {
      const enrichmentResult = {
        data: {},
        sources: [],
      };

      const score = validationService.calculateQualityScore(enrichmentResult);

      expect(score).toBe(0);
    });

    it('should weight different data sources appropriately', () => {
      const propertyOnly = {
        data: { property: { propertyValue: 450000, confidence: 0.9 } },
        sources: ['property'],
      };

      const socialOnly = {
        data: { social: { professionalTitle: 'Engineer', confidence: 0.9 } },
        sources: ['social'],
      };

      const propertyScore = validationService.calculateQualityScore(propertyOnly);
      const socialScore = validationService.calculateQualityScore(socialOnly);

      // Property data should have higher weight than social data
      expect(propertyScore).toBeGreaterThan(socialScore);
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate high confidence for verified data', () => {
      const enrichmentResult = {
        data: {
          property: { confidence: 0.95, ownershipVerified: true },
          social: { confidence: 0.87, emailVerified: true },
          credit: { confidence: 0.92, scoreVerified: true },
        },
        sources: ['property', 'social', 'credit'],
      };

      const confidence = validationService.calculateConfidence(enrichmentResult);

      expect(confidence).toBeGreaterThan(0.8);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    it('should reduce confidence for unverified data', () => {
      const enrichmentResult = {
        data: {
          property: { confidence: 0.95, ownershipVerified: false },
          social: { confidence: 0.87, emailVerified: false },
        },
        sources: ['property', 'social'],
      };

      const confidence = validationService.calculateConfidence(enrichmentResult);

      expect(confidence).toBeLessThan(0.8);
    });

    it('should handle data source conflicts', () => {
      const enrichmentResult = {
        data: {
          property: { propertyValue: 400000, confidence: 0.9 },
          social: { company: 'Company A', confidence: 0.8 },
          // Conflicting data would reduce confidence
        },
        sources: ['property', 'social'],
      };

      const confidence = validationService.calculateConfidence(enrichmentResult);

      expect(confidence).toBeDefined();
    });
  });

  describe('applyCorrections', () => {
    it('should apply corrections to invalid data', () => {
      const invalidData = {
        propertyValue: '450,000', // String with comma
        ownershipStatus: 'OWNER', // Uppercase
        mortgageBalance: '200000', // String number
      };

      const corrections = [
        'propertyValue must be a number',
        'ownershipStatus must be lowercase',
        'mortgageBalance must be a number',
      ];

      const correctedData = validationService.applyCorrections(invalidData, corrections);

      expect(correctedData.propertyValue).toBe(450000);
      expect(correctedData.ownershipStatus).toBe('owner');
      expect(correctedData.mortgageBalance).toBe(200000);
    });

    it('should handle unfixable corrections', () => {
      const invalidData = {
        creditScore: 900, // Out of range
      };

      const corrections = ['creditScore must be between 300 and 850'];

      const correctedData = validationService.applyCorrections(invalidData, corrections);

      expect(correctedData.creditScore).toBeUndefined(); // Should be removed
      expect(correctedData.correctionErrors).toContain('Could not fix creditScore');
    });
  });

  describe('validateDataCompleteness', () => {
    it('should assess data completeness accurately', () => {
      const completeData = {
        property: {
          propertyValue: 450000,
          ownershipStatus: 'owner',
          mortgageBalance: 200000,
          transactionHistory: [],
        },
        social: {
          professionalTitle: 'Engineer',
          company: 'Tech Corp',
          connections: 500,
        },
        credit: {
          creditScore: 750,
          paymentHistory: 'excellent',
          debtToIncomeRatio: 0.35,
        },
      };

      const completeness = validationService.validateDataCompleteness(completeData);

      expect(completeness.overall).toBeGreaterThan(0.8);
      expect(completeness.property).toBeGreaterThan(0.8);
      expect(completeness.social).toBeGreaterThan(0.8);
      expect(completeness.credit).toBeGreaterThan(0.8);
    });

    it('should identify incomplete data', () => {
      const incompleteData = {
        property: {
          propertyValue: 450000,
          // Missing ownershipStatus, mortgageBalance, etc.
        },
      };

      const completeness = validationService.validateDataCompleteness(incompleteData);

      expect(completeness.overall).toBeLessThan(0.5);
      expect(completeness.property).toBeLessThan(0.5);
    });
  });

  describe('detectDataAnomalies', () => {
    it('should detect unrealistic property values', () => {
      const anomalousData = {
        propertyValue: 50000000, // Unrealistically high
        mortgageBalance: 45000000, // Mortgage > property value
      };

      const anomalies = validationService.detectDataAnomalies(anomalousData, 'property');

      expect(anomalies).toContain('Property value seems unrealistically high');
      expect(anomalies).toContain('Mortgage balance exceeds property value');
    });

    it('should detect credit score anomalies', () => {
      const anomalousData = {
        creditScore: 850,
        paymentHistory: 'poor', // High score but poor history
        debtToIncomeRatio: 2.0, // Impossible ratio
      };

      const anomalies = validationService.detectDataAnomalies(anomalousData, 'credit');

      expect(anomalies).toContain('Debt-to-income ratio is unrealistically high');
      expect(anomalies).toContain('Payment history inconsistent with credit score');
    });

    it('should handle normal data without anomalies', () => {
      const normalData = {
        propertyValue: 450000,
        mortgageBalance: 200000,
        creditScore: 750,
        paymentHistory: 'excellent',
        debtToIncomeRatio: 0.35,
      };

      const anomalies = validationService.detectDataAnomalies(normalData, 'property');

      expect(anomalies).toHaveLength(0);
    });
  });

  describe('crossValidateData', () => {
    it('should validate consistency across data sources', () => {
      const enrichmentData = {
        property: {
          propertyValue: 450000,
          ownershipStatus: 'owner',
        },
        social: {
          professionalTitle: 'Software Engineer',
          company: 'Tech Corp',
        },
        credit: {
          creditScore: 750,
          paymentHistory: 'excellent',
        },
      };

      const validation = validationService.crossValidateData(enrichmentData);

      expect(validation.consistent).toBe(true);
      expect(validation.conflicts).toHaveLength(0);
    });

    it('should detect data inconsistencies', () => {
      const enrichmentData = {
        property: {
          propertyValue: 100000, // Low value
          ownershipStatus: 'owner',
        },
        credit: {
          creditScore: 800, // High score but low property value
          debtToIncomeRatio: 0.8, // High DTI
        },
      };

      const validation = validationService.crossValidateData(enrichmentData);

      expect(validation.consistent).toBe(false);
      expect(validation.conflicts).toContain('Property value inconsistent with credit profile');
    });
  });

  describe('generateValidationReport', () => {
    it('should generate comprehensive validation report', () => {
      const enrichmentResult = {
        data: {
          property: { propertyValue: 450000, confidence: 0.9 },
          social: { professionalTitle: 'Engineer', confidence: 0.8 },
        },
        sources: ['property', 'social'],
      };

      const report = validationService.generateValidationReport(enrichmentResult);

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('dataQuality');
      expect(report).toHaveProperty('completeness');
      expect(report).toHaveProperty('anomalies');
      expect(report).toHaveProperty('recommendations');
      expect(report.summary.qualityScore).toBeDefined();
      expect(report.summary.confidence).toBeDefined();
    });
  });
});