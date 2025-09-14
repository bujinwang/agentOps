// Market Analytics Service
// Advanced market analysis including trends, forecasting, and economic indicators

import {
  MarketTrend,
  MarketTimeframe,
  CMAMetricType,
  NeighborhoodAnalysis,
  MarketForecast,
  CMAAPIResponse,
} from '../types/cma';

class MarketAnalyticsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:5678/webhook';
  }

  /**
   * Get comprehensive market trends analysis
   */
  async getMarketTrendsAnalysis(
    location: {
      latitude: number;
      longitude: number;
      radius?: number;
    },
    metrics: CMAMetricType[] = ['price_per_sqft', 'total_price'],
    timeframes: MarketTimeframe[] = ['1_month', '3_months', '6_months', '1_year']
  ): Promise<CMAAPIResponse<{
    trends: MarketTrend[];
    analysis: {
      overall_direction: 'up' | 'down' | 'stable' | 'volatile';
      confidence_level: 'low' | 'medium' | 'high';
      key_insights: string[];
      seasonal_patterns: any;
      cyclical_analysis: any;
    };
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/market/analytics/trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          metrics,
          timeframes,
        }),
      });

      const result = await this.handleResponse<{
        trends: MarketTrend[];
        analysis: any;
      }>(response);

      if (result.success && result.data) {
        // Enhance analysis with additional insights
        result.data.analysis = {
          ...result.data.analysis,
          seasonal_patterns: this.analyzeSeasonalPatterns(result.data.trends),
          cyclical_analysis: this.analyzeMarketCycles(result.data.trends),
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MARKET_ANALYTICS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get market trends analysis',
          details: error,
        },
      };
    }
  }

  /**
   * Generate neighborhood market report
   */
  async generateNeighborhoodReport(
    location: {
      latitude: number;
      longitude: number;
    },
    propertyType?: string
  ): Promise<CMAAPIResponse<{
    neighborhood: NeighborhoodAnalysis;
    market_report: {
      summary: string;
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
      comparables_summary: any;
      demographic_insights: any;
      amenity_analysis: any;
    };
  }>> {
    try {
      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        property_type: propertyType || '',
      });

      const response = await fetch(`${this.baseUrl}/api/market/analytics/neighborhood?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await this.handleResponse<{
        neighborhood: NeighborhoodAnalysis;
        market_report: any;
      }>(response);

      if (result.success && result.data) {
        // Enhance with SWOT analysis
        result.data.market_report = {
          ...result.data.market_report,
          ...this.generateSWOTAnalysis(result.data.neighborhood, result.data.market_report),
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NEIGHBORHOOD_REPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate neighborhood report',
          details: error,
        },
      };
    }
  }

  /**
   * Get seasonal market analysis
   */
  async getSeasonalAnalysis(
    location: {
      latitude: number;
      longitude: number;
      radius?: number;
    },
    years: number = 3
  ): Promise<CMAAPIResponse<{
    seasonal_patterns: {
      peak_season: {
        months: number[];
        average_performance: number;
        best_month: number;
      };
      off_season: {
        months: number[];
        average_performance: number;
        worst_month: number;
      };
      seasonal_adjustments: {
        [month: number]: number; // percentage adjustment
      };
    };
    historical_data: {
      year: number;
      monthly_performance: number[];
      seasonal_index: number[];
    }[];
    insights: string[];
  }>> {
    try {
      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        radius: (location.radius || 5).toString(),
        years: years.toString(),
      });

      const response = await fetch(`${this.baseUrl}/api/market/analytics/seasonal?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse<{
        seasonal_patterns: any;
        historical_data: any[];
        insights: string[];
      }>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEASONAL_ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get seasonal analysis',
          details: error,
        },
      };
    }
  }

  /**
   * Generate market forecast with economic indicators
   */
  async generateMarketForecast(
    location: {
      latitude: number;
      longitude: number;
      radius?: number;
    },
    forecastPeriodMonths: number = 12
  ): Promise<CMAAPIResponse<{
    forecast: MarketForecast;
    economic_indicators: {
      interest_rates: {
        current: number;
        predicted: number[];
        impact: 'low' | 'medium' | 'high';
      };
      employment: {
        current_rate: number;
        trend: 'improving' | 'declining' | 'stable';
        forecast: number[];
      };
      population_growth: {
        current_rate: number;
        forecast: number[];
        impact_on_housing: 'positive' | 'negative' | 'neutral';
      };
      economic_growth: {
        gdp_growth: number;
        forecast: number[];
        housing_impact: number;
      };
    };
    risk_assessment: {
      overall_risk: 'low' | 'medium' | 'high';
      risk_factors: {
        name: string;
        probability: number;
        impact: number;
        mitigation: string;
      }[];
    };
    scenarios: {
      optimistic: MarketForecast;
      pessimistic: MarketForecast;
      baseline: MarketForecast;
    };
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/market/analytics/forecast`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          location,
          forecast_period_months: forecastPeriodMonths,
        }),
      });

      const result = await this.handleResponse<{
        forecast: MarketForecast;
        economic_indicators: any;
        risk_assessment: any;
        scenarios: any;
      }>(response);

      if (result.success && result.data) {
        // Enhance with scenario analysis
        result.data.scenarios = this.generateForecastScenarios(result.data.forecast);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FORECAST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate market forecast',
          details: error,
        },
      };
    }
  }

  /**
   * Get economic indicators and market drivers
   */
  async getEconomicIndicators(
    location: {
      latitude: number;
      longitude: number;
    },
    includeNational: boolean = true,
    includeRegional: boolean = true
  ): Promise<CMAAPIResponse<{
    national_indicators: {
      interest_rates: number;
      inflation_rate: number;
      unemployment_rate: number;
      gdp_growth: number;
      housing_starts: number;
      building_permits: number;
    };
    regional_indicators: {
      state_unemployment: number;
      state_gdp_growth: number;
      local_housing_starts: number;
      local_population_growth: number;
    };
    market_drivers: {
      name: string;
      current_value: number;
      trend: 'up' | 'down' | 'stable';
      impact_on_housing: 'positive' | 'negative' | 'neutral';
      strength: 'weak' | 'moderate' | 'strong';
    }[];
    analysis: {
      overall_market_sentiment: 'bullish' | 'bearish' | 'neutral';
      key_drivers: string[];
      risks: string[];
      opportunities: string[];
    };
  }>> {
    try {
      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        include_national: includeNational.toString(),
        include_regional: includeRegional.toString(),
      });

      const response = await fetch(`${this.baseUrl}/api/market/analytics/economic?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await this.handleResponse<{
        national_indicators: any;
        regional_indicators: any;
        market_drivers: any[];
        analysis: any;
      }>(response);

      if (result.success && result.data) {
        // Enhance with market sentiment analysis
        result.data.analysis = {
          ...result.data.analysis,
          overall_market_sentiment: this.calculateMarketSentiment(result.data),
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ECONOMIC_INDICATORS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get economic indicators',
          details: error,
        },
      };
    }
  }

  // Helper methods
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<CMAAPIResponse<T>> {
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse the error response, use the default message
      }

      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: errorMessage,
          details: { status: response.status },
        },
      };
    }

    try {
      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse response',
          details: e,
        },
      };
    }
  }

  private analyzeSeasonalPatterns(trends: MarketTrend[]): any {
    // Group trends by month
    const monthlyData: { [month: number]: number[] } = {};

    trends.forEach(trend => {
      const month = new Date().getMonth(); // Simplified - would need actual date from trend
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(trend.current_value);
    });

    // Calculate seasonal indices
    const monthlyAverages = Object.keys(monthlyData).map(month => ({
      month: parseInt(month),
      average: monthlyData[parseInt(month)].reduce((a, b) => a + b, 0) / monthlyData[parseInt(month)].length,
    }));

    const overallAverage = monthlyAverages.reduce((sum, m) => sum + m.average, 0) / monthlyAverages.length;

    const seasonalIndices = monthlyAverages.map(m => ({
      month: m.month,
      index: (m.average / overallAverage) * 100,
    }));

    return {
      monthly_averages: monthlyAverages,
      seasonal_indices: seasonalIndices,
      peak_months: seasonalIndices.filter(s => s.index > 110).map(s => s.month),
      low_months: seasonalIndices.filter(s => s.index < 90).map(s => s.month),
    };
  }

  private analyzeMarketCycles(trends: MarketTrend[]): any {
    // Simplified cycle analysis
    const values = trends.map(t => t.current_value);
    const smoothed = this.simpleMovingAverage(values, 3);

    const cycles = [];
    let currentCycle = { start: 0, direction: 'up' as 'up' | 'down', length: 0 };

    for (let i = 1; i < smoothed.length; i++) {
      const direction = smoothed[i] > smoothed[i - 1] ? 'up' : 'down';

      if (direction !== currentCycle.direction) {
        currentCycle.length = i - currentCycle.start;
        cycles.push({ ...currentCycle });
        currentCycle = { start: i, direction, length: 0 };
      }
    }

    return {
      detected_cycles: cycles,
      average_cycle_length: cycles.reduce((sum, c) => sum + c.length, 0) / cycles.length,
      current_phase: currentCycle.direction,
    };
  }

  private simpleMovingAverage(data: number[], window: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const end = i + 1;
      const sum = data.slice(start, end).reduce((a, b) => a + b, 0);
      result.push(sum / (end - start));
    }

    return result;
  }

  private generateSWOTAnalysis(neighborhood: NeighborhoodAnalysis, marketReport: any): any {
    const strengths = [];
    const weaknesses = [];
    const opportunities = [];
    const threats = [];

    // Analyze neighborhood data for SWOT
    if (neighborhood.market_metrics.average_price_per_sqft > 200) {
      strengths.push('High-value neighborhood with premium pricing');
    }

    if (neighborhood.amenities.schools.length > 0) {
      const avgRating = neighborhood.amenities.schools.reduce((sum, s) => sum + s.rating, 0) / neighborhood.amenities.schools.length;
      if (avgRating > 7) {
        strengths.push('Excellent school district');
      }
    }

    if (neighborhood.market_metrics.average_days_on_market < 30) {
      opportunities.push('Fast-selling market indicates high demand');
    }

    return {
      strengths,
      weaknesses,
      opportunities,
      threats,
    };
  }

  private generateForecastScenarios(baseline: MarketForecast): any {
    const optimistic: MarketForecast = {
      ...baseline,
      price_projection: {
        ...baseline.price_projection,
        expected_change_percentage: baseline.price_projection.expected_change_percentage * 1.5,
        confidence_interval: {
          low: baseline.price_projection.confidence_interval.low * 1.2,
          high: baseline.price_projection.confidence_interval.high * 1.8,
        },
      },
    };

    const pessimistic: MarketForecast = {
      ...baseline,
      price_projection: {
        ...baseline.price_projection,
        expected_change_percentage: baseline.price_projection.expected_change_percentage * 0.5,
        confidence_interval: {
          low: baseline.price_projection.confidence_interval.low * 0.8,
          high: baseline.price_projection.confidence_interval.high * 0.6,
        },
      },
    };

    return {
      optimistic,
      pessimistic,
      baseline,
    };
  }

  private calculateMarketSentiment(data: any): 'bullish' | 'bearish' | 'neutral' {
    let bullishScore = 0;
    let bearishScore = 0;

    // Analyze economic indicators
    if (data.economic_indicators) {
      if (data.economic_indicators.interest_rates.predicted[0] < data.economic_indicators.interest_rates.current) {
        bullishScore += 2;
      } else {
        bearishScore += 1;
      }

      if (data.economic_indicators.employment.trend === 'improving') {
        bullishScore += 2;
      } else if (data.economic_indicators.employment.trend === 'declining') {
        bearishScore += 2;
      }

      if (data.economic_indicators.economic_growth.gdp_growth > 2) {
        bullishScore += 1;
      }
    }

    // Analyze market drivers
    if (data.market_drivers) {
      data.market_drivers.forEach((driver: any) => {
        if (driver.impact_on_housing === 'positive' && driver.strength === 'strong') {
          bullishScore += 1;
        } else if (driver.impact_on_housing === 'negative' && driver.strength === 'strong') {
          bearishScore += 1;
        }
      });
    }

    if (bullishScore > bearishScore + 1) return 'bullish';
    if (bearishScore > bullishScore + 1) return 'bearish';
    return 'neutral';
  }
}

// Export singleton instance
export const marketAnalyticsService = new MarketAnalyticsService();