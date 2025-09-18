const { Lead } = require('../../models/Lead');

class ValidationService {
  constructor() {
    this.qualityThresholds = {
      property: {
        ownershipVerified: 0.95,
        propertyValue: 0.90,
        transactionHistory: 0.85,
        overall: 0.88,
      },
      social: {
        profileVerified: 0.92,
        professionalData: 0.88,
        contactInfo: 0.95,
        overall: 0.90,
      },
      credit: {
        scoreVerified: 0.98,
        paymentHistory: 0.95,
        debtRatio: 0.90,
        overall: 0.94,
      },
    };

    this.confidenceWeights = {
      property: 0.4,
      social: 0.3,
      credit: 0.3,
    };
  }

  /**
   * Validate enriched data comprehensively
   * @param {Object} enrichmentResult - Enrichment result to validate
   * @returns {Promise<Object>} Validation result
   */
  async validate(enrichmentResult) {
    const validation = {
      isValid: true,
      qualityScore: 0,
      confidence: 0,
      issues: [],
      corrections: [],
      metadata: {
        validationTimestamp: new Date(),
        validatorVersion: '1.0',
      },
    };

    try {
      // Validate data structure
      this.validateDataStructure(enrichmentResult, validation);

      // Validate data quality for each source
      if (enrichmentResult.data.property) {
        await this.validatePropertyData(enrichmentResult.data.property, validation);
      }

      if (enrichmentResult.data.social) {
        await this.validateSocialData(enrichmentResult.data.social, validation);
      }

      if (enrichmentResult.data.credit) {
        await this.validateCreditData(enrichmentResult.data.credit, validation);
      }

      // Calculate overall quality score
      validation.qualityScore = this.calculateQualityScore(enrichmentResult, validation);

      // Calculate confidence score
      validation.confidence = this.calculateConfidenceScore(enrichmentResult);

      // Apply automatic corrections if possible
      await this.applyAutomaticCorrections(enrichmentResult, validation);

      // Final validation decision
      validation.isValid = validation.qualityScore >= 95 && validation.issues.length === 0;

    } catch (error) {
      validation.isValid = false;
      validation.issues.push({
        type: 'validation_error',
        severity: 'critical',
        message: `Validation failed: ${error.message}`,
        source: 'system',
      });
    }

    return validation;
  }

  /**
   * Validate data structure and required fields
   * @private
   */
  validateDataStructure(enrichmentResult, validation) {
    const requiredFields = ['leadId', 'enrichmentId', 'sources', 'data'];

    for (const field of requiredFields) {
      if (!enrichmentResult[field]) {
        validation.issues.push({
          type: 'missing_field',
          severity: 'critical',
          message: `Required field '${field}' is missing`,
          source: 'structure',
        });
      }
    }

    if (!enrichmentResult.sources || enrichmentResult.sources.length === 0) {
      validation.issues.push({
        type: 'no_data_sources',
        severity: 'critical',
        message: 'No data sources were successfully enriched',
        source: 'structure',
      });
    }
  }

  /**
   * Validate property data
   * @private
   */
  async validatePropertyData(propertyData, validation) {
    // Ownership verification
    if (!propertyData.ownershipVerified) {
      validation.issues.push({
        type: 'unverified_ownership',
        severity: 'high',
        message: 'Property ownership not verified',
        source: 'property',
        suggestion: 'Cross-reference with multiple public records',
      });
    }

    // Property value validation
    if (propertyData.propertyValue) {
      const valueValidation = this.validatePropertyValue(propertyData.propertyValue);
      if (!valueValidation.isValid) {
        validation.issues.push({
          type: 'invalid_property_value',
          severity: 'medium',
          message: valueValidation.message,
          source: 'property',
          suggestion: valueValidation.suggestion,
        });
      }
    }

    // Transaction history validation
    if (propertyData.lastTransactionDate) {
      const dateValidation = this.validateTransactionDate(propertyData.lastTransactionDate);
      if (!dateValidation.isValid) {
        validation.issues.push({
          type: 'invalid_transaction_date',
          severity: 'low',
          message: dateValidation.message,
          source: 'property',
        });
      }
    }

    // Mortgage balance validation
    if (propertyData.mortgageBalance && propertyData.propertyValue) {
      const ltvValidation = this.validateLoanToValueRatio(
        propertyData.mortgageBalance,
        propertyData.propertyValue
      );
      if (!ltvValidation.isValid) {
        validation.issues.push({
          type: 'invalid_ltv_ratio',
          severity: 'medium',
          message: ltvValidation.message,
          source: 'property',
        });
      }
    }
  }

