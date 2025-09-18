const crypto = require('crypto');
const { Lead } = require('../../models/Lead');
const { EnrichmentAudit } = require('../../models/EnrichmentAudit');

class ComplianceService {
  constructor() {
    this.consentRetentionPeriod = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years
    this.dataRetentionPeriod = 3 * 365 * 24 * 60 * 60 * 1000; // 3 years
  }

  /**
   * Grant enrichment consent for a lead
   * @param {number} leadId - Lead ID
   * @param {Object} consentData - Consent information
   * @returns {Promise<Object>} Consent record
   */
  async grantConsent(leadId, consentData) {
    const consentId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.consentRetentionPeriod);

    const consentRecord = {
      id: consentId,
      leadId,
      grantedAt: new Date(),
      expiresAt,
      ipAddress: consentData.ipAddress,
      userAgent: consentData.userAgent,
      consentText: consentData.consentText,
      consentVersion: consentData.consentVersion || '1.0',
      purposes: consentData.purposes || ['enrichment'],
      dataTypes: consentData.dataTypes || ['property', 'social', 'credit'],
      withdrawalMethod: 'api_call',
    };

    // Update lead with consent information
    await Lead.update({
      enrichmentConsent: true,
      consentGrantedAt: consentRecord.grantedAt,
      consentExpiresAt: expiresAt,
      consentId: consentId,
    }, { where: { id: leadId } });

    // Log consent grant
    await this.logComplianceEvent('consent_granted', leadId, consentRecord);

