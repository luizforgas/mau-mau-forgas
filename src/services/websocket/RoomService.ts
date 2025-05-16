
import { supabase } from '@/integrations/supabase/client';
import { Room } from './types';
import { EventEmitter } from './EventEmitter';

class RoomService {
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Fetches public rooms
   */
  async getPublicRooms(): Promise<Room[]> {
    try {
      console.log('Fetching public rooms');
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select('id, code, host_id, max_players, is_private')
        .eq('is_private', false)
        .is('started_at', null);

      if (error) {
        console.error('Error fetching rooms:', error);
        throw error;
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

      console.log('Emitting room list with', roomsWithCounts.length, 'rooms');
      return roomsWithCounts;
    } catch (error) {
      console.error('Error in getRoomList:', error);
      throw error;
    }
  }

  /**
   * Creates a new room
   */
  async createRoom(nickname: string, playerId: string, isPrivate: boolean): Promise<string> {
    try {
      console.log('Creating room for player', playerId, 'with nickname', nickname);
      
      // Get the current user session
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        console.error('No active session found');
        throw new Error('Usuário não está autenticado.');
      }
      
      const userId = session.session.user.id;
      
      // Ensure the user exists in the users table
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          nickname: nickname
        }, {
          onConflict: 'id'
        });
        
      if (userError) {
        console.error('Failed to create or update user record:', userError);
        throw new Error(`Erro ao criar usuário: ${userError.message}`);
      }
      
      // Wait a moment to ensure the user record is fully committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate a random room code (6 uppercase letters)
      const roomCode = this.generateRoomCode();
      