  /**
   * Validate social media data
   * @private
   */
  async validateSocialData(socialData, validation) {
    // Profile verification
    if (!socialData.profileVerified) {
      validation.issues.push({
        type: 'unverified_profile',
        severity: 'medium',
        message: 'Social profile not verified',
        source: 'social',
        suggestion: 'Verify profile authenticity through multiple signals',
      });
    }

    // Professional data validation
    if (socialData.professionalTitle) {
      const titleValidation = this.validateProfessionalTitle(socialData.professionalTitle);
      if (!titleValidation.isValid) {
        validation.issues.push({
          type: 'invalid_professional_title',
          severity: 'low',
          message: titleValidation.message,
          source: 'social',
        });
      }
    }

    // Connection count validation
    if (socialData.connections) {
      const connectionValidation = this.validateConnectionCount(socialData.connections);
      if (!connectionValidation.isValid) {
        validation.issues.push({
          type: 'suspicious_connection_count',
          severity: 'low',
          message: connectionValidation.message,
          source: 'social',
        });
      }
    }

    // Email validation
    if (socialData.email) {
      const emailValidation = this.validateEmail(socialData.email);
      if (!emailValidation.isValid) {
        validation.issues.push({
          type: 'invalid_email',
          severity: 'high',
          message: emailValidation.message,
          source: 'social',
        });
      }
    }
  }

  /**
   * Validate credit data
   * @private
   */
  async validateCreditData(creditData, validation) {
    // Credit score validation
    if (creditData.creditScore) {
      const scoreValidation = this.validateCreditScore(creditData.creditScore);
      if (!scoreValidation.isValid) {
        validation.issues.push({
          type: 'invalid_credit_score',
          severity: 'high',
          message: scoreValidation.message,
          source: 'credit',
        });
      }
    }

    // Payment history validation
    if (creditData.paymentHistory) {
      const historyValidation = this.validatePaymentHistory(creditData.paymentHistory);
      if (!historyValidation.isValid) {
        validation.issues.push({
          type: 'poor_payment_history',
          severity: 'high',
          message: historyValidation.message,
          source: 'credit',
        });
      }
    }

    // Debt-to-income ratio validation
    if (creditData.debtToIncomeRatio) {
      const dtiValidation = this.validateDebtToIncomeRatio(creditData.debtToIncomeRatio);
      if (!dtiValidation.isValid) {
        validation.issues.push({
          type: 'high_debt_ratio',
          severity: 'medium',
          message: dtiValidation.message,
          source: 'credit',
        });
      }
    }

    // Verification status
    if (!creditData.scoreVerified) {
      validation.issues.push({
        type: 'unverified_credit_score',
        severity: 'critical',
        message: 'Credit score not verified by reporting agency',
        source: 'credit',
      });
    }
  }

  /**
   * Calculate overall quality score
   * @private
   */
  calculateQualityScore(enrichmentResult, validation) {
    let totalScore = 0;
    let totalWeight = 0;

    const sourceWeights = {
      property: 0.4,
      social: 0.3,
      credit: 0.3,
    };

    // Calculate score for each data source
    for (const source of enrichmentResult.sources) {
      if (enrichmentResult.data[source]) {
        const sourceScore = this.calculateSourceQualityScore(source, enrichmentResult.data[source], validation);
        totalScore += sourceScore * sourceWeights[source];
        totalWeight += sourceWeights[source];
      }
    }

    // Penalty for issues
    const issuePenalty = validation.issues.length * 2; // 2 points per issue

    const finalScore = totalWeight > 0 ? Math.max(0, (totalScore / totalWeight) * 100 - issuePenalty) : 0;

    return Math.round(finalScore);
  }

