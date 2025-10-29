
type Listener<T> = (data: T) => void;

class EventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: Listener<T[K]>[] } = {};

  on<K extends keyof T>(event: K, listener: Listener<T[K]>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: Listener<T[K]>): void {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event] = this.listeners[event]!.filter(
      (l) => l !== listener
    );
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event]!.forEach((listener) => listener(data));
  }
}

// Define your event map here
interface AppEvents {
  'permission-error': any; 
}

export const errorEmitter = new EventEmitter<AppEvents>();
