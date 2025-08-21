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

// Register Edge AI services to prevent circular imports
registry.register('EdgeAIOrchestrator', () => {
  const { EdgeAIOrchestrator } = require('./ai/EdgeAIOrchestrator');
  return EdgeAIOrchestrator.getInstance();
});

registry.register('TokenBudgetManager', () => {
  const { TokenBudgetManager } = require('./ai/TokenBudgetManager');
  return new TokenBudgetManager(200000);
});

registry.register('OnDeviceInferenceEngine', () => {
  const { OnDeviceInferenceEngine } = require('./ai/OnDeviceInferenceEngine');
  return new OnDeviceInferenceEngine();
});

registry.register('PolicyEngine', () => {
  const { PolicyEngine } = require('./ai/PolicyEngine');
  return new PolicyEngine();
});

registry.register('LocalRAGService', () => {
  const { LocalRAGService } = require('./ai/LocalRAGService');
  return new LocalRAGService();
});

registry.register('CentralOrchestrator', () => {
  const { CentralOrchestrator } = require('./ai/CentralOrchestrator');
  return new CentralOrchestrator();
});

registry.register('FederatedLearningManager', () => {
  const { FederatedLearningManager } = require('./ai/FederatedLearningManager');
  return new FederatedLearningManager();
});

export default registry;
