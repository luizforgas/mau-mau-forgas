
import { supabase } from '@/integrations/supabase/client';
import { EventEmitter } from './EventEmitter';
import { ConnectionStatus } from './types';
import { RoomService } from './RoomService';
import { ChatService } from './ChatService';

/**
 * Service to handle real-time updates via Supabase
 */
class SupabaseRealTimeService {
  private eventEmitter: EventEmitter;
  private roomService: RoomService;
  private chatService: ChatService;
  private channels: Map<string, any> = new Map();
  private status: ConnectionStatus = 'disconnected';

  constructor(eventEmitter: EventEmitter, roomService: RoomService, chatService: ChatService) {
    this.eventEmitter = eventEmitter;
    this.roomService = roomService;
    this.chatService = chatService;
  }

  /**
   * Connects to Supabase real-time services
   */
  async connect(): Promise<void> {
    try {
      console.log('Connecting to Supabase real-time');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        this.setStatus('disconnected');
        this.eventEmitter.emit('connection_status', { status: 'disconnected' });
        return;
      }
      
      if (data.session) {
        console.log('Connected to Supabase with session:', data.session.user.id);
        this.setStatus('connected');
        this.eventEmitter.emit('connection_status', { status: 'connected' });
        this.setupRealTimeSubscriptions();
      } else {
        console.log('No active session found');
        this.setStatus('disconnected');
        this.eventEmitter.emit('connection_status', { status: 'disconnected' });
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      this.setStatus('disconnected');
      this.eventEmitter.emit('connection_status', { status: 'disconnected' });
    }
  }

  /**
   * Disconnects from Supabase real-time services
   */
  disconnect(): void {
    for (const [key, channel] of this.channels.entries()) {
      channel.unsubscribe();
      this.channels.delete(key);
    }
    
    this.setStatus('disconnected');
    this.eventEmitter.emit('connection_status', { status: 'disconnected' });
  }
  
  /**
   * Set up real-time subscriptions to Supabase tables
   */
  private setupRealTimeSubscriptions(): void {
    // Subscribe to room changes
    const roomsChannel = supabase
      .channel('public:rooms')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rooms' }, 
        (payload) => {
          console.log('Room change detected:', payload);
          if (payload.eventType === 'INSERT') {
            this.handleNewRoom(payload.new);
          } else if (payload.eventType === 'UPDATE') {
            this.handleRoomUpdate(payload.new);
          } else if (payload.eventType === 'DELETE') {
            this.handleRoomDelete(payload.old);
          }
        })
      .subscribe();
    
    this.channels.set('rooms', roomsChannel);

