import {
  PropertyCreate,
  PropertyUpdate,
  validatePropertyAddress,
  validatePropertyPrice
} from '../types/property';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

/**
 * Comprehensive property validation
 */
export function validateProperty(property: PropertyCreate | PropertyUpdate): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // Required field validation
  if (!property.property_type) {
    errors.property_type = 'Property type is required';
  }

  if (!property.listing_type) {
    errors.listing_type = 'Listing type is required';
  }

  // Address validation
  const addressValidation = validatePropertyAddress(property.address);
  if (!addressValidation.isValid) {
    Object.assign(errors, addressValidation.errors);
  }

  // Price validation
  const priceValidation = validatePropertyPrice(property);
  if (!priceValidation.isValid) {
    Object.assign(errors, priceValidation.errors);
  }

  // Property details validation
  if (property.details) {
    const detailsErrors = validatePropertyDetails(property.details);
    Object.assign(errors, detailsErrors);
  }

  // Features validation
  if (property.features) {
    const featuresErrors = validatePropertyFeatures(property.features);
    Object.assign(errors, featuresErrors);
  }

  // Business logic validations
  const businessErrors = validateBusinessLogic(property);
  Object.assign(errors, businessErrors);

  // Generate warnings
  warnings.push(...generateWarnings(property));

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

/**
 * Validate property details
 */
function validatePropertyDetails(details: any): Record<string, string> {
  const errors: Record<string, string> = {};

  // Bedrooms validation
  if (details.bedrooms !== undefined && (details.bedrooms < 0 || details.bedrooms > 20)) {
    errors['details.bedrooms'] = 'Bedrooms must be between 0 and 20';
  }

  // Bathrooms validation
  if (details.bathrooms !== undefined && (details.bathrooms < 0 || details.bathrooms > 20)) {
    errors['details.bathrooms'] = 'Bathrooms must be between 0 and 20';
  }

  // Square feet validation
  if (details.square_feet !== undefined && (details.square_feet < 0 || details.square_feet > 100000)) {
    errors['details.square_feet'] = 'Square feet must be between 0 and 100,000';
  }

  // Lot size validation
  if (details.lot_size !== undefined && (details.lot_size < 0 || details.lot_size > 1000)) {
    errors['details.lot_size'] = 'Lot size must be between 0 and 1,000 acres';
  }

  // Year built validation
  if (details.year_built !== undefined) {
    const currentYear = new Date().getFullYear();
    if (details.year_built < 1800 || details.year_built > currentYear + 1) {
      errors['details.year_built'] = `Year built must be between 1800 and ${currentYear + 1}`;
    }
  }

  return errors;
}

/**
 * Validate property features
 */
function validatePropertyFeatures(features: any): Record<string, string> {
  const errors: Record<string, string> = {};

  // Check for excessively long feature lists
  const maxFeatures = 50;
  const totalFeatures = (features.interior?.length || 0) +
                       (features.exterior?.length || 0) +
                       (features.appliances?.length || 0) +
                       (features.utilities?.length || 0) +
                       (features.community?.length || 0);

  if (totalFeatures > maxFeatures) {
    errors.features = `Too many features listed (${totalFeatures}). Maximum allowed: ${maxFeatures}`;
  }

  return errors;
}

/**
 * Validate business logic
 */
function validateBusinessLogic(property: PropertyCreate | PropertyUpdate): Record<string, string> {
  const errors: Record<string, string> = {};

  // MLS number format validation
  if (property.mls_number && !/^[A-Z0-9]{6,12}$/i.test(property.mls_number)) {
    errors.mls_number = 'MLS number must be 6-12 alphanumeric characters';
  }

  // Title length validation
  if (property.title && property.title.length > 200) {
    errors.title = 'Title must be 200 characters or less';
  }

  // Description length validation
  if (property.description && property.description.length > 5000) {
    errors.description = 'Description must be 5,000 characters or less';
  }

  // Public remarks length validation
  if (property.public_remarks && property.public_remarks.length > 2000) {
    errors.public_remarks = 'Public remarks must be 2,000 characters or less';
  }

  return errors;
}

/**
 * Generate validation warnings
 */
function generateWarnings(property: PropertyCreate | PropertyUpdate): string[] {
  const warnings: string[] = [];

  // Missing optional but recommended fields
  if (!property.title) {
    warnings.push('Consider adding a title for better property presentation');
  }

  if (!property.description) {
    warnings.push('Consider adding a description to provide more details about the property');
  }

  if (!property.mls_number) {
    warnings.push('Consider adding an MLS number for professional listings');
  }

  // Price warnings
  if (property.price && property.price > 10000000) {
    warnings.push('High property price detected - please verify this is correct');
  }

  // Year built warnings
  if (property.details?.year_built && property.details.year_built < 1950) {
    warnings.push('Property built before 1950 may require additional inspections');
  }

  return warnings;
}

/**
 * Sanitize property data before submission
 */
export function sanitizePropertyData(property: PropertyCreate | PropertyUpdate): PropertyCreate | PropertyUpdate {
  const sanitized = { ...property };

  // Trim string fields
  if (sanitized.title) sanitized.title = sanitized.title.trim();
  if (sanitized.description) sanitized.description = sanitized.description.trim();
  if (sanitized.public_remarks) sanitized.public_remarks = sanitized.public_remarks?.trim();
  if (sanitized.mls_number) sanitized.mls_number = sanitized.mls_number.trim().toUpperCase();

  // Address sanitization
  if (sanitized.address) {
    sanitized.address = {
      ...sanitized.address,
      street: sanitized.address.street?.trim(),
      city: sanitized.address.city?.trim(),
      state: sanitized.address.state?.trim().toUpperCase(),
      zip_code: sanitized.address.zip_code?.trim(),
      country: sanitized.address.country?.trim().toUpperCase() || 'US',
      neighborhood: sanitized.address.neighborhood?.trim(),
      county: sanitized.address.county?.trim()
    };
  }

  // Features sanitization
  if (sanitized.features) {
    sanitized.features = {
      interior: sanitized.features.interior?.map(f => f.trim()).filter(f => f.length > 0) || [],
      exterior: sanitized.features.exterior?.map(f => f.trim()).filter(f => f.length > 0) || [],
      appliances: sanitized.features.appliances?.map(f => f.trim()).filter(f => f.length > 0) || [],
      utilities: sanitized.features.utilities?.map(f => f.trim()).filter(f => f.length > 0) || [],
      community: sanitized.features.community?.map(f => f.trim()).filter(f => f.length > 0) || []
    };
  }

  return sanitized;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string>): string[] {
  return Object.entries(errors).map(([field, message]) => {
    const fieldName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    return `${fieldName}: ${message}`;
  });
}

/**
 * Check if property data has changed
 */
export function hasPropertyChanged(original: any, updated: any): boolean {
  return JSON.stringify(original) !== JSON.stringify(updated);
}