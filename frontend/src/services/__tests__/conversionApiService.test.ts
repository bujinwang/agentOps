import { conversionApiService, ConversionEventData } from '../conversionApiService';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('ConversionApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true, message: 'Success' }),
    } as any);
  });

  describe('logConversionEvent', () => {
    it('should successfully log a conversion event', async () => {
      const eventData: ConversionEventData = {
        eventType: 'contact_made',
        eventDescription: 'Initial contact established',
        eventData: { contactMethod: 'phone' },
        userId: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          message: 'Event logged successfully',
          data: { eventId: 123 }
        }),
      } as any);

      const result = await conversionApiService.logConversionEvent(1, eventData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/leads/1/conversion-events',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(eventData),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ eventId: 123 });
    });

    it('should handle API errors gracefully', async () => {
      const eventData: ConversionEventData = {
        eventType: 'contact_made',
        eventDescription: 'Test event'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          message: 'Validation failed'
        }),
      } as any);

      const result = await conversionApiService.logConversionEvent(1, eventData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
    });

    it('should handle network errors', async () => {
      const eventData: ConversionEventData = {
        eventType: 'contact_made',
        eventDescription: 'Test event'
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await conversionApiService.logConversionEvent(1, eventData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });

  describe('getConversionTimeline', () => {
    it('should retrieve conversion timeline successfully', async () => {
      const mockTimeline = {
        leadId: 1,
        events: [
          {
            id: 1,
            eventType: 'contact_made',
            eventDescription: 'Initial contact',
            eventTimestamp: '2024-01-01T10:00:00Z'
          }
        ],
        totalEvents: 1,
        lastEvent: {
          id: 1,
          eventType: 'contact_made',
          eventDescription: 'Initial contact',
          eventTimestamp: '2024-01-01T10:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          message: 'Timeline retrieved',
          data: mockTimeline.events
        }),
      } as any);

      const result = await conversionApiService.getConversionTimeline(1);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/leads/1/conversion-timeline',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTimeline);
    });
  });

  describe('updateConversionStatus', () => {
    it('should update conversion status successfully', async () => {
      const statusUpdate = {
        newStatus: 'qualified',
        newStage: 2,
        notes: 'Lead meets qualification criteria'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          message: 'Status updated successfully',
          data: { newStatus: 'qualified', newStage: 2 }
        }),
      } as any);

      const result = await conversionApiService.updateConversionStatus(1, statusUpdate);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/leads/1/conversion-status',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(statusUpdate),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ newStatus: 'qualified', newStage: 2 });
    });
  });

  describe('getConversionFunnel', () => {
    it('should retrieve conversion funnel data', async () => {
      const mockFunnelData = {
        funnelName: 'Real Estate Conversion Funnel',
        stages: [
          {
            stage: 'lead_created',
            name: 'Lead Created',
            order: 1,
            leadsInStage: 100,
            leadsAtStage: 100,
            conversionRate: 100,
            averageDaysInStage: 0,
            totalValue: 0
          }
        ],
        totalLeads: 100,
        overallConversionRate: 0.15
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          message: 'Funnel data retrieved',
          data: mockFunnelData
        }),
      } as any);

      const result = await conversionApiService.getConversionFunnel();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/analytics/conversions/funnel',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFunnelData);
    });
  });

  describe('batchLogConversionEvents', () => {
    it('should batch log multiple events successfully', async () => {
      const events = [
        {
          leadId: 1,
          eventData: {
            eventType: 'contact_made' as const,
            eventDescription: 'Contact 1',
            userId: 1
          }
        },
        {
          leadId: 2,
          eventData: {
            eventType: 'qualified' as const,
            eventDescription: 'Qualified 2',
            userId: 1
          }
        }
      ];

      // Mock successful responses for both events
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { eventId: 1 }
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { eventId: 2 }
          }),
        } as any);

      const result = await conversionApiService.batchLogConversionEvents(events);

      expect(result.success).toBe(true);
      expect(result.data?.loggedEvents).toBe(2);
      expect(result.data?.failedEvents).toBe(0);
    });

    it('should handle partial failures in batch logging', async () => {
      const events = [
        {
          leadId: 1,
          eventData: {
            eventType: 'contact_made' as const,
            eventDescription: 'Contact 1',
            userId: 1
          }
        },
        {
          leadId: 2,
          eventData: {
            eventType: 'qualified' as const,
            eventDescription: 'Qualified 2',
            userId: 1
          }
        }
      ];

      // Mock one success and one failure
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { eventId: 1 }
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({
            success: false,
            message: 'Validation failed'
          }),
        } as any);

      const result = await conversionApiService.batchLogConversionEvents(events);

      expect(result.success).toBe(false); // Overall failure due to partial failure
      expect(result.data?.loggedEvents).toBe(1);
      expect(result.data?.failedEvents).toBe(1);
    });
  });

  describe('retryConversionEvent', () => {
    it('should retry failed events up to max attempts', async () => {
      const eventData: ConversionEventData = {
        eventType: 'contact_made',
        eventDescription: 'Test event'
      };

      // Mock failures for first 2 attempts, success on 3rd
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({ success: false }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({ success: false }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { eventId: 123 }
          }),
        } as any);

      const result = await conversionApiService.retryConversionEvent(1, eventData, 3);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ eventId: 123 });
    });

    it('should fail after max retries exceeded', async () => {
      const eventData: ConversionEventData = {
        eventType: 'contact_made',
        eventDescription: 'Test event'
      };

      // Mock consistent failures
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ success: false }),
      } as any);

      const result = await conversionApiService.retryConversionEvent(1, eventData, 2);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Max retries exceeded');
    });
  });

  describe('Authentication', () => {
    it('should include auth token in requests when available', async () => {
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue('mock-auth-token'),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      const eventData: ConversionEventData = {
        eventType: 'contact_made',
        eventDescription: 'Test event'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      } as any);

      await conversionApiService.logConversionEvent(1, eventData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-auth-token',
          }),
        })
      );
    });
  });
});