import { propertyApiService } from '../propertyApiService';
import { createMockProperty } from '../../test-utils/test-helpers';

describe('Property API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    } as any);
  });

  describe('getProperties', () => {
    it('should retrieve properties with pagination', async () => {
      const mockProperties = [
        createMockProperty({ id: 'prop-1' }),
        createMockProperty({ id: 'prop-2' })
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockProperties,
          pagination: {
            currentPage: 1,
            totalPages: 3,
            totalItems: 25
          }
        }),
      } as any);

      const result = await propertyApiService.getProperties(1, 10);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/properties?page=1&limit=10',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProperties);
    });

    it('should handle search filters', async () => {
      const filters = {
        city: 'Anytown',
        propertyType: 'Single Family',
        minPrice: 300000,
        maxPrice: 600000
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: []
        }),
      } as any);

      await propertyApiService.getProperties(1, 10, filters);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('city=Anytown'),
        expect.any(Object)
      );
    });
  });

  describe('getProperty', () => {
    it('should retrieve single property by ID', async () => {
      const mockProperty = createMockProperty();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockProperty
        }),
      } as any);

      const result = await propertyApiService.getProperty('prop-1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/properties/prop-1',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProperty);
    });
  });

  describe('createProperty', () => {
    it('should create new property successfully', async () => {
      const newProperty = createMockProperty();
      delete newProperty.id; // Remove ID for creation

      const createdProperty = createMockProperty();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: createdProperty
        }),
      } as any);

      const result = await propertyApiService.createProperty(newProperty);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/properties',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newProperty),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdProperty);
    });
  });

  describe('updateProperty', () => {
    it('should update property successfully', async () => {
      const updates = {
        listPrice: 550000,
        status: 'Pending'
      };

      const updatedProperty = createMockProperty();
      updatedProperty.listPrice = 550000;
      updatedProperty.status = 'Pending';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: updatedProperty
        }),
      } as any);

      const result = await propertyApiService.updateProperty('prop-1', updates);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/properties/prop-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedProperty);
    });
  });

  describe('deleteProperty', () => {
    it('should delete property successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true
        }),
      } as any);

      const result = await propertyApiService.deleteProperty('prop-1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/properties/prop-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await propertyApiService.getProperty('prop-1');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Network error');
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found'
          }
        }),
      } as any);

      const result = await propertyApiService.getProperty('prop-1');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Property not found');
    });
  });
});