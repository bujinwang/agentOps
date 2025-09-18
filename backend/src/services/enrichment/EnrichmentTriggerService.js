const { Lead } = require('../../models/Lead');
const enrichmentService = require('./EnrichmentService');
const webhookService = require('./WebhookService');

class EnrichmentTriggerService {
  constructor() {
    this.triggers = new Map();
    this.setupDefaultTriggers();
  }

  /**
   * Setup default enrichment triggers
   * @private
   */
  setupDefaultTriggers() {
    // Trigger on lead creation
    this.registerTrigger('lead_created', {
      event: 'lead_created',
      condition: (lead) => this.shouldEnrichLead(lead),
      action: (lead) => this.triggerEnrichment(lead.id, 'automatic_creation'),
      priority: 1,
      enabled: true,
    });

    // Trigger on lead update with new contact info
    this.registerTrigger('lead_updated_contact', {
      event: 'lead_updated',
      condition: (lead, changes) => this.hasNewContactInfo(changes),
      action: (lead) => this.triggerEnrichment(lead.id, 'automatic_update_contact'),
      priority: 2,
      enabled: true,
    });

    // Trigger on lead update with new property preferences
    this.registerTrigger('lead_updated_property', {
      event: 'lead_updated',
      condition: (lead, changes) => this.hasNewPropertyInfo(changes),
      action: (lead) => this.triggerEnrichment(lead.id, 'automatic_update_property'),
      priority: 3,
      enabled: true,
    });

    // Trigger on consent granted
    this.registerTrigger('consent_granted', {
      event: 'consent_granted',
      condition: (lead) => lead.enrichmentConsent && !lead.enrichmentData,
      action: (lead) => this.triggerEnrichment(lead.id, 'consent_granted'),
      priority: 1,
      enabled: true,
    });

    // Trigger on periodic refresh (for existing enriched leads)
    this.registerTrigger('periodic_refresh', {
      event: 'periodic_refresh',
      condition: (lead) => this.shouldRefreshEnrichment(lead),
      action: (lead) => this.triggerEnrichment(lead.id, 'periodic_refresh', { forceRefresh: true }),
      priority: 4,
      enabled: true,
    });
  }

  /**
   * Register a new enrichment trigger
   * @param {string} triggerId - Unique trigger identifier
   * @param {Object} config - Trigger configuration
   */
  registerTrigger(triggerId, config) {
    this.triggers.set(triggerId, {
      id: triggerId,
      ...config,
      createdAt: new Date(),
    });
  }

  /**
   * Unregister an enrichment trigger
   * @param {string} triggerId - Trigger identifier
   */
  unregisterTrigger(triggerId) {
    this.triggers.delete(triggerId);
  }

  /**
   * Process lead creation event
   * @param {Object} lead - Lead data
   */
  async onLeadCreated(lead) {
    await this.processTriggers('lead_created', lead);
  }

  /**
   * Process lead update event
   * @param {Object} lead - Updated lead data
   * @param {Object} changes - Changes made to the lead
   */
  async onLeadUpdated(lead, changes) {
    await this.processTriggers('lead_updated', lead, changes);

    // Also check for contact info updates
    if (this.hasNewContactInfo(changes)) {
      await this.processTriggers('lead_updated_contact', lead, changes);
    }

    // Check for property info updates
    if (this.hasNewPropertyInfo(changes)) {
      await this.processTriggers('lead_updated_property', lead, changes);
    }
  }

  /**
   * Process consent granted event
   * @param {Object} lead - Lead data
   */
  async onConsentGranted(lead) {
    await this.processTriggers('consent_granted', lead);
  }

