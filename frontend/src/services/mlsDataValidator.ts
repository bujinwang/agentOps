import {
  IMLSDataValidator,
  MLSPropertyData,
  MLSDataQualityScore,
  MLSFieldMapping
} from '../types/mls';

/**
 * MLS Data Quality Validator
 * Validates and scores the quality of MLS imported data
 */
export class MLSDataValidator implements IMLSDataValidator {
  private fieldMappings: MLSFieldMapping[] = [];

  constructor() {
    this.initializeDefaultMappings();
  }

  /**
   * Validate a single property record
   */
  async validateRecord(record: MLSPropertyData): Promise<MLSDataQualityScore> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Completeness check
    const completenessScore = this.calculateCompleteness(record, issues, recommendations);

    // Accuracy check
    const accuracyScore = this.calculateAccuracy(record, issues, recommendations);

    // Consistency check
    const consistencyScore = this.calculateConsistency(record, issues, recommendations);

    // Overall score (weighted average)
    const overall = Math.round(
      (completenessScore * 0.4) +
      (accuracyScore * 0.4) +
      (consistencyScore * 0.2)
    );

    return {
      overall,
      completeness: completenessScore,
      accuracy: accuracyScore,
      consistency: consistencyScore,
      issues,
      recommendations
    };
  }

  /**
   * Validate multiple records in batch
   */
  async validateBatch(records: MLSPropertyData[]): Promise<MLSDataQualityScore[]> {
    const promises = records.map(record => this.validateRecord(record));
    return Promise.all(promises);
  }

  /**
   * Get validation rules/field mappings
   */
  getValidationRules(): MLSFieldMapping[] {
    return [...this.fieldMappings];
  }

  /**
   * Update validation rules
   */
  async updateValidationRules(rules: MLSFieldMapping[]): Promise<void> {
    this.fieldMappings = [...rules];
  }

  /**
   * Calculate completeness score (0-100)
   */
  private calculateCompleteness(
    record: MLSPropertyData,
    issues: string[],
    recommendations: string[]
  ): number {
    let score = 100;
    const deductions = [];

    // Required address fields
    if (!record.address.streetName) {
      score -= 15;
      deductions.push('Missing street address');
      issues.push('Street address is required');
    }

    if (!record.address.city) {
      score -= 10;
      deductions.push('Missing city');
      issues.push('City is required');
    }

    if (!record.address.state) {
      score -= 10;
      deductions.push('Missing state');
      issues.push('State is required');
    }

    if (!record.address.zipCode) {
      score -= 5;
      deductions.push('Missing ZIP code');
      recommendations.push('Add ZIP code for better location accuracy');
    }

    // Required property details
    if (record.price <= 0) {
      score -= 20;
      deductions.push('Invalid or missing price');
      issues.push('Property price must be greater than 0');
    }

    if (!record.details.bedrooms || record.details.bedrooms < 0) {
      score -= 8;
      deductions.push('Invalid bedroom count');
      issues.push('Bedroom count is invalid or missing');
    }

    if (!record.details.bathrooms || record.details.bathrooms <= 0) {
      score -= 8;
      deductions.push('Invalid bathroom count');
      issues.push('Bathroom count is invalid or missing');
    }

    if (!record.details.squareFeet || record.details.squareFeet <= 0) {
      score -= 10;
      deductions.push('Invalid square footage');
      issues.push('Square footage is invalid or missing');
    }

    // Optional but recommended fields
    if (!record.agent.name) {
      score -= 3;
      recommendations.push('Add listing agent information');
    }

    if (!record.media || record.media.length === 0) {
      score -= 5;
      recommendations.push('Add property photos for better presentation');
    }

    if (!record.details.description) {
      score -= 2;
      recommendations.push('Add property description');
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate accuracy score (0-100)
   */
  private calculateAccuracy(
    record: MLSPropertyData,
    issues: string[],
    recommendations: string[]
  ): number {
    let score = 100;

    // Price validation
    if (record.price > 0) {
      const priceRange = this.getPriceRangeForPropertyType(record.propertyType);
      if (record.price < priceRange.min || record.price > priceRange.max) {
        score -= 15;
        issues.push(`Property price $${record.price.toLocaleString()} seems unusual for ${record.propertyType}`);
        recommendations.push('Verify property price is accurate');
      }
    }

    // Square footage validation
    if (record.details.squareFeet > 0) {
      const sqftRange = this.getSqftRangeForPropertyType(record.propertyType);
      if (record.details.squareFeet < sqftRange.min || record.details.squareFeet > sqftRange.max) {
        score -= 10;
        issues.push(`Square footage ${record.details.squareFeet} seems unusual for ${record.propertyType}`);
        recommendations.push('Verify square footage measurement');
      }
    }

    // Bedroom/bathroom ratio validation
    if (record.details.bedrooms > 0 && record.details.bathrooms > 0) {
      const bathToBedRatio = record.details.bathrooms / record.details.bedrooms;
      if (bathToBedRatio > 3) {
        score -= 5;
        issues.push('Unusual bathroom to bedroom ratio');
        recommendations.push('Verify bedroom and bathroom counts');
      }
    }

    // Year built validation
    if (record.details.yearBuilt) {
      const currentYear = new Date().getFullYear();
      if (record.details.yearBuilt < 1800 || record.details.yearBuilt > currentYear + 1) {
        score -= 10;
        issues.push(`Year built ${record.details.yearBuilt} seems invalid`);
        recommendations.push('Verify year built is accurate');
      }
    }

    // Address format validation
    if (record.address.zipCode && !this.isValidZipCode(record.address.zipCode)) {
      score -= 8;
      issues.push('ZIP code format appears invalid');
      recommendations.push('Verify ZIP code format');
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate consistency score (0-100)
   */
  private calculateConsistency(
    record: MLSPropertyData,
    issues: string[],
    recommendations: string[]
  ): number {
    let score = 100;

    // Property type and details consistency
    if (record.propertyType === 'single_family' && record.details.stories && record.details.stories > 3) {
      score -= 5;
      issues.push('Single family home with unusual number of stories');
    }

    // Price and square footage correlation
    if (record.price > 0 && record.details.squareFeet > 0) {
      const pricePerSqft = record.price / record.details.squareFeet;
      const expectedRange = this.getPricePerSqftRange(record.address.state || '');

      if (pricePerSqft < expectedRange.min || pricePerSqft > expectedRange.max) {
        score -= 10;
        issues.push(`Price per square foot $${pricePerSqft.toFixed(0)} seems inconsistent with market data`);
        recommendations.push('Verify price and square footage are consistent');
      }
    }

    // Media consistency
    if (record.media && record.media.length > 0) {
      const primaryCount = record.media.filter(m => m.isPrimary).length;
      if (primaryCount === 0) {
        score -= 3;
        recommendations.push('Designate a primary photo for the property');
      } else if (primaryCount > 1) {
        score -= 5;
        issues.push('Multiple photos marked as primary');
        recommendations.push('Only one photo should be marked as primary');
      }
    }

    // Date consistency
    if (record.dates.listed > record.dates.updated) {
      score -= 5;
      issues.push('Listing date is after last updated date');
      recommendations.push('Verify listing and update dates are correct');
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Initialize default field mappings
   */
  private initializeDefaultMappings(): void {
    this.fieldMappings = [
      { mlsField: 'ListingID', internalField: 'mls_listing_id', required: true, validation: this.validateString },
      { mlsField: 'ListPrice', internalField: 'price', required: true, validation: this.validatePrice },
      { mlsField: 'StreetNumber', internalField: 'address.street_number', required: true, validation: this.validateString },
      { mlsField: 'StreetName', internalField: 'address.street_name', required: true, validation: this.validateString },
      { mlsField: 'City', internalField: 'address.city', required: true, validation: this.validateString },
      { mlsField: 'StateOrProvince', internalField: 'address.state', required: true, validation: this.validateState },
      { mlsField: 'PostalCode', internalField: 'address.zip_code', required: true, validation: this.validateZipCode },
      { mlsField: 'BedroomsTotal', internalField: 'details.bedrooms', required: false, validation: this.validateBedrooms },
      { mlsField: 'BathroomsTotal', internalField: 'details.bathrooms', required: false, validation: this.validateBathrooms },
      { mlsField: 'LivingArea', internalField: 'details.square_feet', required: false, validation: this.validateSquareFeet },
      { mlsField: 'PropertyType', internalField: 'property_type', required: false, validation: this.validatePropertyType },
      { mlsField: 'YearBuilt', internalField: 'details.year_built', required: false, validation: this.validateYearBuilt }
    ];
  }

  /**
   * Validation helper methods
   */
  private validateString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private validatePrice(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num > 0 && num < 100000000; // Reasonable price range
  }

  private validateState(value: any): boolean {
    const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
                   'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
                   'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
                   'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                   'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    return typeof value === 'string' && states.includes(value.toUpperCase());
  }

  private validateZipCode(value: any): boolean {
    return this.isValidZipCode(value);
  }

  private validateBedrooms(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 20 && Number.isInteger(num);
  }

  private validateBathrooms(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 20;
  }

  private validateSquareFeet(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num > 0 && num < 100000;
  }

  private validatePropertyType(value: any): boolean {
    const validTypes = ['single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial'];
    return typeof value === 'string' && validTypes.includes(value.toLowerCase());
  }

  private validateYearBuilt(value: any): boolean {
    const num = Number(value);
    const currentYear = new Date().getFullYear();
    return !isNaN(num) && num >= 1800 && num <= currentYear + 1;
  }

  /**
   * Helper methods for range validation
   */
  private getPriceRangeForPropertyType(type: string): { min: number; max: number } {
    const ranges: { [key: string]: { min: number; max: number } } = {
      'single_family': { min: 50000, max: 10000000 },
      'condo': { min: 30000, max: 5000000 },
      'townhouse': { min: 40000, max: 3000000 },
      'multi_family': { min: 100000, max: 20000000 },
      'land': { min: 10000, max: 5000000 },
      'commercial': { min: 50000, max: 50000000 }
    };
    return ranges[type] || { min: 10000, max: 100000000 };
  }

  private getSqftRangeForPropertyType(type: string): { min: number; max: number } {
    const ranges: { [key: string]: { min: number; max: number } } = {
      'single_family': { min: 500, max: 15000 },
      'condo': { min: 300, max: 5000 },
      'townhouse': { min: 800, max: 8000 },
      'multi_family': { min: 1000, max: 50000 },
      'land': { min: 1000, max: 1000000 },
      'commercial': { min: 500, max: 100000 }
    };
    return ranges[type] || { min: 100, max: 1000000 };
  }

  private getPricePerSqftRange(state: string): { min: number; max: number } {
    // Simplified price per square foot ranges by state
    const ranges: { [key: string]: { min: number; max: number } } = {
      'CA': { min: 200, max: 2000 },
      'NY': { min: 150, max: 1500 },
      'TX': { min: 80, max: 400 },
      'FL': { min: 100, max: 600 }
    };
    return ranges[state] || { min: 50, max: 1000 };
  }

  private isValidZipCode(zip: any): boolean {
    const zipStr = String(zip).trim();
    return /^\d{5}(-\d{4})?$/.test(zipStr);
  }
}

/**
 * Factory function to create data validator
 */
export function createMLSDataValidator(): IMLSDataValidator {
  return new MLSDataValidator();
}