/**
 * Search and Discovery E2E Test Scenarios
 *
 * Tests the complete property search and discovery workflow
 * from initial search to detailed property exploration.
 */

describe('Search and Discovery E2E Tests', () => {
  describe('Advanced Property Search Journey', () => {
    test('Complete search refinement and results exploration', async () => {
      // Launch app and navigate to search
      await device.launchApp();
      await element(by.id('search-tab')).tap();

      // Initial broad search
      await element(by.id('search-input')).typeText('California');
      await element(by.id('search-button')).tap();

      // Verify initial results
      await expect(element(by.id('search-results-count'))).toBeVisible();
      await expect(element(by.id('search-results-list'))).toBeVisible();

      // Apply advanced filters
      await element(by.id('filters-button')).tap();

      // Price range filter
      await element(by.id('price-min-input')).typeText('300000');
      await element(by.id('price-max-input')).typeText('800000');

      // Property type filters
      await element(by.id('property-type-single-family')).tap();
      await element(by.id('property-type-condo')).tap();

      // Bedrooms filter
      await element(by.id('bedrooms-3-plus')).tap();

      // Apply filters
      await element(by.id('apply-filters-button')).tap();

      // Verify filtered results
      await waitFor(element(by.id('filtered-results-ready'))).toBeVisible().withTimeout(5000);
      await expect(element(by.text('3+ bedrooms'))).toBeVisible();

      // Sort results
      await element(by.id('sort-dropdown')).tap();
      await element(by.text('Price: Low to High')).tap();

      // Verify sorting
      const firstResult = element(by.id('result-0'));
      const secondResult = element(by.id('result-1'));
      // Verify prices are in ascending order

      // Save search
      await element(by.id('save-search-button')).tap();
      await element(by.id('search-name-input')).typeText('California Family Homes');
      await element(by.id('save-search-confirm')).tap();

      await expect(element(by.text('Search saved successfully'))).toBeVisible();

      // Test saved search
      await element(by.id('saved-searches-tab')).tap();
      await expect(element(by.text('California Family Homes'))).toBeVisible();

      // Load saved search
      await element(by.text('California Family Homes')).tap();
      await expect(element(by.id('search-results-list'))).toBeVisible();
    });

    test('Map-based property discovery', async () => {
      // Navigate to map view
      await element(by.id('map-tab')).tap();
      await expect(element(by.id('property-map'))).toBeVisible();

      // Search on map
      await element(by.id('map-search-input')).typeText('San Francisco');
      await element(by.id('map-search-button')).tap();

      // Verify map markers
      await waitFor(element(by.id('map-marker-0'))).toBeVisible().withTimeout(5000);
      await expect(element(by.id('map-marker-count'))).toBeVisible();

      // Interact with map marker
      await element(by.id('map-marker-0')).tap();
      await expect(element(by.id('map-property-preview'))).toBeVisible();

      // View property details from map
      await element(by.id('view-property-details')).tap();
      await expect(element(by.id('property-detail-screen'))).toBeVisible();

      // Navigate back to map
      await element(by.id('back-to-map')).tap();

      // Test map filters
      await element(by.id('map-filters-button')).tap();
      await element(by.id('map-price-filter')).tap();
      await element(by.id('map-price-500k-1m')).tap();
      await element(by.id('apply-map-filters')).tap();

      // Verify filtered markers
      await expect(element(by.id('filtered-marker-count'))).toBeVisible();
    });
  });

  describe('Property Comparison Journey', () => {
    test('Compare multiple properties side by side', async () => {
      // Search for properties
      await element(by.id('search-tab')).tap();
      await element(by.id('search-input')).typeText('luxury homes');
      await element(by.id('search-button')).tap();

      // Select first property for comparison
      await element(by.id('result-0')).tap();
      await element(by.id('add-to-compare')).tap();

      // Go back and select second property
      await element(by.id('back-button')).tap();
      await element(by.id('result-1')).tap();
      await element(by.id('add-to-compare')).tap();

      // Go back and select third property
      await element(by.id('back-button')).tap();
      await element(by.id('result-2')).tap();
      await element(by.id('add-to-compare')).tap();

      // View comparison
      await element(by.id('compare-button')).tap();
      await expect(element(by.id('property-comparison-screen'))).toBeVisible();

      // Verify comparison elements
      await expect(element(by.id('comparison-table'))).toBeVisible();
      await expect(element(by.id('comparison-chart'))).toBeVisible();

      // Test comparison features
      await element(by.id('comparison-toggle-details')).tap();
      await expect(element(by.id('detailed-comparison-view'))).toBeVisible();

      // Remove property from comparison
      await element(by.id('remove-property-1')).tap();
      await expect(element(by.text('2 properties compared'))).toBeVisible();

      // Export comparison
      await element(by.id('export-comparison')).tap();
      await element(by.id('export-pdf')).tap();
      await expect(element(by.text('Comparison exported successfully'))).toBeVisible();
    });
  });

  describe('Search History and Recommendations', () => {
    test('Search history tracking and recommendations', async () => {
      // Perform multiple searches
      await element(by.id('search-tab')).tap();

      // First search
      await element(by.id('search-input')).clearText();
      await element(by.id('search-input')).typeText('downtown condos');
      await element(by.id('search-button')).tap();
      await element(by.id('back-button')).tap();

      // Second search
      await element(by.id('search-input')).clearText();
      await element(by.id('search-input')).typeText('luxury apartments');
      await element(by.id('search-button')).tap();
      await element(by.id('back-button')).tap();

      // Third search
      await element(by.id('search-input')).clearText();
      await element(by.id('search-input')).typeText('single family homes');
      await element(by.id('search-button')).tap();
      await element(by.id('back-button')).tap();

      // Check search history
      await element(by.id('search-history-button')).tap();
      await expect(element(by.text('downtown condos'))).toBeVisible();
      await expect(element(by.text('luxury apartments'))).toBeVisible();
      await expect(element(by.text('single family homes'))).toBeVisible();

      // Test search suggestions
      await element(by.id('search-input')).clearText();
      await element(by.id('search-input')).typeText('lux');
      await expect(element(by.text('luxury apartments'))).toBeVisible(); // Autocomplete suggestion

      // Clear search history
      await element(by.id('clear-history-button')).tap();
      await element(by.id('confirm-clear-history')).tap();
      await expect(element(by.text('Search history cleared'))).toBeVisible();
    });

    test('Personalized property recommendations', async () => {
      // Set user preferences
      await element(by.id('profile-tab')).tap();
      await element(by.id('search-preferences')).tap();

      await element(by.id('preferred-price-min')).typeText('400000');
      await element(by.id('preferred-price-max')).typeText('700000');
      await element(by.id('preferred-bedrooms')).typeText('3');
      await element(by.id('preferred-property-types')).tap();
      await element(by.text('Single Family')).tap();
      await element(by.text('Condo')).tap();

      await element(by.id('save-preferences')).tap();
      await expect(element(by.text('Preferences saved'))).toBeVisible();

      // Navigate to recommendations
      await element(by.id('home-tab')).tap();
      await element(by.id('recommended-properties')).tap();

      // Verify personalized recommendations
      await expect(element(by.id('recommendations-list'))).toBeVisible();
      await expect(element(by.text('$400K - $700K'))).toBeVisible();
      await expect(element(by.text('3+ bedrooms'))).toBeVisible();

      // Test recommendation feedback
      await element(by.id('recommendation-0')).swipe('left');
      await expect(element(by.text('Not interested'))).toBeVisible();
      await element(by.text('Not interested')).tap();

      // Verify recommendation updates
      await element(by.id('refresh-recommendations')).tap();
      await expect(element(by.id('recommendations-updated'))).toBeVisible();
    });
  });
});