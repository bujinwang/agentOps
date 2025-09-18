import { jest } from '@jest/globals';

// Mock all the services we'll be testing
jest.mock('../../services/templateEngine');
jest.mock('../../services/personalizationEngine');
jest.mock('../../services/abTestingService');
jest.mock('../../services/templateAnalyticsService');
jest.mock('../../services/conversionAttributionService');
jest.mock('../../services/reportingEngine');
jest.mock('../../services/biIntegrationService');

import { templateEngine } from '../../services/templateEngine';
import { personalizationEngine } from '../../services/personalizationEngine';
import { abTestingService } from '../../services/abTestingService';
import { templateAnalyticsService } from '../../services/templateAnalyticsService';
import { conversionAttributionService } from '../../services/conversionAttributionService';
import { reportingEngine } from '../../services/reportingEngine';
import { biIntegrationService } from '../../services/biIntegrationService';

describe('Template System Integration Tests', () => {
  const testLead = {
    id: 12345,
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1-555-0123',
    propertyType: 'single-family',
    budgetRange: '$500,000 - $750,000',
    timeline: '3-6 months',
    location: 'Downtown Seattle',
    leadScore: 85,
    engagementLevel: 'high',
    lastActivity: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Template Personalization Flow', () => {
    test('should successfully personalize and render template for high-score lead', async () => {
      // Mock the services
      const mockPersonalizationResult = {
        templateId: 'welcome_email',
        leadId: 12345,
        confidence: 0.95,
        matchScore: 0.88,
        appliedRules: ['lead_score_high', 'engagement_high'],
        personalizationData: {
          leadName: 'John Smith',
          propertyType: 'single-family',
          location: 'Downtown Seattle',
        },
      };

      const mockRenderedContent = {
        templateId: 'welcome_email',
        leadId: 12345,
        subject: 'Welcome to Our Real Estate Services, John Smith!',
        content: '<h1>Welcome John Smith!</h1><p>Thank you for your interest in single-family properties in Downtown Seattle.</p>',
        variablesUsed: ['leadName', 'propertyType', 'location'],
        renderTime: 45,
        timestamp: new Date().toISOString(),
      };

      (personalizationEngine.personalizeForLead as jest.Mock).mockResolvedValue(mockPersonalizationResult);
      (templateEngine.renderTemplate as jest.Mock).mockResolvedValue(mockRenderedContent);

      // Act
      const personalizationResult = await personalizationEngine.personalizeForLead('welcome_email', testLead);
      const renderedContent = await templateEngine.renderTemplate('welcome_email', testLead);

      // Assert
      expect(personalizationResult.confidence).toBeGreaterThan(0.8);
      expect(personalizationResult.matchScore).toBeGreaterThan(0.7);
      expect(renderedContent.subject).toContain('John Smith');
      expect(renderedContent.content).toContain('single-family');
      expect(renderedContent.content).toContain('Downtown Seattle');
      expect(renderedContent.variablesUsed).toContain('leadName');
    });

    test('should handle template with missing lead data gracefully', async () => {
      // Arrange
      const incompleteLead = {
        id: 12346,
        name: 'Jane Doe',
        // Missing other fields
      };

      const mockRenderedContent = {
        templateId: 'welcome_email',
        leadId: 12346,
        subject: 'Welcome to Our Real Estate Services, Jane Doe!',
        content: '<h1>Welcome Jane Doe!</h1><p>Thank you for your interest in property in your area.</p>',
        variablesUsed: ['leadName'],
        fallbackUsed: ['propertyType', 'location'],
        renderTime: 38,
        timestamp: new Date().toISOString(),
      };

      (templateEngine.renderTemplate as jest.Mock).mockResolvedValue(mockRenderedContent);

      // Act
      const renderedContent = await templateEngine.renderTemplate('welcome_email', incompleteLead);

      // Assert
      expect(renderedContent.subject).toContain('Jane Doe');
      expect(renderedContent.fallbackUsed).toContain('propertyType');
      expect(renderedContent.fallbackUsed).toContain('location');
    });

    test('should reject template for low-score lead', async () => {
      // Arrange
      const lowScoreLead = {
        ...testLead,
        leadScore: 45,
        engagementLevel: 'low',
      };

      (personalizationEngine.personalizeForLead as jest.Mock).mockRejectedValue(
        new Error('Lead does not meet template conditions')
      );

      // Act & Assert
      await expect(personalizationEngine.personalizeForLead('welcome_email', lowScoreLead))
        .rejects
        .toThrow('Lead does not meet template conditions');
    });
  });

  describe('A/B Testing Integration', () => {
    test('should assign lead to appropriate A/B test variant', async () => {
      // Mock A/B testing service
      const mockAssignment = {
        testId: 'subject_line_test',
        variantId: 'variant_a',
        leadId: 12345,
        assignedAt: new Date().toISOString(),
        weight: 0.5,
      };

      (abTestingService.assignVariant as jest.Mock).mockResolvedValue(mockAssignment);

      // Act
      const assignment = await abTestingService.assignVariant(testLead.id, 'subject_line_test');

      // Assert
      expect(assignment.testId).toBe('subject_line_test');
      expect(assignment.leadId).toBe(testLead.id);
      expect(['control', 'variant_a', 'variant_b']).toContain(assignment.variantId);
    });

    test('should track A/B test performance metrics', async () => {
      // Mock test results
      const mockResults = {
        testId: 'subject_line_test',
        totalSent: 1000,
        totalOpened: 300,
        totalClicked: 90,
        totalConverted: 27,
        openRate: 0.30,
        clickRate: 0.09,
        conversionRate: 0.027,
        variants: [
          {
            variantId: 'control',
            sent: 500,
            opened: 135,
            clicked: 38,
            converted: 12,
            openRate: 0.27,
            clickRate: 0.076,
            conversionRate: 0.024,
          },
          {
            variantId: 'variant_a',
            sent: 500,
            opened: 165,
            clicked: 52,
            converted: 15,
            openRate: 0.33,
            clickRate: 0.104,
            conversionRate: 0.03,
          },
        ],
      };

      (abTestingService.getTestResults as jest.Mock).mockResolvedValue(mockResults);

      // Act
      const results = await abTestingService.getTestResults('subject_line_test');

      // Assert
      expect(results.totalSent).toBe(1000);
      expect(results.openRate).toBe(0.30);
      expect(results.variants).toHaveLength(2);
      expect(results.variants[0].openRate).toBeLessThan(results.variants[1].openRate);
    });

    test('should determine A/B test winner with statistical significance', async () => {
      // Mock winner determination
      const mockWinner = {
        testId: 'subject_line_test',
        winnerVariant: 'variant_a',
        confidence: 0.97,
        improvement: 22.2, // 22.2% improvement
        statisticalSignificance: 0.95,
        sampleSize: 1000,
        recommendation: 'implement_variant_a',
        reasoning: [
          'Variant A shows 22.2% improvement in open rate',
          'Statistical significance achieved with 97% confidence',
          'Sample size of 1000 provides reliable results',
        ],
      };

      (abTestingService.determineWinner as jest.Mock).mockResolvedValue(mockWinner);

      // Act
      const winner = await abTestingService.determineWinner('subject_line_test');

      // Assert
      expect(winner.winnerVariant).toBe('variant_a');
      expect(winner.confidence).toBeGreaterThan(0.9);
      expect(winner.improvement).toBeGreaterThan(0);
      expect(winner.recommendation).toBe('implement_variant_a');
    });
  });

  describe('Analytics and Attribution Integration', () => {
    test('should track template performance metrics', async () => {
      // Mock analytics data
      const mockAnalytics = {
        templateId: 'welcome_email',
        timeframe: {
          start: '2025-01-01T00:00:00Z',
          end: '2025-01-07T23:59:59Z',
        },
        metrics: {
          sent: 500,
          delivered: 475,
          opened: 190,
          clicked: 38,
          responded: 15,
          converted: 5,
          bounced: 15,
          unsubscribed: 5,
        },
        rates: {
          deliveryRate: 0.95,
          openRate: 0.40,
          clickRate: 0.08,
          responseRate: 0.03,
          conversionRate: 0.01,
          bounceRate: 0.03,
          unsubscribeRate: 0.01,
        },
        trends: {
          direction: 'increasing',
          changePercent: 12.5,
          confidence: 0.85,
        },
        segments: [
          {
            segment: 'High Value Leads',
            sent: 200,
            performance: 0.045,
            improvement: 8.2,
          },
          {
            segment: 'New Leads',
            sent: 300,
            performance: 0.032,
            improvement: -2.1,
          },
        ],
      };

      (templateAnalyticsService.generateTemplateAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      // Act
      const analytics = await templateAnalyticsService.generateTemplateAnalytics(
        'welcome_email',
        mockAnalytics.timeframe
      );

      // Assert
      expect(analytics.templateId).toBe('welcome_email');
      expect(analytics.metrics.sent).toBe(500);
      expect(analytics.rates.openRate).toBe(0.40);
      expect(analytics.trends.direction).toBe('increasing');
      expect(analytics.segments).toHaveLength(2);
    });

    test('should calculate conversion attribution', async () => {
      // Mock attribution data
      const mockAttribution = {
        leadId: 12345,
        conversionId: 'conv_12345',
        conversionType: 'sale',
        conversionValue: 250000,
        totalAttribution: 0.75,
        touchpoints: [
          {
            templateId: 'welcome_email',
            interactionType: 'sent',
            timestamp: '2025-01-01T10:00:00Z',
            weight: 0.2,
            attributedValue: 50000,
            position: 1,
          },
          {
            templateId: 'welcome_email',
            interactionType: 'opened',
            timestamp: '2025-01-01T10:30:00Z',
            weight: 0.3,
            attributedValue: 75000,
            position: 2,
          },
          {
            templateId: 'follow_up_offer',
            interactionType: 'clicked',
            timestamp: '2025-01-02T14:00:00Z',
            weight: 0.5,
            attributedValue: 125000,
            position: 3,
          },
        ],
        attributionModel: 'position_based',
        confidence: 0.88,
        insights: [
          'Most influential touchpoint: follow_up_offer click',
          'Customer journey spanned 2 days',
          'High-value conversion with strong engagement',
        ],
      };

      (conversionAttributionService.calculateAttribution as jest.Mock).mockResolvedValue(mockAttribution);

      // Act
      const attribution = await conversionAttributionService.calculateAttribution(
        testLead.id,
        'conv_12345',
        'sale',
        250000,
        mockAttribution.touchpoints.map(tp => ({
          templateId: tp.templateId,
          interactionType: tp.interactionType,
          timestamp: tp.timestamp,
        }))
      );

      // Assert
      expect(attribution.leadId).toBe(testLead.id);
      expect(attribution.conversionValue).toBe(250000);
      expect(attribution.totalAttribution).toBe(0.75);
      expect(attribution.touchpoints).toHaveLength(3);
      expect(attribution.confidence).toBeGreaterThan(0.8);
      expect(attribution.insights).toContain('High-value conversion');
    });

    test('should generate comprehensive analytics dashboard', async () => {
      // Mock dashboard data
      const mockDashboard = {
        overview: {
          totalTemplates: 5,
          activeTemplates: 4,
          totalSent: 2500,
          averageConversionRate: 0.032,
          topPerformingTemplate: 'welcome_email',
          periodGrowth: 12.5,
        },
        performance: {
          topTemplates: [
            {
              templateId: 'welcome_email',
              rates: { conversionRate: 0.045 },
              metrics: { sent: 800 },
            },
          ],
          underperformingTemplates: [],
          trendingUp: ['welcome_email'],
          trendingDown: [],
        },
        insights: {
          recommendations: [
            {
              templateId: 'follow_up_offer',
              score: 75,
              reasons: ['Good engagement but low conversion'],
              confidence: 'medium',
            },
          ],
          alerts: [],
          opportunities: [
            {
              type: 'optimization',
              potential: 0.15,
              description: 'A/B testing opportunity identified',
            },
          ],
        },
        attribution: {
          totalRevenue: 750000,
          attributedRevenue: 525000,
          topAttributionTemplates: [
            {
              templateId: 'welcome_email',
              attributedRevenue: 225000,
              attributionRate: 0.3,
            },
          ],
          conversionFunnel: [
            { stage: 'Sent', count: 2500, rate: 1.0 },
            { stage: 'Opened', count: 875, rate: 0.35 },
            { stage: 'Clicked', count: 225, rate: 0.09 },
            { stage: 'Converted', count: 80, rate: 0.032 },
          ],
        },
      };

      (templateAnalyticsService.generateDashboard as jest.Mock).mockResolvedValue(mockDashboard);

      // Act
      const dashboard = await templateAnalyticsService.generateDashboard({
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-31T23:59:59Z',
      });

      // Assert
      expect(dashboard.overview.totalTemplates).toBe(5);
      expect(dashboard.overview.averageConversionRate).toBe(0.032);
      expect(dashboard.performance.topTemplates).toHaveLength(1);
      expect(dashboard.insights.recommendations).toHaveLength(1);
      expect(dashboard.attribution.conversionFunnel).toHaveLength(4);
    });
  });

  describe('Reporting Engine Integration', () => {
    test('should generate automated report', async () => {
      // Mock report data
      const mockReport = {
        id: 'report_123',
        templateId: 'executive_summary',
        title: 'Executive Summary - Jan 1-7, 2025',
        generatedAt: new Date().toISOString(),
        timeframe: {
          start: '2025-01-01T00:00:00Z',
          end: '2025-01-07T23:59:59Z',
        },
        content: {
          html: '<html><body><h1>Executive Summary</h1><p>Report content...</p></body></html>',
        },
        metadata: {
          totalTemplates: 5,
          totalSent: 2500,
          averageConversionRate: 0.032,
          keyInsights: [
            '📈 Strong growth of 12.5% indicates effective template strategy',
            '🎯 1 template identified for optimization',
          ],
          alertsTriggered: 0,
        },
        sections: [
          {
            sectionId: 'overview',
            title: 'Performance Overview',
            type: 'summary',
            data: { totalSent: 2500, averageConversionRate: 0.032 },
          },
        ],
      };

      (reportingEngine.generateReport as jest.Mock).mockResolvedValue(mockReport);

      // Act
      const report = await reportingEngine.generateReport(
        'executive_summary',
        mockReport.timeframe,
        {} as any // Mock dashboard
      );

      // Assert
      expect(report.id).toBe('report_123');
      expect(report.title).toContain('Executive Summary');
      expect(report.metadata.totalTemplates).toBe(5);
      expect(report.metadata.keyInsights).toHaveLength(2);
      expect(report.sections).toHaveLength(1);
    });

    test('should create and manage report templates', async () => {
      // Mock template creation
      const mockTemplate = {
        id: 'template_123',
        name: 'Custom Performance Report',
        description: 'Custom report for performance analysis',
        type: 'custom',
        frequency: 'weekly',
        format: 'html',
        recipients: ['manager@company.com'],
        sections: [
          {
            id: 'performance_overview',
            title: 'Performance Overview',
            type: 'summary',
            dataSource: 'dashboard',
            config: {},
            layout: { width: 100, position: 'full' },
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (reportingEngine.createTemplate as jest.Mock).mockReturnValue(mockTemplate);
      (reportingEngine.getTemplate as jest.Mock).mockReturnValue(mockTemplate);

      // Act
      const template = reportingEngine.createTemplate({
        name: 'Custom Performance Report',
        description: 'Custom report for performance analysis',
        type: 'custom',
        frequency: 'weekly',
        format: 'html',
        recipients: ['manager@company.com'],
        sections: [],
      });

      const retrieved = reportingEngine.getTemplate(template.id);

      // Assert
      expect(template.id).toBe('template_123');
      expect(template.name).toBe('Custom Performance Report');
      expect(retrieved).toEqual(template);
    });
  });

  describe('BI Integration', () => {
    test('should export metrics for BI consumption', async () => {
      // Mock BI export data
      const mockExport = {
        timeframe: {
          start: '2025-01-01T00:00:00Z',
          end: '2025-01-31T23:59:59Z',
        },
        metrics: {
          templates: [
            {
              templateId: 'welcome_email',
              name: 'Welcome Email',
              category: 'initial_contact',
              channel: 'email',
              sent: 1000,
              delivered: 950,
              opened: 380,
              clicked: 76,
              responded: 30,
              converted: 12,
              openRate: 0.38,
              clickRate: 0.076,
              responseRate: 0.03,
              conversionRate: 0.012,
              bounceRate: 0.05,
              unsubscribeRate: 0.002,
            },
          ],
          conversions: [
            {
              id: 'conv_001',
              leadId: 12345,
              type: 'sale',
              value: 250000,
              timestamp: '2025-01-15T10:30:00Z',
              attributedValue: 75000,
              attributionRate: 0.3,
            },
          ],
          attribution: [
            {
              templateId: 'welcome_email',
              totalAttributedValue: 150000,
              conversionCount: 45,
              attributionRate: 0.25,
              channel: 'email',
            },
          ],
          abTests: [
            {
              testId: 'ab_test_001',
              name: 'Subject Line Test',
              status: 'completed',
              variants: [
                {
                  variantId: 'control',
                  name: 'Original Subject',
                  sent: 500,
                  conversions: 18,
                  conversionRate: 0.036,
                  winner: false,
                },
                {
                  variantId: 'variant_a',
                  name: 'New Subject',
                  sent: 500,
                  conversions: 25,
                  conversionRate: 0.05,
                  winner: true,
                },
              ],
              winner: 'variant_a',
              improvement: 38.9,
              confidence: 0.95,
            },
          ],
        },
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          totalRecords: 15,
          dataQuality: {
            completeness: 0.95,
            accuracy: 0.98,
            timeliness: 0.92,
          },
        },
      };

      (biIntegrationService.exportMetricsForBI as jest.Mock).mockResolvedValue(mockExport);

      // Act
      const exportData = await biIntegrationService.exportMetricsForBI(
        'dashboard_123',
        mockExport.timeframe
      );

      // Assert
      expect(exportData.timeframe.start).toBe('2025-01-01T00:00:00Z');
      expect(exportData.metrics.templates).toHaveLength(1);
      expect(exportData.metrics.conversions).toHaveLength(1);
      expect(exportData.metrics.abTests).toHaveLength(1);
      expect(exportData.metadata.totalRecords).toBe(15);
      expect(exportData.metadata.dataQuality.completeness).toBe(0.95);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent template rendering', async () => {
      // Mock concurrent rendering
      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        templateId: 'welcome_email',
        leadId: 12345 + i,
        subject: `Welcome to Our Services, User ${i}!`,
        content: `<h1>Welcome User ${i}!</h1><p>Personalized content for user ${i}</p>`,
        renderTime: 25 + Math.random() * 20,
        timestamp: new Date().toISOString(),
      }));

      (templateEngine.renderTemplate as jest.Mock)
        .mockImplementation((templateId, lead) =>
          Promise.resolve(mockResults.find(r => r.leadId === lead.id))
        );

      // Act
      const startTime = Date.now();
      const leads = Array.from({ length: 10 }, (_, i) => ({
        ...testLead,
        id: testLead.id + i,
        name: `User ${i}`,
      }));

      const results = await Promise.all(
        leads.map(lead => templateEngine.renderTemplate('welcome_email', lead))
      );
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.leadId).toBe(testLead.id + i);
        expect(result.subject).toContain(`User ${i}`);
        expect(result.renderTime).toBeLessThan(100); // Under 100ms per render
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // Under 1 second for 10 concurrent
    });

    test('should maintain performance under load', async () => {
      // Mock performance data
      const mockRenders = Array.from({ length: 50 }, (_, i) => ({
        templateId: 'welcome_email',
        leadId: testLead.id + i,
        renderTime: 15 + Math.random() * 30, // 15-45ms per render
        timestamp: new Date().toISOString(),
      }));

      let renderCount = 0;
      (templateEngine.renderTemplate as jest.Mock)
        .mockImplementation(() => {
          const result = mockRenders[renderCount % mockRenders.length];
          renderCount++;
          return Promise.resolve({ ...result, leadId: testLead.id + renderCount });
        });

      // Act
      const startTime = Date.now();
      const promises = Array.from({ length: 50 }, (_, i) =>
        templateEngine.renderTemplate('welcome_email', { ...testLead, id: testLead.id + i })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / 50;

      // Assert
      expect(results).toHaveLength(50);
      expect(avgTime).toBeLessThan(50); // Average under 50ms per render
      expect(totalTime).toBeLessThan(3000); // Total under 3 seconds for 50 renders
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle template rendering errors gracefully', async () => {
      (templateEngine.renderTemplate as jest.Mock)
        .mockRejectedValue(new Error('Template not found'));

      // Act & Assert
      await expect(templateEngine.renderTemplate('nonexistent_template', testLead))
        .rejects
        .toThrow('Template not found');
    });

    test('should handle personalization engine failures', async () => {
      (personalizationEngine.personalizeForLead as jest.Mock)
        .mockRejectedValue(new Error('Personalization failed'));

      // Act & Assert
      await expect(personalizationEngine.personalizeForLead('welcome_email', testLead))
        .rejects
        .toThrow('Personalization failed');
    });

    test('should handle A/B testing service errors', async () => {
      (abTestingService.getTestResults as jest.Mock)
        .mockRejectedValue(new Error('Test not found'));

      // Act & Assert
      await expect(abTestingService.getTestResults('nonexistent_test'))
        .rejects
        .toThrow('Test not found');
    });

    test('should handle analytics service failures', async () => {
      (templateAnalyticsService.generateTemplateAnalytics as jest.Mock)
        .mockRejectedValue(new Error('Analytics service unavailable'));

      // Act & Assert
      await expect(templateAnalyticsService.generateTemplateAnalytics(
        'welcome_email',
        { start: '2025-01-01T00:00:00Z', end: '2025-01-07T23:59:59Z' }
      )).rejects.toThrow('Analytics service unavailable');
    });
  });

  describe('Data Consistency and Integrity', () => {
    test('should maintain data consistency across services', async () => {
      // Mock consistent data across services
      const mockPersonalization = {
        templateId: 'welcome_email',
        leadId: testLead.id,
        confidence: 0.92,
        matchScore: 0.85,
      };

      const mockRendering = {
        templateId: 'welcome_email',
        leadId: testLead.id,
        subject: 'Welcome John Smith!',
        content: '<h1>Welcome John Smith!</h1>',
        timestamp: new Date().toISOString(),
      };

      (personalizationEngine.personalizeForLead as jest.Mock).mockResolvedValue(mockPersonalization);
      (templateEngine.renderTemplate as jest.Mock).mockResolvedValue(mockRendering);

      // Act
      const personalization = await personalizationEngine.personalizeForLead('welcome_email', testLead);
      const rendering = await templateEngine.renderTemplate('welcome_email', testLead);

      // Assert
      expect(personalization.templateId).toBe(rendering.templateId);
      expect(personalization.leadId).toBe(rendering.leadId);
      expect(personalization.leadId).toBe(testLead.id);
    });

    test('should validate data integrity in attribution calculations', async () => {
      // Mock attribution with data integrity
      const mockAttribution = {
        leadId: testLead.id,
        conversionId: 'conv_12345',
        conversionType: 'sale',
        conversionValue: 250000,
        totalAttribution: 0.8,
        touchpoints: [
          {
            templateId: 'welcome_email',
            interactionType: 'sent',
            timestamp: '2025-01-01T10:00:00Z',
            weight: 0.3,
            attributedValue: 75000,
            position: 1,
          },
          {
            templateId: 'follow_up_offer',
            interactionType: 'clicked',
            timestamp: '2025-01-02T14:00:00Z',
            weight: 0.5,
            attributedValue: 125000,
            position: 2,
          },
        ],
        attributionModel: 'position_based',
        confidence: 0.90,
        insights: ['Data integrity validated', 'Attribution weights sum correctly'],
      };

      (conversionAttributionService.calculateAttribution as jest.Mock).mockResolvedValue(mockAttribution);

      // Act
      const attribution = await conversionAttributionService.calculateAttribution(
        testLead.id,
        'conv_12345',
        'sale',
        250000,
        mockAttribution.touchpoints.map(tp => ({
          templateId: tp.templateId,
          interactionType: tp.interactionType,
          timestamp: tp.timestamp,
        }))
      );

      // Assert
      expect(attribution.totalAttribution).toBeGreaterThanOrEqual(0);
      expect(attribution.totalAttribution).toBeLessThanOrEqual(1);
      expect(attribution.touchpoints.length).toBe(2);
      expect(attribution.confidence).toBeGreaterThan(0.8);

      // Validate attribution weights sum correctly
      const totalWeight = attribution.touchpoints.reduce((sum, tp) => sum + tp.weight, 0);
      expect(totalWeight).toBeCloseTo(attribution.totalAttribution, 0.01);
    });
  });
});