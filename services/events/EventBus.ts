import EE from "eventemitter3";

export type EventMap = {
  "security:incident": { severity: "low" | "high" | "critical"; details: any };
  "monitor:metric": { name: string; value: number; tags?: Record<string, string> };
  "security:breach": { type: string; timestamp: number; details: any };
  "security:alert": { level: string; message: string; source: string };
  "performance:metric": { metric: string; value: number; timestamp: number };
  "ai:inference": { model: string; latency: number; accuracy?: number };
  "system:health": { component: string; status: "healthy" | "degraded" | "critical" };
};

export class EventBus {
  private static _inst: EventBus;
  private ee = new EE();

  static get instance() {
    if (!EventBus._inst) EventBus._inst = new EventBus();
    return EventBus._inst;
  }

  on<K extends keyof EventMap>(evt: K, fn: (p: EventMap[K]) => void) {
    this.ee.on(evt, fn as any);
  }

  off<K extends keyof EventMap>(evt: K, fn: (p: EventMap[K]) => void) {
    this.ee.off(evt, fn as any);
  }

  emit<K extends keyof EventMap>(evt: K, payload: EventMap[K]) {
    this.ee.emit(evt, payload as any);
  }

  removeAllListeners<K extends keyof EventMap>(evt?: K) {
    if (evt) {
      this.ee.removeAllListeners(evt);
    } else {
      this.ee.removeAllListeners();
    }
  }

  listenerCount<K extends keyof EventMap>(evt: K): number {
    return this.ee.listenerCount(evt);
  }
}

export default EventBus;