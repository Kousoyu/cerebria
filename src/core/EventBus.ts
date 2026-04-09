/**
 * EventBus - Event-Driven Architecture
 */

type EventHandler = (data: any) => void;

class EventBus {
  private events: Map<string, EventHandler[]>;
  private static instance: EventBus;

  constructor() {
    this.events = new Map();
  }

  on(eventName: string, handler: EventHandler): void {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName)!.push(handler);
  }

  emit(eventName: string, data: any): void {
    if (this.events.has(eventName)) {
      this.events.get(eventName)!.forEach((handler) => handler(data));
    }
  }

  off(eventName: string, handler: EventHandler): void {
    if (this.events.has(eventName)) {
      const handlers = this.events.get(eventName)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
}

export default EventBus;
