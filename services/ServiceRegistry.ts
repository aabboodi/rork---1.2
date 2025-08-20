type Provider<T> = () => T;

class ServiceRegistry {
  private providers: Map<string, Provider<unknown>> = new Map();
  private instances: Map<string, unknown> = new Map();

  register<T>(token: string, provider: Provider<T>): void {
    if (!token || typeof provider !== 'function') {
      throw new Error('Invalid service registration');
    }
    this.providers.set(token, provider as Provider<unknown>);
  }

  get<T>(token: string): T | null {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }
    const provider = this.providers.get(token);
    if (!provider) return null;
    try {
      const instance = provider();
      this.instances.set(token, instance);
      return instance as T;
    } catch (e) {
      console.warn(`ServiceRegistry: failed to instantiate service for token ${token}`);
      return null;
    }
  }

  has(token: string): boolean {
    return this.providers.has(token);
  }
}

const registry = new ServiceRegistry();
export default registry;
