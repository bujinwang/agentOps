import {
  IMLSDuplicateDetector,
  MLSPropertyData,
  MLSDuplicateCandidate,
  MLSDataQualityScore
} from '../types/mls';

/**
 * MLS Duplicate Detection Service
 * Identifies potential duplicate properties using fuzzy matching algorithms
 */
export class MLSDuplicateDetector implements IMLSDuplicateDetector {
  private readonly SIMILARITY_THRESHOLD = 0.85;
  private readonly ADDRESS_WEIGHT = 0.4;
  private readonly PRICE_WEIGHT = 0.3;
  private readonly DETAILS_WEIGHT = 0.3;

  /**
   * Find potential duplicates for a batch of properties
   */
  async findDuplicates(properties: MLSPropertyData[]): Promise<MLSDuplicateCandidate[]> {
    const candidates: MLSDuplicateCandidate[] = [];

    // Compare each property with every other property
    for (let i = 0; i < properties.length; i++) {
      for (let j = i + 1; j < properties.length; j++) {
        const candidate = this.compareProperties(properties[i], properties[j]);
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }

    // Sort by confidence (highest first)
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Resolve a duplicate candidate
   */
  async resolveDuplicate(candidate: MLSDuplicateCandidate): Promise<void> {
    // In a real implementation, this would:
    // 1. Apply the chosen resolution strategy
    // 2. Update the database accordingly
    // 3. Mark the candidate as resolved
    // 4. Log the resolution action

    console.log(`Resolving duplicate: ${candidate.suggestedAction}`, {
      sourceId: candidate.sourceRecord.mlsId,
      targetId: candidate.targetRecord.mlsId,
      confidence: candidate.confidence
    });

    // Mark as resolved in the database
    await this.markDuplicateResolved(candidate.id, candidate.suggestedAction as 'merged' | 'kept_both' | 'skipped');
  }

  /**
   * Get pending duplicate candidates
   */
  async getPendingDuplicates(): Promise<MLSDuplicateCandidate[]> {
    // In a real implementation, this would query the database
    // for unresolved duplicate candidates
    return [];
  }

  /**
   * Compare two properties and determine if they're duplicates
   */
  private compareProperties(
    prop1: MLSPropertyData,
    prop2: MLSPropertyData
  ): MLSDuplicateCandidate | null {
    // Skip if MLS IDs are the same
    if (prop1.mlsId === prop2.mlsId) {
      return null;
    }

    const addressSimilarity = this.calculateAddressSimilarity(prop1.address, prop2.address);
    const priceSimilarity = this.calculatePriceSimilarity(prop1.price, prop2.price);
    const detailsSimilarity = this.calculateDetailsSimilarity(prop1.details, prop2.details);

    const overallSimilarity =
      (addressSimilarity * this.ADDRESS_WEIGHT) +
      (priceSimilarity * this.PRICE_WEIGHT) +
      (detailsSimilarity * this.DETAILS_WEIGHT);

    if (overallSimilarity >= this.SIMILARITY_THRESHOLD) {
      const matchReasons = this.generateMatchReasons(
        addressSimilarity,
        priceSimilarity,
        detailsSimilarity
      );

      return {
        id: this.generateCandidateId(),
        confidence: overallSimilarity,
        sourceRecord: prop1,
        targetRecord: prop2,
        matchReasons,
        suggestedAction: this.determineSuggestedAction(overallSimilarity, matchReasons),
        mergeData: this.generateMergeData(prop1, prop2)
      };
    }

    return null;
  }

  /**
   * Calculate address similarity score (0-1)
   */
  private calculateAddressSimilarity(addr1: any, addr2: any): number {
    let score = 0;
    let factors = 0;

    // Street address similarity
    if (addr1.streetName && addr2.streetName) {
      const streetSim = this.calculateStringSimilarity(
        `${addr1.streetNumber} ${addr1.streetName}`.toLowerCase(),
        `${addr2.streetNumber} ${addr2.streetName}`.toLowerCase()
      );
      score += streetSim;
      factors++;
    }

    // City similarity
    if (addr1.city && addr2.city) {
      const citySim = this.calculateStringSimilarity(
        addr1.city.toLowerCase(),
        addr2.city.toLowerCase()
      );
      score += citySim;
      factors++;
    }

    // State similarity
    if (addr1.state && addr2.state) {
      const stateSim = addr1.state.toLowerCase() === addr2.state.toLowerCase() ? 1 : 0;
      score += stateSim;
      factors++;
    }

    // ZIP code similarity
    if (addr1.zipCode && addr2.zipCode) {
      const zipSim = addr1.zipCode === addr2.zipCode ? 1 : 0;
      score += zipSim;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate price similarity score (0-1)
   */
  private calculatePriceSimilarity(price1: number, price2: number): number {
    if (price1 === 0 || price2 === 0) return 0;

    const ratio = Math.min(price1, price2) / Math.max(price1, price2);
    return Math.max(0, 1 - Math.abs(1 - ratio) * 2); // Allow 50% variance
  }

  /**
   * Calculate property details similarity score (0-1)
   */
  private calculateDetailsSimilarity(details1: any, details2: any): number {
    let score = 0;
    let factors = 0;

    // Bedrooms
    if (details1.bedrooms && details2.bedrooms) {
      const bedSim = details1.bedrooms === details2.bedrooms ? 1 : 0;
      score += bedSim;
      factors++;
    }

    // Bathrooms
    if (details1.bathrooms && details2.bathrooms) {
      const bathSim = Math.abs(details1.bathrooms - details2.bathrooms) <= 0.5 ? 1 : 0;
      score += bathSim;
      factors++;
    }

    // Square footage (allow 10% variance)
    if (details1.squareFeet && details2.squareFeet) {
      const sqftRatio = Math.min(details1.squareFeet, details2.squareFeet) /
                       Math.max(details1.squareFeet, details2.squareFeet);
      const sqftSim = sqftRatio >= 0.9 ? 1 : 0;
      score += sqftSim;
      factors++;
    }

    // Year built (allow 2 year variance)
    if (details1.yearBuilt && details2.yearBuilt) {
      const yearDiff = Math.abs(details1.yearBuilt - details2.yearBuilt);
      const yearSim = yearDiff <= 2 ? 1 : 0;
      score += yearSim;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0 || len2 === 0) return 0;

    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);

    return 1 - distance / maxLength;
  }

  /**
   * Generate human-readable match reasons
   */
  private generateMatchReasons(
    addressSim: number,
    priceSim: number,
    detailsSim: number
  ): string[] {
    const reasons: string[] = [];

    if (addressSim >= 0.9) {
      reasons.push('Very similar addresses');
    } else if (addressSim >= 0.7) {
      reasons.push('Similar addresses');
    }

    if (priceSim >= 0.9) {
      reasons.push('Identical or very similar prices');
    } else if (priceSim >= 0.7) {
      reasons.push('Similar price ranges');
    }

    if (detailsSim >= 0.8) {
      reasons.push('Matching property details (bedrooms, bathrooms, square footage)');
    } else if (detailsSim >= 0.6) {
      reasons.push('Similar property specifications');
    }

    return reasons;
  }

  /**
   * Determine suggested action based on confidence and match reasons
   */
  private determineSuggestedAction(
    confidence: number,
    reasons: string[]
  ): 'merge' | 'keep_both' | 'skip' {
    if (confidence >= 0.95 && reasons.length >= 2) {
      return 'merge'; // High confidence, multiple matching factors
    } else if (confidence >= 0.85) {
      return 'merge'; // Good confidence
    } else {
      return 'keep_both'; // Lower confidence, manual review needed
    }
  }

  /**
   * Generate merge data for duplicate resolution
   */
  private generateMergeData(
    prop1: MLSPropertyData,
    prop2: MLSPropertyData
  ): Partial<MLSPropertyData> {
    // Choose the more recent or complete record as the base
    const baseProp = this.chooseBetterRecord(prop1, prop2);
    const otherProp = baseProp === prop1 ? prop2 : prop1;

    // Merge data, preferring non-null values and more recent updates
    const merged: Partial<MLSPropertyData> = { ...baseProp };

    // Merge media arrays
    if (otherProp.media && otherProp.media.length > 0) {
      merged.media = [...(baseProp.media || []), ...otherProp.media];
    }

    // Update timestamps
    merged.dates = {
      ...baseProp.dates,
      updated: new Date() // Current timestamp for merge
    };

    return merged;
  }

  /**
   * Choose the better record for merging
   */
  private chooseBetterRecord(prop1: MLSPropertyData, prop2: MLSPropertyData): MLSPropertyData {
    // Prefer more recent updates
    const date1 = new Date(prop1.dates.updated);
    const date2 = new Date(prop2.dates.updated);

    if (date1 > date2) return prop1;
    if (date2 > date1) return prop2;

    // If dates are equal, prefer more complete data
    const completeness1 = this.calculateCompleteness(prop1);
    const completeness2 = this.calculateCompleteness(prop2);

    return completeness1 >= completeness2 ? prop1 : prop2;
  }

  /**
   * Calculate data completeness score
   */
  private calculateCompleteness(property: MLSPropertyData): number {
    let score = 0;
    const total = 10;

    if (property.price > 0) score++;
    if (property.address.streetName) score++;
    if (property.address.city) score++;
    if (property.address.state) score++;
    if (property.address.zipCode) score++;
    if (property.details.bedrooms > 0) score++;
    if (property.details.bathrooms > 0) score++;
    if (property.details.squareFeet > 0) score++;
    if (property.agent.name) score++;
    if (property.media && property.media.length > 0) score++;

    return score / total;
  }

  /**
   * Mark duplicate as resolved in database
   */
  private async markDuplicateResolved(
    candidateId: string,
    action: 'merged' | 'kept_both' | 'skipped'
  ): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Marked duplicate ${candidateId} as resolved with action: ${action}`);
  }

  /**
   * Generate unique candidate ID
   */
  private generateCandidateId(): string {
    return `dup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Fuzzy Address Matcher
 * Specialized utility for address matching
 */
export class FuzzyAddressMatcher {
  /**
   * Normalize address for comparison
   */
  static normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  /**
   * Calculate address similarity with special handling
   */
  static calculateSimilarity(addr1: string, addr2: string): number {
    const normalized1 = this.normalizeAddress(addr1);
    const normalized2 = this.normalizeAddress(addr2);

    if (normalized1 === normalized2) return 1;

    // Check for common address variations
    const variations1 = this.generateVariations(normalized1);
    const variations2 = this.generateVariations(normalized2);

    for (const v1 of variations1) {
      for (const v2 of variations2) {
        if (v1 === v2) return 0.95; // High similarity for variations
      }
    }

    // Fall back to string similarity
    return this.levenshteinSimilarity(normalized1, normalized2);
  }

  /**
   * Generate common address variations
   */
  private static generateVariations(address: string): string[] {
    const variations: string[] = [address];

    // Street suffix variations
    variations.push(address.replace(/\b(st|street)\b/g, 'st'));
    variations.push(address.replace(/\b(ave|avenue)\b/g, 'ave'));
    variations.push(address.replace(/\b(rd|road)\b/g, 'rd'));
    variations.push(address.replace(/\b(dr|drive)\b/g, 'dr'));

    // Number variations
    variations.push(address.replace(/(\d+)(st|nd|rd|th)/g, '$1'));

    return variations;
  }

  /**
   * Levenshtein distance similarity
   */
  private static levenshteinSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0 || len2 === 0) return 0;

    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    return 1 - distance / Math.max(len1, len2);
  }
}

/**
 * Factory function to create duplicate detector
 */
export function createMLSDuplicateDetector(): IMLSDuplicateDetector {
  return new MLSDuplicateDetector();
}