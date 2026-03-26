/**
 * EventBus - Event-Driven Architecture
 */

class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(eventName, handler) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName).push(handler);
  }

  emit(eventName, data) {
    if (this.events.has(eventName)) {
      this.events.get(eventName).forEach((handler) => handler(data));
    }
  }

  off(eventName, handler) {
    if (this.events.has(eventName)) {
      const handlers = this.events.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  static getInstance() {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
}

module.exports = EventBus;
