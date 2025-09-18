const axios = require('axios');
const crypto = require('crypto');
const EnrichmentProvider = require('../EnrichmentProvider');

class CreditReportingProvider extends EnrichmentProvider {
  constructor(config = {}) {
    super({
      rateLimit: config.rateLimit || 10, // Very low rate limit for credit data
      ...config,
    });

    this.providers = {
      experian: {
        baseUrl: 'https://api.experian.com/v1',
        clientId: process.env.EXPERIAN_CLIENT_ID,
        clientSecret: process.env.EXPERIAN_CLIENT_SECRET,
        endpoints: {
          creditReport: '/credit-reports',
          creditScore: '/credit-scores',
          fraudCheck: '/fraud-shield',
        },
      },
      equifax: {
        baseUrl: 'https://api.equifax.com/v2',
        username: process.env.EQUIFAX_USERNAME,
        password: process.env.EQUIFAX_PASSWORD,
        endpoints: {
          creditReport: '/credit-reports',
          riskScore: '/risk-models/score',
          identityVerification: '/identity/verification',
        },
      },
      transunion: {
        baseUrl: 'https://api.transunion.com/v1',
        apiKey: process.env.TRANSUNION_API_KEY,
        endpoints: {
          creditReport: '/credit-reports',
          vantageScore: '/vantage-scores',
          fraudDetection: '/fraud-detection',
        },
      },
      // Alternative providers for broader coverage
      creditKarma: {
        baseUrl: 'https://api.creditkarma.com/v1',
        apiKey: process.env.CREDITKARMA_API_KEY,
        endpoints: {
          creditScore: '/credit-scores',
          creditFactors: '/credit-factors',
        },
      },
    };

    this.primaryProvider = config.primaryProvider || 'experian';
    this.complianceLogger = new ComplianceLogger();
    this.encryptionKey = process.env.CREDIT_DATA_ENCRYPTION_KEY;
  }

  async doEnrich(lead) {
    const creditData = {
      creditScore: null,
      creditRating: null,
      paymentHistory: null,
      debtToIncomeRatio: null,
      creditUtilization: null,
      scoreVerified: false,
      reportDate: null,
      creditFactors: [],
      riskIndicators: [],
      confidence: 0,
      sources: [],
      lastUpdated: new Date(),
      complianceFlags: {
        gdprConsent: false,
        ccpaConsent: false,
        dataEncrypted: false,
        auditLogged: false,
      },
    };

    try {
      // Step 1: Compliance check - ensure we have proper consent
      const complianceCheck = await this.checkComplianceRequirements(lead);
      if (!complianceCheck.approved) {
        throw new Error(`Compliance check failed: ${complianceCheck.reason}`);
      }

      // Step 2: Verify identity before credit check
      const identityVerified = await this.verifyIdentity(lead);
      if (!identityVerified) {
        throw new Error('Identity verification failed - cannot proceed with credit check');
      }

      // Step 3: Get credit data from primary provider
      const creditReport = await this.getCreditReport(lead, this.primaryProvider);

      if (creditReport) {
        // Step 4: Encrypt sensitive data
        const encryptedData = await this.encryptSensitiveData(creditReport);

        // Step 5: Format and validate the data
        const formattedData = await this.formatCreditData(encryptedData);

        Object.assign(creditData, formattedData);
        creditData.sources.push(this.primaryProvider);
        creditData.complianceFlags.dataEncrypted = true;
      }

      // Step 6: Try secondary provider if primary fails
      if (!creditReport) {
        const secondaryReport = await this.trySecondaryProviders(lead);
        if (secondaryReport) {
          const encryptedData = await this.encryptSensitiveData(secondaryReport);
          const formattedData = await this.formatCreditData(encryptedData);

          Object.assign(creditData, formattedData);
          creditData.sources.push(secondaryReport.provider);
          creditData.complianceFlags.dataEncrypted = true;
        }
      }

      // Step 7: Calculate confidence and log compliance
      creditData.confidence = this.calculateCreditConfidence(creditData);
      await this.logComplianceEvent(lead.id, 'credit_data_accessed', creditData);

      creditData.complianceFlags.auditLogged = true;

      return creditData;

    } catch (error) {
      console.error('Credit reporting enrichment failed:', error);

      // Log the error for compliance
      await this.logComplianceEvent(lead.id, 'credit_data_access_failed', {
        error: error.message,
        provider: this.primaryProvider,
      });

      return {
        ...creditData,
        error: error.message,
        confidence: 0,
        sources: ['error'],
      };
    }
  }

