import { ThemePerformanceMonitor, THEME_TRANSITIONS } from '../themeUtils';

describe('Theme Performance Monitor', () => {
  let monitor: ThemePerformanceMonitor;

  beforeEach(() => {
    monitor = ThemePerformanceMonitor.getInstance();
    // Reset any previous state
    jest.clearAllMocks();
  });

  describe('Performance Monitoring', () => {
    it('should measure transition duration accurately', () => {
      // Mock Date.now to control timing
      const mockNow = jest.fn();
      mockNow.mockReturnValueOnce(1000); // Start time
      mockNow.mockReturnValueOnce(1080); // End time (80ms later)

      global.Date.now = mockNow;

      monitor.startTransition();
      const duration = monitor.endTransition();

      expect(duration).toBe(80);
    });

    it('should meet performance target for optimized transitions', () => {
      const testDuration = 80; // Our optimized smooth transition
      expect(monitor.meetsPerformanceTarget(testDuration)).toBe(true);
    });

    it('should fail performance target for slow transitions', () => {
      const testDuration = 120; // Slower than target
      expect(monitor.meetsPerformanceTarget(testDuration)).toBe(false);
    });

    it('should warn when transition exceeds 100ms', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock slow transition
      const mockNow = jest.fn();
      mockNow.mockReturnValueOnce(1000);
      mockNow.mockReturnValueOnce(1120); // 120ms

      global.Date.now = mockNow;

      monitor.startTransition();
      monitor.endTransition();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Theme transition took 120ms (target: <100ms)')
      );

      consoleSpy.mockRestore();
    });

    it('should log successful fast transitions', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockNow = jest.fn();
      mockNow.mockReturnValueOnce(1000);
      mockNow.mockReturnValueOnce(1080); // 80ms

      global.Date.now = mockNow;

      monitor.startTransition();
      monitor.endTransition();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Theme transition completed in 80ms'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Transition Durations', () => {
    it('should have optimized smooth transition under 100ms', () => {
      expect(THEME_TRANSITIONS.smooth).toBeLessThan(100);
      expect(THEME_TRANSITIONS.smooth).toBe(80);
    });

    it('should have instant transition at 0ms', () => {
      expect(THEME_TRANSITIONS.instant).toBe(0);
    });

    it('should have system transition under 300ms', () => {
      expect(THEME_TRANSITIONS.system).toBeLessThan(300);
      expect(THEME_TRANSITIONS.system).toBe(200);
    });
  });

  describe('Performance Metrics', () => {
    it('should provide performance metrics structure', () => {
      const metrics = monitor.getPerformanceMetrics();

      expect(metrics).toHaveProperty('averageDuration');
      expect(metrics).toHaveProperty('maxDuration');
      expect(metrics).toHaveProperty('minDuration');
      expect(metrics).toHaveProperty('totalTransitions');
      expect(metrics).toHaveProperty('targetCompliance');
    });

    it('should validate device performance expectations', () => {
      expect(monitor.validateDevicePerformance('low-end')).toBe(true);
      expect(monitor.validateDevicePerformance('mid-range')).toBe(true);
      expect(monitor.validateDevicePerformance('high-end')).toBe(true);
    });
  });
});

describe('Theme Transition Performance Benchmarks', () => {
  it('should validate transition duration meets requirements', () => {
    // Test that our optimized duration meets the <100ms requirement
    const optimizedDuration = THEME_TRANSITIONS.smooth;
    const requirement = 100;

    expect(optimizedDuration).toBeLessThan(requirement);

    // Ensure we have reasonable buffer for variability
    const buffer = requirement - optimizedDuration;
    expect(buffer).toBeGreaterThan(10); // At least 10ms buffer
  });

  it('should handle edge cases in performance monitoring', () => {
    const monitor = ThemePerformanceMonitor.getInstance();

    // Test calling endTransition without startTransition
    const duration = monitor.endTransition();
    expect(duration).toBe(0);

    // Test multiple rapid transitions
    monitor.startTransition();
    const duration1 = monitor.endTransition();

    monitor.startTransition();
    const duration2 = monitor.endTransition();

    expect(duration1).toBeGreaterThanOrEqual(0);
    expect(duration2).toBeGreaterThanOrEqual(0);
  });
});