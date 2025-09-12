import { Dimensions } from 'react-native';
import {
  Breakpoints,
  getDeviceType,
  getOrientation,
  ResponsiveDimensions,
  responsiveDimensions,
  isMobile,
  isTablet,
  isDesktop,
  isPortrait,
  isLandscape,
} from '../responsive';

// Mock Dimensions
const mockDimensions = {
  get: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

jest.mock('react-native', () => ({
  Dimensions: mockDimensions,
  Platform: {
    OS: 'ios',
    select: jest.fn(),
  },
}));

describe('Responsive Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (ResponsiveDimensions as any).instance = null;
  });

  describe('Breakpoints', () => {
    it('should have correct breakpoint values', () => {
      expect(Breakpoints.mobile).toBe(320);
      expect(Breakpoints.tablet).toBe(768);
      expect(Breakpoints.desktop).toBe(1024);
      expect(Breakpoints.xs).toBe(0);
      expect(Breakpoints.sm).toBe(600);
      expect(Breakpoints.md).toBe(960);
      expect(Breakpoints.lg).toBe(1280);
      expect(Breakpoints.xl).toBe(1920);
    });
  });

  describe('getDeviceType', () => {
    it('should return mobile for width < tablet', () => {
      expect(getDeviceType(300)).toBe('mobile');
      expect(getDeviceType(767)).toBe('mobile');
    });

    it('should return tablet for width >= tablet and < desktop', () => {
      expect(getDeviceType(768)).toBe('tablet');
      expect(getDeviceType(1023)).toBe('tablet');
    });

    it('should return desktop for width >= desktop', () => {
      expect(getDeviceType(1024)).toBe('desktop');
      expect(getDeviceType(1920)).toBe('desktop');
    });
  });

  describe('getOrientation', () => {
    it('should return portrait when height > width', () => {
      expect(getOrientation(400, 800)).toBe('portrait');
    });

    it('should return landscape when width > height', () => {
      expect(getOrientation(800, 400)).toBe('landscape');
    });
  });

  describe('ResponsiveDimensions', () => {
    beforeEach(() => {
      mockDimensions.get.mockReturnValue({
        width: 375,
        height: 667,
        scale: 2,
        fontScale: 1,
      });
    });

    it('should return singleton instance', () => {
      const instance1 = ResponsiveDimensions.getInstance();
      const instance2 = ResponsiveDimensions.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should get current dimensions', () => {
      const dimensions = responsiveDimensions.getDimensions();
      expect(dimensions).toEqual({
        width: 375,
        height: 667,
      });
    });

    it('should update dimensions', () => {
      responsiveDimensions.updateDimensions({ width: 768, height: 1024 });
      const dimensions = responsiveDimensions.getDimensions();
      expect(dimensions).toEqual({
        width: 768,
        height: 1024,
      });
    });

    it('should detect device type correctly', () => {
      responsiveDimensions.updateDimensions({ width: 375, height: 667 });
      expect(responsiveDimensions.getDeviceType()).toBe('mobile');

      responsiveDimensions.updateDimensions({ width: 768, height: 1024 });
      expect(responsiveDimensions.getDeviceType()).toBe('tablet');

      responsiveDimensions.updateDimensions({ width: 1024, height: 768 });
      expect(responsiveDimensions.getDeviceType()).toBe('desktop');
    });

    it('should detect orientation correctly', () => {
      responsiveDimensions.updateDimensions({ width: 375, height: 667 });
      expect(responsiveDimensions.getOrientation()).toBe('portrait');

      responsiveDimensions.updateDimensions({ width: 667, height: 375 });
      expect(responsiveDimensions.getOrientation()).toBe('landscape');
    });

    it('should check breakpoints correctly', () => {
      responsiveDimensions.updateDimensions({ width: 375, height: 667 });
      expect(responsiveDimensions.isBreakpoint('mobile')).toBe(true);
      expect(responsiveDimensions.isBreakpoint('tablet')).toBe(false);
      expect(responsiveDimensions.isBreakpoint('desktop')).toBe(false);

      responsiveDimensions.updateDimensions({ width: 768, height: 1024 });
      expect(responsiveDimensions.isBreakpoint('mobile')).toBe(false);
      expect(responsiveDimensions.isBreakpoint('tablet')).toBe(true);
      expect(responsiveDimensions.isBreakpoint('desktop')).toBe(false);
    });

    it('should get responsive values', () => {
      responsiveDimensions.updateDimensions({ width: 375, height: 667 });
      const values = {
        mobile: 'small',
        tablet: 'medium',
        desktop: 'large',
      };
      expect(responsiveDimensions.getResponsiveValue(values)).toBe('small');

      responsiveDimensions.updateDimensions({ width: 768, height: 1024 });
      expect(responsiveDimensions.getResponsiveValue(values)).toBe('medium');
    });

    it('should scale values correctly', () => {
      responsiveDimensions.updateDimensions({ width: 375, height: 667 });
      expect(responsiveDimensions.scaleValue(100)).toBe(100); // 375/320 = 1.17, but capped at 2

      responsiveDimensions.updateDimensions({ width: 768, height: 1024 });
      expect(responsiveDimensions.scaleValue(100)).toBe(200); // 768/320 = 2.4, capped at 2
    });

    it('should get touch target size', () => {
      responsiveDimensions.updateDimensions({ width: 375, height: 667 });
      const touchTarget = responsiveDimensions.getTouchTargetSize();
      expect(touchTarget).toBeGreaterThanOrEqual(44);
    });

    it('should get responsive font size', () => {
      responsiveDimensions.updateDimensions({ width: 375, height: 667 });
      expect(responsiveDimensions.getResponsiveFontSize(16)).toBe(16);

      responsiveDimensions.updateDimensions({ width: 1024, height: 768 });
      expect(responsiveDimensions.getResponsiveFontSize(16)).toBe(18);
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      mockDimensions.get.mockReturnValue({
        width: 375,
        height: 667,
        scale: 2,
        fontScale: 1,
      });
    });

    it('should detect mobile correctly', () => {
      expect(isMobile()).toBe(true);
      expect(isTablet()).toBe(false);
      expect(isDesktop()).toBe(false);
    });

    it('should detect orientation correctly', () => {
      expect(isPortrait()).toBe(true);
      expect(isLandscape()).toBe(false);
    });
  });

  describe('Dimension Listener', () => {
    it('should add and remove dimension listener', () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };

      mockDimensions.addEventListener.mockReturnValue(mockSubscription);

      const removeListener = require('../responsive').addDimensionListener(mockCallback);

      expect(mockDimensions.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(typeof removeListener).toBe('function');

      removeListener();
      expect(mockSubscription.remove).toHaveBeenCalled();
    });
  });
});