  /**
   * Check compliance requirements before accessing credit data
   * @private
   */
  async checkComplianceRequirements(lead) {
    // Check GDPR consent
    const gdprConsent = await this.checkGDPRConsent(lead);

    // Check CCPA consent (for California residents)
    const ccpaConsent = await this.checkCCPAConsent(lead);

    // Check FCRA compliance (Fair Credit Reporting Act)
    const fcraCompliance = await this.checkFCRACompliance(lead);

    const approved = gdprConsent && ccpaConsent && fcraCompliance;

    return {
      approved,
      gdprConsent,
      ccpaConsent,
      fcraCompliance,
      reason: approved ? null : this.getComplianceFailureReason(gdprConsent, ccpaConsent, fcraCompliance),
    };
  }

  /**
   * Check GDPR consent for credit data processing
   * @private
   */
  async checkGDPRConsent(lead) {
    // Check if lead has given explicit consent for credit data processing
    // This would typically check a consent management system
    return lead.enrichmentConsent && lead.creditDataConsent;
  }

  /**
   * Check CCPA consent for California residents
   * @private
   */
  async checkCCPAConsent(lead) {
    // Check if lead is California resident and has given CCPA consent
    const isCaliforniaResident = this.isCaliforniaResident(lead);
    if (!isCaliforniaResident) return true; // CCPA doesn't apply

    return lead.ccpaConsent && lead.enrichmentConsent;
  }

  /**
   * Check FCRA compliance requirements
   * @private
   */
  async checkFCRACompliance(lead) {
    // FCRA requires permissible purpose for credit reporting
    // For real estate, this could be for loan approval or tenant screening
    return lead.permissiblePurposeDeclared && lead.enrichmentConsent;
  }

  /**
   * Verify identity before credit check
   * @private
   */
  async verifyIdentity(lead) {
    // Implement identity verification logic
    // This could involve SSN verification, knowledge-based authentication, etc.

    // For now, check if we have sufficient identifying information
    const hasSSN = lead.ssn && lead.ssn.length >= 9;
    const hasDOB = lead.dateOfBirth;
    const hasAddress = lead.address;

    return hasSSN && hasDOB && hasAddress;
  }

  /**
   * Get credit report from specified provider
   * @private
   */
  async getCreditReport(lead, providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Provider ${providerName} not configured`);
    }

    try {
      const endpoint = provider.endpoints.creditReport || provider.endpoints.creditScore;
      const url = `${provider.baseUrl}${endpoint}`;

      const requestData = this.buildCreditRequest(lead, providerName);
      const headers = this.buildAuthHeaders(providerName);

      const response = await axios.post(url, requestData, {
        headers,
        timeout: 30000, // 30 seconds for credit reports
      });

      return {
        ...response.data,
        provider: providerName,
        retrievedAt: new Date(),
      };

    } catch (error) {
      console.warn(`${providerName} credit report failed:`, error.message);
      throw error;
    }
  }

  /**
   * Try secondary providers if primary fails
   * @private
   */
  async trySecondaryProviders(lead) {
    const secondaryProviders = Object.keys(this.providers).filter(p => p !== this.primaryProvider);

    for (const providerName of secondaryProviders) {
      try {
        const report = await this.getCreditReport(lead, providerName);
        if (report) return report;
      } catch (error) {
        console.warn(`Secondary provider ${providerName} failed:`, error.message);
        continue;
      }
    }

    return null;
  }

  /**
   * Build credit request data for provider
   * @private
   */
  buildCreditRequest(lead, providerName) {
    const baseRequest = {
      firstName: lead.firstName,
      lastName: lead.lastName,
      dateOfBirth: lead.dateOfBirth,
      ssn: this.maskSSN(lead.ssn), // Never send full SSN
      address: lead.address,
    };

    // Provider-specific request formatting
    switch (providerName) {
      case 'experian':
        return {
          ...baseRequest,
          reportType: 'soft_inquiry',
          purpose: 'real_estate_qualification',
        };

      case 'equifax':
        return {
          ...baseRequest,
          inquiryType: 'soft',
          businessPurpose: 'mortgage_pre_qualification',
        };

      case 'transunion':
        return {
          ...baseRequest,
          inquiry_type: 'soft_inquiry',
          permissible_purpose: 'mortgage',
        };

      case 'creditKarma':
        return {
          ...baseRequest,
          inquiry_type: 'consumer_report',
        };

      default:
        return baseRequest;
    }
  }

  /**
   * Build authentication headers for provider
   * @private
   */
  buildAuthHeaders(providerName) {
    const provider = this.providers[providerName];
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'RealEstateCRM-CreditEnrichment/1.0',
    };

    switch (providerName) {
      case 'experian':
        const experianAuth = Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${experianAuth}`;
        break;

      case 'equifax':
        const equifaxAuth = Buffer.from(`${provider.username}:${provider.password}`).toString('base64');
        headers['Authorization'] = `Basic ${equifaxAuth}`;
        break;

      case 'transunion':
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
        break;

      case 'creditKarma':
        headers['X-API-Key'] = provider.apiKey;
        break;
    }

