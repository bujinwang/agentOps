// CMA Report Generation Service
// Handles PDF and Excel report generation for Comparative Market Analysis

import { ComparativeMarketAnalysis, CMAExportFormat, CMAReport } from '../types/cma';

class CMAReportService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:5678/webhook';
  }

  /**
   * Generate a comprehensive CMA report
   */
  async generateCMAReport(
    cma: ComparativeMarketAnalysis,
    format: CMAExportFormat,
    options?: {
      includeCharts?: boolean;
      includeMaps?: boolean;
      templateType?: 'standard' | 'executive' | 'detailed';
      customSections?: string[];
    }
  ): Promise<CMAReport> {
    try {
      const reportData = this.buildReportData(cma, options);

      const response = await fetch(`${this.baseUrl}/api/cma/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cma_data: cma,
          format,
          options: options || {},
          report_data: reportData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.report;
    } catch (error) {
      console.error('Error generating CMA report:', error);
      throw new Error('Failed to generate CMA report');
    }
  }

  /**
   * Build comprehensive report data structure
   */
  private buildReportData(
    cma: ComparativeMarketAnalysis,
    options?: {
      includeCharts?: boolean;
      includeMaps?: boolean;
      templateType?: 'standard' | 'executive' | 'detailed';
      customSections?: string[];
    }
  ) {
    const templateType = options?.templateType || 'standard';

    const baseReport = {
      executive_summary: this.generateExecutiveSummary(cma),
      subject_property_analysis: this.generateSubjectPropertyAnalysis(cma),
      comparables_analysis: this.generateComparablesAnalysis(cma),
      market_analysis: this.generateMarketAnalysis(cma),
      recommendations: this.generateRecommendations(cma),
      methodology: this.generateMethodology(cma),
    };

    // Add template-specific content
    switch (templateType) {
      case 'executive':
        return {
          ...baseReport,
          executive_summary: this.generateDetailedExecutiveSummary(cma),
        };

      case 'detailed':
        return {
          ...baseReport,
          detailed_statistics: this.generateDetailedStatistics(cma),
          neighborhood_analysis: this.generateNeighborhoodAnalysis(cma),
          market_forecast: this.generateMarketForecast(cma),
        };

      default:
        return baseReport;
    }
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(cma: ComparativeMarketAnalysis): string {
    const { subject_property, price_range, statistics, recommendations } = cma;

    const highRecommendation = recommendations.find(r => r.impact_level === 'high');
    const pricingRecommendation = recommendations.find(r => r.type === 'pricing');

    return `
# Comparative Market Analysis Executive Summary

## Subject Property
${subject_property.address.street}, ${subject_property.address.city}, ${subject_property.address.state} ${subject_property.address.zip_code}

## Analysis Overview
This Comparative Market Analysis (CMA) was performed on ${new Date(cma.analysis_date).toLocaleDateString()} and includes ${statistics.comparables_count} comparable properties within the search criteria.

## Key Findings

### Estimated Market Value
- **Price Range**: $${price_range.estimated_value_range.low.toLocaleString()} - $${price_range.estimated_value_range.high.toLocaleString()}
- **Confidence Level**: ${price_range.estimated_value_range.confidence_level}
- **Average Price per Sqft**: $${statistics.average_price_per_sqft.toFixed(0)}

### Market Conditions
- **Market Strength**: ${statistics.market_strength}
- **Absorption Rate**: ${statistics.market_absorption_rate} properties per month
- **Average Days on Market**: ${statistics.average_days_on_market.toFixed(0)} days

### Primary Recommendation
${highRecommendation ? highRecommendation.description : 'Analysis complete - see detailed recommendations section'}

${pricingRecommendation ? `**Pricing Strategy**: ${pricingRecommendation.description}` : ''}
    `.trim();
  }

  /**
   * Generate detailed executive summary for executive template
   */
  private generateDetailedExecutiveSummary(cma: ComparativeMarketAnalysis): string {
    const baseSummary = this.generateExecutiveSummary(cma);

    return `
${baseSummary}

## Market Position Analysis

### Competitive Advantages
${this.analyzeCompetitiveAdvantages(cma)}

### Market Risks
${this.analyzeMarketRisks(cma)}

## Strategic Recommendations
${this.generateStrategicRecommendations(cma)}
    `.trim();
  }

  /**
   * Generate subject property analysis
   */
  private generateSubjectPropertyAnalysis(cma: ComparativeMarketAnalysis): any {
    const { subject_property } = cma;

    return {
      property_details: {
        address: subject_property.address,
        property_type: subject_property.property_type,
        bedrooms: subject_property.details?.bedrooms,
        bathrooms: subject_property.details?.bathrooms,
        square_feet: subject_property.details?.square_feet,
        lot_size: subject_property.details?.lot_size,
        year_built: subject_property.details?.year_built,
        features: subject_property.features,
      },
      market_position: this.calculateMarketPosition(cma),
      condition_assessment: this.assessPropertyCondition(subject_property),
    };
  }

  /**
   * Generate comparables analysis
   */
  private generateComparablesAnalysis(cma: ComparativeMarketAnalysis): any {
    const { comparables, subject_property } = cma;

    return {
      comparables_count: comparables.length,
      comparables_list: comparables.map(comp => ({
        address: comp.address,
        sale_price: comp.adjusted_price || comp.sale_price,
        price_per_sqft: comp.price_per_sqft,
        sale_date: comp.sale_date,
        days_on_market: comp.days_on_market,
        similarity_score: comp.similarity_score,
        adjustments: comp.adjustments,
        distance: comp.distance_miles,
      })),
      similarity_analysis: this.analyzeSimilarityDistribution(comparables),
      adjustment_summary: this.summarizeAdjustments(comparables),
    };
  }

  /**
   * Generate market analysis
   */
  private generateMarketAnalysis(cma: ComparativeMarketAnalysis): any {
    const { statistics, market_trends } = cma;

    return {
      current_market_conditions: {
        strength: statistics.market_strength,
        absorption_rate: statistics.market_absorption_rate,
        inventory_levels: statistics.inventory_levels,
        average_days_on_market: statistics.average_days_on_market,
      },
      price_trends: market_trends.filter(t => t.metric === 'price_per_sqft'),
      market_indicators: this.calculateMarketIndicators(statistics),
      seasonal_analysis: this.analyzeSeasonalTrends(market_trends),
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(cma: ComparativeMarketAnalysis): any {
    const { recommendations, price_range } = cma;

    return {
      pricing_recommendations: recommendations.filter(r => r.type === 'pricing'),
      marketing_recommendations: recommendations.filter(r => r.type === 'marketing'),
      timing_recommendations: recommendations.filter(r => r.type === 'timing'),
      strategic_recommendations: recommendations.filter(r => r.type === 'strategy'),
      automated_pricing_suggestions: this.generatePricingSuggestions(cma),
    };
  }

  /**
   * Generate methodology section
   */
  private generateMethodology(cma: ComparativeMarketAnalysis): string {
    const { search_criteria } = cma;

    return `
# Methodology

## Data Sources
- MLS (Multiple Listing Service) data
- Public records and tax assessment data
- Historical sales data and market trends

## Search Criteria
- **Search Radius**: ${search_criteria.search_radius_miles} miles
- **Date Range**: ${new Date(search_criteria.date_range.start).toLocaleDateString()} to ${new Date(search_criteria.date_range.end).toLocaleDateString()}
- **Property Types**: ${search_criteria.property_types.join(', ')}
- **Quality Filters**: Minimum ${search_criteria.min_data_quality_score}% data quality score

## Analysis Methods
- **Similarity Scoring**: Multi-factor analysis including size, features, location, and condition
- **Price Adjustments**: Market-based adjustments for property differences
- **Statistical Analysis**: Confidence intervals and standard deviation calculations
- **Trend Analysis**: Time-series analysis of market data

## Quality Assurance
- Data validation and verification processes
- Statistical significance testing
- Market condition adjustments
- Peer review and validation procedures
    `.trim();
  }

  /**
   * Generate detailed statistics for detailed template
   */
  private generateDetailedStatistics(cma: ComparativeMarketAnalysis): any {
    const { statistics } = cma;

    return {
      price_distribution: this.calculatePriceDistribution(cma.comparables),
      statistical_measures: {
        mean: statistics.average_price,
        median: statistics.median_price,
        mode: this.calculateMode(cma.comparables.map(c => c.adjusted_price || c.sale_price)),
        standard_deviation: statistics.standard_deviation,
        variance: Math.pow(statistics.standard_deviation, 2),
        skewness: this.calculateSkewness(cma.comparables.map(c => c.adjusted_price || c.sale_price)),
        kurtosis: this.calculateKurtosis(cma.comparables.map(c => c.adjusted_price || c.sale_price)),
      },
      correlation_analysis: this.analyzeCorrelations(cma),
      outlier_analysis: this.identifyOutliers(cma.comparables),
    };
  }

  /**
   * Generate neighborhood analysis
   */
  private generateNeighborhoodAnalysis(cma: ComparativeMarketAnalysis): any {
    // This would integrate with neighborhood data from the CMA
    return cma.neighborhood_analysis || {
      demographics: {},
      market_metrics: {},
      amenities: {},
      comparables_in_neighborhood: 0,
    };
  }

  /**
   * Generate market forecast
   */
  private generateMarketForecast(cma: ComparativeMarketAnalysis): any {
    return cma.market_forecast || {
      forecast_period_months: 6,
      price_projection: {
        expected_change_percentage: 0,
        confidence_interval: { low: 0, high: 0 },
        direction: 'stable',
      },
    };
  }

  // Helper methods for analysis
  private analyzeCompetitiveAdvantages(cma: ComparativeMarketAnalysis): string {
    const { subject_property, comparables } = cma;
    const advantages: string[] = [];

    if (subject_property.details?.square_feet &&
        comparables.every(c => c.square_feet < subject_property.details!.square_feet!)) {
      advantages.push('Larger than average comparable properties');
    }

    if (subject_property.details?.year_built &&
        subject_property.details.year_built > new Date().getFullYear() - 10) {
      advantages.push('Newer construction compared to market');
    }

    return advantages.length > 0 ? advantages.map(adv => `- ${adv}`).join('\n') : 'No significant competitive advantages identified';
  }

  private analyzeMarketRisks(cma: ComparativeMarketAnalysis): string {
    const { statistics } = cma;
    const risks: string[] = [];

    if (statistics.market_absorption_rate < 10) {
      risks.push('Slow market absorption may extend time on market');
    }

    if (statistics.inventory_levels > 6) {
      risks.push('High inventory levels may pressure pricing');
    }

    return risks.length > 0 ? risks.map(risk => `- ${risk}`).join('\n') : 'No significant market risks identified';
  }

  private generateStrategicRecommendations(cma: ComparativeMarketAnalysis): string {
    const recommendations: string[] = [];

    if (cma.statistics.market_strength === 'buyers') {
      recommendations.push('Consider pricing at lower end of range to attract buyers');
    } else if (cma.statistics.market_strength === 'sellers') {
      recommendations.push('Strong seller market - consider pricing at higher end of range');
    }

    return recommendations.map(rec => `- ${rec}`).join('\n');
  }

  private calculateMarketPosition(cma: ComparativeMarketAnalysis): string {
    const { subject_property, price_range } = cma;
    const subjectValue = subject_property.price || price_range.subject_property_value;

    if (!subjectValue) return 'Unable to determine market position';

    const range = price_range.estimated_value_range.high - price_range.estimated_value_range.low;
    const position = ((subjectValue - price_range.estimated_value_range.low) / range) * 100;

    if (position < 25) return 'Below market value';
    if (position < 75) return 'At market value';
    return 'Above market value';
  }

  private assessPropertyCondition(property: any): string {
    // Simplified condition assessment
    if (property.details?.year_built) {
      const age = new Date().getFullYear() - property.details.year_built;
      if (age < 10) return 'Excellent - Recently built';
      if (age < 25) return 'Good - Well maintained';
      if (age < 50) return 'Fair - May need updates';
      return 'Needs updating';
    }
    return 'Unknown condition';
  }

  private analyzeSimilarityDistribution(comparables: any[]): any {
    const scores = comparables.map(c => c.similarity_score);
    const high = scores.filter(s => s >= 80).length;
    const medium = scores.filter(s => s >= 60 && s < 80).length;
    const low = scores.filter(s => s < 60).length;

    return { high, medium, low, total: scores.length };
  }

  private summarizeAdjustments(comparables: any[]): any {
    const totalAdjustments = comparables.reduce((sum, comp) => {
      return sum + comp.adjustments.reduce((adjSum: number, adj: any) => adjSum + Math.abs(adj.amount), 0);
    }, 0);

    return {
      total_adjustments: totalAdjustments,
      average_adjustment_per_property: totalAdjustments / comparables.length,
      adjustment_types: this.groupAdjustmentsByType(comparables),
    };
  }

  private groupAdjustmentsByType(comparables: any[]): any {
    const types: { [key: string]: number } = {};

    comparables.forEach(comp => {
      comp.adjustments.forEach((adj: any) => {
        types[adj.type] = (types[adj.type] || 0) + Math.abs(adj.amount);
      });
    });

    return types;
  }

  private calculateMarketIndicators(statistics: any): any {
    return {
      market_health_score: this.calculateMarketHealthScore(statistics),
      buyer_seller_index: statistics.market_strength === 'buyers' ? 0.3 :
                          statistics.market_strength === 'sellers' ? 0.7 : 0.5,
      supply_demand_ratio: statistics.inventory_levels / statistics.market_absorption_rate,
    };
  }

  private calculateMarketHealthScore(statistics: any): number {
    let score = 50; // Base score

    // Absorption rate impact
    if (statistics.market_absorption_rate > 20) score += 20;
    else if (statistics.market_absorption_rate < 10) score -= 20;

    // Inventory levels impact
    if (statistics.inventory_levels < 3) score += 15;
    else if (statistics.inventory_levels > 6) score -= 15;

    // Days on market impact
    if (statistics.average_days_on_market < 30) score += 15;
    else if (statistics.average_days_on_market > 90) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  private analyzeSeasonalTrends(trends: any[]): any {
    // Simplified seasonal analysis
    const monthlyTrends = trends.filter(t => t.timeframe.includes('month'));

    return {
      seasonal_pattern: monthlyTrends.length > 0 ? 'Data available' : 'Insufficient data',
      peak_season: 'Spring/Summer (typically March-August)',
      off_season: 'Fall/Winter (typically September-February)',
    };
  }

  private generatePricingSuggestions(cma: ComparativeMarketAnalysis): any[] {
    const { price_range, statistics } = cma;
    const suggestions: any[] = [];

    // Conservative pricing
    suggestions.push({
      strategy: 'Conservative',
      price: price_range.estimated_value_range.low,
      rationale: 'Minimize time on market, maximize certainty of sale',
      expected_days_on_market: Math.round(statistics.average_days_on_market * 0.8),
    });

    // Market pricing
    const marketPrice = (price_range.estimated_value_range.low + price_range.estimated_value_range.high) / 2;
    suggestions.push({
      strategy: 'Market Rate',
      price: marketPrice,
      rationale: 'Balance between speed and maximum return',
      expected_days_on_market: statistics.average_days_on_market,
    });

    // Aggressive pricing
    suggestions.push({
      strategy: 'Aggressive',
      price: price_range.estimated_value_range.high,
      rationale: 'Maximize potential return, may extend time on market',
      expected_days_on_market: Math.round(statistics.average_days_on_market * 1.5),
    });

    return suggestions;
  }

  private calculatePriceDistribution(comparables: any[]): any {
    const prices = comparables.map(c => c.adjusted_price || c.sale_price).sort((a, b) => a - b);

    return {
      minimum: Math.min(...prices),
      maximum: Math.max(...prices),
      quartiles: {
        q1: this.calculatePercentile(prices, 25),
        q2: this.calculatePercentile(prices, 50), // median
        q3: this.calculatePercentile(prices, 75),
      },
      percentiles: {
        p10: this.calculatePercentile(prices, 10),
        p90: this.calculatePercentile(prices, 90),
      },
    };
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private calculateMode(numbers: number[]): number {
    const frequency: { [key: number]: number } = {};
    numbers.forEach(num => {
      frequency[num] = (frequency[num] || 0) + 1;
    });

    let mode = numbers[0];
    let maxCount = 0;

    for (const num in frequency) {
      if (frequency[num] > maxCount) {
        maxCount = frequency[num];
        mode = parseFloat(num);
      }
    }

    return mode;
  }

  private calculateSkewness(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);

    const skewness = numbers.reduce((sum, num) => sum + Math.pow((num - mean) / stdDev, 3), 0) / numbers.length;
    return skewness;
  }

  private calculateKurtosis(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);

    const kurtosis = numbers.reduce((sum, num) => sum + Math.pow((num - mean) / stdDev, 4), 0) / numbers.length - 3;
    return kurtosis;
  }

  private analyzeCorrelations(cma: ComparativeMarketAnalysis): any {
    // Simplified correlation analysis
    return {
      price_vs_size: this.calculateCorrelation(
        cma.comparables.map(c => c.square_feet),
        cma.comparables.map(c => c.adjusted_price || c.sale_price)
      ),
      price_vs_age: this.calculateCorrelation(
        cma.comparables.map(c => c.year_built || new Date().getFullYear()),
        cma.comparables.map(c => c.adjusted_price || c.sale_price)
      ),
      price_vs_distance: this.calculateCorrelation(
        cma.comparables.map(c => c.distance_miles),
        cma.comparables.map(c => c.adjusted_price || c.sale_price)
      ),
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private identifyOutliers(comparables: any[]): any {
    const prices = comparables.map(c => c.adjusted_price || c.sale_price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length);

    const outliers = comparables.filter(c => {
      const price = c.adjusted_price || c.sale_price;
      return Math.abs(price - mean) > 2 * stdDev; // 2 standard deviations
    });

    return {
      count: outliers.length,
      percentage: (outliers.length / comparables.length) * 100,
      outliers: outliers.map(o => ({
        address: o.address,
        price: o.adjusted_price || o.sale_price,
        deviation: Math.abs((o.adjusted_price || o.sale_price) - mean) / stdDev,
      })),
    };
  }
}

// Export singleton instance
export const cmaReportService = new CMAReportService();