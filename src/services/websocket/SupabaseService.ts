import { ChatMessage, Room, ConnectionStatus, WebSocketEvent } from './types';
import { supabase } from '@/integrations/supabase/client';

// EventHandlers storage with callback functions
type EventHandler<T> = (data: T) => void;
type EventHandlers = Map<string, EventHandler<any>[]>;

export class SupabaseService {
  private handlers: EventHandlers = new Map();
  private status: ConnectionStatus = 'disconnected';
  private channels: Map<string, any> = new Map();

  constructor() {
    // Initialize with disconnect status
    this.setStatus('disconnected');
  }

  // Connect to Supabase
  async connect(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        this.setStatus('disconnected');
        this.emit('connection_status', { status: 'disconnected' });
        return;
      }
      
      if (data.session) {
        this.setStatus('connected');
        this.emit('connection_status', { status: 'connected' });
        this.setupRealTimeSubscriptions();
      } else {
        this.setStatus('disconnected');
        this.emit('connection_status', { status: 'disconnected' });
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      this.setStatus('disconnected');
      this.emit('connection_status', { status: 'disconnected' });
    }
  }

  // Setup real-time subscriptions
  private setupRealTimeSubscriptions() {
    // Subscribe to room changes
    const roomsChannel = supabase
      .channel('public:rooms')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rooms' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            this.handleNewRoom(payload.new);
          } else if (payload.eventType === 'UPDATE') {
            this.handleRoomUpdate(payload.new);
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
          this.handleNewMessage(payload.new);
        })
      .subscribe();
    
    this.channels.set('messages', messagesChannel);
  }

  // Handle new room creation
  private async handleNewRoom(room: any) {
    // Fixed: Replaced join query with separate query for creator data
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
      this.emit('room_created', { room: roomData });
    }

    // Also update the room list
    this.getRoomList();
  }

  // Handle room updates
  private handleRoomUpdate(room: any) {
    if (room.started_at) {
      this.emit('game_started', { roomCode: room.code });
    }
  }

  // Handle player joining a room
  private async handlePlayerJoin(playerData: any) {
    // Get the room information
    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', playerData.room_id)
      .single();

    if (!roomData) return;

    // Get the user information
    // Fixed: Replaced join query with separate query for user data
    const { data: userData } = await supabase
      .from('users')
      .select('nickname')
      .eq('id', playerData.user_id)
      .single();

    // Get all players in the room
    const { data: playersData } = await supabase
      .from('room_players')
      .select('user_id')
      .eq('room_id', playerData.room_id);

    const playerCount = playersData?.length || 0;

    // Check if this is the current user joining a room
    const { data: session } = await supabase.auth.getSession();
    if (session.session && session.session.user.id === playerData.user_id) {
      // Get all players with their nicknames
      // Fixed: Correctly query players with their nicknames using two separate queries
      const { data: roomPlayers } = await supabase
        .from('room_players')
        .select('user_id')
        .eq('room_id', playerData.room_id);
        
      // Get nicknames for each player
      const players = [];
      if (roomPlayers) {
        for (const player of roomPlayers) {
          const { data: userData } = await supabase
            .from('users')
            .select('nickname')
            .eq('id', player.user_id)
            .single();
            
          players.push({
            id: player.user_id,
            nickname: userData?.nickname || 'Unknown',
            isCreator: player.user_id === roomData.host_id
          });
        }
      }

      // Get messages for the room
      // Fixed: Correctly query messages with sender nicknames using two separate queries
      const { data: roomMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', playerData.room_id)
        .order('created_at', { ascending: true });
        
      // Get sender nickname for each message
      const messages = [];
      if (roomMessages) {
        for (const message of roomMessages) {
          const { data: userData } = await supabase
            .from('users')
            .select('nickname')
            .eq('id', message.user_id)
            .single();
            
          messages.push({
            id: message.id,
            playerId: message.user_id,
            playerName: userData?.nickname || 'Unknown',
            content: message.content,
            timestamp: message.created_at
          });
        }
      }

      // Format the room data for the client
      const roomFullData = {
        code: roomData.code,
        players: players || [],
        messages: messages || [],
        gameStarted: !!roomData.started_at,
        creatorId: roomData.host_id,
        isPrivate: roomData.is_private
      };

      this.emit('room_joined', { room: roomFullData });
    } else {
      // Notify about player joining if room is being viewed
      this.emit('player_joined', { 
        roomCode: roomData.code,
        player: {
          id: playerData.user_id,
          nickname: userData?.nickname || 'Unknown',
          isCreator: playerData.user_id === roomData.host_id
        }
      });
    }
  }

  // Handle player leaving a room
  private async handlePlayerLeave(playerData: any) {
    // Get the current user's session
    const { data: session } = await supabase.auth.getSession();
    
    // If it's the current user, emit player_kicked event
    if (session.session && session.session.user.id === playerData.user_id) {
      this.emit('player_kicked', { 
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
      this.emit('player_left', { 
        roomCode: playerData.room_id,
        playerId: playerData.user_id,
        playerName: userData?.nickname || 'Unknown'
      });
    }
  }

  // Handle new messages
  private async handleNewMessage(message: any) {
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

    this.emit('chat_message', { message: formattedMessage });
  }

  // Set connection status
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
  }

  // Get rooms list
  private async getRoomList() {
    // Fixed: Correctly query rooms with creator nicknames using two separate queries
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('id, code, host_id, max_players, is_private')
      .eq('is_private', false)
      .is('started_at', null);

    if (error) {
      console.error('Error fetching rooms:', error);
      return;
    }

    // Get player counts and creator nicknames for each room
    const roomsWithCounts = await Promise.all(
      (rooms || []).map(async (room) => {
        const { count } = await supabase
          .from('room_players')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id);
          
        // Get creator nickname
        const { data: creator } = await supabase
          .from('users')
          .select('nickname')
          .eq('id', room.host_id)
          .single();

        return {
          code: room.code,
          name: `Sala ${room.code}`,
          playerCount: count || 0,
          maxPlayers: room.max_players,
          isPrivate: room.is_private,
          creatorNickname: creator?.nickname || 'Unknown'
        };
      })
    );

    // Emit room list event
    this.emit('room_list', { rooms: roomsWithCounts });
  }

  // Send an event to the server
  async sendEvent(event: WebSocketEvent): Promise<void> {
    const { type, payload } = event;
    
    try {
      switch (type) {
        case 'create_room':
          await this.createRoom(payload);
          break;
        case 'join_room':
          await this.joinRoom(payload);
          break;
        case 'leave_room':
          await this.leaveRoom(payload);
          break;
        case 'kick_player':
          await this.kickPlayer(payload);
          break;
        case 'start_game':
          await this.startGame(payload);
          break;
        case 'chat_message':
          await this.sendMessage(payload);
          break;
        case 'room_list':
          await this.getRoomList();
          break;
        default:
          console.warn('Unhandled event type:', type);
      }
    } catch (error) {
      console.error(`Error processing ${type} event:`, error);
      this.emit('error', { message: 'Ocorreu um erro ao processar sua solicitação.' });
    }
  }

  // Create a new room
  private async createRoom(payload: any): Promise<void> {
    try {
      console.log('Creating room with payload:', payload);
      
      // Get the current user session
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        this.emit('error', { 
          message: 'Usuário não está autenticado.' 
        });
        return;
      }
      
      const userId = session.session.user.id;
      const userNickname = payload.nickname || 'Unknown Player';
      
      // IMPORTANT: First ensure the user exists in the users table
      // Use upsert to create or update the user record if needed
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          nickname: userNickname
        }, {
          onConflict: 'id'
        });
        
      if (userError) {
        console.error('Failed to create or update user record:', userError);
        this.emit('error', { 
          message: `Erro ao criar usuário: ${userError.message}` 
        });
        return;
      }
      
      console.log('User record ensured for auth user:', userId);
      
      // Important: Wait a moment to ensure the user record is fully committed
      // This helps avoid race conditions with foreign key constraints
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate a random room code (6 uppercase letters)
      const generateRoomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      const roomCode = generateRoomCode();
      
      // Insert new room in the rooms table - now using the userId from the session
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          host_id: userId, // Use the userId from the session directly
          is_private: payload.isPrivate,
          code: roomCode,
          max_players: 4 // Default to 4 players
        })
        .select()
        .single();

      if (roomError) {
        console.error('Room creation error:', roomError);
        this.emit('error', { 
          message: `Erro ao criar sala: ${roomError.message}` 
        });
        return;
      }
      
      console.log('Room created:', roomData);

      // Add the creator to room_players
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          user_id: userId // Use the userId from the session
        });

      if (playerError) {
        console.error('Error adding player to room:', playerError);
        this.emit('error', { 
          message: `Erro ao adicionar jogador à sala: ${playerError.message}` 
        });
        return;
      }
      
      console.log('Player added to room successfully');

      // The room creation event will be emitted by the real-time subscription
    } catch (error: any) {
      console.error('Error creating room:', error);
      this.emit('error', { 
        message: `Erro ao criar sala: ${error.message || 'Tente novamente.'}` 
      });
    }
  }

  // Join an existing room
  private async joinRoom(payload: any): Promise<void> {
    try {
      // Find the room by code
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', payload.roomCode)
        .single();

      if (roomError) {
        this.emit('error', { 
          message: `Sala com o código ${payload.roomCode} não foi encontrada.` 
        });
        return;
      }

      // Check if the room has started
      if (roomData.started_at) {
        this.emit('error', { 
          message: 'Esta sala já iniciou o jogo e não aceita novos jogadores.' 
        });
        return;
      }

      // Check if room is full
      const { count, error: countError } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomData.id);

      if (countError) throw countError;

      if (count && count >= roomData.max_players) {
        this.emit('error', { 
          message: 'Esta sala está cheia.' 
        });
        return;
      }

      // Check if player is already in the room
      const { data: existingPlayer, error: existingError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomData.id)
        .eq('user_id', payload.playerId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingPlayer) {
        // Player is already in the room, just rejoin
        // The room_joined event will be triggered by the subscription
        return;
      }

      // Add player to room
      const { error: joinError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          user_id: payload.playerId
        });

      if (joinError) throw joinError;

      // The room_joined event will be emitted by the real-time subscription
    } catch (error) {
      console.error('Error joining room:', error);
      this.emit('error', { 
        message: 'Erro ao entrar na sala. Tente novamente.' 
      });
    }
  }

  // Leave a room
  private async leaveRoom(payload: any): Promise<void> {
    try {
      // Find the room by code
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', payload.roomCode)
        .single();

      if (roomError) throw roomError;

      // Remove player from room
      const { error: leaveError } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomData.id)
        .eq('user_id', payload.playerId);

      if (leaveError) throw leaveError;

      // If this player was the host, delete the room if empty or transfer ownership
      if (roomData.host_id === payload.playerId) {
        // Check if room is empty
        const { count, data: remainingPlayers, error: countError } = await supabase
          .from('room_players')
          .select('*', { count: 'exact' })
          .eq('room_id', roomData.id);

        if (countError) throw countError;

        if (count === 0) {
          // Room is empty, delete it
          await supabase
            .from('rooms')
            .delete()
            .eq('id', roomData.id);
        } else {
          // Transfer ownership to the first remaining player
          const newHostId = remainingPlayers![0].user_id;
          await supabase
            .from('rooms')
            .update({ host_id: newHostId })
            .eq('id', roomData.id);
        }
      }

      // The player_left event will be handled by the real-time subscription
    } catch (error) {
      console.error('Error leaving room:', error);
      this.emit('error', { 
        message: 'Erro ao sair da sala. Tente novamente.' 
      });
    }
  }

  // Kick a player from a room
  private async kickPlayer(payload: any): Promise<void> {
    try {
      // Find the room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', payload.roomCode)
        .single();

      if (roomError) throw roomError;

      // Check if the current user is the host
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session || session.session.user.id !== roomData.host_id) {
        this.emit('error', { 
          message: 'Apenas o anfitrião pode remover jogadores.' 
        });
        return;
      }

      // Remove the target player
      const { error: kickError } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomData.id)
        .eq('user_id', payload.targetPlayerId);

      if (kickError) throw kickError;

      // The player_kicked event will be handled by the real-time subscription
    } catch (error) {
      console.error('Error kicking player:', error);
      this.emit('error', { 
        message: 'Erro ao remover jogador. Tente novamente.' 
      });
    }
  }

  // Start a game
  private async startGame(payload: any): Promise<void> {
    try {
      // Find the room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', payload.roomCode)
        .single();

      if (roomError) throw roomError;

      // Check if the current user is the host
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session || session.session.user.id !== roomData.host_id) {
        this.emit('error', { 
          message: 'Apenas o anfitrião pode iniciar o jogo.' 
        });
        return;
      }

      // Check if there are enough players (at least 2)
      const { count, error: countError } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomData.id);

      if (countError) throw countError;

      if (count && count < 2) {
        this.emit('error', { 
          message: 'São necessários pelo menos 2 jogadores para iniciar.' 
        });
        return;
      }

      // Update room to started
      const { error: startError } = await supabase
        .from('rooms')
        .update({ started_at: new Date().toISOString() })
        .eq('id', roomData.id);

      if (startError) throw startError;

      // The game_started event will be emitted by the real-time subscription
    } catch (error) {
      console.error('Error starting game:', error);
      this.emit('error', { 
        message: 'Erro ao iniciar o jogo. Tente novamente.' 
      });
    }
  }

  // Send a chat message
  private async sendMessage(payload: any): Promise<void> {
    try {
      // Find the room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', payload.roomCode)
        .single();

      if (roomError) throw roomError;

      // Insert the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          room_id: roomData.id,
          user_id: payload.playerId,
          content: payload.message
        });

      if (messageError) throw messageError;

      // The chat_message event will be emitted by the real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      this.emit('error', { 
        message: 'Erro ao enviar mensagem. Tente novamente.' 
      });
    }
  }

  // Register an event handler
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

  // Emit an event to all registered handlers
  private emit<T>(event: string, data: T): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }
}

// Create a singleton instance
export const supabaseService = new SupabaseService();
