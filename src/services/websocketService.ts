
import { toast } from "@/hooks/use-toast";
import translations from "@/localization/pt-BR";

// WebSocket connection states
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

// Room visibility type
export type RoomVisibility = 'public' | 'private';

// Events that can be sent/received via WebSocket
export type WebSocketEvent = 
  | { type: 'join_room', payload: { roomCode: string, nickname: string, playerId: string } }
  | { type: 'create_room', payload: { nickname: string, playerId: string, isPrivate: boolean } }
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

// Active room data
interface ActiveRoom {
  code: string;
  name: string;
  players: { id: string; nickname: string; isCreator: boolean }[];
  createdAt: number;
  maxPlayers: number;
  isPrivate: boolean;
  creatorId: string;
}

// Create a shared storage for active rooms using window global
// This ensures all WebSocketService instances share the same room data
if (!window.activeRoomsMap) {
  window.activeRoomsMap = new Map<string, ActiveRoom>();
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private serverUrl: string;
  private activeRoomsMap: Map<string, ActiveRoom>;
  
  constructor() {
    // In a real app, this would come from environment variables
    this.serverUrl = 'wss://mau-mau-server.example.com';
    
    // Use the shared global room storage
    this.activeRoomsMap = window.activeRoomsMap;
    
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
  
  // Generate unique room code
  private generateRoomCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking characters
    let code = '';
    
    // Generate a 6-character code
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // If code already exists, generate a new one (avoid collisions)
    if (this.activeRoomsMap.has(code)) {
      return this.generateRoomCode();
    }
    
    return code;
  }
  
  // For demo: handle mock responses based on sent events
  private handleMockResponse(event: WebSocketEvent): void {
    switch (event.type) {
      case 'create_room':
        setTimeout(() => {
          const roomCode = this.generateRoomCode();
          const isPrivate = 'isPrivate' in event.payload ? event.payload.isPrivate : false;
          
          const newRoom: ActiveRoom = {
            code: roomCode,
            name: `${event.payload.nickname}'s Room`,
            players: [{
              id: event.payload.playerId,
              nickname: event.payload.nickname,
              isCreator: true
            }],
            createdAt: Date.now(),
            maxPlayers: 4,
            isPrivate: isPrivate,
            creatorId: event.payload.playerId
          };
          
          // Store the room in the shared map
          this.activeRoomsMap.set(roomCode, newRoom);
          
          this.emit('room_created', { 
            room: { 
              code: roomCode,
              name: newRoom.name,
              playerCount: 1,
              maxPlayers: 4,
              creatorId: event.payload.playerId,
              isPrivate: isPrivate
            } 
          });
        }, 300);
        break;
        
      case 'join_room':
        setTimeout(() => {
          const roomCode = event.payload.roomCode;
          const room = this.activeRoomsMap.get(roomCode);
          
          if (!room) {
            // Room not found - send error in Brazilian Portuguese
            const errorMessage = translations.messages.errorRoomNotFound(roomCode);
            
            this.emit('error', { message: errorMessage });
            toast({
              title: translations.app.error,
              description: errorMessage,
              variant: "destructive"
            });
            return;
          }
          
          // Check if player is already in the room
          const existingPlayerIndex = room.players.findIndex(p => p.id === event.payload.playerId);
          if (existingPlayerIndex === -1) {
            // Add player to room if not already in it
            room.players.push({
              id: event.payload.playerId,
              nickname: event.payload.nickname,
              isCreator: false
            });
          }
          
          // Prepare room data for client
          const roomData = {
            code: room.code,
            name: room.name,
            players: room.players,
            messages: [], // Messages would be stored and retrieved in a real implementation
            creatorId: room.creatorId,
            gameStarted: false, // Game status would be tracked in a real implementation
            isPrivate: room.isPrivate
          };
          
          // Emit room joined event
          this.emit('room_joined', { room: roomData });
          
          // Broadcast player joined message
          setTimeout(() => {
            this.emit('chat_message', {
              message: {
                id: `msg-${Date.now()}`,
                playerId: 'system',
                nickname: 'Sistema',
                message: translations.messages.playerJoined(event.payload.nickname),
                timestamp: Date.now(),
              }
            });
          }, 300);
        }, 500);
        break;
        
      case 'room_list':
        setTimeout(() => {
          // Convert active rooms to array for room list
          const rooms: Room[] = [];
          
          this.activeRoomsMap.forEach(room => {
            if (!room.isPrivate) { // Only show public rooms
              rooms.push({
                code: room.code,
                name: room.name,
                playerCount: room.players.length,
                maxPlayers: room.maxPlayers,
                creatorId: room.creatorId,
                isPrivate: room.isPrivate
              });
            }
          });
          
          this.emit('room_list', { rooms });
        }, 300);
        break;
        
      case 'chat_message':
        // Echo the chat message back as if from server
        setTimeout(() => {
          // Get stored player info
          const playerId = sessionStorage.getItem('mauMauPlayerId') || 'unknown';
          const nickname = sessionStorage.getItem('mauMauNickname') || 'Convidado';
          
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
            title: translations.messages.gameStarted,
            description: translations.messages.gameStartedByHost,
          });
          
          this.emit('game_started', { roomCode: event.payload.roomCode });
        }, 500);
        break;
        
      case 'kick_player':
        setTimeout(() => {
          const roomCode = event.payload.roomCode;
          const targetId = event.payload.targetPlayerId;
          const room = this.activeRoomsMap.get(roomCode);
          
          if (room) {
            // Find the player to kick
            const playerIndex = room.players.findIndex(p => p.id === targetId);
            let kickedNickname = "Jogador";
            
            if (playerIndex >= 0) {
              kickedNickname = room.players[playerIndex].nickname;
              // Remove player from the room
              room.players.splice(playerIndex, 1);
            }
            
            if (targetId === sessionStorage.getItem('mauMauPlayerId')) {
              this.emit('player_kicked', { reason: translations.messages.youWereKicked });
              toast({
                title: translations.app.error,
                description: translations.messages.youWereKicked,
                variant: "destructive"
              });
            } else {
              this.emit('player_left', { playerId: targetId, nickname: kickedNickname });
              this.emit('chat_message', {
                message: {
                  id: `msg-${Date.now()}`,
                  playerId: 'system',
                  nickname: 'Sistema',
                  message: translations.messages.playerKicked(kickedNickname),
                  timestamp: Date.now(),
                }
              });
            }
          }
        }, 300);
        break;
        
      case 'leave_room':
        setTimeout(() => {
          const roomCode = event.payload.roomCode;
          const playerId = event.payload.playerId;
          const room = this.activeRoomsMap.get(roomCode);
          
          if (room) {
            // Find and remove the player
            const playerIndex = room.players.findIndex(p => p.id === playerId);
            
            if (playerIndex >= 0) {
              const playerNickname = room.players[playerIndex].nickname;
              room.players.splice(playerIndex, 1);
              
              // If no players left, remove the room
              if (room.players.length === 0) {
                this.activeRoomsMap.delete(roomCode);
              } else if (playerId === room.creatorId && room.players.length > 0) {
                // If creator left, assign a new creator
                room.creatorId = room.players[0].id;
                room.players[0].isCreator = true;
              }
              
              this.emit('chat_message', {
                message: {
                  id: `msg-${Date.now()}`,
                  playerId: 'system',
                  nickname: 'Sistema',
                  message: translations.messages.playerLeft(playerNickname),
                  timestamp: Date.now(),
                }
              });
            }
          }
        }, 300);
        break;
    }
  }
}

// Augment Window interface to include our global rooms storage
declare global {
  interface Window {
    activeRoomsMap: Map<string, ActiveRoom>;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();
