
import { EventEmitter } from './EventEmitter';
import { RoomService } from './RoomService';
import { ChatService } from './ChatService';
import { GameService } from './GameService';
import { SupabaseRealTimeService } from './SupabaseRealTimeService';
import { WebSocketEvent, ConnectionStatus } from './types';

/**
 * Main service for managing Supabase interactions
 */
class SupabaseService {
  private eventEmitter: EventEmitter;
  private roomService: RoomService;
  private chatService: ChatService;
  private gameService: GameService;
  private realtimeService: SupabaseRealTimeService;
  private status: ConnectionStatus = 'disconnected';

  constructor() {
    // Initialize the event emitter
    this.eventEmitter = new EventEmitter();
    
    // Initialize the dependent services
    this.roomService = new RoomService(this.eventEmitter);
    this.chatService = new ChatService(this.eventEmitter);
    this.gameService = new GameService(this.eventEmitter);
    this.realtimeService = new SupabaseRealTimeService(this.eventEmitter, this.roomService, this.chatService);
    
    // Set initial status
    this.setStatus('disconnected');
  }

  /**
   * Connect to Supabase services
   */
  async connect(): Promise<void> {
    this.setStatus('connecting');
    try {
      await this.realtimeService.connect();
    } catch (error) {
      console.error('Failed to connect to Supabase:', error);
      this.setStatus('disconnected');
    }
  }

  /**
   * Register an event handler
   */
  on<T>(event: string, callback: (data: T) => void): () => void {
    return this.eventEmitter.on<T>(event, callback);
  }

  /**
   * Send an event to the Supabase backend
   */
  async sendEvent(event: WebSocketEvent): Promise<void> {
    const { type, payload } = event;
    
    try {
      console.log(`Sending ${type} event with payload:`, payload);
      switch (type) {
        case 'create_room':
          const roomCode = await this.roomService.createRoom(
            payload.nickname,
            payload.playerId,
            payload.isPrivate
          );
          // Room created event will be emitted by the real-time subscription
          break;
          
        case 'join_room':
          await this.roomService.joinRoom(
            payload.roomCode,
            payload.nickname,
            payload.playerId
          );
          // Room joined event will be emitted by the real-time subscription
          break;
          
        case 'leave_room':
          await this.roomService.leaveRoom(
            payload.roomCode,
            payload.playerId
          );
          // Player left event will be emitted by the real-time subscription
          break;
          
        case 'kick_player':
          await this.roomService.kickPlayer(
            payload.roomCode,
            payload.targetPlayerId
          );
          // Player kicked event will be emitted by the real-time subscription
          break;
          
        case 'start_game':
          await this.roomService.startGame(payload.roomCode);
          // Game started event will be emitted by the real-time subscription
          break;
          
        case 'chat_message':
          await this.chatService.sendMessage(
            payload.roomCode,
            payload.playerId,
            payload.message
          );
          // Chat message event will be emitted by the real-time subscription
          break;
          
        case 'play_card':
          await this.gameService.playCard(
            payload.roomCode,
            payload.cardId
          );
          break;
          
        case 'draw_card':
          await this.gameService.drawCard(payload.roomCode);
          break;
          
        case 'say_mau_mau':
          await this.gameService.sayMauMau(payload.roomCode);
          break;
          
        case 'room_list':
          const rooms = await this.roomService.getPublicRooms();
          this.eventEmitter.emit('room_list', { rooms });
          break;
          
        default:
          console.warn('Unhandled event type:', type);
      }
    } catch (error) {
      console.error(`Error processing ${type} event:`, error);
      this.eventEmitter.emit('error', { message: error instanceof Error ? error.message : 'Ocorreu um erro ao processar sua solicitação.' });
    }
  }

  /**
   * Set connection status
   */
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
  }
}

// Create singleton instance
export const supabaseService = new SupabaseService();
