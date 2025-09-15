import {
  MLSPropertyData,
  MLSAddress,
  MLSPropertyDetails,
  MLSMedia,
  MLSDataQualityScore,
  MLSError
} from '../types/mls';

/**
 * MLS Data Validator
 * Validates MLS property data for completeness, accuracy, and consistency
 */
export class MLSDataValidator {

  /**
   * Validate a single MLS property record
   */
  static validateProperty(mlsProperty: MLSPropertyData): MLSDataQualityScore {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validate required fields
    this.validateRequiredFields(mlsProperty, issues);

    // Validate address completeness
    this.validateAddress(mlsProperty.address, issues, recommendations);

    // Validate property details
    this.validatePropertyDetails(mlsProperty.details, issues, recommendations);

    // Validate pricing
    this.validatePricing(mlsProperty, issues, recommendations);

    // Validate media
    this.validateMedia(mlsProperty.media, issues, recommendations);

    // Validate dates
    this.validateDates(mlsProperty.dates, issues, recommendations);

    // Calculate scores
    const completeness = this.calculateCompleteness(mlsProperty);
    const accuracy = this.calculateAccuracy(mlsProperty, issues);
    const consistency = this.calculateConsistency(mlsProperty, issues);

    const overall = Math.round((completeness * 0.4) + (accuracy * 0.4) + (consistency * 0.2));

    return {
      overall,
      completeness,
      accuracy,
      consistency,
      issues,
      recommendations
    };
  }

  /**
   * Validate multiple MLS property records
   */
  static validateProperties(mlsProperties: MLSPropertyData[]): MLSDataQualityScore[] {
    return mlsProperties.map(property => this.validateProperty(property));
  }

  /**
   * Get validation summary for a batch of properties
   */
  static getValidationSummary(scores: MLSDataQualityScore[]): {
    totalRecords: number;
    averageScore: number;
    highQualityCount: number;
    mediumQualityCount: number;
    lowQualityCount: number;
    criticalIssues: string[];
  } {
    const totalRecords = scores.length;
    const averageScore = Math.round(scores.reduce((sum, score) => sum + score.overall, 0) / totalRecords);

    const highQualityCount = scores.filter(s => s.overall >= 80).length;
    const mediumQualityCount = scores.filter(s => s.overall >= 60 && s.overall < 80).length;
    const lowQualityCount = scores.filter(s => s.overall < 60).length;

    const criticalIssues = scores
      .flatMap(score => score.issues)
      .filter(issue => this.isCriticalIssue(issue))
      .slice(0, 10); // Top 10 critical issues

    return {
      totalRecords,
      averageScore,
      highQualityCount,
      mediumQualityCount,
      lowQualityCount,
      criticalIssues
    };
  }

  /**
   * Validate required fields
   */
  private static validateRequiredFields(mlsProperty: MLSPropertyData, issues: string[]): void {
    if (!mlsProperty.mlsId?.trim()) {
      issues.push('Missing MLS ID');
    }

    if (!mlsProperty.listingId?.trim()) {
      issues.push('Missing listing ID');
    }

    if (!mlsProperty.propertyType?.trim()) {
      issues.push('Missing property type');
    }

    if (!mlsProperty.status) {
      issues.push('Missing property status');
    }

    if (!mlsProperty.price || mlsProperty.price <= 0) {
      issues.push('Invalid or missing price');
    }

    if (!mlsProperty.address) {
      issues.push('Missing address information');
    }

    if (!mlsProperty.details) {
      issues.push('Missing property details');
    }

    if (!mlsProperty.agent?.name?.trim()) {
      issues.push('Missing agent information');
    }
  }

  /**
   * Validate address completeness
   */
  private static validateAddress(
    address: MLSAddress,
    issues: string[],
    recommendations: string[]
  ): void {
    if (!address.streetName?.trim()) {
      issues.push('Missing street name');
    }

    if (!address.city?.trim()) {
      issues.push('Missing city');
    }

    if (!address.state?.trim()) {
      issues.push('Missing state');
    }

    if (!address.zipCode?.trim()) {
      issues.push('Missing ZIP code');
    }

    if (!address.country?.trim()) {
      issues.push('Missing country');
    }

    // Validate ZIP code format
    if (address.zipCode && !this.isValidZipCode(address.zipCode)) {
      issues.push('Invalid ZIP code format');
    }

    // Check for coordinates
    if (!address.latitude || !address.longitude) {
      recommendations.push('Add latitude/longitude coordinates for better mapping');
    }
  }

