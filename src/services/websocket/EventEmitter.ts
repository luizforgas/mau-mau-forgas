
type EventHandler<T = any> = (data: T) => void;

/**
 * Simple event emitter for managing pub/sub events
 */
class EventEmitter {
  private handlers: Map<string, EventHandler<any>[]> = new Map();

  /**
   * Register an event handler
   */
  on<T>(event: string, callback: (data: T) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    
    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = eventHandlers.indexOf(callback);
      if (index !== -1) {
        eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event to all registered handlers
   */
  emit<T>(event: string, data: T): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }
  }
}

export { EventEmitter };