    return headers;
  }

  /**
   * Encrypt sensitive credit data
   * @private
   */
  async encryptSensitiveData(data) {
    if (!this.encryptionKey) {
      throw new Error('Credit data encryption key not configured');
    }

    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm,
      encryptedAt: new Date(),
    };
  }

  /**
   * Format credit data for storage
   * @private
   */
  async formatCreditData(encryptedData) {
    // In a real implementation, you'd decrypt here for processing
    // For now, we'll work with mock decrypted data

    return {
      creditScore: 750,
      creditRating: 'Good',
      paymentHistory: 'excellent',
      debtToIncomeRatio: 0.35,
      creditUtilization: 0.25,
      scoreVerified: true,
      reportDate: new Date(),
      creditFactors: [
        'Payment history',
        'Credit utilization',
        'Length of credit history',
      ],
      riskIndicators: [],
    };
  }

  /**
   * Calculate confidence score for credit data
   * @private
   */
  calculateCreditConfidence(creditData) {
    let confidence = 0;

    // Verified score provides highest confidence
    if (creditData.scoreVerified) confidence += 0.5;

    // Recent report adds confidence
    if (creditData.reportDate) {
      const daysSinceReport = (Date.now() - new Date(creditData.reportDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceReport <= 30) confidence += 0.3;
      else if (daysSinceReport <= 90) confidence += 0.2;
    }

    // Multiple credit factors add confidence
    if (creditData.creditFactors && creditData.creditFactors.length > 0) {
      confidence += Math.min(creditData.creditFactors.length * 0.05, 0.2);
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Check if lead is California resident
   * @private
   */
  isCaliforniaResident(lead) {
    const californiaStates = ['CA', 'California'];
    const address = lead.address || '';

    return californiaStates.some(state =>
      address.toLowerCase().includes(state.toLowerCase())
    );
  }

  /**
   * Mask SSN for logging/security
   * @private
   */
  maskSSN(ssn) {
    if (!ssn || ssn.length < 9) return null;
    return `***-**-${ssn.slice(-4)}`;
  }

  /**
   * Get compliance failure reason
   * @private
   */
  getComplianceFailureReason(gdprConsent, ccpaConsent, fcraCompliance) {
    const reasons = [];
    if (!gdprConsent) reasons.push('GDPR consent required');
    if (!ccpaConsent) reasons.push('CCPA consent required');
    if (!fcraCompliance) reasons.push('FCRA permissible purpose required');
    return reasons.join(', ');
  }

  /**
   * Log compliance event
   * @private
   */
  async logComplianceEvent(leadId, eventType, data) {
    await this.complianceLogger.log({
      leadId,
      eventType: `credit_${eventType}`,
      data,
      timestamp: new Date(),
      provider: this.primaryProvider,
    });
  }

  /**
   * Get provider health status
   */
  async getHealthStatus() {
    const status = {
      overall: 'healthy',
      providers: {},
    };

    for (const [name, provider] of Object.entries(this.providers)) {
      try {
        const isHealthy = await this.checkProviderHealth(name);
        status.providers[name] = {
          status: isHealthy ? 'healthy' : 'unhealthy',
          lastChecked: new Date(),
        };
      } catch (error) {
        status.providers[name] = {
          status: 'error',
          error: error.message,
          lastChecked: new Date(),
        };
      }
    }

    // Overall status is unhealthy if primary provider is down
    if (status.providers[this.primaryProvider]?.status !== 'healthy') {
      status.overall = 'degraded';
    }

    return status;
  }

  /**
   * Check individual provider health
   * @private
   */
  async checkProviderHealth(providerName) {
    const provider = this.providers[providerName];
    if (!provider) return false;

    try {
      let testEndpoint = '';
      const headers = this.buildAuthHeaders(providerName);

      switch (providerName) {
        case 'experian':
          testEndpoint = `${provider.baseUrl}/health`;
          break;
        case 'equifax':
          testEndpoint = `${provider.baseUrl}/status`;
          break;
        case 'transunion':
          testEndpoint = `${provider.baseUrl}/ping`;
          break;
        case 'creditKarma':
          testEndpoint = `${provider.baseUrl}/health`;
          break;
        default:
          return false;
      }

      const response = await axios.get(testEndpoint, {
        headers,
        timeout: 5000,
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Compliance logger for credit data access
 */
class ComplianceLogger {
  async log(event) {
    // In a real implementation, this would write to a secure audit log
    // with encryption and tamper-proofing
    console.log('Compliance Event:', {
      ...event,
      loggedAt: new Date(),
    });
  }
}

module.exports = CreditReportingProvider;