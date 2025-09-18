const axios = require('axios');
const EnrichmentProvider = require('../EnrichmentProvider');

class PropertyDataProvider extends EnrichmentProvider {
  constructor(config = {}) {
    super({
      rateLimit: config.rateLimit || 50, // requests per minute
      ...config,
    });

    this.apiKey = process.env.PROPERTY_API_KEY;
    this.baseUrl = config.baseUrl || 'https://api.propertydata.com/v1';
    this.timeout = config.timeout || 10000; // 10 seconds

    // Supported providers with their configurations
    this.providers = {
      zillow: {
        baseUrl: 'https://api.zillow.com/webservice',
        apiKey: process.env.ZILLOW_API_KEY,
        endpoints: {
          search: '/GetSearchResults.htm',
          details: '/GetUpdatedPropertyDetails.htm',
          comps: '/GetComps.htm',
        },
      },
      realtor: {
        baseUrl: 'https://api.realtor.com/v1',
        apiKey: process.env.REALTOR_API_KEY,
        endpoints: {
          search: '/properties/search',
          details: '/properties/{propertyId}',
        },
      },
      publicRecords: {
        baseUrl: 'https://api.publicrecords.com/v1',
        apiKey: process.env.PUBLIC_RECORDS_API_KEY,
        endpoints: {
          ownership: '/ownership/search',
          transactions: '/transactions/search',
        },
      },
    };

    this.primaryProvider = config.primaryProvider || 'zillow';
  }

  async doEnrich(lead) {
    const propertyData = {
      ownershipStatus: null,
      propertyValue: null,
      mortgageBalance: null,
      lastTransactionDate: null,
      propertyType: null,
      ownershipVerified: false,
      transactionHistory: [],
      confidence: 0,
      sources: [],
      lastUpdated: new Date(),
    };

    try {
      // Step 1: Search for properties associated with the lead
      const properties = await this.searchProperties(lead);

      if (properties.length === 0) {
        return {
          ...propertyData,
          confidence: 0,
          sources: ['no_properties_found'],
        };
      }

      // Step 2: Get detailed information for the most relevant property
      const primaryProperty = properties[0];
      const details = await this.getPropertyDetails(primaryProperty.id);

      // Step 3: Get transaction history
      const transactions = await this.getTransactionHistory(primaryProperty.id);

      // Step 4: Calculate confidence score
      const confidence = this.calculatePropertyConfidence(properties, details, transactions);

      return {
        ownershipStatus: details.ownershipStatus || 'unknown',
        propertyValue: details.estimatedValue,
        mortgageBalance: details.mortgageBalance,
        lastTransactionDate: transactions.length > 0 ? transactions[0].date : null,
        propertyType: details.propertyType,
        ownershipVerified: details.ownershipVerified || false,
        transactionHistory: transactions.slice(0, 5), // Last 5 transactions
        confidence,
        sources: ['property_api'],
        lastUpdated: new Date(),
        propertyId: primaryProperty.id,
        address: primaryProperty.address,
      };

    } catch (error) {
      console.error('Property data enrichment failed:', error);

      // Return partial data if available
      return {
        ...propertyData,
        error: error.message,
        confidence: 0,
        sources: ['error'],
      };
    }
  }

  /**
   * Search for properties associated with a lead
   * @private
   */
  async searchProperties(lead) {
    const searchCriteria = this.buildSearchCriteria(lead);
    const results = [];

    // Try primary provider first
    try {
      const primaryResults = await this.searchWithProvider(this.primaryProvider, searchCriteria);
      results.push(...primaryResults);
    } catch (error) {
      console.warn(`Primary provider ${this.primaryProvider} failed:`, error.message);
    }

    // If primary provider didn't return results, try secondary providers
    if (results.length === 0) {
      for (const [providerName, providerConfig] of Object.entries(this.providers)) {
        if (providerName !== this.primaryProvider) {
          try {
            const secondaryResults = await this.searchWithProvider(providerName, searchCriteria);
            results.push(...secondaryResults);
            if (results.length > 0) break; // Stop after finding results
          } catch (error) {
            console.warn(`Secondary provider ${providerName} failed:`, error.message);
          }
        }
      }
    }

    return this.deduplicateProperties(results);
  }

  /**
   * Search using a specific provider
   * @private
   */
  async searchWithProvider(providerName, criteria) {
    const provider = this.providers[providerName];
    if (!provider || !provider.apiKey) {
      throw new Error(`Provider ${providerName} not configured`);
    }

    const endpoint = provider.endpoints.search;
    const url = `${provider.baseUrl}${endpoint}`;

    const params = {
      ...criteria,
      api_key: provider.apiKey,
    };

    const response = await axios.get(url, {
      params,
      timeout: this.timeout,
      headers: {
        'User-Agent': 'RealEstateCRM-Enrichment/1.0',
        'Accept': 'application/json',
      },
    });

    return this.normalizeProviderResponse(providerName, response.data);
  }

