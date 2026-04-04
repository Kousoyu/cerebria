/**
 * EventBus - Event-Driven Architecture
 * Supports: sync/async emit, wildcard subscriptions, once, off
 */
class EventBus {
  constructor() { this.events = new Map(); this.wildcardHandlers = []; }

  on(eventName, handler) {
    if (!this.events.has(eventName)) this.events.set(eventName, []);
    this.events.get(eventName).push(handler);
    return () => this.off(eventName, handler);
  }

  once(eventName, handler) {
    const wrapper = (data) => { this.off(eventName, wrapper); handler(data); };
    this.on(eventName, wrapper);
  }

  onWildcard(pattern, handler) {
    this.wildcardHandlers.push({ pattern, handler });
    return () => { this.wildcardHandlers = this.wildcardHandlers.filter(h => h.pattern !== pattern || h.handler !== handler); };
  }

  emit(eventName, data) {
    (this.events.get(eventName) || []).forEach(h => { try { h(data); } catch (err) { console.error('Event handler error [' + eventName + ']:', err.message); } });
    this.wildcardHandlers.forEach(({ pattern, handler }) => {
      if (this._matchPattern(eventName, pattern)) {
        try { handler({ eventName, data }); } catch (err) { console.error('Wildcard handler error [' + pattern + ']:', err.message); }
      }
    });
  }

  async emitAsync(eventName, data) {
    const handlers = this.events.get(eventName) || [];
    const wildcard = this.wildcardHandlers.filter(({ pattern }) => this._matchPattern(eventName, pattern)).map(h => h.handler);
    await Promise.all([...handlers, ...wildcard].map(h => Promise.resolve(h(data)).catch(err => console.error('Async event error [' + eventName + ']:', err.message))));
  }

  off(eventName, handler) {
    if (!handler) this.events.delete(eventName);
    else { const handlers = this.events.get(eventName) || []; this.events.set(eventName, handlers.filter(h => h !== handler)); }
  }

  clear() { this.events.clear(); this.wildcardHandlers = []; }

  _matchPattern(eventName, pattern) {
    if (!pattern.includes('*')) return eventName === pattern;
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$').test(eventName);
  }
}
module.exports = EventBus;
