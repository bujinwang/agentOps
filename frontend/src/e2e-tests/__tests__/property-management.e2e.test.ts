import { device, element, by, waitFor } from 'detox';

describe('Property Management E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Complete Property Listing Workflow', () => {
    it('should create, edit, and manage a property listing', async () => {
      // Step 1: Navigate to property creation
      await element(by.id('properties-tab')).tap();
      await element(by.id('add-property-button')).tap();

      // Step 2: Fill out property details
      await element(by.id('property-address-street')).typeText('123 Main Street');
      await element(by.id('property-address-city')).typeText('Anytown');
      await element(by.id('property-address-state')).typeText('CA');
      await element(by.id('property-address-zip')).typeText('12345');

      await element(by.id('property-type-picker')).tap();
      await element(by.text('Single Family')).tap();

      await element(by.id('property-price')).typeText('500000');
      await element(by.id('property-bedrooms')).typeText('3');
      await element(by.id('property-bathrooms')).typeText('2');
      await element(by.id('property-square-footage')).typeText('2000');

      // Step 3: Add property description
      await element(by.id('property-description')).typeText('Beautiful single family home with modern amenities');

      // Step 4: Upload property images
      await element(by.id('add-photos-button')).tap();
      // Simulate photo selection (would need device permissions in real test)
      await element(by.id('photo-library-button')).tap();
      await waitFor(element(by.id('photo-1'))).toBeVisible().withTimeout(5000);
      await element(by.id('select-photos-done')).tap();

      // Step 5: Save property
      await element(by.id('save-property-button')).tap();

      // Step 6: Verify property appears in list
      await waitFor(element(by.text('123 Main Street'))).toBeVisible().withTimeout(5000);
      await expect(element(by.text('$500,000'))).toBeVisible();

      // Step 7: Edit property
      await element(by.text('123 Main Street')).tap();
      await element(by.id('edit-property-button')).tap();

      await element(by.id('property-price')).clearText();
      await element(by.id('property-price')).typeText('525000');
      await element(by.id('save-property-button')).tap();

      // Step 8: Verify price update
      await waitFor(element(by.text('$525,000'))).toBeVisible().withTimeout(5000);

      // Step 9: Change property status
      await element(by.id('property-status-dropdown')).tap();
      await element(by.text('Pending')).tap();

      // Step 10: Verify status change
      await expect(element(by.text('Pending'))).toBeVisible();
    });

    it('should handle property search and filtering', async () => {
      // Navigate to search
      await element(by.id('search-tab')).tap();

      // Enter search criteria
      await element(by.id('search-input')).typeText('Anytown');

      // Apply filters
      await element(by.id('filters-button')).tap();
      await element(by.id('price-min')).typeText('400000');
      await element(by.id('price-max')).typeText('600000');
      await element(by.id('bedrooms-min')).typeText('3');

      await element(by.id('property-type-filter')).tap();
      await element(by.text('Single Family')).tap();

      await element(by.id('apply-filters-button')).tap();

      // Verify search results
      await waitFor(element(by.id('search-results-list'))).toBeVisible().withTimeout(5000);
      await expect(element(by.text('123 Main Street'))).toBeVisible();

      // Test sorting
      await element(by.id('sort-button')).tap();
      await element(by.text('Price: High to Low')).tap();

      // Verify results are sorted
      const firstResult = element(by.id('search-result-0'));
      await expect(firstResult).toBeVisible();
    });
  });

  describe('Property Details and Interaction', () => {
    it('should display comprehensive property details', async () => {
      // Navigate to property details
      await element(by.id('properties-tab')).tap();
      await element(by.text('123 Main Street')).tap();

      // Verify all property information is displayed
      await expect(element(by.text('123 Main Street'))).toBeVisible();
      await expect(element(by.text('Anytown, CA 12345'))).toBeVisible();
      await expect(element(by.text('$525,000'))).toBeVisible();
      await expect(element(by.text('3 bed • 2 bath • 2,000 sqft'))).toBeVisible();
      await expect(element(by.text('Single Family'))).toBeVisible();

      // Check property images
      await expect(element(by.id('property-image-gallery'))).toBeVisible();

      // Verify description
      await expect(element(by.text('Beautiful single family home with modern amenities'))).toBeVisible();

      // Check for map view
      await element(by.id('map-tab')).tap();
      await expect(element(by.id('property-map'))).toBeVisible();
    });

    it('should handle property sharing and saving', async () => {
      // Navigate to property
      await element(by.text('123 Main Street')).tap();

      // Save property to favorites
      await element(by.id('favorite-button')).tap();
      await expect(element(by.id('favorite-button-filled'))).toBeVisible();

      // Share property
      await element(by.id('share-button')).tap();
      await expect(element(by.id('share-options-modal'))).toBeVisible();

      // Test different share options
      await element(by.text('Email')).tap();
      await expect(element(by.id('email-compose-screen'))).toBeVisible();

      // Go back and test another share option
      await element(by.id('back-button')).tap();
      await element(by.text('SMS')).tap();
      await expect(element(by.id('sms-compose-screen'))).toBeVisible();
    });
  });

  describe('Property Analytics and Insights', () => {
    it('should generate and display CMA analysis', async () => {
      // Navigate to property
      await element(by.text('123 Main Street')).tap();

      // Request CMA analysis
      await element(by.id('cma-button')).tap();

      // Fill CMA criteria
      await element(by.id('cma-radius')).typeText('2');
      await element(by.id('cma-date-range')).tap();
      await element(by.text('90 days')).tap();

      await element(by.id('generate-cma-button')).tap();

      // Wait for CMA results
      await waitFor(element(by.id('cma-results'))).toBeVisible().withTimeout(10000);

      // Verify CMA components
      await expect(element(by.id('cma-price-range'))).toBeVisible();
      await expect(element(by.id('cma-comparables-list'))).toBeVisible();
      await expect(element(by.id('cma-statistics'))).toBeVisible();
      await expect(element(by.id('cma-recommendations'))).toBeVisible();

      // Test CMA export
      await element(by.id('export-cma-button')).tap();
      await element(by.text('PDF Report')).tap();
      await waitFor(element(by.text('Report generated successfully'))).toBeVisible().withTimeout(5000);
    });

    it('should display market trends and analytics', async () => {
      // Navigate to analytics
      await element(by.id('analytics-tab')).tap();

      // Check market overview
      await expect(element(by.id('market-overview'))).toBeVisible();
      await expect(element(by.id('price-trends-chart'))).toBeVisible();

      // Test neighborhood analysis
      await element(by.id('neighborhood-analysis')).tap();
      await expect(element(by.id('neighborhood-demographics'))).toBeVisible();
      await expect(element(by.id('neighborhood-trends'))).toBeVisible();

      // Test forecast view
      await element(by.id('forecast-tab')).tap();
      await expect(element(by.id('price-forecast-chart'))).toBeVisible();
      await expect(element(by.id('market-indicators'))).toBeVisible();
    });
  });
});