    // Subscribe to room_players changes
    const playersChannel = supabase
      .channel('public:room_players')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'room_players' }, 
        (payload) => {
          console.log('Room player change detected:', payload);
          if (payload.eventType === 'INSERT') {
            this.handlePlayerJoin(payload.new);
          } else if (payload.eventType === 'DELETE') {
            this.handlePlayerLeave(payload.old);
          }
        })
      .subscribe();
    
    this.channels.set('room_players', playersChannel);

    // Subscribe to messages
    const messagesChannel = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => {
          console.log('New message detected:', payload);
          this.handleNewMessage(payload.new);
        })
      .subscribe();
    
    this.channels.set('messages', messagesChannel);
  }
  
  /**
   * Handle room updates
   */
  private async handleRoomUpdate(room: any): Promise<void> {
    console.log('Room updated:', room);
    if (room.started_at) {
      this.eventEmitter.emit('game_started', { roomCode: room.code });
    }
  }
  
  /**
   * Handle new room creation
   */
  private async handleNewRoom(room: any): Promise<void> {
    console.log('New room created:', room);
    try {
      // Get creator data
      const { data: creatorData } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', room.host_id)
        .single();

      const roomData = {
        code: room.code,
        name: `Sala ${room.code}`,
        playerCount: 1,
        maxPlayers: room.max_players,
        isPrivate: room.is_private,
        creatorNickname: creatorData?.nickname || 'Unknown'
      };

      // Check if this is the user's created room
      const { data: session } = await supabase.auth.getSession();
      if (session.session && session.session.user.id === room.host_id) {
        console.log('This is my room, emitting room_created event', roomData);
        this.eventEmitter.emit('room_created', { room: roomData });
      }
    } catch (error) {
      console.error('Error in handleNewRoom:', error);
    }
  }
  
  /**
   * Handle room deletion
   */
  private handleRoomDelete(room: any): void {
    console.log('Room deleted:', room);
    // Notify any subscribers that room has been deleted
    this.eventEmitter.emit('room_deleted', { roomCode: room.code });
  }
  
  /**
   * Handle player joining a room
   */
  private async handlePlayerJoin(playerData: any): Promise<void> {
    try {
      console.log('Player joined a room:', playerData);
      // Get the room information
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', playerData.room_id)
        .single();

      if (roomError || !roomData) {
        console.error('Error getting room data:', roomError);
        return;
      }

      // Get the user information
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', playerData.user_id)
        .single();

      if (userError) {
        console.error('Error getting user data:', userError);
        return;
      }

      // Check if this is the current user joining a room
      const { data: session } = await supabase.auth.getSession();
      if (session.session && session.session.user.id === playerData.user_id) {
        console.log('This is me joining a room:', roomData.code);
        
        // Get room data with players and messages
        const roomWithData = await this.roomService.getRoomData(roomData.code);
        
        console.log('Emitting room_joined event with data:', roomWithData);
        this.eventEmitter.emit('room_joined', { room: roomWithData });
      } else {
        // Notify about player joining if room is being viewed
        console.log('Another player joined the room:', userData?.nickname);
        this.eventEmitter.emit('player_joined', { 
          roomCode: roomData.code,
          player: {
            id: playerData.user_id,
            nickname: userData?.nickname || 'Unknown',
            isCreator: playerData.user_id === roomData.host_id
          }
        });
      }
    } catch (error) {
      console.error('Error in handlePlayerJoin:', error);
    }
  }
  
  /**
   * Handle player leaving a room
   */
  private async handlePlayerLeave(playerData: any): Promise<void> {
    try {
      console.log('Player left a room:', playerData);
      // Get the current user's session
      const { data: session } = await supabase.auth.getSession();
      
      // Get room information to have the code
      const { data: roomData } = await supabase
        .from('rooms')
        .select('code')
        .eq('id', playerData.room_id)
        .single();
      
      const roomCode = roomData?.code || '';
      
      // If it's the current user, emit player_kicked event
      if (session.session && session.session.user.id === playerData.user_id) {
        console.log('I was removed from the room');
        this.eventEmitter.emit('player_kicked', { 
          reason: 'Você saiu da sala ou foi removido pelo anfitrião.'
        });
      } else {
        // Get the user information
        const { data: userData } = await supabase
          .from('users')
          .select('nickname')
          .eq('id', playerData.user_id)
          .single();

        // Notify about player leaving
        console.log('Another player left the room:', userData?.nickname);
        this.eventEmitter.emit('player_left', { 
          roomCode: roomCode,
          playerId: playerData.user_id,
          playerName: userData?.nickname || 'Unknown'
        });
      }
    } catch (error) {
      console.error('Error in handlePlayerLeave:', error);
    }
  }
  
  /**
   * Handle new messages
   */
  private async handleNewMessage(message: any): Promise<void> {
    try {
      // Get sender information
      const { data: userData } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', message.user_id)
        .single();

      const formattedMessage = {
        id: message.id,
        playerId: message.user_id,
        playerName: userData?.nickname || 'Unknown',
        content: message.content,
        timestamp: message.created_at
      };

      console.log('New chat message:', formattedMessage);
      this.eventEmitter.emit('chat_message', { message: formattedMessage });
    } catch (error) {
      console.error('Error in handleNewMessage:', error);
    }
  }
  
  /**
   * Set connection status
   */
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    console.log('Connection status changed to', status);
  }
}

export { SupabaseRealTimeService };
