const axios = require('axios');
const EnrichmentProvider = require('../EnrichmentProvider');

class SocialMediaProvider extends EnrichmentProvider {
  constructor(config = {}) {
    super({
      rateLimit: config.rateLimit || 30, // requests per minute (LinkedIn limit)
      ...config,
    });

    this.providers = {
      linkedin: {
        baseUrl: 'https://api.linkedin.com/v2',
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        endpoints: {
          people: '/people/(id:{personId})',
          search: '/people-search',
          organizations: '/organizations/{organizationId}',
        },
      },
      fullcontact: {
        baseUrl: 'https://api.fullcontact.com/v3',
        apiKey: process.env.FULLCONTACT_API_KEY,
        endpoints: {
          person: '/person.enrich',
          company: '/company.enrich',
        },
      },
      hunter: {
        baseUrl: 'https://api.hunter.io/v2',
        apiKey: process.env.HUNTER_API_KEY,
        endpoints: {
          email: '/email-verifier',
          domain: '/domain-search',
        },
      },
      clearbit: {
        baseUrl: 'https://person.clearbit.com/v2',
        apiKey: process.env.CLEARBIT_API_KEY,
        endpoints: {
          person: '/people/find',
          company: '/companies/find',
        },
      },
    };

    this.primaryProvider = config.primaryProvider || 'linkedin';
    this.accessTokens = new Map(); // Cache access tokens
  }

  async doEnrich(lead) {
    const socialData = {
      linkedinProfile: null,
      professionalTitle: null,
      company: null,
      industry: null,
      connections: null,
      emailVerified: false,
      profileVerified: false,
      socialProfiles: [],
      confidence: 0,
      sources: [],
      lastUpdated: new Date(),
    };

    try {
      // Step 1: Try LinkedIn enrichment first
      const linkedinData = await this.enrichFromLinkedIn(lead);
      if (linkedinData) {
        Object.assign(socialData, linkedinData);
        socialData.sources.push('linkedin');
      }

      // Step 2: Try additional social data providers
      const additionalData = await this.enrichFromAdditionalProviders(lead);
      if (additionalData) {
        this.mergeSocialData(socialData, additionalData);
        socialData.sources.push(...additionalData.sources);
      }

      // Step 3: Calculate overall confidence
      socialData.confidence = this.calculateSocialConfidence(socialData);

      return socialData;

    } catch (error) {
      console.error('Social media enrichment failed:', error);

      return {
        ...socialData,
        error: error.message,
        confidence: 0,
        sources: ['error'],
      };
    }
  }

  /**
   * Enrich data from LinkedIn
   * @private
   */
  async enrichFromLinkedIn(lead) {
    const linkedin = this.providers.linkedin;
    if (!linkedin.clientId || !linkedin.clientSecret) {
      return null;
    }

    try {
      // Get access token
      const accessToken = await this.getLinkedInAccessToken();

      // Search for person
      const searchResults = await this.searchLinkedInPeople(lead, accessToken);

      if (searchResults.length === 0) {
        return null;
      }

      // Get detailed profile for the best match
      const personId = searchResults[0].id;
      const profile = await this.getLinkedInProfile(personId, accessToken);

      return {
        linkedinProfile: `https://linkedin.com/in/${profile.vanityName || personId}`,
        professionalTitle: profile.headline,
        company: profile.positions?.[0]?.companyName,
        industry: profile.industry,
        connections: profile.numConnections || 0,
        profileVerified: true,
        location: profile.location,
        experience: profile.positions?.slice(0, 3), // Last 3 positions
        education: profile.educations?.slice(0, 2), // Last 2 education entries
      };

    } catch (error) {
      console.warn('LinkedIn enrichment failed:', error.message);
      return null;
    }
  }