  /**
   * Validate property details
   */
  private static validatePropertyDetails(
    details: MLSPropertyDetails,
    issues: string[],
    recommendations: string[]
  ): void {
    if (details.bedrooms < 0) {
      issues.push('Invalid bedroom count');
    }

    if (details.bathrooms <= 0) {
      issues.push('Invalid bathroom count');
    }

    if (details.squareFeet <= 0) {
      issues.push('Invalid square footage');
    }

    if (details.yearBuilt && (details.yearBuilt < 1800 || details.yearBuilt > new Date().getFullYear() + 1)) {
      issues.push('Invalid year built');
    }

    // Check for missing optional details
    if (!details.squareFeet) {
      recommendations.push('Add square footage for better property valuation');
    }

    if (!details.yearBuilt) {
      recommendations.push('Add year built for property analysis');
    }

    if (!details.lotSize) {
      recommendations.push('Add lot size for comprehensive property details');
    }
  }

  /**
   * Validate pricing information
   */
  private static validatePricing(
    mlsProperty: MLSPropertyData,
    issues: string[],
    recommendations: string[]
  ): void {
    const price = mlsProperty.price;

    // Check for unrealistic prices based on property type and location
    if (price > 50000000) {
      issues.push('Price seems unusually high - verify accuracy');
    }

    if (price < 1000) {
      issues.push('Price seems unusually low - verify accuracy');
    }

    // Check price per square foot
    if (mlsProperty.details.squareFeet && mlsProperty.details.squareFeet > 0) {
      const pricePerSqFt = price / mlsProperty.details.squareFeet;
      if (pricePerSqFt > 10000) {
        recommendations.push('High price per square foot - consider market analysis');
      }
      if (pricePerSqFt < 10) {
        recommendations.push('Low price per square foot - verify pricing accuracy');
      }
    }
  }

  /**
   * Validate media information
   */
  private static validateMedia(
    media: MLSMedia[],
    issues: string[],
    recommendations: string[]
  ): void {
    if (!media || media.length === 0) {
      recommendations.push('Add property photos for better listing presentation');
      return;
    }

    // Check for primary photo
    const hasPrimary = media.some(m => m.isPrimary);
    if (!hasPrimary) {
      issues.push('No primary photo designated');
    }

    // Check for minimum photo count
    if (media.length < 3) {
      recommendations.push('Add more photos (minimum 3 recommended)');
    }

    // Validate URLs
    media.forEach((item, index) => {
      if (!item.url?.trim()) {
        issues.push(`Media item ${index + 1} missing URL`);
      } else if (!this.isValidUrl(item.url)) {
        issues.push(`Media item ${index + 1} has invalid URL`);
      }
    });

    // Check for different media types
    const hasPhotos = media.some(m => m.type === 'photo');
    const hasFloorPlan = media.some(m => m.type === 'floor_plan');

    if (!hasPhotos) {
      recommendations.push('Add property photos');
    }

    if (!hasFloorPlan) {
      recommendations.push('Consider adding floor plan');
    }
  }

  /**
   * Validate date information
   */
  private static validateDates(
    dates: any,
    issues: string[],
    recommendations: string[]
  ): void {
    const now = new Date();

    if (!dates.listed) {
      issues.push('Missing listing date');
    } else if (dates.listed > now) {
      issues.push('Listing date is in the future');
    }

    if (!dates.updated) {
      issues.push('Missing last updated date');
    } else if (dates.updated > now) {
      issues.push('Last updated date is in the future');
    }

    // Check if listing date is before updated date
    if (dates.listed && dates.updated && dates.listed > dates.updated) {
      issues.push('Listing date is after last updated date');
    }
  }

