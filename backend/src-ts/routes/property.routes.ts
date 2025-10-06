import { Router } from 'express';
import {
  createProperty,
  createPropertyValidation,
  getProperty,
  getProperties,
  getPropertiesValidation,
  updateProperty,
  updatePropertyValidation,
  deleteProperty,
  propertyIdValidation,
  getPropertyStatistics,
  searchProperties,
  getFeaturedProperties,
} from '../controllers/property.controller';

const router = Router();

// Note: Properties are public (no auth required for viewing)
// Only MLS sync service can create/update/delete properties

/**
 * @route   GET /api/v1/properties/stats
 * @desc    Get property statistics
 * @access  Public
 */
router.get('/stats', getPropertyStatistics);

/**
 * @route   GET /api/v1/properties/featured
 * @desc    Get featured properties (recently listed)
 * @access  Public
 */
router.get('/featured', getFeaturedProperties);

/**
 * @route   GET /api/v1/properties/search
 * @desc    Search properties by keyword
 * @access  Public
 */
router.get('/search', searchProperties);

/**
 * @route   GET /api/v1/properties
 * @desc    Get all properties with filtering and pagination
 * @access  Public
 */
router.get('/', getPropertiesValidation, getProperties);

/**
 * @route   POST /api/v1/properties
 * @desc    Create a new property (MLS sync only)
 * @access  Internal/Admin
 */
router.post('/', createPropertyValidation, createProperty);

/**
 * @route   GET /api/v1/properties/:id
 * @desc    Get a specific property by ID
 * @access  Public
 */
router.get('/:id', propertyIdValidation, getProperty);

/**
 * @route   PUT /api/v1/properties/:id
 * @desc    Update a property (MLS sync only)
 * @access  Internal/Admin
 */
router.put('/:id', updatePropertyValidation, updateProperty);

/**
 * @route   DELETE /api/v1/properties/:id
 * @desc    Delete a property (MLS sync only)
 * @access  Internal/Admin
 */
router.delete('/:id', propertyIdValidation, deleteProperty);

export default router;