      // Insert new room in the rooms table
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          host_id: userId,
          is_private: isPrivate,
          code: roomCode,
          max_players: 4
        })
        .select()
        .single();

      if (roomError) {
        console.error('Room creation error:', roomError);
        throw new Error(`Erro ao criar sala: ${roomError.message}`);
      }
      
      console.log('Room created:', roomData);

      // Add the creator to room_players
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          user_id: userId
        });

      if (playerError) {
        console.error('Error adding player to room:', playerError);
        
        // Clean up by deleting the room if player couldn't be added
        await supabase
          .from('rooms')
          .delete()
          .eq('id', roomData.id);
          
        throw new Error(`Erro ao adicionar jogador à sala: ${playerError.message}`);
      }
      
      console.log('Player added to room successfully');
      return roomCode;
    } catch (error) {
      console.error('Error in createRoom:', error);
      throw error;
    }
  }

  /**
   * Joins a room by room code
   */
  async joinRoom(roomCode: string, nickname: string, playerId: string): Promise<void> {
    try {
      console.log('Joining room', roomCode, 'for player', playerId);
      
      // Get the current user session
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        console.error('No active session found');
        throw new Error('Usuário não está autenticado.');
      }
      
      const userId = session.session.user.id;
      
      // Ensure the user exists in the users table
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          nickname: nickname
        }, {
          onConflict: 'id'
        });
        
      if (userError) {
        console.error('Failed to create or update user record:', userError);
        throw new Error(`Erro ao criar usuário: ${userError.message}`);
      }
      
      // Wait a moment to ensure the user record is fully committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Find the room by code
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (roomError) {
        console.error('Room not found:', roomError);
        throw new Error(`Sala com o código ${roomCode} não foi encontrada.`);
      }

      console.log('Found room:', roomData);

      // Check if the room has started
      if (roomData.started_at) {
        console.log('Room has already started game');
        throw new Error('Esta sala já iniciou o jogo e não aceita novos jogadores.');
      }

      // Check if room is full
      const { count, error: countError } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomData.id);

      if (countError) {
        console.error('Error checking room count:', countError);
        throw countError;
      }

      if (count && count >= roomData.max_players) {
        console.log('Room is full');
        throw new Error('Esta sala está cheia.');
      }

      // Check if player is already in the room
      const { data: existingPlayer, error: existingError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomData.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingError) {
        console.error('Error checking if player is in room:', existingError);
        throw existingError;
      }

      if (existingPlayer) {
        console.log('Player is already in room, rejoining');
        // Player is already in the room, just rejoin
        return;
      }

      // Add player to room
      const { error: joinError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          user_id: userId
        });

      if (joinError) {
        console.error('Error joining room:', joinError);
        throw joinError;
      }

      console.log('Player successfully joined room');
    } catch (error) {
      console.error('Error in joinRoom:', error);
      throw error;
    }
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomCode: string, playerId: string): Promise<void> {
    try {
      console.log('Leaving room', roomCode, 'for player', playerId);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        console.error('No active session found');
        throw new Error('Usuário não está autenticado.');
      }
      
      const userId = session.session.user.id;
      
      // Find the room by code
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (roomError) {
        console.error('Room not found:', roomError);
        throw roomError;
      }

      // Remove player from room
      const { error: leaveError } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomData.id)
        .eq('user_id', userId);

      if (leaveError) {
        console.error('Error leaving room:', leaveError);
        throw leaveError;
      }

      console.log('Player left room successfully');

      // If this player was the host, transfer ownership or delete the room
      if (roomData.host_id === userId) {
        // Check if room is empty
        const { count, data: remainingPlayers, error: countError } = await supabase
          .from('room_players')
          .select('*', { count: 'exact' })
          .eq('room_id', roomData.id);

        if (countError) {
          console.error('Error checking if room is empty:', countError);
          throw countError;
        }

        if (count === 0) {
          // Room is empty, delete it
          console.log('Room is empty, deleting it', roomData.id);
          await supabase
            .from('rooms')
            .delete()
            .eq('id', roomData.id);
        } else if (remainingPlayers && remainingPlayers.length > 0) {
          // Transfer ownership to the first remaining player
          const newHostId = remainingPlayers[0].user_id;
          console.log('Transferring room ownership to:', newHostId);
          await supabase
            .from('rooms')
            .update({ host_id: newHostId })
            .eq('id', roomData.id);
        }
      }
    } catch (error) {
      console.error('Error in leaveRoom:', error);
      throw error;
    }
  }

  /**
   * Kick a player from a room
   */
  async kickPlayer(roomCode: string, targetPlayerId: string): Promise<void> {
    try {
      console.log('Kicking player', targetPlayerId, 'from room', roomCode);
      
      // Find the room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (roomError) throw roomError;

      // Check if the current user is the host
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session || session.session.user.id !== roomData.host_id) {
        console.log('Not room host, cannot kick player');
        throw new Error('Apenas o anfitrião pode remover jogadores.');
      }

      // Remove the target player
      const { error: kickError } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomData.id)
        .eq('user_id', targetPlayerId);

      if (kickError) throw kickError;
      
      console.log('Player kicked successfully');
    } catch (error) {
      console.error('Error in kickPlayer:', error);
      throw error;
    }
  }

  /**
   * Start a game
   */
  async startGame(roomCode: string): Promise<void> {
    try {
      console.log('Starting game in room', roomCode);
      
      // Find the room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (roomError) throw roomError;

      // Check if the current user is the host
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session || session.session.user.id !== roomData.host_id) {
        console.log('Not room host, cannot start game');
        throw new Error('Apenas o anfitrião pode iniciar o jogo.');
      }

      // Check if there are enough players (at least 2)
      const { count, error: countError } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomData.id);

      if (countError) throw countError;

      if (count && count < 2) {
        console.log('Not enough players to start game');
        throw new Error('São necessários pelo menos 2 jogadores para iniciar.');
      }

      // Update room to started
      const { error: startError } = await supabase
        .from('rooms')
        .update({ started_at: new Date().toISOString() })
        .eq('id', roomData.id);

      if (startError) throw startError;
      
      console.log('Game started successfully');
    } catch (error) {
      console.error('Error in startGame:', error);
      throw error;
    }
  }

  /**
   * Fetch room data with players and messages
   */
  async getRoomData(roomCode: string): Promise<any> {
    try {
      console.log('Fetching data for room', roomCode);
      
      // Get the room information
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (roomError) {
        console.error('Error getting room data:', roomError);
        throw roomError;
      }

      // Get all players with their nicknames
      const { data: roomPlayers, error: roomPlayersError } = await supabase
        .from('room_players')
        .select('user_id')
        .eq('room_id', roomData.id);
        
      if (roomPlayersError) {
        console.error('Error getting room players:', roomPlayersError);
        throw roomPlayersError;
      }
          
      // Get nicknames for each player
      const players = [];
      if (roomPlayers) {
        for (const player of roomPlayers) {
          const { data: userData, error: userDataError } = await supabase
            .from('users')
            .select('nickname')
            .eq('id', player.user_id)
            .single();

          if (userDataError) {
            console.error('Error getting user nickname:', userDataError);
            continue;
          }
              
          players.push({
            id: player.user_id,
            nickname: userData?.nickname || 'Unknown',
            isCreator: player.user_id === roomData.host_id
          });
        }
      }

      // Get messages for the room
      const { data: roomMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomData.id)
        .order('created_at', { ascending: true });
        
      if (messagesError) {
        console.error('Error getting room messages:', messagesError);
        throw messagesError;
      }
          
      // Get sender nickname for each message
      const messages = [];
      if (roomMessages) {
        for (const message of roomMessages) {
          const { data: userData, error: userDataError } = await supabase
            .from('users')
            .select('nickname')
            .eq('id', message.user_id)
            .single();

          if (userDataError) {
            console.error('Error getting message sender:', userDataError);
            continue;
          }
              
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
      return {
        code: roomData.code,
        players: players || [],
        messages: messages || [],
        gameStarted: !!roomData.started_at,
        creatorId: roomData.host_id,
        isPrivate: roomData.is_private
      };
    } catch (error) {
      console.error('Error in getRoomData:', error);
      throw error;
    }
  }

  /**
   * Generate a random room code
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export { RoomService };
