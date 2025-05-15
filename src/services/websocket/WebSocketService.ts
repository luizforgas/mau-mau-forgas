
import { ConnectionStatus, WebSocketEvent, ActiveRoom, initializeGlobalRoomStorage } from './types';
import { MockHandlers } from './mock-handlers';

class WebSocketService {
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private serverUrl: string;
  private activeRoomsMap: Map<string, ActiveRoom>;
  private mockHandlers: MockHandlers;
  
  constructor() {
    // In a real app, this would come from environment variables
    this.serverUrl = 'wss://mau-mau-server.example.com';
    
    // Initialize the global room storage
    initializeGlobalRoomStorage();
    
    // Use the shared global room storage
    this.activeRoomsMap = window.activeRoomsMap;
    
    // Create mock handlers
    this.mockHandlers = new MockHandlers(
      this.activeRoomsMap,
      this.emit.bind(this)
    );
    
    // For this demo, we'll use a mock WebSocket
    // In a real app, replace with actual WebSocket connection
    this.setupMockWebSocket();
  }
  
  // Mock WebSocket setup
  private setupMockWebSocket(): void {
    console.log('Setting up mock WebSocket');
    // This method doesn't need to do anything special
    // It's just a placeholder for real WebSocket initialization
  }
  
  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.status === 'connected') {
        resolve();
        return;
      }
      
      this.status = 'connecting';
      
      // In a real implementation:
      // this.socket = new WebSocket(this.serverUrl);
      
      this.socket = {
        send: this.mockSend.bind(this),
        close: this.mockClose.bind(this),
        readyState: 1, // OPEN
      } as unknown as WebSocket;
      
      setTimeout(() => {
        this.status = 'connected';
        this.reconnectAttempts = 0;
        console.log('WebSocket connected');
        this.emit('connection_status', { status: this.status });
        resolve();
      }, 500);
    });
  }
  
  // Send an event through WebSocket
  sendEvent<T extends WebSocketEvent>(event: T): void {
    if (!this.socket || this.status !== 'connected') {
      console.error('Cannot send event: WebSocket not connected');
      this.connect().then(() => this.sendEvent(event));
      return;
    }
    
    console.log('Sending event:', event);
    this.socket.send(JSON.stringify(event));
    
    // Mock response for demo purposes
    this.mockHandlers.handleMockResponse(event);
  }
  
  // Add event listener
  on<T>(eventName: string, callback: (data: T) => void): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    
    const listeners = this.eventListeners.get(eventName) || [];
    listeners.push(callback);
    this.eventListeners.set(eventName, listeners);
    
    // Return function to remove listener
    return () => {
      const updatedListeners = (this.eventListeners.get(eventName) || [])
        .filter(listener => listener !== callback);
      
      this.eventListeners.set(eventName, updatedListeners);
    };
  }
  
  // Emit event to all listeners
  private emit(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName) || [];
    listeners.forEach(callback => callback(data));
  }
  
  // Close WebSocket connection
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.status = 'disconnected';
      this.emit('connection_status', { status: this.status });
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    }
  }
  
  // Get current connection status
  getStatus(): ConnectionStatus {
    return this.status;
  }
  
  // For demo: mock WebSocket methods
  private mockSend(data: string): void {
    // In real implementation, this would be handled by the WebSocket
    console.log('Mock WebSocket send:', data);
  }
  
  private mockClose(): void {
    console.log('Mock WebSocket closed');
    this.status = 'disconnected';
    this.emit('connection_status', { status: this.status });
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();
