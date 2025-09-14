// Jest type declarations for React Native testing
declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any> extends Function {
      (...args: Y): T;
      mock: {
        calls: Y[];
        instances: T[];
        invocationCallOrder: number[];
        results: {
          type: 'return' | 'throw';
          value: T;
        }[];
      };
      mockClear(): void;
      mockReset(): void;
      mockRestore(): void;
      mockImplementation(fn?: (...args: Y) => T): this;
      mockImplementationOnce(fn?: (...args: Y) => T): this;
      mockReturnValue(value: T): this;
      mockReturnValueOnce(value: T): this;
      mockResolvedValue(value: T): this;
      mockResolvedValueOnce(value: T): this;
      mockRejectedValue(value: any): this;
      mockRejectedValueOnce(value: any): this;
    }

    function fn<T = any, Y extends any[] = any>(implementation?: (...args: Y) => T): Mock<T, Y>;
    function spyOn<T extends {}, M extends keyof T>(object: T, method: M): Mock<T[M]>;
    function clearAllMocks(): void;
    function resetAllMocks(): void;
    function restoreAllMocks(): void;
  }

  const describe: {
    (name: string, fn: () => void): void;
    each: (cases: any[]) => (name: string, fn: (...args: any[]) => void) => void;
    only: (name: string, fn: () => void) => void;
    skip: (name: string, fn: () => void) => void;
  };

  const it: {
    (name: string, fn: () => void | Promise<void>): void;
    each: (cases: any[]) => (name: string, fn: (...args: any[]) => void) => void;
    only: (name: string, fn: () => void | Promise<void>) => void;
    skip: (name: string, fn: () => void | Promise<void>) => void;
    todo: (name: string) => void;
  };

  const expect: {
    <T>(actual: T): {
      toBe(expected: T): void;
      toEqual(expected: T): void;
      toBeTruthy(): void;
      toBeFalsy(): void;
      toBeNull(): void;
      toBeUndefined(): void;
      toBeDefined(): void;
      toContain(expected: any): void;
      toHaveLength(expected: number): void;
      toHaveProperty(property: string, value?: any): void;
      toMatch(expected: RegExp | string): void;
      toThrow(error?: any): void;
      toBeInstanceOf(expected: any): void;
      toBeGreaterThan(expected: number): void;
      toBeLessThan(expected: number): void;
      toBeCloseTo(expected: number, precision?: number): void;
      not: {
        toBe(expected: T): void;
        toEqual(expected: T): void;
        toBeTruthy(): void;
        toBeFalsy(): void;
        toBeNull(): void;
        toBeUndefined(): void;
        toBeDefined(): void;
        toContain(expected: any): void;
        toHaveLength(expected: number): void;
        toHaveProperty(property: string, value?: any): void;
        toMatch(expected: RegExp | string): void;
        toThrow(error?: any): void;
        toBeInstanceOf(expected: any): void;
        toBeGreaterThan(expected: number): void;
        toBeLessThan(expected: number): void;
        toBeCloseTo(expected: number, precision?: number): void;
      };
      resolves: {
        toBe(expected: T): Promise<void>;
        toEqual(expected: T): Promise<void>;
        toBeTruthy(): Promise<void>;
        toBeFalsy(): Promise<void>;
        toBeNull(): Promise<void>;
        toBeUndefined(): Promise<void>;
        toBeDefined(): Promise<void>;
        toContain(expected: any): Promise<void>;
        toHaveLength(expected: number): Promise<void>;
        toHaveProperty(property: string, value?: any): Promise<void>;
        toMatch(expected: RegExp | string): Promise<void>;
        toThrow(error?: any): Promise<void>;
        toBeInstanceOf(expected: any): Promise<void>;
        toBeGreaterThan(expected: number): Promise<void>;
        toBeLessThan(expected: number): Promise<void>;
        toBeCloseTo(expected: number, precision?: number): Promise<void>;
      };
      rejects: {
        toBe(expected: T): Promise<void>;
        toEqual(expected: T): Promise<void>;
        toBeTruthy(): Promise<void>;
        toBeFalsy(): Promise<void>;
        toBeNull(): Promise<void>;
        toBeUndefined(): Promise<void>;
        toBeDefined(): Promise<void>;
        toContain(expected: any): Promise<void>;
        toHaveLength(expected: number): Promise<void>;
        toHaveProperty(property: string, value?: any): Promise<void>;
        toMatch(expected: RegExp | string): Promise<void>;
        toThrow(error?: any): Promise<void>;
        toBeInstanceOf(expected: any): Promise<void>;
        toBeGreaterThan(expected: number): Promise<void>;
        toBeLessThan(expected: number): Promise<void>;
        toBeCloseTo(expected: number, precision?: number): Promise<void>;
      };
    };
    any(constructor: any): any;
    stringContaining(expected: string): any;
    objectContaining(expected: object): any;
    arrayContaining(expected: any[]): any;
  };

  const beforeEach: (fn: () => void | Promise<void>) => void;
  const afterEach: (fn: () => void | Promise<void>) => void;
  const beforeAll: (fn: () => void | Promise<void>) => void;
  const afterAll: (fn: () => void | Promise<void>) => void;
}

export {};