  /**
   * Calculate confidence score
   * @private
   */
  calculateConfidenceScore(enrichmentResult) {
    let totalConfidence = 0;
    let totalWeight = 0;

    for (const source of enrichmentResult.sources) {
      if (enrichmentResult.data[source] && enrichmentResult.data[source].confidence) {
        totalConfidence += enrichmentResult.data[source].confidence * this.confidenceWeights[source];
        totalWeight += this.confidenceWeights[source];
      }
    }

    return totalWeight > 0 ? totalConfidence / totalWeight : 0;
  }

  /**
   * Calculate quality score for a specific data source
   * @private
   */
  calculateSourceQualityScore(source, data, validation) {
    const sourceIssues = validation.issues.filter(issue => issue.source === source);
    const baseScore = this.qualityThresholds[source].overall * 100;
    const issuePenalty = sourceIssues.length * 5; // 5 points per issue for this source

    return Math.max(0, baseScore - issuePenalty);
  }

  /**
   * Apply automatic corrections to data
   * @private
   */
  async applyAutomaticCorrections(enrichmentResult, validation) {
    for (const issue of validation.issues) {
      if (issue.severity === 'low' && this.canAutoCorrect(issue)) {
        const correction = await this.applyCorrection(issue, enrichmentResult);
        if (correction) {
          validation.corrections.push(correction);
          // Remove the issue since it was corrected
          validation.issues = validation.issues.filter(i => i !== issue);
        }
      }
    }
  }

  /**
   * Check if an issue can be automatically corrected
   * @private
   */
  canAutoCorrect(issue) {
    const autoCorrectableTypes = [
      'invalid_transaction_date',
      'invalid_professional_title',
      'suspicious_connection_count',
    ];

    return autoCorrectableTypes.includes(issue.type);
  }

  /**
   * Apply automatic correction
   * @private
   */
  async applyCorrection(issue, enrichmentResult) {
    switch (issue.type) {
      case 'invalid_transaction_date':
        // Try to parse and correct date format
        if (enrichmentResult.data.property?.lastTransactionDate) {
          const correctedDate = this.correctDateFormat(enrichmentResult.data.property.lastTransactionDate);
          if (correctedDate) {
            enrichmentResult.data.property.lastTransactionDate = correctedDate;
            return {
              type: 'date_format_correction',
              field: 'lastTransactionDate',
              originalValue: enrichmentResult.data.property.lastTransactionDate,
              correctedValue: correctedDate,
            };
          }
        }
        break;

      case 'invalid_professional_title':
        // Standardize professional title
        if (enrichmentResult.data.social?.professionalTitle) {
          const correctedTitle = this.standardizeProfessionalTitle(enrichmentResult.data.social.professionalTitle);
          if (correctedTitle) {
            enrichmentResult.data.social.professionalTitle = correctedTitle;
            return {
              type: 'title_standardization',
              field: 'professionalTitle',
              originalValue: enrichmentResult.data.social.professionalTitle,
              correctedValue: correctedTitle,
            };
          }
        }
        break;

      case 'suspicious_connection_count':
        // Validate and adjust connection count
        if (enrichmentResult.data.social?.connections) {
          const correctedCount = this.validateAndCorrectConnectionCount(enrichmentResult.data.social.connections);
          if (correctedCount !== enrichmentResult.data.social.connections) {
            enrichmentResult.data.social.connections = correctedCount;
            return {
              type: 'connection_count_correction',
              field: 'connections',
              originalValue: enrichmentResult.data.social.connections,
              correctedValue: correctedCount,
            };
          }
        }
        break;
    }

    return null;
  }

  // Validation helper methods
  validatePropertyValue(value) {
    if (typeof value !== 'number' || value <= 0) {
      return {
        isValid: false,
        message: 'Property value must be a positive number',
        suggestion: 'Verify property value from multiple sources',
      };
    }

    if (value > 10000000) { // $10M
      return {
        isValid: false,
        message: 'Property value seems unusually high',
        suggestion: 'Cross-reference with recent comparable sales',
      };
    }

    return { isValid: true };
  }

