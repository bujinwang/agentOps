// Dependency Injection Types and Decorators

export interface InjectableOptions {
  scope?: 'singleton' | 'transient';
  token?: string | symbol;
}

export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return (target: any) => {
    // Store metadata for dependency injection
    (target as any).__injectable = options;

    // Create singleton instance storage
    if (options.scope === 'singleton' || !options.scope) {
      const originalConstructor = target;
      let instance: any = null;

      target = function(...args: any[]) {
        if (!instance) {
          instance = new originalConstructor(...args);
        }
        return instance;
      };

      // Copy prototype
      target.prototype = originalConstructor.prototype;

      // Copy static methods
      Object.getOwnPropertyNames(originalConstructor).forEach(name => {
        if (name !== 'prototype' && name !== 'length' && name !== 'name') {
          (target as any)[name] = (originalConstructor as any)[name];
        }
      });
    }

    return target;
  };
}

export function Inject(token?: string | symbol): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const constructor = target.constructor;
    const dependencies = (constructor as any).__dependencies || [];
    dependencies.push({
      propertyKey,
      token: token || propertyKey,
    });
    (constructor as any).__dependencies = dependencies;
  };
}

export interface DependencyContainer {
  register<T>(token: string | symbol, implementation: new (...args: any[]) => T): void;
  registerSingleton<T>(token: string | symbol, implementation: new (...args: any[]) => T): void;
  registerInstance<T>(token: string | symbol, instance: T): void;
  resolve<T>(token: string | symbol): T;
  resolveAll<T>(token: string | symbol): T[];
  clear(): void;
}

export class Container implements DependencyContainer {
  private registry = new Map<string | symbol, Registration>();

  register<T>(token: string | symbol, implementation: new (...args: any[]) => T): void {
    this.registry.set(token, {
      implementation,
      scope: 'transient',
    });
  }

  registerSingleton<T>(token: string | symbol, implementation: new (...args: any[]) => T): void {
    this.registry.set(token, {
      implementation,
      scope: 'singleton',
      instance: null,
    });
  }

  registerInstance<T>(token: string | symbol, instance: T): void {
    this.registry.set(token, {
      instance,
      scope: 'singleton',
    });
  }

  resolve<T>(token: string | symbol): T {
    const registration = this.registry.get(token);
    if (!registration) {
      throw new Error(`No registration found for token: ${String(token)}`);
    }

    if (registration.scope === 'singleton') {
      if (!registration.instance) {
        registration.instance = this.createInstance(registration.implementation!);
      }
      return registration.instance;
    }

    return this.createInstance(registration.implementation!);
  }

  resolveAll<T>(token: string | symbol): T[] {
    // For now, return single instance. Could be extended for multiple registrations
    return [this.resolve<T>(token)];
  }

  clear(): void {
    this.registry.clear();
  }

  private createInstance<T>(implementation: new (...args: any[]) => T): T {
    const dependencies = (implementation as any).__dependencies || [];
    const args: any[] = [];

    for (const dep of dependencies) {
      args.push(this.resolve(dep.token));
    }

    return new implementation(...args);
  }
}

interface Registration {
  implementation?: new (...args: any[]) => any;
  instance?: any;
  scope: 'singleton' | 'transient';
}

// Global container instance
export const container = new Container();

// Service locator functions
export function getService<T>(token: string | symbol): T {
  return container.resolve<T>(token);
}

export function registerService<T>(
  token: string | symbol,
  implementation: new (...args: any[]) => T,
  scope: 'singleton' | 'transient' = 'singleton'
): void {
  if (scope === 'singleton') {
    container.registerSingleton(token, implementation);
  } else {
    container.register(token, implementation);
  }
}

export function registerServiceInstance<T>(token: string | symbol, instance: T): void {
  container.registerInstance(token, instance);
}

// Auto-registration decorator
export function Service(token?: string | symbol): ClassDecorator {
  return (target: any) => {
    const serviceToken = token || target.name;

    // Apply Injectable decorator
    Injectable({ scope: 'singleton' })(target);

    // Register with container
    registerService(serviceToken, target, 'singleton');

    return target;
  };
}

// Factory function for creating service instances
export function createService<T>(
  ServiceClass: new (...args: any[]) => T,
  dependencies: any[] = []
): T {
  return new ServiceClass(...dependencies);
}

// Service registry for tracking all registered services
export class ServiceRegistry {
  private static services = new Map<string | symbol, any>();

  static register(token: string | symbol, service: any): void {
    this.services.set(token, service);
  }

  static get<T>(token: string | symbol): T | undefined {
    return this.services.get(token);
  }

  static has(token: string | symbol): boolean {
    return this.services.has(token);
  }

  static list(): Array<{ token: string | symbol; service: any }> {
    return Array.from(this.services.entries()).map(([token, service]) => ({
      token,
      service,
    }));
  }

  static clear(): void {
    this.services.clear();
  }
}

// Auto-discovery of services (for modules)
export function discoverServices(module: any): void {
  const services = Object.values(module).filter(
    (exported: any) =>
      typeof exported === 'function' &&
      (exported as any).__injectable
  );

  services.forEach((service: any) => {
    const options = (service as any).__injectable;
    const token = options.token || service.name;
    registerService(token, service, options.scope || 'singleton');
    ServiceRegistry.register(token, service);
  });
}

// Health check for services
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
  lastChecked: string;
  responseTime?: number;
}

export interface HealthCheckable {
  getHealth(): Promise<ServiceHealth>;
}

// Service lifecycle management
export interface ServiceLifecycle {
  onInit?(): Promise<void>;
  onDestroy?(): Promise<void>;
  onHealthCheck?(): Promise<ServiceHealth>;
}

export class ServiceManager {
  private services = new Map<string | symbol, ServiceLifecycle>();

  register(token: string | symbol, service: ServiceLifecycle): void {
    this.services.set(token, service);
  }

  async initializeAll(): Promise<void> {
    for (const [token, service] of this.services) {
      if (service.onInit) {
        try {
          await service.onInit();
          console.log(`Service ${String(token)} initialized successfully`);
        } catch (error) {
          console.error(`Failed to initialize service ${String(token)}:`, error);
        }
      }
    }
  }

  async destroyAll(): Promise<void> {
    for (const [token, service] of this.services) {
      if (service.onDestroy) {
        try {
          await service.onDestroy();
          console.log(`Service ${String(token)} destroyed successfully`);
        } catch (error) {
          console.error(`Failed to destroy service ${String(token)}:`, error);
        }
      }
    }
  }

  async healthCheckAll(): Promise<ServiceHealth[]> {
    const results: ServiceHealth[] = [];

    for (const [token, service] of this.services) {
      try {
        const health = service.onHealthCheck
          ? await service.onHealthCheck()
          : {
              name: String(token),
              status: 'unknown' as const,
              lastChecked: new Date().toISOString(),
            };
        results.push(health);
      } catch (error) {
        results.push({
          name: String(token),
          status: 'unhealthy',
          message: `Health check failed: ${error}`,
          lastChecked: new Date().toISOString(),
        });
      }
    }

    return results;
  }
}

// Global service manager
export const serviceManager = new ServiceManager();