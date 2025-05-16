
import { toast } from "@/hooks/use-toast";
import translations from "@/localization/pt-BR";
import { WebSocketEvent, ActiveRoom } from './types';

export class MockHandlers {
  private activeRoomsMap: Map<string, ActiveRoom>;
  private emitEvent: (eventName: string, data: any) => void;
  
  constructor(
    activeRoomsMap: Map<string, ActiveRoom>,
    emitEvent: (eventName: string, data: any) => void
  ) {
    this.activeRoomsMap = activeRoomsMap;
    this.emitEvent = emitEvent;
  }
  
  // Generate unique room code
  generateRoomCode(): string {
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
  
  // Handle mock responses based on sent events
  handleMockResponse(event: WebSocketEvent): void {
    switch (event.type) {
      case 'create_room':
        this.handleCreateRoom(event);
        break;
        
      case 'join_room':
        this.handleJoinRoom(event);
        break;
        
      case 'room_list':
        this.handleRoomList();
        break;
        
      case 'chat_message':
        this.handleChatMessage(event);
        break;
        
      case 'start_game':
        this.handleStartGame(event);
        break;
        
      case 'kick_player':
        this.handleKickPlayer(event);
        break;
        
      case 'leave_room':
        this.handleLeaveRoom(event);
        break;
    }
  }
  
  private handleCreateRoom(event: WebSocketEvent): void {
    if (event.type !== 'create_room') return;
    
    setTimeout(() => {
      const roomCode = this.generateRoomCode();
      const isPrivate = event.payload.isPrivate;
      
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
      
      this.emitEvent('room_created', { 
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
  }
  
  private handleJoinRoom(event: WebSocketEvent): void {
    if (event.type !== 'join_room') return;
    
    setTimeout(() => {
      const roomCode = event.payload.roomCode;
      const room = this.activeRoomsMap.get(roomCode);
      
      if (!room) {
        // Room not found - send error in Brazilian Portuguese
        const errorMessage = translations.messages.errorRoomNotFound(roomCode);
        
        this.emitEvent('error', { message: errorMessage });
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
      this.emitEvent('room_joined', { room: roomData });
      
      // Broadcast player joined message
      setTimeout(() => {
        this.emitEvent('chat_message', {
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
  }
  
  private handleRoomList(): void {
    setTimeout(() => {
      // Convert active rooms to array for room list
      const rooms = [];
      
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
      
      this.emitEvent('room_list', { rooms });
    }, 300);
  }
  
  private handleChatMessage(event: WebSocketEvent): void {
    if (event.type !== 'chat_message') return;
    
    // Echo the chat message back as if from server
    setTimeout(() => {
      // Get stored player info
      const playerId = sessionStorage.getItem('mauMauPlayerId') || 'unknown';
      const playerName = sessionStorage.getItem('mauMauNickname') || 'Convidado';
      
      this.emitEvent('chat_message', {
        message: {
          id: `msg-${Date.now()}`,
          playerId: playerId,
          playerName: playerName, 
          content: event.payload.message,
          timestamp: new Date().toISOString(),
        }
      });
    }, 100);
  }
  
  private handleStartGame(event: WebSocketEvent): void {
    if (event.type !== 'start_game') return;
    
    setTimeout(() => {
      toast({
        title: translations.messages.gameStarted,
        description: translations.messages.gameStartedByHost,
      });
      
      this.emitEvent('game_started', { roomCode: event.payload.roomCode });
    }, 500);
  }
  
  private handleKickPlayer(event: WebSocketEvent): void {
    if (event.type !== 'kick_player') return;
    
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
          this.emitEvent('player_kicked', { reason: translations.messages.youWereKicked });
          toast({
            title: translations.app.error,
            description: translations.messages.youWereKicked,
            variant: "destructive"
          });
        } else {
          this.emitEvent('player_left', { playerId: targetId, nickname: kickedNickname });
          this.emitEvent('chat_message', {
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
  }
  
  private handleLeaveRoom(event: WebSocketEvent): void {
    if (event.type !== 'leave_room') return;
    
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
          
          this.emitEvent('chat_message', {
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
  }
}