    return consentRecord;
  }

  /**
   * Withdraw enrichment consent for a lead
   * @param {number} leadId - Lead ID
   * @param {string} reason - Reason for withdrawal
   * @returns {Promise<boolean>} Success status
   */
  async withdrawConsent(leadId, reason = 'user_request') {
    const lead = await Lead.findByPk(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Update lead to revoke consent
    await Lead.update({
      enrichmentConsent: false,
      consentWithdrawnAt: new Date(),
      consentWithdrawalReason: reason,
    }, { where: { id: leadId } });

    // Log consent withdrawal
    await this.logComplianceEvent('consent_withdrawn', leadId, {
      reason,
      previousConsentId: lead.consentId,
    });

    return true;
  }

  /**
   * Check if consent is valid for a lead
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Consent validation result
   */
  async validateConsent(leadId) {
    const lead = await Lead.findByPk(leadId);
    if (!lead) {
      return { valid: false, reason: 'lead_not_found' };
    }

    if (!lead.enrichmentConsent) {
      return { valid: false, reason: 'consent_not_granted' };
    }

    if (lead.consentExpiresAt && new Date() > lead.consentExpiresAt) {
      return { valid: false, reason: 'consent_expired' };
    }

    if (lead.consentWithdrawnAt) {
      return { valid: false, reason: 'consent_withdrawn' };
    }

    return {
      valid: true,
      consentId: lead.consentId,
      grantedAt: lead.consentGrantedAt,
      expiresAt: lead.consentExpiresAt,
    };
  }

  /**
   * Handle GDPR data portability request
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Data portability package
   */
  async exportDataForPortability(leadId) {
    const lead = await Lead.findByPk(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Validate consent for data export
    const consentValidation = await this.validateConsent(leadId);
    if (!consentValidation.valid) {
      throw new Error(`Cannot export data: ${consentValidation.reason}`);
    }

    // Gather all enrichment data
    const enrichmentData = lead.enrichmentData || {};
    const auditTrail = await EnrichmentAudit.findAll({
      where: { leadId },
      order: [['timestamp', 'ASC']],
    });

    const dataPackage = {
      leadId,
      exportDate: new Date(),
      consentInformation: consentValidation,
      personalData: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        address: lead.address,
      },
      enrichmentData,
      auditTrail: auditTrail.map(audit => ({
        timestamp: audit.timestamp,
        eventType: audit.eventType,
        metadata: JSON.parse(audit.metadata || '{}'),
      })),
      dataRetention: {
        enrichmentDataRetention: this.dataRetentionPeriod / (365 * 24 * 60 * 60 * 1000) + ' years',
        consentRetention: this.consentRetentionPeriod / (365 * 24 * 60 * 60 * 1000) + ' years',
      },
    };

    // Log data export
    await this.logComplianceEvent('data_exported', leadId, {
      exportType: 'portability',
      dataPackageSize: JSON.stringify(dataPackage).length,
    });

    return dataPackage;
  }

  /**
   * Handle CCPA data deletion request
   * @param {number} leadId - Lead ID
   * @param {string} requestType - Type of deletion request
   * @returns {Promise<Object>} Deletion confirmation
   */
  async handleDeletionRequest(leadId, requestType = 'ccpa') {
    const lead = await Lead.findByPk(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    // For CCPA, check if lead is California resident
    if (requestType === 'ccpa' && !this.isCaliforniaResident(lead)) {
      throw new Error('Lead is not identified as a California resident for CCPA request');
    }

    // Log deletion request
    await this.logComplianceEvent('deletion_requested', leadId, {
      requestType,
      requestDate: new Date(),
    });

    // Perform data deletion
    const deletionResult = await this.performDataDeletion(leadId);

    // Log deletion completion
    await this.logComplianceEvent('data_deleted', leadId, {
      requestType,
      deletionResult,
      deletedAt: new Date(),
    });

    return {
      leadId,
      deletionCompleted: true,
      deletedAt: new Date(),
      requestType,
      dataRemoved: deletionResult,
    };
  }

  /**
   * Validate deletion request compliance
   * @param {number} leadId - Lead ID
   * @returns {Promise<boolean>} Validation result
   */
  async validateDeletionRequest(leadId) {
    const consentValidation = await this.validateConsent(leadId);

    // Even if consent is withdrawn/expired, we can still delete data
    // But we should log the reason
    if (!consentValidation.valid) {
      await this.logComplianceEvent('deletion_without_consent', leadId, {
        reason: consentValidation.reason,
        deletionApproved: true,
      });
    }

    return true;
  }

  /**
   * Check if lead is a California resident (for CCPA)
   * @param {Object} lead - Lead object
   * @returns {boolean} California resident status
   */
  isCaliforniaResident(lead) {
    // This would typically check address/state information
    // For now, we'll use a simple check
    const californiaStates = ['CA', 'California'];
    const address = lead.address || '';

    return californiaStates.some(state =>
      address.toLowerCase().includes(state.toLowerCase())
    );
  }

  /**
   * Perform actual data deletion
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Deletion result
   */
  async performDataDeletion(leadId) {
    const deletionResult = {
      enrichmentData: false,
      auditTrail: false,
      consentRecords: false,
    };

    // Delete enrichment data from lead
    await Lead.update({
      enrichmentData: null,
      enrichmentConsent: false,
      consentGrantedAt: null,
      consentExpiresAt: null,
      consentId: null,
      consentWithdrawnAt: new Date(),
      consentWithdrawalReason: 'data_deletion',
    }, { where: { id: leadId } });

    deletionResult.enrichmentData = true;

    // Delete audit trail (in production, this might be archived instead)
    const auditDeletionCount = await EnrichmentAudit.destroy({
      where: { leadId },
    });

    deletionResult.auditTrail = auditDeletionCount > 0;

    // Note: Consent records are kept for compliance purposes
    deletionResult.consentRecords = true;

    return deletionResult;
  }

  /**
   * Get compliance report for a lead
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Compliance report
   */
  async getComplianceReport(leadId) {
    const lead = await Lead.findByPk(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    const consentValidation = await this.validateConsent(leadId);
    const auditTrail = await EnrichmentAudit.findAll({
      where: { leadId },
      order: [['timestamp', 'DESC']],
      limit: 10,
    });

    return {
      leadId,
      consentStatus: consentValidation,
      dataRetention: {
        enrichmentData: lead.enrichmentData ? 'present' : 'not_present',
        lastEnrichment: lead.enrichmentData?.lastEnrichmentAt || null,
        dataAge: lead.enrichmentData?.lastEnrichmentAt
          ? Date.now() - new Date(lead.enrichmentData.lastEnrichmentAt).getTime()
          : null,
      },
      recentActivity: auditTrail.map(audit => ({
        timestamp: audit.timestamp,
        eventType: audit.eventType,
        metadata: JSON.parse(audit.metadata || '{}'),
      })),
      complianceFlags: this.checkComplianceFlags(lead),
    };
  }

  /**
   * Check compliance flags for a lead
   * @param {Object} lead - Lead object
   * @returns {Object} Compliance flags
   */
  checkComplianceFlags(lead) {
    const flags = {
      consentExpired: false,
      consentWithdrawn: false,
      dataRetentionExceeded: false,
      gdprCompliance: true,
      ccpaCompliance: true,
    };

    if (lead.consentExpiresAt && new Date() > lead.consentExpiresAt) {
      flags.consentExpired = true;
    }

    if (lead.consentWithdrawnAt) {
      flags.consentWithdrawn = true;
    }

    if (lead.enrichmentData?.lastEnrichmentAt) {
      const dataAge = Date.now() - new Date(lead.enrichmentData.lastEnrichmentAt).getTime();
      if (dataAge > this.dataRetentionPeriod) {
        flags.dataRetentionExceeded = true;
      }
    }

    // Check CCPA compliance for California residents
    if (this.isCaliforniaResident(lead)) {
      // Additional CCPA checks would go here
    }

    return flags;
  }

  /**
   * Log compliance event
   * @param {string} eventType - Type of compliance event
   * @param {number} leadId - Lead ID
   * @param {Object} eventData - Event data
   * @returns {Promise<void>}
   */
  async logComplianceEvent(eventType, leadId, eventData) {
    await EnrichmentAudit.create({
      id: crypto.randomUUID(),
      leadId,
      eventType: `compliance_${eventType}`,
      data: JSON.stringify(eventData),
      metadata: JSON.stringify({
        complianceFramework: 'gdpr_ccpa',
        loggedBy: 'ComplianceService',
      }),
      timestamp: new Date(),
      ipAddress: 'system',
      userAgent: 'ComplianceService',
    });
  }

  /**
   * Get compliance statistics
   * @returns {Promise<Object>} Compliance statistics
   */
  async getComplianceStats() {
    const totalLeads = await Lead.count();
    const consentedLeads = await Lead.count({
      where: { enrichmentConsent: true },
    });
    const expiredConsents = await Lead.count({
      where: {
        enrichmentConsent: true,
        consentExpiresAt: { [require('sequelize').Op.lt]: new Date() },
      },
    });

    return {
      totalLeads,
      consentedLeads,
      consentRate: totalLeads > 0 ? (consentedLeads / totalLeads) * 100 : 0,
      expiredConsents,
      activeConsents: consentedLeads - expiredConsents,
    };
  }
}

module.exports = new ComplianceService();