  /**
   * Calculate completeness score (0-100)
   */
  private static calculateCompleteness(mlsProperty: MLSPropertyData): number {
    let score = 0;
    const totalFields = 15;

    // Required fields (weight: 2 each)
    if (mlsProperty.mlsId) score += 2;
    if (mlsProperty.listingId) score += 2;
    if (mlsProperty.propertyType) score += 2;
    if (mlsProperty.status) score += 2;
    if (mlsProperty.price > 0) score += 2;

    // Address fields (weight: 1 each)
    if (mlsProperty.address?.streetName) score += 1;
    if (mlsProperty.address?.city) score += 1;
    if (mlsProperty.address?.state) score += 1;
    if (mlsProperty.address?.zipCode) score += 1;

    // Details fields (weight: 1 each)
    if (mlsProperty.details?.bedrooms >= 0) score += 1;
    if (mlsProperty.details?.bathrooms > 0) score += 1;

    return Math.round((score / totalFields) * 100);
  }

  /**
   * Calculate accuracy score (0-100)
   */
  private static calculateAccuracy(mlsProperty: MLSPropertyData, issues: string[]): number {
    const accuracyIssues = issues.filter(issue =>
      issue.includes('Invalid') ||
      issue.includes('format') ||
      issue.includes('future') ||
      issue.includes('unusually')
    );

    const baseScore = 100;
    const penalty = accuracyIssues.length * 10;

    return Math.max(0, baseScore - penalty);
  }

  /**
   * Calculate consistency score (0-100)
   */
  private static calculateConsistency(mlsProperty: MLSPropertyData, issues: string[]): number {
    const consistencyIssues = issues.filter(issue =>
      issue.includes('after') ||
      issue.includes('inconsistent') ||
      issue.includes('mismatch')
    );

    const baseScore = 100;
    const penalty = consistencyIssues.length * 15;

    return Math.max(0, baseScore - penalty);
  }

  /**
   * Check if ZIP code is valid
   */
  private static isValidZipCode(zipCode: string): boolean {
    // US ZIP code patterns
    const zipPattern = /^\d{5}(-\d{4})?$/;
    return zipPattern.test(zipCode);
  }

  /**
   * Check if URL is valid
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if an issue is critical
   */
  private static isCriticalIssue(issue: string): boolean {
    const criticalKeywords = [
      'Missing MLS ID',
      'Missing listing ID',
      'Invalid or missing price',
      'Missing address',
      'Missing agent information',
      'Invalid ZIP code format',
      'Invalid bedroom count',
      'Invalid bathroom count',
      'Invalid square footage',
      'Listing date is in the future',
      'Last updated date is in the future'
    ];

    return criticalKeywords.some(keyword => issue.includes(keyword));
  }
}

/**
 * Utility functions for MLS validation
 */
export const mlsValidator = {
  /**
   * Validate single property
   */
  validateProperty: (property: MLSPropertyData): MLSDataQualityScore => {
    return MLSDataValidator.validateProperty(property);
  },

  /**
   * Validate multiple properties
   */
  validateProperties: (properties: MLSPropertyData[]): MLSDataQualityScore[] => {
    return MLSDataValidator.validateProperties(properties);
  },

  /**
   * Get validation summary
   */
  getValidationSummary: (scores: MLSDataQualityScore[]) => {
    return MLSDataValidator.getValidationSummary(scores);
  },

  /**
   * Check if property meets minimum quality standards
   */
  meetsMinimumStandards: (score: MLSDataQualityScore): boolean => {
    const criticalIssues = score.issues.filter(issue => {
      const criticalKeywords = [
        'Missing MLS ID',
        'Missing listing ID',
        'Invalid or missing price',
        'Missing address',
        'Missing agent information',
        'Invalid ZIP code format',
        'Invalid bedroom count',
        'Invalid bathroom count',
        'Invalid square footage',
        'Listing date is in the future',
        'Last updated date is in the future'
      ];
      return criticalKeywords.some(keyword => issue.includes(keyword));
    });
    return score.overall >= 70 && criticalIssues.length === 0;
  },

  /**
   * Get quality grade based on score
   */
  getQualityGrade: (score: MLSDataQualityScore): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (score.overall >= 90) return 'A';
    if (score.overall >= 80) return 'B';
    if (score.overall >= 70) return 'C';
    if (score.overall >= 60) return 'D';
    return 'F';
  }
};

export default mlsValidator;