  validateTransactionDate(date) {
    const transactionDate = new Date(date);
    const now = new Date();

    if (isNaN(transactionDate.getTime())) {
      return {
        isValid: false,
        message: 'Invalid transaction date format',
      };
    }

    if (transactionDate > now) {
      return {
        isValid: false,
        message: 'Transaction date cannot be in the future',
      };
    }

    return { isValid: true };
  }

  validateLoanToValueRatio(mortgageBalance, propertyValue) {
    const ltvRatio = mortgageBalance / propertyValue;

    if (ltvRatio > 1.5) { // 150% LTV
      return {
        isValid: false,
        message: 'Loan-to-value ratio seems unusually high',
      };
    }

    return { isValid: true };
  }

  validateProfessionalTitle(title) {
    if (typeof title !== 'string' || title.length < 2) {
      return {
        isValid: false,
        message: 'Professional title is too short or invalid',
      };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = ['test', 'fake', 'spam', '123'];
    if (suspiciousPatterns.some(pattern => title.toLowerCase().includes(pattern))) {
      return {
        isValid: false,
        message: 'Professional title contains suspicious content',
      };
    }

    return { isValid: true };
  }

  validateConnectionCount(count) {
    if (typeof count !== 'number') {
      return {
        isValid: false,
        message: 'Connection count must be a number',
      };
    }

    if (count > 50000) { // Unusually high
      return {
        isValid: false,
        message: 'Connection count seems unusually high',
      };
    }

    return { isValid: true };
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        message: 'Invalid email format',
      };
    }

    return { isValid: true };
  }

  validateCreditScore(score) {
    if (typeof score !== 'number' || score < 300 || score > 850) {
      return {
        isValid: false,
        message: 'Credit score must be between 300 and 850',
      };
    }

    return { isValid: true };
  }

  validatePaymentHistory(history) {
    const validStatuses = ['excellent', 'good', 'fair', 'poor'];
    if (!validStatuses.includes(history.toLowerCase())) {
      return {
        isValid: false,
        message: 'Invalid payment history status',
      };
    }

    if (history.toLowerCase() === 'poor') {
      return {
        isValid: false,
        message: 'Payment history indicates high risk',
      };
    }

    return { isValid: true };
  }

  validateDebtToIncomeRatio(ratio) {
    if (typeof ratio !== 'number' || ratio < 0 || ratio > 1) {
      return {
        isValid: false,
        message: 'Debt-to-income ratio must be between 0 and 1',
      };
    }

    if (ratio > 0.6) { // 60% DTI
      return {
        isValid: false,
        message: 'Debt-to-income ratio is quite high',
      };
    }

    return { isValid: true };
  }

  // Correction helper methods
  correctDateFormat(dateString) {
    // Try different date formats
    const formats = [
      'YYYY-MM-DD',
      'MM/DD/YYYY',
      'DD/MM/YYYY',
      'YYYY/MM/DD',
    ];

    for (const format of formats) {
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  standardizeProfessionalTitle(title) {
    // Common title mappings
    const titleMappings = {
      'ceo': 'Chief Executive Officer',
      'cfo': 'Chief Financial Officer',
      'cto': 'Chief Technology Officer',
      'vp': 'Vice President',
      'mgr': 'Manager',
      'sr': 'Senior',
      'jr': 'Junior',
    };

    let standardizedTitle = title;
    for (const [abbrev, full] of Object.entries(titleMappings)) {
      standardizedTitle = standardizedTitle.replace(new RegExp(`\\b${abbrev}\\b`, 'gi'), full);
    }

    return standardizedTitle;
  }

  validateAndCorrectConnectionCount(count) {
    // If count seems unreasonably high, apply a reasonable cap
    if (count > 30000) {
      return 30000; // Cap at 30k
    }

    return count;
  }
}

module.exports = new ValidationService();