  /**
   * Get LinkedIn access token
   * @private
   */
  async getLinkedInAccessToken() {
    const cacheKey = 'linkedin_access_token';
    let token = this.accessTokens.get(cacheKey);

    if (token && token.expiresAt > new Date()) {
      return token.accessToken;
    }

    const linkedin = this.providers.linkedin;
    const auth = Buffer.from(`${linkedin.clientId}:${linkedin.clientSecret}`).toString('base64');

    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'client_credentials',
        scope: 'r_liteprofile,r_emailaddress',
      },
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    });

    token = {
      accessToken: response.data.access_token,
      expiresAt: new Date(Date.now() + (response.data.expires_in * 1000)),
    };

    this.accessTokens.set(cacheKey, token);
    return token.accessToken;
  }

  /**
   * Search for people on LinkedIn
   * @private
   */
  async searchLinkedInPeople(lead, accessToken) {
    const linkedin = this.providers.linkedin;

    const searchParams = {
      keywords: lead.name,
      facets: ['people'],
    };

    // Add email if available
    if (lead.email) {
      searchParams.email = lead.email;
    }

    const response = await axios.get(`${linkedin.baseUrl}${linkedin.endpoints.search}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      params: searchParams,
      timeout: 10000,
    });

    return response.data.elements || [];
  }

  /**
   * Get LinkedIn profile details
   * @private
   */
  async getLinkedInProfile(personId, accessToken) {
    const linkedin = this.providers.linkedin;

    const response = await axios.get(
      `${linkedin.baseUrl}${linkedin.endpoints.people.replace('{personId}', personId)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        params: {
          projection: '(id,vanityName,headline,industry,location,positions,educations,numConnections)',
        },
        timeout: 10000,
      }
    );

    return response.data;
  }

  /**
   * Enrich from additional social data providers
   * @private
   */
  async enrichFromAdditionalProviders(lead) {
    const additionalData = {
      emailVerified: false,
      socialProfiles: [],
      sources: [],
    };

    // Try FullContact for comprehensive person data
    const fullcontactData = await this.enrichFromFullContact(lead);
    if (fullcontactData) {
      Object.assign(additionalData, fullcontactData);
      additionalData.sources.push('fullcontact');
    }

    // Try Hunter.io for email verification
    const hunterData = await this.enrichFromHunter(lead);
    if (hunterData) {
      Object.assign(additionalData, hunterData);
      additionalData.sources.push('hunter');
    }

    // Try Clearbit for professional data
    const clearbitData = await this.enrichFromClearbit(lead);
    if (clearbitData) {
      Object.assign(additionalData, clearbitData);
      additionalData.sources.push('clearbit');
    }

    return Object.keys(additionalData).length > 2 ? additionalData : null;
  }

  /**
   * Enrich from FullContact
   * @private
   */
  async enrichFromFullContact(lead) {
    const fullcontact = this.providers.fullcontact;
    if (!fullcontact.apiKey) return null;

    try {
      const response = await axios.post(
        `${fullcontact.baseUrl}${fullcontact.endpoints.person}`,
        {
          email: lead.email,
          name: lead.name,
        },
        {
          headers: {
            'Authorization': `Bearer ${fullcontact.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      return {
        emailVerified: data.contactInfo?.email?.isValid || false,
        socialProfiles: data.socialProfiles || [],
        location: data.demographics?.location,
        bio: data.bio,
        website: data.contactInfo?.websites?.[0]?.url,
      };
    } catch (error) {
      console.warn('FullContact enrichment failed:', error.message);
      return null;
    }
  }

  /**
   * Enrich from Hunter.io
   * @private
   */
  async enrichFromHunter(lead) {
    const hunter = this.providers.hunter;
    if (!hunter.apiKey || !lead.email) return null;

    try {
      const response = await axios.get(
        `${hunter.baseUrl}${hunter.endpoints.email}`,
        {
          params: {
            email: lead.email,
            api_key: hunter.apiKey,
          },
          timeout: 10000,
        }
      );

      const data = response.data.data;
      return {
        emailVerified: data.result === 'deliverable',
        emailScore: data.score,
        domainStatus: data.disposable ? 'disposable' : 'valid',
        mxRecords: data.mx_records || [],
      };
    } catch (error) {
      console.warn('Hunter.io enrichment failed:', error.message);
      return null;
    }
  }

  /**
   * Enrich from Clearbit
   * @private
   */
  async enrichFromClearbit(lead) {
    const clearbit = this.providers.clearbit;
    if (!clearbit.apiKey || !lead.email) return null;

    try {
      const response = await axios.get(
        `${clearbit.baseUrl}${clearbit.endpoints.person}`,
        {
          params: {
            email: lead.email,
          },
          headers: {
            'Authorization': `Bearer ${clearbit.apiKey}`,
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      return {
        clearbitProfile: data,
        employment: data.employment,
        company: data.company,
        linkedin: data.linkedin,
        twitter: data.twitter,
        github: data.github,
      };
    } catch (error) {
      console.warn('Clearbit enrichment failed:', error.message);
      return null;
    }
  }

  /**
   * Merge social data from multiple sources
   * @private
   */
  mergeSocialData(primaryData, additionalData) {
    // Merge social profiles
    if (additionalData.socialProfiles) {
      primaryData.socialProfiles = [
        ...(primaryData.socialProfiles || []),
        ...additionalData.socialProfiles,
      ];
    }

    // Use best available data for each field
    if (!primaryData.emailVerified && additionalData.emailVerified) {
      primaryData.emailVerified = additionalData.emailVerified;
    }

    if (!primaryData.company && additionalData.company) {
      primaryData.company = additionalData.company;
    }

    if (!primaryData.location && additionalData.location) {
      primaryData.location = additionalData.location;
    }

    // Add any additional fields
    Object.keys(additionalData).forEach(key => {
      if (!primaryData[key] && key !== 'sources') {
        primaryData[key] = additionalData[key];
      }
    });
  }

  /**
   * Calculate confidence score for social data
   * @private
   */
  calculateSocialConfidence(socialData) {
    let confidence = 0;

    // LinkedIn profile provides highest confidence
    if (socialData.linkedinProfile) confidence += 0.4;

    // Professional title and company add confidence
    if (socialData.professionalTitle) confidence += 0.15;
    if (socialData.company) confidence += 0.15;

    // Verified email adds confidence
    if (socialData.emailVerified) confidence += 0.1;

    // Multiple social profiles add confidence
    if (socialData.socialProfiles && socialData.socialProfiles.length > 0) {
      confidence += Math.min(socialData.socialProfiles.length * 0.05, 0.15);
    }

    // Profile verification adds confidence
    if (socialData.profileVerified) confidence += 0.1;

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
      let testParams = {};

      switch (providerName) {
        case 'linkedin':
          if (!provider.clientId) return false;
          // Test token generation
          return true; // Assume healthy if credentials are configured

        case 'fullcontact':
          if (!provider.apiKey) return false;
          testEndpoint = `${provider.baseUrl}/stats`;
          break;

        case 'hunter':
          if (!provider.apiKey) return false;
          testEndpoint = `${provider.baseUrl}/account`;
          testParams = { api_key: provider.apiKey };
          break;

        case 'clearbit':
          if (!provider.apiKey) return false;
          testEndpoint = `${provider.baseUrl}/people/find`;
          testParams = { email: 'test@example.com' };
          break;

        default:
          return false;
      }

      if (testEndpoint) {
        const response = await axios.get(testEndpoint, {
          params: testParams,
          headers: provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {},
          timeout: 5000,
        });
        return response.status === 200;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = SocialMediaProvider;