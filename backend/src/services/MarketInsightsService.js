const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

/**
 * Market Insights Service - Extracted from n8n market insights workflow
 * Handles property recommendations and market analysis
 */
class MarketInsightsService {
  constructor() {
    this.db = require('../config/database');
  }

  /**
   * Generate property recommendations for a lead
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} Property recommendations
   */
  async generatePropertyRecommendations(leadId) {
    try {
      logger.info('Generating property recommendations', { leadId });

      // Get lead details
      const leadQuery = `
        SELECT * FROM leads WHERE lead_id = $1
      `;
      const leadResult = await this.db.query(leadQuery, [leadId]);

      if (leadResult.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const lead = leadResult.rows[0];

      // Generate recommendations based on lead preferences
      const recommendations = this.generateRecommendationsFromLead(lead);

      // Generate market insights
      const marketInsights = this.generateMarketInsights(lead.desired_location || 'Toronto');

      // Log the recommendation generation
      await this.logRecommendationGeneration(leadId, recommendations.length);

      const result = {
        leadId,
        recommendations: recommendations.slice(0, 6), // Top 6
        marketInsights,
        personalizedTips: this.generatePersonalizedTips(lead),
        searchCriteria: {
          location: lead.desired_location || 'Toronto',
          propertyType: lead.property_type || 'House',
          minBedrooms: lead.bedrooms_min || 2,
          minBathrooms: lead.bathrooms_min || 1,
          maxBudget: lead.budget_max || 500000
        },
        lastUpdated: new Date().toISOString(),
        totalMatches: recommendations.length
      };

      logger.info('Property recommendations generated', {
        leadId,
        recommendationCount: result.recommendations.length,
        totalMatches: result.totalMatches
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.error('Error generating property recommendations', {
        leadId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to generate property recommendations: ${error.message}`);
    }
  }

  /**
   * Generate market insights for a location
   * @param {string} location - Location to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Market insights
   */
  async generateMarketInsights(location = 'Toronto', options = {}) {
    try {
      const { timeframe = '30days', propertyType } = options;

      logger.info('Generating market insights', { location, timeframe, propertyType });

      // Generate simulated market data (in production, this would query real estate APIs)
      const marketData = {
        location,
        reportDate: new Date().toISOString(),
        timeframe,

        // Overall market statistics
        overallStats: {
          totalActiveListings: Math.round(500 + Math.random() * 1000),
          newListingsThisMonth: Math.round(50 + Math.random() * 150),
          averageDaysOnMarket: Math.round(15 + Math.random() * 30),
          averagePrice: Math.round(450000 + Math.random() * 300000),
          medianPrice: Math.round(400000 + Math.random() * 250000),
          pricePerSqft: Math.round(400 + Math.random() * 300),
          inventoryLevel: Math.random() > 0.5 ? 'low' : Math.random() > 0.3 ? 'moderate' : 'high'
        },

        // Price trends
        priceTrends: {
          monthOverMonth: {
            change: Math.round((Math.random() * 10 - 3) * 10) / 10,
            direction: null
          },
          yearOverYear: {
            change: Math.round((Math.random() * 20 - 5) * 10) / 10,
            direction: null
          },
          forecast: {
            nextQuarter: Math.random() > 0.6 ? 'increasing' : Math.random() > 0.3 ? 'stable' : 'decreasing',
            confidence: Math.round(70 + Math.random() * 25)
          }
        },

        // Property type breakdown
        propertyTypes: [
          {
            type: 'House',
            averagePrice: Math.round(600000 + Math.random() * 400000),
            inventory: Math.round(100 + Math.random() * 200),
            daysOnMarket: Math.round(20 + Math.random() * 25)
          },
          {
            type: 'Condo',
            averagePrice: Math.round(350000 + Math.random() * 250000),
            inventory: Math.round(150 + Math.random() * 300),
            daysOnMarket: Math.round(15 + Math.random() * 20)
          },
          {
            type: 'Townhouse',
            averagePrice: Math.round(500000 + Math.random() * 300000),
            inventory: Math.round(80 + Math.random() * 150),
            daysOnMarket: Math.round(18 + Math.random() * 22)
          }
        ],

        // Neighborhood analysis
        neighborhoods: this.generateNeighborhoodData(location),

        // Market indicators
        indicators: {
          buyerDemand: Math.random() > 0.5 ? 'high' : Math.random() > 0.3 ? 'moderate' : 'low',
          sellerMotivation: Math.random() > 0.4 ? 'moderate' : Math.random() > 0.2 ? 'high' : 'low',
          competitionLevel: Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'moderate' : 'low',
          marketBalance: Math.random() > 0.5 ? 'seller_market' : Math.random() > 0.3 ? 'balanced' : 'buyer_market'
        },

        // Economic factors
        economicFactors: {
          interestRates: {
            current: Math.round((4 + Math.random() * 3) * 100) / 100,
            trend: Math.random() > 0.5 ? 'rising' : Math.random() > 0.3 ? 'stable' : 'falling'
          },
          employment: {
            rate: Math.round((92 + Math.random() * 6) * 10) / 10,
            trend: Math.random() > 0.6 ? 'improving' : 'stable'
          },
          populationGrowth: {
            rate: Math.round((1 + Math.random() * 2) * 10) / 10,
            impact: 'positive'
          }
        },

        // Seasonal factors
        seasonalFactors: {
          currentSeason: this.getCurrentSeason(),
          typicalActivity: null,
          buyerBehavior: null
        },

        // Recommendations
        recommendations: {
          forBuyers: [
            'Get pre-approved to act quickly on good properties',
            'Consider slightly expanding your search criteria',
            'Be prepared to make competitive offers in desirable areas',
            'Schedule viewings promptly for new listings'
          ],
          forSellers: [
            'Price competitively based on recent comparables',
            'Stage your home to stand out from competition',
            'Consider timing based on seasonal trends',
            'Highlight unique features and recent updates'
          ],
          timing: {
            bestTimeToList: 'Spring months typically see highest activity',
            bestTimeToBuy: 'Winter months may offer better negotiating power',
            marketCycle: Math.random() > 0.5 ? 'Currently in a seller market phase' : 'Currently in a buyer market phase'
          }
        }
      };

      // Set trend directions
      marketData.priceTrends.monthOverMonth.direction =
        marketData.priceTrends.monthOverMonth.change > 0 ? 'up' :
        marketData.priceTrends.monthOverMonth.change < 0 ? 'down' : 'stable';

      marketData.priceTrends.yearOverYear.direction =
        marketData.priceTrends.yearOverYear.change > 0 ? 'up' :
        marketData.priceTrends.yearOverYear.change < 0 ? 'down' : 'stable';

      // Set seasonal activity
      const season = marketData.seasonalFactors.currentSeason.name;
      const seasonalData = {
        spring: { activity: 'high', behavior: 'aggressive_buying' },
        summer: { activity: 'moderate', behavior: 'family_focused' },
        fall: { activity: 'moderate', behavior: 'strategic_buying' },
        winter: { activity: 'low', behavior: 'patient_shopping' }
      };

      marketData.seasonalFactors.typicalActivity = seasonalData[season]?.activity || 'moderate';
      marketData.seasonalFactors.buyerBehavior = seasonalData[season]?.behavior || 'strategic_buying';

      logger.info('Market insights generated', {
        location,
        timeframe,
        averagePrice: marketData.overallStats.averagePrice
      });

      return {
        success: true,
        data: marketData
      };

    } catch (error) {
      logger.error('Error generating market insights', {
        location,
        options,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to generate market insights: ${error.message}`);
    }
  }

  /**
   * Generate property recommendations based on lead preferences
   * @param {Object} lead - Lead data
   * @returns {Array} Property recommendations
   */
  generateRecommendationsFromLead(lead) {
    const basePrice = lead.budget_max || 500000;
    const location = lead.desired_location || 'Toronto';
    const propertyType = lead.property_type || 'House';
    const bedrooms = lead.bedrooms_min || 2;
    const bathrooms = lead.bathrooms_min || 1;

    const recommendations = [];
    const propertyTypes = ['House', 'Condo', 'Townhouse'];
    const neighborhoods = this.getNeighborhoodsForLocation(location);

    for (let i = 0; i < 8; i++) {
      const priceVariation = (Math.random() * 0.4 - 0.2); // ±20% price variation
      const price = Math.round(basePrice * (1 + priceVariation));
      const bedroomVariation = Math.floor(Math.random() * 2);
      const bathroomVariation = Math.round(Math.random() * 1.5 * 10) / 10;

      const property = {
        id: `prop-${Date.now()}-${i}`,
        address: `${100 + i * 50} ${['Main', 'Oak', 'Elm', 'Pine', 'Cedar'][i % 5]} Street`,
        neighborhood: neighborhoods[i % neighborhoods.length],
        city: location,
        price: price,
        propertyType: i % 3 === 0 ? propertyType : propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
        bedrooms: bedrooms + bedroomVariation,
        bathrooms: bathrooms + bathroomVariation,
        sqft: Math.round(800 + Math.random() * 1200),
        yearBuilt: Math.round(1980 + Math.random() * 43),
        daysOnMarket: Math.round(Math.random() * 60),
        features: [
          'Updated Kitchen',
          'Hardwood Floors',
          'Parking',
          'Garden',
          'Fireplace',
          'Walk-in Closet'
        ].sort(() => 0.5 - Math.random()).slice(0, 3 + Math.floor(Math.random() * 3)),
        matchScore: Math.round(60 + Math.random() * 35),
        pricePerSqft: 0,
        marketTrend: Math.random() > 0.5 ? 'increasing' : 'stable',
        virtualTourAvailable: Math.random() > 0.6,
        openHouseScheduled: Math.random() > 0.7
      };

      property.pricePerSqft = Math.round(property.price / property.sqft);

      // Add match reasoning
      const matchReasons = [];
      if (property.propertyType === lead.property_type) matchReasons.push('Matches preferred property type');
      if (property.bedrooms >= bedrooms) matchReasons.push('Meets bedroom requirements');
      if (property.bathrooms >= bathrooms) matchReasons.push('Meets bathroom requirements');
      if (property.price <= basePrice * 1.1) matchReasons.push('Within budget range');
      if (property.daysOnMarket < 30) matchReasons.push('Recently listed');

      property.matchReasons = matchReasons;
      recommendations.push(property);
    }

    // Sort by match score descending
    return recommendations.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Generate neighborhood data for a location
   * @param {string} location - Location name
   * @returns {Array} Neighborhood data
   */
  generateNeighborhoodData(location) {
    const baseNeighborhoods = {
      'Toronto': ['Downtown', 'Midtown', 'North York', 'Etobicoke', 'Scarborough'],
      'Vancouver': ['Downtown', 'West End', 'Kitsilano', 'Richmond', 'Burnaby'],
      'Montreal': ['Downtown', 'Plateau', 'Westmount', 'Outremont', 'NDG']
    };

    const neighborhoods = baseNeighborhoods[location] || ['Downtown', 'Suburb', 'Central'];

    return neighborhoods.map(name => ({
      name,
      averagePrice: Math.round(400000 + Math.random() * 400000),
      priceChange: Math.round((Math.random() * 12 - 2) * 10) / 10,
      walkScore: Math.round(80 + Math.random() * 20),
      schoolRating: Math.round(7 + Math.random() * 3),
      trend: Math.random() > 0.4 ? 'hot' : 'stable'
    }));
  }

  /**
   * Get neighborhoods for a location
   * @param {string} location - Location name
   * @returns {Array} Neighborhood names
   */
  getNeighborhoodsForLocation(location) {
    const neighborhoods = {
      'Toronto': ['Downtown', 'Midtown', 'North York', 'Etobicoke', 'Scarborough'],
      'Vancouver': ['Downtown', 'West End', 'Kitsilano', 'Richmond', 'Burnaby'],
      'Montreal': ['Downtown', 'Plateau', 'Westmount', 'Outremont', 'NDG']
    };

    return neighborhoods[location] || ['Downtown', 'Suburb', 'Central'];
  }

  /**
   * Generate personalized tips for a lead
   * @param {Object} lead - Lead data
   * @returns {Array} Personalized tips
   */
  generatePersonalizedTips(lead) {
    const tips = [];

    if (lead.budget_max && lead.budget_max > 600000) {
      tips.push('Consider luxury features and prime locations within your budget');
    }

    if (lead.priority === 'High') {
      tips.push('Act quickly on desirable properties - high competition expected');
    }

    if (!lead.phone_number) {
      tips.push('Provide phone contact for immediate notifications on new listings');
    }

    if (lead.property_type === 'Condo') {
      tips.push('Consider amenities, maintenance fees, and building age for condos');
    }

    if (lead.bedrooms_min && lead.bedrooms_min >= 4) {
      tips.push('Look for properties with flexible floor plans for larger families');
    }

    return tips;
  }

  /**
   * Get current season information
   * @returns {Object} Season data
   */
  getCurrentSeason() {
    const month = new Date().getMonth();
    const seasons = {
      spring: [2, 3, 4],
      summer: [5, 6, 7],
      fall: [8, 9, 10],
      winter: [11, 0, 1]
    };

    const seasonName = Object.keys(seasons).find(season =>
      seasons[season].includes(month)
    ) || 'spring';

    return {
      name: seasonName,
      month: month + 1
    };
  }

  /**
   * Log recommendation generation activity
   * @param {number} leadId - Lead ID
   * @param {number} recommendationCount - Number of recommendations generated
   * @returns {Promise<void>}
   */
  async logRecommendationGeneration(leadId, recommendationCount) {
    try {
      const query = `
        INSERT INTO interactions (lead_id, user_id, type, content, interaction_date, created_at)
        VALUES ($1, 1, 'System Generated', $2, NOW(), NOW())
      `;

      const content = `AI Property Recommendations Generated\n\nTotal Recommendations: ${recommendationCount}\nGenerated at: ${new Date().toISOString()}`;

      await this.db.query(query, [leadId, content]);

      logger.debug('Recommendation generation logged', { leadId, recommendationCount });

    } catch (error) {
      logger.error('Error logging recommendation generation', {
        leadId,
        recommendationCount,
        error: error.message
      });
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Get market trends for a location
   * @param {string} location - Location to analyze
   * @param {string} timeframe - Analysis timeframe
   * @returns {Promise<Object>} Market trends
   */
  async getMarketTrends(location = 'Toronto', timeframe = 'month') {
    try {
      logger.info('Getting market trends', { location, timeframe });

      // Get basic market insights
      const insightsResult = await this.generateMarketInsights(location, { timeframe });

      if (!insightsResult.success) {
        throw new Error('Failed to generate market insights');
      }

      const trends = {
        location,
        timeframe,
        priceTrends: insightsResult.data.priceTrends,
        marketIndicators: insightsResult.data.indicators,
        seasonalFactors: insightsResult.data.seasonalFactors,
        recommendations: insightsResult.data.recommendations,
        generatedAt: new Date().toISOString()
      };

      logger.info('Market trends retrieved', {
        location,
        timeframe,
        trend: trends.priceTrends.monthOverMonth.direction
      });

      return {
        success: true,
        data: trends
      };

    } catch (error) {
      logger.error('Error getting market trends', {
        location,
        timeframe,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get market trends: ${error.message}`);
    }
  }
}

module.exports = new MarketInsightsService();