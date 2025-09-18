// Advanced Redis Caching Service for Real Estate CRM

const {
  cacheSetWithCompression,
  cacheGetWithDecompression,
  invalidateByPattern,
  invalidateUserCache,
  invalidateLeadCache,
  getCacheStats,
  resetCacheStats,
  generateCacheKey,
  CACHE_CONFIG
} = require('../config/redis');

class CacheService {

  // User-related caching
  static async getUserDashboard(userId) {
    const cacheKey = generateCacheKey('dashboard', userId, 'data');
    return await cacheGetWithDecompression(cacheKey);
  }

  static async setUserDashboard(userId, data) {
    const cacheKey = generateCacheKey('dashboard', userId, 'data');
    return await cacheSetWithCompression(cacheKey, data, CACHE_CONFIG.dashboard);
  }

  static async getUserProfile(userId) {
    const cacheKey = generateCacheKey('user', userId, 'profile');
    return await cacheGetWithDecompression(cacheKey);
  }

  static async setUserProfile(userId, profile) {
    const cacheKey = generateCacheKey('user', userId, 'profile');
    return await cacheSetWithCompression(cacheKey, profile, CACHE_CONFIG.user);
  }

  // Lead-related caching
  static async getLeadList(userId, filters = {}, pagination = {}) {
    const filterKey = this.generateFilterKey(filters, pagination);
    const cacheKey = generateCacheKey('leads', 'list', userId, filterKey);
    return await cacheGetWithDecompression(cacheKey);
  }

  static async setLeadList(userId, filters = {}, pagination = {}, data) {
    const filterKey = this.generateFilterKey(filters, pagination);
    const cacheKey = generateCacheKey('leads', 'list', userId, filterKey);
    return await cacheSetWithCompression(cacheKey, data, CACHE_CONFIG.leads);
  }

  static async getLead(leadId) {
    const cacheKey = generateCacheKey('leads', leadId);
    return await cacheGetWithDecompression(cacheKey);
  }

  static async setLead(leadId, data) {
    const cacheKey = generateCacheKey('leads', leadId);
    return await cacheSetWithCompression(cacheKey, data, CACHE_CONFIG.leads);
  }

  // Search caching
  static async getSearchResults(query, filters = {}) {
    const searchKey = this.generateSearchKey(query, filters);
    const cacheKey = generateCacheKey('search', searchKey);
    return await cacheGetWithDecompression(cacheKey);
  }

  static async setSearchResults(query, filters = {}, results) {
    const searchKey = this.generateSearchKey(query, filters);
    const cacheKey = generateCacheKey('search', searchKey);
    return await cacheSetWithCompression(cacheKey, results, CACHE_CONFIG.search);
  }

  // Analytics caching
  static async getAnalyticsData(type, params = {}) {
    const paramKey = this.generateParamKey(params);
    const cacheKey = generateCacheKey('analytics', type, paramKey);
    return await cacheGetWithDecompression(cacheKey);
  }

  static async setAnalyticsData(type, params = {}, data) {
    const paramKey = this.generateParamKey(params);
    const cacheKey = generateCacheKey('analytics', type, paramKey);
    return await cacheSetWithCompression(cacheKey, data, CACHE_CONFIG.analytics);
  }

  // Template caching
  static async getTemplate(templateId) {
    const cacheKey = generateCacheKey('templates', templateId);
    return await cacheGetWithDecompression(cacheKey);
  }

  static async setTemplate(templateId, data) {
    const cacheKey = generateCacheKey('templates', templateId);
    return await cacheSetWithCompression(cacheKey, data, CACHE_CONFIG.templates);
  }

  static async getTemplateList(filters = {}) {
    const filterKey = this.generateFilterKey(filters);
    const cacheKey = generateCacheKey('templates', 'list', filterKey);
    return await cacheGetWithDecompression(cacheKey);
  }

  static async setTemplateList(filters = {}, data) {
    const filterKey = this.generateFilterKey(filters);
    const cacheKey = generateCacheKey('templates', 'list', filterKey);
    return await cacheSetWithCompression(cacheKey, data, CACHE_CONFIG.templates);
  }

  // Metadata caching
  static async getMetadata(type) {
    const cacheKey = generateCacheKey('metadata', type);
    return await cacheGetWithDecompression(cacheKey);
  }

  static async setMetadata(type, data) {
    const cacheKey = generateCacheKey('metadata', type);
    return await cacheSetWithCompression(cacheKey, data, CACHE_CONFIG.metadata);
  }

  // Cache invalidation helpers
  static async invalidateUserData(userId) {
    return await invalidateUserCache(userId);
  }

  static async invalidateLeadData(leadId, userId = null) {
    return await invalidateLeadCache(leadId, userId);
  }

