
import { toast } from "@/hooks/use-toast";

// WebSocket connection states
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

// Events that can be sent/received via WebSocket
export type WebSocketEvent = 
  | { type: 'join_room', payload: { roomCode: string, nickname: string, playerId: string } }
  | { type: 'create_room', payload: { nickname: string, playerId: string } }
  | { type: 'leave_room', payload: { roomCode: string, playerId: string } }
  | { type: 'start_game', payload: { roomCode: string } }
  | { type: 'kick_player', payload: { roomCode: string, targetPlayerId: string } }
  | { type: 'chat_message', payload: { roomCode: string, message: string, playerId: string } }
  | { type: 'play_card', payload: { roomCode: string, cardId: string } }
  | { type: 'draw_card', payload: { roomCode: string } }
  | { type: 'say_mau_mau', payload: { roomCode: string } }
  | { type: 'room_list', payload: { rooms: Room[] } }
  | { type: 'game_state_update', payload: { gameState: any } }
  | { type: 'player_kicked', payload: { reason: string } }
  | { type: 'error', payload: { message: string } };

// Room data structure
export interface Room {
  code: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  creatorId: string;
  isPrivate: boolean;
}

// Chat message structure
export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  message: string;
  timestamp: number;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private serverUrl: string;

  constructor() {
    // In a real app, this would come from environment variables
    this.serverUrl = 'wss://mau-mau-server.example.com';
    
    // For this demo, we'll use a mock WebSocket
    // In a real app, replace with actual WebSocket connection
    this.mockWebSocket();
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
    this.handleMockResponse(event);
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
  
  // For demo: handle mock responses based on sent events
  private handleMockResponse(event: WebSocketEvent): void {
    switch (event.type) {
      case 'create_room':
        setTimeout(() => {
          const roomCode = 'R' + Math.random().toString(36).substring(2, 7).toUpperCase();
          this.emit('room_created', { 
            room: { 
              code: roomCode,
              name: `${event.payload.nickname}'s Room`,
              playerCount: 1,
              maxPlayers: 4,
              creatorId: event.payload.playerId,
              isPrivate: false
            } 
          });
        }, 300);
        break;
        
      case 'join_room':
        setTimeout(() => {
          // Mock room data
          const mockRoomData = {
            code: event.payload.roomCode,
            players: [
              { id: event.payload.playerId, nickname: event.payload.nickname, isCreator: true },
              { id: 'ai-player-1', nickname: 'AI Player 1', isCreator: false },
            ],
            messages: [],
          };
          
          // Emit room joined event
          this.emit('room_joined', { room: mockRoomData });
          
          // Broadcast player joined message
          setTimeout(() => {
            this.emit('chat_message', {
              message: {
                id: `msg-${Date.now()}`,
                playerId: 'system',
                nickname: 'System',
                message: `${event.payload.nickname} joined the room`,
                timestamp: Date.now(),
              }
            });
          }, 300);
        }, 500);
        break;
        
      case 'room_list':
        setTimeout(() => {
          // Mock room list
          const mockRooms: Room[] = [
            { 
              code: 'ABC123', 
              name: 'Fun Game', 
              playerCount: 2, 
              maxPlayers: 4,
              creatorId: 'player-1',
              isPrivate: false
            },
            { 
              code: 'DEF456', 
              name: 'Pro Players', 
              playerCount: 3, 
              maxPlayers: 4,
              creatorId: 'player-2',
              isPrivate: false
            },
            { 
              code: 'GHI789', 
              name: 'Beginners Welcome', 
              playerCount: 1, 
              maxPlayers: 4,
              creatorId: 'player-3',
              isPrivate: true
            },
          ];
          this.emit('room_list', { rooms: mockRooms });
        }, 300);
        break;
        
      case 'chat_message':
        // Echo the chat message back as if from server
        setTimeout(() => {
          // Get stored player info
          const playerId = localStorage.getItem('mauMauPlayerId') || 'unknown';
          const nickname = localStorage.getItem('mauMauNickname') || 'Guest';
          
          this.emit('chat_message', {
            message: {
              id: `msg-${Date.now()}`,
              playerId: playerId,
              nickname: nickname, 
              message: event.payload.message,
              timestamp: Date.now(),
            }
          });
        }, 100);
        break;
        
      case 'start_game':
        setTimeout(() => {
          toast({
            title: "Game Started!",
            description: "The game has been started by the room creator.",
          });
          
          this.emit('game_started', { roomCode: event.payload.roomCode });
        }, 500);
        break;
        
      case 'kick_player':
        setTimeout(() => {
          if (event.payload.targetPlayerId === localStorage.getItem('mauMauPlayerId')) {
            this.emit('player_kicked', { reason: 'You have been kicked from the room' });
            toast({
              title: "Kicked",
              description: "You have been removed from the room",
              variant: "destructive"
            });
          } else {
            const nickname = "Player"; // in a real app, we'd have the player's nickname
            this.emit('player_left', { playerId: event.payload.targetPlayerId, nickname });
            this.emit('chat_message', {
              message: {
                id: `msg-${Date.now()}`,
                playerId: 'system',
                nickname: 'System',
                message: `${nickname} has been kicked from the room`,
                timestamp: Date.now(),
              }
            });
          }
        }, 300);
        break;
    }
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();
