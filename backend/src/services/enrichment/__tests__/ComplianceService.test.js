const ComplianceService = require('../ComplianceService');
const { Lead } = require('../../../models/Lead');

jest.mock('../../../models/Lead');

describe('ComplianceService', () => {
  let complianceService;

  const mockLead = {
    id: 123,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+1234567890',
    enrichmentConsent: true,
    consentGrantedAt: new Date('2025-01-01'),
    consentExpiresAt: new Date('2026-01-01'),
    creditDataConsent: true,
    ccpaConsent: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    complianceService = new ComplianceService();
  });

  describe('validateConsent', () => {
    it('should validate active consent successfully', async () => {
      Lead.findByPk.mockResolvedValue(mockLead);

      const result = await complianceService.validateConsent(mockLead.id);

      expect(result.approved).toBe(true);
      expect(result.gdprCompliant).toBe(true);
      expect(result.ccpaCompliant).toBe(false); // Not in California
      expect(result.expiresAt).toEqual(mockLead.consentExpiresAt);
    });

    it('should reject expired consent', async () => {
      const expiredLead = {
        ...mockLead,
        consentExpiresAt: new Date('2024-01-01'), // Past date
      };

      Lead.findByPk.mockResolvedValue(expiredLead);

      const result = await complianceService.validateConsent(mockLead.id);

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('Consent has expired');
    });

    it('should reject withdrawn consent', async () => {
      const withdrawnLead = {
        ...mockLead,
        consentWithdrawnAt: new Date('2025-01-15'),
        consentWithdrawalReason: 'User requested',
      };

      Lead.findByPk.mockResolvedValue(withdrawnLead);

      const result = await complianceService.validateConsent(mockLead.id);

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('Consent has been withdrawn');
    });

    it('should reject missing consent', async () => {
      const noConsentLead = {
        ...mockLead,
        enrichmentConsent: false,
      };

      Lead.findByPk.mockResolvedValue(noConsentLead);

      const result = await complianceService.validateConsent(mockLead.id);

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('No enrichment consent granted');
    });

    it('should handle California residents with CCPA requirements', async () => {
      const caLead = {
        ...mockLead,
        desiredLocation: 'Los Angeles, CA',
        ccpaConsent: true,
      };

      Lead.findByPk.mockResolvedValue(caLead);

      const result = await complianceService.validateConsent(caLead.id);

      expect(result.approved).toBe(true);
      expect(result.ccpaCompliant).toBe(true);
      expect(result.gdprCompliant).toBe(true);
    });

    it('should reject California residents without CCPA consent', async () => {
      const caLead = {
        ...mockLead,
        desiredLocation: 'San Francisco, CA',
        ccpaConsent: false,
      };

      Lead.findByPk.mockResolvedValue(caLead);

      const result = await complianceService.validateConsent(caLead.id);

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('CCPA consent required for California residents');
    });

    it('should handle non-existent leads', async () => {
      Lead.findByPk.mockResolvedValue(null);

      const result = await complianceService.validateConsent(999);

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('Lead not found');
    });
  });

  describe('grantConsent', () => {
    it('should grant consent successfully', async () => {
      const consentData = {
        consentText: 'I consent to data enrichment',
        consentVersion: '1.0',
        consentType: 'comprehensive',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Browser',
      };

      Lead.findByPk.mockResolvedValue(mockLead);
      Lead.update = jest.fn().mockResolvedValue([1]);

      const result = await complianceService.grantConsent(mockLead.id, consentData);

      expect(result.consentId).toBeDefined();
      expect(result.status).toBe('active');
      expect(result.consentType).toBe('comprehensive');
      expect(Lead.update).toHaveBeenCalled();
    });

    it('should set appropriate expiration dates', async () => {
      const consentData = {
        consentText: 'I consent',
        consentVersion: '1.0',
        consentType: 'basic',
      };

      Lead.findByPk.mockResolvedValue(mockLead);
      Lead.update = jest.fn().mockResolvedValue([1]);

      await complianceService.grantConsent(mockLead.id, consentData);

      const updateCall = Lead.update.mock.calls[0][0];
      expect(updateCall.consentExpiresAt).toBeDefined();
      expect(updateCall.consentGrantedAt).toBeDefined();
    });

    it('should handle credit data consent separately', async () => {
      const consentData = {
        consentText: 'I consent to credit data',
        consentVersion: '1.0',
        consentType: 'credit_only',
        creditDataConsent: true,
      };

      Lead.findByPk.mockResolvedValue(mockLead);
      Lead.update = jest.fn().mockResolvedValue([1]);

      await complianceService.grantConsent(mockLead.id, consentData);

      const updateCall = Lead.update.mock.calls[0][0];
      expect(updateCall.creditDataConsent).toBe(true);
    });
  });

  describe('withdrawConsent', () => {
    it('should withdraw consent successfully', async () => {
      Lead.findByPk.mockResolvedValue(mockLead);
      Lead.update = jest.fn().mockResolvedValue([1]);

      await complianceService.withdrawConsent(mockLead.id, 'User requested deletion');

      const updateCall = Lead.update.mock.calls[0][0];
      expect(updateCall.consentWithdrawnAt).toBeDefined();
      expect(updateCall.consentWithdrawalReason).toBe('User requested deletion');
    });

    it('should handle consent withdrawal for non-existent leads', async () => {
      Lead.findByPk.mockResolvedValue(null);

      await expect(complianceService.withdrawConsent(999, 'Test'))
        .rejects
        .toThrow('Lead not found');
    });
  });

  describe('handleDeletionRequest', () => {
    it('should handle GDPR deletion requests', async () => {
      Lead.findByPk.mockResolvedValue(mockLead);
      Lead.update = jest.fn().mockResolvedValue([1]);

      const result = await complianceService.handleDeletionRequest(mockLead.id, 'gdpr');

      expect(result.deletionId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.requestType).toBe('gdpr');
      expect(result.deletedAt).toBeDefined();
    });

    it('should handle CCPA deletion requests', async () => {
      Lead.findByPk.mockResolvedValue(mockLead);
      Lead.update = jest.fn().mockResolvedValue([1]);

      const result = await complianceService.handleDeletionRequest(mockLead.id, 'ccpa');

      expect(result.requestType).toBe('ccpa');
      expect(result.status).toBe('completed');
    });

    it('should anonymize data for CCPA requests', async () => {
      Lead.findByPk.mockResolvedValue(mockLead);
      Lead.update = jest.fn().mockResolvedValue([1]);

      await complianceService.handleDeletionRequest(mockLead.id, 'ccpa');

      const updateCall = Lead.update.mock.calls[0][0];
      expect(updateCall.firstName).toBe('[REDACTED]');
      expect(updateCall.lastName).toBe('[REDACTED]');
      expect(updateCall.email).toBe('[REDACTED]');
    });

    it('should completely delete data for GDPR requests', async () => {
      Lead.findByPk.mockResolvedValue(mockLead);
      Lead.update = jest.fn().mockResolvedValue([1]);

      await complianceService.handleDeletionRequest(mockLead.id, 'gdpr');

      const updateCall = Lead.update.mock.calls[0][0];
      expect(updateCall.enrichmentData).toBeNull();
      expect(updateCall.enrichmentConsent).toBe(false);
    });
  });

  describe('exportDataForPortability', () => {
    it('should export data in GDPR-compliant format', async () => {
      const leadWithData = {
        ...mockLead,
        enrichmentData: {
          property: { propertyValue: 450000 },
          social: { professionalTitle: 'Engineer' },
        },
        consentHistory: [
          { action: 'granted', timestamp: '2025-01-01' },
          { action: 'renewed', timestamp: '2025-06-01' },
        ],
      };

      Lead.findByPk.mockResolvedValue(leadWithData);

      const result = await complianceService.exportDataForPortability(mockLead.id);

      expect(result.leadId).toBe(mockLead.id);
      expect(result.exportFormat).toBe('json');
      expect(result.dataPackage).toHaveProperty('personalData');
      expect(result.dataPackage).toHaveProperty('enrichmentData');
      expect(result.dataPackage).toHaveProperty('consentHistory');
      expect(result.dataPackage).toHaveProperty('processingHistory');
      expect(result.exportedAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should include all required GDPR data fields', async () => {
      Lead.findByPk.mockResolvedValue(mockLead);

      const result = await complianceService.exportDataForPortability(mockLead.id);

      expect(result.dataPackage.personalData).toHaveProperty('name');
      expect(result.dataPackage.personalData).toHaveProperty('email');
      expect(result.dataPackage.personalData).toHaveProperty('phone');
      expect(result.dataPackage.processingHistory).toBeDefined();
    });
  });

  describe('validateDataProcessingPurpose', () => {
    it('should validate legitimate processing purposes', () => {
      const validPurposes = [
        'real_estate_services',
        'lead_qualification',
        'market_analysis',
        'customer_support',
      ];

      validPurposes.forEach(purpose => {
        const result = complianceService.validateDataProcessingPurpose(purpose);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid processing purposes', () => {
      const invalidPurposes = [
        'marketing_unrelated',
        'third_party_sales',
        'illegal_purpose',
      ];

      invalidPurposes.forEach(purpose => {
        const result = complianceService.validateDataProcessingPurpose(purpose);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('checkJurisdictionalCompliance', () => {
    it('should identify GDPR-applicable jurisdictions', () => {
      const gdprLocations = [
        'London, UK',
        'Berlin, Germany',
        'Paris, France',
        'Amsterdam, Netherlands',
      ];

      gdprLocations.forEach(location => {
        const result = complianceService.checkJurisdictionalCompliance(location);
        expect(result.gdpr).toBe(true);
      });
    });

    it('should identify CCPA-applicable jurisdictions', () => {
      const ccpaLocations = [
        'Los Angeles, CA',
        'San Francisco, CA',
        'New York, NY', // Not CCPA
      ];

      const laResult = complianceService.checkJurisdictionalCompliance('Los Angeles, CA');
      const sfResult = complianceService.checkJurisdictionalCompliance('San Francisco, CA');
      const nyResult = complianceService.checkJurisdictionalCompliance('New York, NY');

      expect(laResult.ccpa).toBe(true);
      expect(sfResult.ccpa).toBe(true);
      expect(nyResult.ccpa).toBe(false);
    });
  });

  describe('getComplianceStats', () => {
    it('should return comprehensive compliance statistics', async () => {
      // Mock database queries
      const mockStats = {
        totalLeads: 1000,
        consentedLeads: 850,
        gdprCompliant: 850,
        ccpaCompliant: 120,
        deletionRequests: 5,
        portabilityRequests: 3,
        consentWithdrawals: 2,
      };

      // Mock the database queries that would be used
      Lead.count = jest.fn()
        .mockResolvedValueOnce(1000) // totalLeads
        .mockResolvedValueOnce(850)  // consentedLeads
        .mockResolvedValueOnce(850)  // gdprCompliant
        .mockResolvedValueOnce(120); // ccpaCompliant

      const stats = await complianceService.getComplianceStats();

      expect(stats.totalLeads).toBeDefined();
      expect(stats.consentedLeads).toBeDefined();
      expect(stats.consentRate).toBeDefined();
      expect(stats.gdprCompliant).toBeDefined();
      expect(stats.ccpaCompliant).toBeDefined();
    });

    it('should calculate consent rates correctly', async () => {
      Lead.count = jest.fn()
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(750);

      const stats = await complianceService.getComplianceStats();

      expect(stats.consentRate).toBe('75.0%');
    });
  });

  describe('auditLogEnrichmentEvent', () => {
    it('should log enrichment events for audit trail', async () => {
      const eventData = {
        leadId: mockLead.id,
        eventType: 'enrichment_completed',
        enrichmentId: 'enr_123',
        qualityScore: 92,
        sources: ['property', 'social'],
        ipAddress: '192.168.1.100',
        userAgent: 'Test Browser',
      };

      // Mock audit log creation
      const mockAuditLog = {
        id: 1,
        ...eventData,
        timestamp: new Date(),
      };

      // Mock the audit log model
      const mockEnrichmentAudit = {
        create: jest.fn().mockResolvedValue(mockAuditLog),
      };

      // Replace the require with mock
      jest.doMock('../../../models/EnrichmentAudit', () => mockEnrichmentAudit);

      await complianceService.logEnrichmentEvent(eventData);

      expect(mockEnrichmentAudit.create).toHaveBeenCalledWith({
        leadId: eventData.leadId,
        eventType: eventData.eventType,
        data: JSON.stringify(eventData),
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
      });
    });
  });

  describe('validateRetentionPeriod', () => {
    it('should validate data retention periods', () => {
      const validPeriods = [
        { purpose: 'real_estate_services', period: 7 }, // 7 years
        { purpose: 'lead_qualification', period: 3 },   // 3 years
        { purpose: 'market_analysis', period: 2 },      // 2 years
      ];

      validPeriods.forEach(({ purpose, period }) => {
        const result = complianceService.validateRetentionPeriod(purpose, period);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject excessive retention periods', () => {
      const result = complianceService.validateRetentionPeriod('real_estate_services', 10);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('exceeds maximum allowed');
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate detailed compliance reports', async () => {
      Lead.count = jest.fn()
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(850)
        .mockResolvedValueOnce(850)
        .mockResolvedValueOnce(120);

      const report = await complianceService.generateComplianceReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('gdpr');
      expect(report).toHaveProperty('ccpa');
      expect(report).toHaveProperty('dataRetention');
      expect(report).toHaveProperty('auditTrail');
      expect(report).toHaveProperty('generatedAt');
    });
  });
});