  static async invalidateSearchResults() {
    return await invalidateByPattern(`${CACHE_CONFIG.prefixes.search}*`);
  }

  static async invalidateAnalytics() {
    return await invalidateByPattern(`${CACHE_CONFIG.prefixes.analytics}*`);
  }

  static async invalidateTemplates() {
    return await invalidateByPattern(`${CACHE_CONFIG.prefixes.templates}*`);
  }

  // Multi-level caching with fallback
  static async getWithFallback(cacheKey, fallbackFn, ttl = 3600) {
    try {
      // Try cache first
      const cached = await cacheGetWithDecompression(cacheKey);
      if (cached !== null) {
        return { data: cached, source: 'cache' };
      }

      // Fallback to data source
      const data = await fallbackFn();
      if (data !== null) {
        // Cache the result for future requests
        await cacheSetWithCompression(cacheKey, data, ttl);
        return { data, source: 'database' };
      }

      return { data: null, source: 'none' };
    } catch (error) {
      console.error('Cache fallback error:', error);
      // Return data from source even if caching fails
      try {
        const data = await fallbackFn();
        return { data, source: 'database' };
      } catch (fallbackError) {
        console.error('Fallback function error:', fallbackError);
        return { data: null, source: 'error' };
      }
    }
  }

  // Batch caching operations
  static async getMultiple(cacheKeys) {
    const results = [];
    for (const key of cacheKeys) {
      const data = await cacheGetWithDecompression(key);
      results.push(data);
    }
    return results;
  }

  static async setMultiple(keyValuePairs, ttl = 3600) {
    const promises = keyValuePairs.map(([key, value]) =>
      cacheSetWithCompression(key, value, ttl)
    );
    return await Promise.all(promises);
  }

  // Cache warming utilities
  static async warmUserData(userId) {
    try {
      const User = require('../models/User');

      // Warm dashboard data
      const dashboardData = await User.getDashboardData(userId);
      if (dashboardData) {
        await this.setUserDashboard(userId, dashboardData);
      }

      // Warm user profile
      const userProfile = await User.findById(userId);
      if (userProfile) {
        await this.setUserProfile(userId, userProfile);
      }

      console.log(`Cache warmed for user ${userId}`);
      return true;
    } catch (error) {
      console.error('User cache warming error:', error);
      return false;
    }
  }

  static async warmLeadData(userId, leadIds = []) {
    try {
      const Lead = require('../models/Lead');

      if (leadIds.length === 0) {
        // Warm recent leads
        const recentLeads = await Lead.getLeads(userId, {}, { limit: 20 });
        for (const lead of recentLeads.data) {
          await this.setLead(lead.lead_id, lead);
        }
      } else {
        // Warm specific leads
        for (const leadId of leadIds) {
          const lead = await Lead.getById(leadId, userId);
          if (lead) {
            await this.setLead(leadId, lead);
          }
        }
      }

      console.log(`Cache warmed for ${leadIds.length || 'recent'} leads`);
      return true;
    } catch (error) {
      console.error('Lead cache warming error:', error);
      return false;
    }
  }

  // Cache statistics and monitoring
  static getStats() {
    return getCacheStats();
  }

  static resetStats() {
    resetCacheStats();
  }

  // Utility functions
  static generateFilterKey(filters, pagination = {}) {
    const sortedFilters = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');

    const paginationKey = pagination.page && pagination.limit
      ? `page:${pagination.page}|limit:${pagination.limit}`
      : '';

    return `${sortedFilters}${paginationKey ? `|${paginationKey}` : ''}`;
  }

  static generateSearchKey(query, filters = {}) {
    const normalizedQuery = query.toLowerCase().trim();
    const filterKey = this.generateFilterKey(filters);
    return `${normalizedQuery}${filterKey ? `|${filterKey}` : ''}`;
  }

  static generateParamKey(params) {
    return Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
  }

  // Cache key patterns for invalidation
  static getCachePatterns() {
    return {
      user: `${CACHE_CONFIG.prefixes.user}*`,
      leads: `${CACHE_CONFIG.prefixes.leads}*`,
      dashboard: `${CACHE_CONFIG.prefixes.dashboard}*`,
      search: `${CACHE_CONFIG.prefixes.search}*`,
      analytics: `${CACHE_CONFIG.prefixes.analytics}*`,
      templates: `${CACHE_CONFIG.prefixes.templates}*`,
      metadata: `${CACHE_CONFIG.prefixes.metadata}*`,
      session: `${CACHE_CONFIG.prefixes.session}*`
    };
  }

  // Health check
  static async healthCheck() {
    try {
      const stats = this.getStats();
      return {
        status: 'healthy',
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = CacheService;