  /**
   * Get detailed property information
   * @private
   */
  async getPropertyDetails(propertyId) {
    const provider = this.providers[this.primaryProvider];

    try {
      const endpoint = provider.endpoints.details.replace('{propertyId}', propertyId);
      const url = `${provider.baseUrl}${endpoint}`;

      const response = await axios.get(url, {
        params: { api_key: provider.apiKey },
        timeout: this.timeout,
      });

      return this.normalizePropertyDetails(this.primaryProvider, response.data);
    } catch (error) {
      console.warn('Property details fetch failed:', error.message);
      return {};
    }
  }

  /**
   * Get property transaction history
   * @private
   */
  async getTransactionHistory(propertyId) {
    const provider = this.providers.publicRecords;

    if (!provider || !provider.apiKey) {
      return []; // Return empty if public records not available
    }

    try {
      const url = `${provider.baseUrl}${provider.endpoints.transactions}`;

      const response = await axios.get(url, {
        params: {
          property_id: propertyId,
          api_key: provider.apiKey,
        },
        timeout: this.timeout,
      });

      return this.normalizeTransactionHistory(response.data);
    } catch (error) {
      console.warn('Transaction history fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Build search criteria from lead data
   * @private
   */
  buildSearchCriteria(lead) {
    const criteria = {};

    // Use lead's address if available
    if (lead.address) {
      const addressParts = this.parseAddress(lead.address);
      Object.assign(criteria, addressParts);
    }

    // Use lead's location preferences
    if (lead.location) {
      criteria.city = lead.location;
    }

    // Add name for ownership search
    if (lead.name) {
      const nameParts = this.parseName(lead.name);
      Object.assign(criteria, nameParts);
    }

    return criteria;
  }

  /**
   * Parse address into components
   * @private
   */
  parseAddress(address) {
    // Simple address parsing - in production, use a proper address parser
    const parts = address.split(',').map(part => part.trim());

    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      zip: parts[3] || '',
    };
  }

  /**
   * Parse name into components
   * @private
   */
  parseName(name) {
    const parts = name.split(' ').filter(part => part.length > 0);

    return {
      firstName: parts[0] || '',
      lastName: parts[parts.length - 1] || '',
      middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    };
  }

  /**
   * Normalize provider response to common format
   * @private
   */
  normalizeProviderResponse(providerName, data) {
    const normalized = [];

    switch (providerName) {
      case 'zillow':
        if (data?.response?.results) {
          data.response.results.forEach(result => {
            normalized.push({
              id: result.zpid,
              address: result.address,
              price: result.zestimate,
              confidence: 0.8,
            });
          });
        }
        break;

      case 'realtor':
        if (data?.properties) {
          data.properties.forEach(property => {
            normalized.push({
              id: property.id,
              address: property.address,
              price: property.price,
              confidence: 0.85,
            });
          });
        }
        break;

      case 'publicRecords':
        if (data?.properties) {
          data.properties.forEach(property => {
            normalized.push({
              id: property.propertyId,
              address: property.address,
              price: property.assessedValue,
              confidence: 0.9,
            });
          });
        }
        break;
    }

    return normalized;
  }

  /**
   * Normalize property details to common format
   * @private
   */
  normalizePropertyDetails(providerName, data) {
    const details = {};

    switch (providerName) {
      case 'zillow':
        if (data?.response) {
          const property = data.response;
          details.ownershipStatus = property.ownerName ? 'owned' : 'unknown';
          details.estimatedValue = property.zestimate;
          details.propertyType = property.useCode;
          details.ownershipVerified = !!property.ownerName;
        }
        break;

      case 'realtor':
        if (data?.property) {
          const property = data.property;
          details.ownershipStatus = property.ownership || 'unknown';
          details.estimatedValue = property.price;
          details.propertyType = property.propertyType;
          details.ownershipVerified = !!property.owner;
        }
        break;
    }

    return details;
  }

  /**
   * Normalize transaction history
   * @private
   */
  normalizeTransactionHistory(data) {
    const transactions = [];

    if (data?.transactions) {
      data.transactions.forEach(transaction => {
        transactions.push({
          date: transaction.date,
          type: transaction.type,
          amount: transaction.amount,
          buyer: transaction.buyer,
          seller: transaction.seller,
        });
      });
    }

    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Remove duplicate properties
   * @private
   */
  deduplicateProperties(properties) {
    const seen = new Set();
    return properties.filter(property => {
      const key = `${property.address?.street || ''}-${property.address?.city || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate confidence score for property data
   * @private
   */
  calculatePropertyConfidence(properties, details, transactions) {
    let confidence = 0;

    // Base confidence from number of properties found
    if (properties.length > 0) confidence += 0.3;
    if (properties.length > 1) confidence += 0.2;

    // Additional confidence from detailed data
    if (details.ownershipStatus) confidence += 0.2;
    if (details.estimatedValue) confidence += 0.15;
    if (details.ownershipVerified) confidence += 0.15;

    // Transaction history confidence
    if (transactions.length > 0) confidence += 0.1;
    if (transactions.length > 2) confidence += 0.1;

    return Math.min(confidence, 1.0);
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
        // Simple health check - try to make a basic request
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
    if (!provider || !provider.apiKey) return false;

    try {
      // Make a minimal request to test connectivity
      const response = await axios.get(`${provider.baseUrl}/health`, {
        timeout: 5000,
        params: { api_key: provider.apiKey },
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = PropertyDataProvider;