  /**
   * Process periodic refresh for all eligible leads
   * @param {number} batchSize - Number of leads to process
   */
  async processPeriodicRefresh(batchSize = 50) {
    const eligibleLeads = await this.getLeadsForRefresh(batchSize);

    for (const lead of eligibleLeads) {
      await this.processTriggers('periodic_refresh', lead);
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return eligibleLeads.length;
  }

  /**
   * Process triggers for a specific event
   * @private
   */
  async processTriggers(event, lead, changes = null) {
    const matchingTriggers = Array.from(this.triggers.values())
      .filter(trigger => trigger.event === event && trigger.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const trigger of matchingTriggers) {
      try {
        if (await this.evaluateCondition(trigger, lead, changes)) {
          await this.executeAction(trigger, lead, changes);
          break; // Stop after first successful trigger
        }
      } catch (error) {
        console.error(`Trigger ${trigger.id} failed:`, error);
      }
    }
  }

  /**
   * Evaluate trigger condition
   * @private
   */
  async evaluateCondition(trigger, lead, changes) {
    try {
      return await trigger.condition(lead, changes);
    } catch (error) {
      console.error(`Condition evaluation failed for trigger ${trigger.id}:`, error);
      return false;
    }
  }

  /**
   * Execute trigger action
   * @private
   */
  async executeAction(trigger, lead, changes) {
    try {
      await trigger.action(lead, changes);

      // Log trigger execution
      console.log(`Trigger ${trigger.id} executed for lead ${lead.id}`);

    } catch (error) {
      console.error(`Action execution failed for trigger ${trigger.id}:`, error);
    }
  }

  /**
   * Check if lead should be enriched
   * @private
   */
  async shouldEnrichLead(lead) {
    // Check if lead has sufficient data for enrichment
    const hasBasicInfo = lead.firstName && lead.lastName && (lead.email || lead.phoneNumber);
    const hasConsent = lead.enrichmentConsent;
    const notRecentlyEnriched = !lead.lastEnrichmentAt ||
      (Date.now() - new Date(lead.lastEnrichmentAt).getTime()) > (24 * 60 * 60 * 1000); // 24 hours

    return hasBasicInfo && hasConsent && notRecentlyEnriched;
  }

  /**
   * Check if lead has new contact information
   * @private
   */
  hasNewContactInfo(changes) {
    const contactFields = ['email', 'phoneNumber', 'address'];
    return contactFields.some(field => changes && changes[field]);
  }

  /**
   * Check if lead has new property information
   * @private
  */
  hasNewPropertyInfo(changes) {
    const propertyFields = ['budgetMin', 'budgetMax', 'desiredLocation', 'propertyType', 'bedroomsMin', 'bathroomsMin'];
    return propertyFields.some(field => changes && changes[field]);
  }

  /**
   * Check if lead enrichment should be refreshed
   * @private
   */
  shouldRefreshEnrichment(lead) {
    if (!lead.enrichmentData || !lead.lastEnrichmentAt) return false;

    const daysSinceEnrichment = (Date.now() - new Date(lead.lastEnrichmentAt).getTime()) / (1000 * 60 * 60 * 24);
    const refreshThreshold = lead.enrichmentData.qualityScore > 90 ? 30 : 7; // 30 days for high quality, 7 for lower

    return daysSinceEnrichment > refreshThreshold;
  }

  /**
   * Trigger enrichment for a lead
   * @private
   */
  async triggerEnrichment(leadId, triggerReason, options = {}) {
    try {
      console.log(`Triggering enrichment for lead ${leadId} (${triggerReason})`);

      // Start enrichment process asynchronously
      enrichmentService.enrichLead(leadId, {
        ...options,
        triggerReason,
        triggeredAt: new Date(),
      }).then(async (result) => {
        // Send webhook notification on completion
        await webhookService.sendEnrichmentNotification(leadId, result, 'enrichment_completed');
      }).catch(async (error) => {
        console.error(`Enrichment failed for lead ${leadId}:`, error);

        // Send failure notification
        await webhookService.sendEnrichmentNotification(leadId, {
          enrichmentId: `error-${Date.now()}`,
          error: error.message,
        }, 'enrichment_failed');
      });

    } catch (error) {
      console.error(`Failed to trigger enrichment for lead ${leadId}:`, error);
    }
  }

  /**
   * Get leads eligible for periodic refresh
   * @private
   */
  async getLeadsForRefresh(limit) {
    try {
      // This would be implemented with a database query
      // For now, return empty array as this requires database access
      return [];
    } catch (error) {
      console.error('Failed to get leads for refresh:', error);
      return [];
    }
  }

  /**
   * Get registered triggers
   * @returns {Array} List of registered triggers
   */
  getRegisteredTriggers() {
    return Array.from(this.triggers.values()).map(trigger => ({
      id: trigger.id,
      event: trigger.event,
      priority: trigger.priority,
      enabled: trigger.enabled,
      createdAt: trigger.createdAt,
    }));
  }

  /**
   * Enable or disable a trigger
   * @param {string} triggerId - Trigger identifier
   * @param {boolean} enabled - Enable or disable
   */
  setTriggerEnabled(triggerId, enabled) {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.enabled = enabled;
    }
  }

  /**
   * Get trigger statistics
   * @returns {Object} Trigger execution statistics
   */
  getTriggerStats() {
    const stats = {
      totalTriggers: this.triggers.size,
      enabledTriggers: 0,
      disabledTriggers: 0,
      triggersByEvent: {},
    };

    for (const trigger of this.triggers.values()) {
      if (trigger.enabled) {
        stats.enabledTriggers++;
      } else {
        stats.disabledTriggers++;
      }

      stats.triggersByEvent[trigger.event] = (stats.triggersByEvent[trigger.event] || 0) + 1;
    }

    return stats;
  }

  /**
   * Manual trigger for testing or admin purposes
   * @param {number} leadId - Lead ID
   * @param {string} triggerReason - Reason for manual trigger
   */
  async manualTrigger(leadId, triggerReason = 'manual') {
    const lead = await Lead.findByPk(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    await this.triggerEnrichment(leadId, triggerReason);
    return { success: true, leadId, triggerReason };
  }
}

module.exports = new EnrichmentTriggerService();