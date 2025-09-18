const express = require('express');
const { extractUserFromToken } = require('../middleware/jwtExtractor');
const MarketInsightsService = require('../services/MarketInsightsService');
const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

const router = express.Router();

// All routes require authentication
router.use(extractUserFromToken);

/**
 * POST /api/market-insights/leads/:leadId/recommendations
 * Generate property recommendations for a lead
 * Replaces n8n market insights workflow
 */
router.post('/leads/:leadId/recommendations', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.userId;

    logger.info('Generate property recommendations request', {
      leadId: parseInt(leadId),
      userId
    });

    const result = await MarketInsightsService.generatePropertyRecommendations(parseInt(leadId));

    if (result.success) {
      sendResponse(res, result.data, 'Property recommendations generated successfully');
    } else {
      sendError(res, 'Failed to generate property recommendations', 'RECOMMENDATIONS_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Generate property recommendations error', {
      leadId: req.params.leadId,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to generate property recommendations', 'RECOMMENDATIONS_ERROR', null, 500);
  }
});

/**
 * GET /api/market-insights/market
 * Get market insights for a location
 * Replaces n8n market insights workflow
 */
router.get('/market', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { location = 'Toronto', timeframe = '30days', propertyType } = req.query;

    logger.info('Get market insights request', {
      userId,
      location,
      timeframe,
      propertyType
    });

    const result = await MarketInsightsService.generateMarketInsights(location, {
      timeframe,
      propertyType
    });

    if (result.success) {
      sendResponse(res, result.data, 'Market insights retrieved successfully');
    } else {
      sendError(res, 'Failed to get market insights', 'MARKET_INSIGHTS_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get market insights error', {
      userId: req.user?.userId,
      location: req.query.location,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get market insights', 'MARKET_INSIGHTS_ERROR', null, 500);
  }
});

/**
 * GET /api/market-insights/trends
 * Get market trends for a location
 */
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { location = 'Toronto', timeframe = 'month' } = req.query;

    logger.info('Get market trends request', {
      userId,
      location,
      timeframe
    });

    const result = await MarketInsightsService.getMarketTrends(location, timeframe);

    if (result.success) {
      sendResponse(res, result.data, 'Market trends retrieved successfully');
    } else {
      sendError(res, 'Failed to get market trends', 'TRENDS_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get market trends error', {
      userId: req.user?.userId,
      location: req.query.location,
      timeframe: req.query.timeframe,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get market trends', 'TRENDS_ERROR', null, 500);
  }
});

/**
 * GET /api/market-insights/comparison
 * Compare market data between locations
 */
router.get('/comparison', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { locations = 'Toronto,Vancouver', timeframe = 'month' } = req.query;
    const locationList = locations.split(',').map(loc => loc.trim());

    logger.info('Get market comparison request', {
      userId,
      locations: locationList,
      timeframe
    });

    // Get insights for each location
    const comparisonPromises = locationList.map(location =>
      MarketInsightsService.generateMarketInsights(location, { timeframe })
    );

    const results = await Promise.all(comparisonPromises);

    if (results.every(result => result.success)) {
      const comparison = {
        locations: locationList,
        timeframe,
        comparison: results.map((result, index) => ({
          location: locationList[index],
          averagePrice: result.data.overallStats.averagePrice,
          pricePerSqft: result.data.overallStats.pricePerSqft,
          inventoryLevel: result.data.overallStats.inventoryLevel,
          marketTrend: result.data.priceTrends.monthOverMonth.direction,
          buyerDemand: result.data.indicators.buyerDemand,
          competitionLevel: result.data.indicators.competitionLevel
        })),
        generatedAt: new Date().toISOString()
      };

      sendResponse(res, comparison, 'Market comparison retrieved successfully');
    } else {
      sendError(res, 'Failed to get market comparison', 'COMPARISON_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get market comparison error', {
      userId: req.user?.userId,
      locations: req.query.locations,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get market comparison', 'COMPARISON_ERROR', null, 500);
  }
});

/**
 * GET /api/market-insights/leads/:leadId/market-analysis
 * Get market analysis specific to a lead's preferences
 */
router.get('/leads/:leadId/market-analysis', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.userId;

    logger.info('Get lead market analysis request', {
      leadId: parseInt(leadId),
      userId
    });

    // Get lead details first
    const leadQuery = `
      SELECT desired_location, budget_max, property_type
      FROM leads WHERE lead_id = $1
    `;
    const leadResult = await require('../config/database').query(leadQuery, [parseInt(leadId)]);

    if (leadResult.rows.length === 0) {
      return sendError(res, 'Lead not found', 'LEAD_NOT_FOUND', null, 404);
    }

    const lead = leadResult.rows[0];

    // Get market insights for the lead's location
    const insightsResult = await MarketInsightsService.generateMarketInsights(
      lead.desired_location || 'Toronto',
      { timeframe: 'month' }
    );

    if (insightsResult.success) {
      // Add lead-specific analysis
      const analysis = {
        leadId: parseInt(leadId),
        leadPreferences: {
          location: lead.desired_location,
          maxBudget: lead.budget_max,
          propertyType: lead.property_type
        },
        marketInsights: insightsResult.data,
        affordabilityAnalysis: {
          budgetVsAverage: lead.budget_max
            ? Math.round((lead.budget_max / insightsResult.data.overallStats.averagePrice) * 100)
            : null,
          marketPosition: this.getMarketPosition(lead.budget_max, insightsResult.data.overallStats.averagePrice),
          recommendations: this.generateAffordabilityRecommendations(lead, insightsResult.data)
        },
        generatedAt: new Date().toISOString()
      };

      sendResponse(res, analysis, 'Lead market analysis retrieved successfully');
    } else {
      sendError(res, 'Failed to get lead market analysis', 'ANALYSIS_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get lead market analysis error', {
      leadId: req.params.leadId,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get lead market analysis', 'ANALYSIS_ERROR', null, 500);
  }
});

/**
 * Get market position based on budget vs average price
 * @param {number} budget - Lead's budget
 * @param {number} averagePrice - Market average price
 * @returns {string} Market position
 */
function getMarketPosition(budget, averagePrice) {
  if (!budget || !averagePrice) return 'unknown';

  const ratio = budget / averagePrice;
  if (ratio >= 1.2) return 'above_average';
  if (ratio >= 0.8) return 'average';
  return 'below_average';
}

/**
 * Generate affordability recommendations
 * @param {Object} lead - Lead data
 * @param {Object} marketData - Market data
 * @returns {Array} Recommendations
 */
function generateAffordabilityRecommendations(lead, marketData) {
  const recommendations = [];

  if (lead.budget_max && marketData.overallStats.averagePrice) {
    const ratio = lead.budget_max / marketData.overallStats.averagePrice;

    if (ratio < 0.8) {
      recommendations.push('Consider expanding your search to nearby areas with lower prices');
      recommendations.push('Look for properties that need updating to get better value');
    } else if (ratio > 1.2) {
      recommendations.push('You have flexibility to consider premium locations or features');
      recommendations.push('Consider properties with recent updates or luxury amenities');
    }
  }

  if (marketData.indicators.competitionLevel === 'high') {
    recommendations.push('Act quickly on desirable properties - high competition expected');
  }

  if (marketData.priceTrends.monthOverMonth.direction === 'up') {
    recommendations.push('Prices are trending up - consider making offers sooner');
  }

  return recommendations;
}

/**
 * GET /api/market-insights/report
 * Generate a comprehensive market report
 */
router.get('/report', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { location = 'Toronto', timeframe = 'month', includeRecommendations = 'true' } = req.query;

    logger.info('Generate market report request', {
      userId,
      location,
      timeframe,
      includeRecommendations: includeRecommendations === 'true'
    });

    // Get market insights
    const insightsResult = await MarketInsightsService.generateMarketInsights(location, { timeframe });

    if (!insightsResult.success) {
      return sendError(res, 'Failed to generate market report', 'REPORT_ERROR', null, 500);
    }

    // Get market trends
    const trendsResult = await MarketInsightsService.getMarketTrends(location, timeframe);

    const report = {
      location,
      timeframe,
      reportType: 'comprehensive_market_analysis',
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      sections: {
        marketOverview: insightsResult.data.overallStats,
        priceTrends: insightsResult.data.priceTrends,
        propertyTypes: insightsResult.data.propertyTypes,
        neighborhoods: insightsResult.data.neighborhoods,
        marketIndicators: insightsResult.data.indicators,
        economicFactors: insightsResult.data.economicFactors,
        seasonalFactors: insightsResult.data.seasonalFactors
      }
    };

    if (includeRecommendations === 'true') {
      report.sections.recommendations = insightsResult.data.recommendations;
    }

    if (trendsResult.success) {
      report.sections.marketTrends = trendsResult.data;
    }

    sendResponse(res, report, 'Market report generated successfully');

  } catch (error) {
    logger.error('Generate market report error', {
      userId: req.user?.userId,
      location: req.query.location,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to generate market report', 'REPORT_ERROR', null, 500);
  }
});

module.exports = router;