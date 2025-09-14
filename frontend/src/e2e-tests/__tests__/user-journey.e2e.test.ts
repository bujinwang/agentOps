/**
 * End-to-End Test Scenarios for Real Estate CRM
 *
 * These tests simulate complete user journeys through the application,
 * testing the entire flow from user interaction to backend response.
 *
 * Test Framework: Detox (React Native E2E Testing)
 * Can be adapted to other frameworks like Appium, Maestro, etc.
 */

describe('User Journey E2E Test Scenarios', () => {
  describe('New Agent Onboarding Journey', () => {
    test('Complete agent registration and first property listing', async () => {
      // Step 1: App Launch & Welcome
      await device.launchApp({ newInstance: true });
      await expect(element(by.id('welcome-screen'))).toBeVisible();

      // Step 2: Registration Flow
      await element(by.id('get-started-button')).tap();
      await element(by.id('create-account-button')).tap();

      // Fill registration form
      await element(by.id('first-name-input')).typeText('John');
      await element(by.id('last-name-input')).typeText('Agent');
      await element(by.id('email-input')).typeText('john.agent@example.com');
      await element(by.id('phone-input')).typeText('555-0123');
      await element(by.id('brokerage-input')).typeText('Premier Realty');
      await element(by.id('license-input')).typeText('CA-DRE-12345678');

      await element(by.id('password-input')).typeText('SecurePass123!');
      await element(by.id('confirm-password-input')).typeText('SecurePass123!');

      await element(by.id('terms-checkbox')).tap();
      await element(by.id('register-button')).tap();

      // Step 3: Email Verification
      await expect(element(by.id('verification-screen'))).toBeVisible();
      await element(by.id('enter-code-input')).typeText('123456'); // Mock verification code
      await element(by.id('verify-button')).tap();

      // Step 4: Profile Setup
      await expect(element(by.id('profile-setup-screen'))).toBeVisible();
      await element(by.id('upload-photo-button')).tap();
      // Simulate photo upload
      await element(by.id('camera-button')).tap();
      await element(by.id('take-photo-button')).tap();
      await element(by.id('use-photo-button')).tap();

      await element(by.id('specialties-input')).typeText('Residential, Investment Properties');
      await element(by.id('experience-years')).typeText('5');
      await element(by.id('service-areas')).typeText('Los Angeles, Orange County');

      await element(by.id('complete-profile-button')).tap();

      // Step 5: Dashboard Introduction
      await expect(element(by.id('dashboard-screen'))).toBeVisible();
      await expect(element(by.text('Welcome to Real Estate CRM'))).toBeVisible();

      // Step 6: First Property Listing
      await element(by.id('quick-actions-add-property')).tap();

      // Fill property details
      await element(by.id('property-address-autocomplete')).typeText('123 Main St, Anytown CA');
      await element(by.id('property-type-single-family')).tap();
      await element(by.id('property-price')).typeText('500000');
      await element(by.id('property-bedrooms')).swipe('up', 'fast', 0.5); // Swipe to select 3
      await element(by.id('property-bathrooms')).swipe('up', 'fast', 0.5); // Swipe to select 2
      await element(by.id('property-square-footage')).typeText('2000');

      // Add property photos
      await element(by.id('add-photos-button')).tap();
      await element(by.id('photo-library-button')).tap();
      // Select multiple photos
      await element(by.id('photo-1')).tap();
      await element(by.id('photo-2')).tap();
      await element(by.id('photo-3')).tap();
      await element(by.id('select-photos-done')).tap();

      // Add description
      await element(by.id('property-description')).typeText(
        'Beautiful single family home in quiet neighborhood. Features include hardwood floors, updated kitchen, and large backyard.'
      );

      await element(by.id('save-property-button')).tap();

      // Step 7: Verify Property Listed
      await expect(element(by.text('Property listed successfully!'))).toBeVisible();
      await expect(element(by.text('123 Main St'))).toBeVisible();

      // Step 8: Generate CMA
      await element(by.text('123 Main St')).tap();
      await element(by.id('generate-cma-button')).tap();

      // Configure CMA settings
      await element(by.id('cma-search-radius')).swipe('up', 'fast', 0.5); // Set to 2 miles
      await element(by.id('cma-date-range-90-days')).tap();
      await element(by.id('cma-include-pending')).tap(); // Include pending sales

      await element(by.id('run-cma-analysis')).tap();

      // Wait for CMA results
      await waitFor(element(by.id('cma-results-ready'))).toBeVisible().withTimeout(15000);

      // Step 9: Review CMA Results
      await expect(element(by.id('cma-price-range'))).toBeVisible();
      await expect(element(by.id('cma-market-value'))).toBeVisible();
      await expect(element(by.id('cma-comparables-count'))).toBeVisible();

      // Step 10: Export CMA Report
      await element(by.id('export-cma-report')).tap();
      await element(by.id('export-pdf')).tap();
      await expect(element(by.text('CMA Report exported successfully'))).toBeVisible();

      // Step 11: Complete Onboarding
      await element(by.id('back-to-dashboard')).tap();
      await expect(element(by.id('onboarding-complete-modal'))).toBeVisible();
      await element(by.id('start-using-app')).tap();

      // Verify dashboard shows new property
      await expect(element(by.text('123 Main St'))).toBeVisible();
      await expect(element(by.text('$500,000'))).toBeVisible();
    });
  });

  describe('Lead Management Journey', () => {
    test('Lead capture, qualification, and conversion tracking', async () => {
      // Step 1: Lead Capture from Property Inquiry
      await element(by.id('properties-tab')).tap();
      await element(by.text('123 Main St')).tap();
      await element(by.id('inquire-button')).tap();

      // Fill inquiry form
      await element(by.id('inquiry-name')).typeText('Sarah Buyer');
      await element(by.id('inquiry-email')).typeText('sarah.buyer@email.com');
      await element(by.id('inquiry-phone')).typeText('555-0456');
      await element(by.id('inquiry-message')).typeText(
        'I am very interested in this property. Can we schedule a showing this weekend?'
      );

      await element(by.id('submit-inquiry')).tap();
      await expect(element(by.text('Inquiry sent successfully'))).toBeVisible();

      // Step 2: Lead Appears in CRM
      await element(by.id('leads-tab')).tap();
      await expect(element(by.text('Sarah Buyer'))).toBeVisible();
      await expect(element(by.text('New Inquiry')).toBeVisible();

      // Step 3: Lead Qualification
      await element(by.text('Sarah Buyer')).tap();

      // Update lead information
      await element(by.id('lead-budget')).typeText('550000');
      await element(by.id('lead-timeline')).tap();
      await element(by.text('30-60 days')).tap();

      await element(by.id('lead-prequalified')).tap();
      await element(by.id('lead-motivation')).tap();
      await element(by.text('Ready to buy')).tap();

      await element(by.id('save-lead-info')).tap();

      // Step 4: Schedule Showing
      await element(by.id('schedule-showing-button')).tap();
      await element(by.id('showing-date')).tap();
      // Select date (would use date picker)
      await element(by.id('showing-time')).tap();
      await element(by.text('2:00 PM')).tap();

      await element(by.id('confirm-showing')).tap();
      await expect(element(by.text('Showing scheduled for tomorrow at 2:00 PM'))).toBeVisible();

      // Step 5: Lead Scoring Update
      await element(by.id('update-lead-score')).tap();
      await element(by.id('score-budget-fit')).swipe('right', 'fast', 0.8); // High score
      await element(by.id('score-timeline')).swipe('right', 'fast', 0.9); // Very high score
      await element(by.id('score-motivation')).swipe('right', 'fast', 0.7); // Good score

      await element(by.id('calculate-score')).tap();
      await expect(element(by.text('Lead Score: 87/100'))).toBeVisible();

      // Step 6: Send Follow-up
      await element(by.id('send-follow-up')).tap();
      await element(by.id('follow-up-template')).tap();
      await element(by.text('Post-Showing Follow-up')).tap();

      await element(by.id('personalize-message')).typeText(
        'Thank you for touring 123 Main St. I hope you loved the space as much as I do!'
      );

      await element(by.id('send-follow-up')).tap();
      await expect(element(by.text('Follow-up sent successfully'))).toBeVisible();

      // Step 7: Track Conversion
      await element(by.id('mark-as-converted')).tap();
      await element(by.id('conversion-type')).tap();
      await element(by.text('Property Purchase')).tap();

      await element(by.id('conversion-value')).typeText('500000');
      await element(by.id('conversion-date')).tap();
      // Select today's date

      await element(by.id('complete-conversion')).tap();
      await expect(element(by.text('Lead converted successfully!'))).toBeVisible();

      // Step 8: Verify Analytics Update
      await element(by.id('analytics-tab')).tap();
      await expect(element(by.id('conversion-rate-chart'))).toBeVisible();
      await expect(element(by.text('1 conversion this month'))).toBeVisible();
      await expect(element(by.text('$500,000 total value')).toBeVisible();
    });
  });

  describe('Market Research Journey', () => {
    test('Comprehensive market analysis and reporting', async () => {
      // Step 1: Access Market Analytics
      await element(by.id('analytics-tab')).tap();
      await element(by.id('market-research-section')).tap();

      // Step 2: Set Analysis Parameters
      await element(by.id('market-area-selector')).tap();
      await element(by.text('Downtown District')).tap();

      await element(by.id('analysis-timeframe')).tap();
      await element(by.text('Last 12 months')).tap();

      await element(by.id('property-types')).tap();
      await element(by.text('Single Family')).tap();
      await element(by.text('Condo')).tap();
      await element(by.id('apply-filters')).tap();

      // Step 3: Generate Market Report
      await element(by.id('generate-market-report')).tap();

      // Wait for analysis completion
      await waitFor(element(by.id('market-report-ready'))).toBeVisible().withTimeout(20000);

      // Step 4: Review Market Overview
      await expect(element(by.id('market-overview-summary'))).toBeVisible();
      await expect(element(by.id('price-trends-chart'))).toBeVisible();
      await expect(element(by.id('inventory-levels'))).toBeVisible();
      await expect(element(by.id('days-on-market'))).toBeVisible();

      // Step 5: Analyze Neighborhood Data
      await element(by.id('neighborhood-breakdown')).tap();
      await expect(element(by.id('neighborhood-comparison'))).toBeVisible();
      await expect(element(by.id('demographics-data'))).toBeVisible();
      await expect(element(by.id('amenities-analysis'))).toBeVisible();

      // Step 6: Review Economic Indicators
      await element(by.id('economic-indicators')).tap();
      await expect(element(by.id('interest-rates-chart'))).toBeVisible();
      await expect(element(by.id('employment-data'))).toBeVisible();
      await expect(element(by.id('population-growth'))).toBeVisible();

      // Step 7: Generate Forecast
      await element(by.id('generate-forecast')).tap();
      await element(by.id('forecast-period')).tap();
      await element(by.text('6 months')).tap();

      await element(by.id('run-forecast')).tap();
      await waitFor(element(by.id('forecast-results'))).toBeVisible().withTimeout(10000);

      // Step 8: Review Forecast Data
      await expect(element(by.id('price-projection-chart'))).toBeVisible();
      await expect(element(by.id('market-confidence-level'))).toBeVisible();
      await expect(element(by.id('risk-factors'))).toBeVisible();

      // Step 9: Export Comprehensive Report
      await element(by.id('export-market-report')).tap();
      await element(by.id('report-format')).tap();
      await element(by.text('Full PDF Report')).tap();

      await element(by.id('include-charts')).tap();
      await element(by.id('include-forecast')).tap();
      await element(by.id('include-raw-data')).tap();

      await element(by.id('generate-report')).tap();
      await waitFor(element(by.text('Market report exported successfully'))).toBeVisible().withTimeout(15000);

      // Step 10: Save Report Template
      await element(by.id('save-as-template')).tap();
      await element(by.id('template-name')).typeText('Downtown Market Analysis');
      await element(by.id('template-description')).typeText('Comprehensive market analysis for downtown district');
      await element(by.id('save-template')).tap();

      await expect(element(by.text('Template saved successfully'))).toBeVisible();

      // Step 11: Schedule Recurring Report
      await element(by.id('schedule-report')).tap();
      await element(by.id('schedule-frequency')).tap();
      await element(by.text('Monthly')).tap();

      await element(by.id('schedule-recipients')).typeText('manager@agency.com, analyst@agency.com');
      await element(by.id('schedule-start-date')).tap();
      // Select next month

      await element(by.id('create-schedule')).tap();
      await expect(element(by.text('Recurring report scheduled'))).toBeVisible();
    });
  });
});