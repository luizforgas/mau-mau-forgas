
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { websocketService, Room, ChatMessage, ConnectionStatus, WebSocketEvent } from '@/services/websocketService';
import { playerService, PlayerInfo } from '@/services/playerService';
import { useToast } from '@/components/ui/use-toast';
import { GameState } from '@/types/game';

interface RoomData {
  code: string;
  name?: string;
  players: {
    id: string;
    nickname: string;
    isCreator: boolean;
  }[];
  messages: ChatMessage[];
  gameStarted: boolean;
  creatorId: string;
}

interface MultiplayerContextType {
  status: ConnectionStatus;
  isAuthenticated: boolean;
  playerInfo: PlayerInfo | null;
  publicRooms: Room[];
  currentRoom: RoomData | null;
  chatMessages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  
  // Authentication actions
  setNickname: (nickname: string) => void;
  
  // Room actions
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  leaveRoom: () => void;
  kickPlayer: (playerId: string) => void;
  startGame: () => void;
  
  // Chat actions
  sendChatMessage: (message: string) => void;
  
  // Game actions
  playCard: (cardId: string) => void;
  drawCard: () => void;
  sayMauMau: () => void;
  getPublicRooms: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export const MultiplayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize player data and WebSocket connection
  useEffect(() => {
    const setupPlayer = async () => {
      const player = playerService.getPlayerInfo();
      
      if (player) {
        setPlayerInfo(player);
        setIsAuthenticated(true);
        
        // Connect to WebSocket
        try {
          await websocketService.connect();
          
          // Check if player was in a room
          const currentRoomCode = player.currentRoom;
          if (currentRoomCode) {
            joinRoom(currentRoomCode);
          }
        } catch (error) {
          console.error('Failed to connect to WebSocket:', error);
          setError('Failed to connect to game server');
        }
      }
    };
    
    setupPlayer();
    
    // Set up connection status listener
    const unsubscribe = websocketService.on<{ status: ConnectionStatus }>('connection_status', 
      (data) => {
        setStatus(data.status);
        
        if (data.status === 'disconnected') {
          toast({
            title: "Disconnected",
            description: "Connection to game server lost",
            variant: "destructive"
          });
        }
      });
    
    // Clean up on unmount
    return () => {
      unsubscribe();
    };
  }, [toast]);

  // Set up WebSocket event listeners
  useEffect(() => {
    // Handle room creation response
    const roomCreatedUnsubscribe = websocketService.on<{ room: Room }>('room_created', 
      (data) => {
        setIsLoading(false);
        
        // Save room code
        playerService.setCurrentRoom(data.room.code);
        
        // Create initial room data
        setCurrentRoom({
          code: data.room.code,
          players: [
            { id: playerInfo?.playerId || '', nickname: playerInfo?.nickname || '', isCreator: true }
          ],
          messages: [],
          gameStarted: false,
          creatorId: playerInfo?.playerId || '',
        });
        
        toast({
          title: "Room Created",
          description: `Room code: ${data.room.code}`,
        });
      });
    
    // Handle room join response
    const roomJoinedUnsubscribe = websocketService.on<{ room: any }>('room_joined', 
      (data) => {
        setIsLoading(false);
        setCurrentRoom(data.room);
        playerService.setCurrentRoom(data.room.code);
      });
    
    // Handle chat messages
    const chatMessageUnsubscribe = websocketService.on<{ message: ChatMessage }>('chat_message', 
      (data) => {
        setChatMessages(prevMessages => [...prevMessages, data.message]);
      });
    
    // Handle room list updates
    const roomListUnsubscribe = websocketService.on<{ rooms: Room[] }>('room_list', 
      (data) => {
        setPublicRooms(data.rooms);
        setIsLoading(false);
      });
    
    // Handle player kicked event
    const playerKickedUnsubscribe = websocketService.on<{ reason: string }>('player_kicked', 
      (data) => {
        toast({
          title: "Kicked from Room",
          description: data.reason,
          variant: "destructive"
        });
        
        // Clear room data
        setCurrentRoom(null);
        playerService.setCurrentRoom(undefined);
      });
    
    // Handle game start event
    const gameStartedUnsubscribe = websocketService.on<{ roomCode: string }>('game_started', 
      () => {
        if (currentRoom) {
          setCurrentRoom({
            ...currentRoom,
            gameStarted: true
          });
        }
      });

    // Handle errors from server
    const errorUnsubscribe = websocketService.on<{ message: string }>('error',
      (data) => {
        setError(data.message);
        setIsLoading(false);
        
        // Auto-clear error after 5 seconds
        setTimeout(() => {
          setError(null);
        }, 5000);
      });

    return () => {
      // Clean up all event listeners
      roomCreatedUnsubscribe();
      roomJoinedUnsubscribe();
      chatMessageUnsubscribe();
      roomListUnsubscribe();
      playerKickedUnsubscribe();
      gameStartedUnsubscribe();
      errorUnsubscribe();
    };
  }, [toast, playerInfo, currentRoom]);

  // Authentication actions
  const setNickname = useCallback((nickname: string) => {
    playerService.setNickname(nickname);
    const playerId = playerService.getOrCreatePlayerId();
    
    setPlayerInfo({
      playerId,
      nickname,
      currentRoom: playerService.getCurrentRoom()
    });
    
    setIsAuthenticated(true);
    
    // Connect to WebSocket after authentication
    websocketService.connect().catch(error => {
      console.error('Failed to connect to WebSocket:', error);
      setError('Failed to connect to game server');
    });
  }, []);

  // Room actions
  const createRoom = useCallback(() => {
    if (!isAuthenticated || !playerInfo) {
      setError('You must be logged in to create a room');
      return;
    }
    
    setIsLoading(true);
    setError(null); // Clear any previous errors
    websocketService.sendEvent({
      type: 'create_room',
      payload: {
        nickname: playerInfo.nickname,
        playerId: playerInfo.playerId
      }
    });
  }, [isAuthenticated, playerInfo]);

  const joinRoom = useCallback((roomCode: string) => {
    if (!isAuthenticated || !playerInfo) {
      setError('You must be logged in to join a room');
      return;
    }
    
    setIsLoading(true);
    setError(null); // Clear any previous errors
    websocketService.sendEvent({
      type: 'join_room',
      payload: {
        roomCode,
        nickname: playerInfo.nickname,
        playerId: playerInfo.playerId
      }
    });
  }, [isAuthenticated, playerInfo]);

  const leaveRoom = useCallback(() => {
    if (!currentRoom || !playerInfo) return;
    
    websocketService.sendEvent({
      type: 'leave_room',
      payload: {
        roomCode: currentRoom.code,
        playerId: playerInfo.playerId
      }
    });
    
    setCurrentRoom(null);
    playerService.setCurrentRoom(undefined);
    setChatMessages([]);
  }, [currentRoom, playerInfo]);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    if (!currentRoom || !playerInfo) return;
    
    // Only creator can kick
    if (currentRoom.creatorId !== playerInfo.playerId) {
      toast({
        title: "Permission Denied",
        description: "Only the room creator can kick players",
        variant: "destructive"
      });
      return;
    }
    
    websocketService.sendEvent({
      type: 'kick_player',
      payload: {
        roomCode: currentRoom.code,
        targetPlayerId
      }
    });
  }, [currentRoom, playerInfo, toast]);

  const startGame = useCallback(() => {
    if (!currentRoom || !playerInfo) return;
    
    // Only creator can start the game
    if (currentRoom.creatorId !== playerInfo.playerId) {
      toast({
        title: "Permission Denied",
        description: "Only the room creator can start the game",
        variant: "destructive"
      });
      return;
    }
    
    websocketService.sendEvent({
      type: 'start_game',
      payload: {
        roomCode: currentRoom.code
      }
    });
  }, [currentRoom, playerInfo, toast]);

  // Chat actions
  const sendChatMessage = useCallback((message: string) => {
    if (!currentRoom || !playerInfo) return;
    
    websocketService.sendEvent({
      type: 'chat_message',
      payload: {
        roomCode: currentRoom.code,
        message,
        playerId: playerInfo.playerId
      }
    });
  }, [currentRoom, playerInfo]);

  // Game actions
  const playCard = useCallback((cardId: string) => {
    if (!currentRoom || !playerInfo) return;
    
    websocketService.sendEvent({
      type: 'play_card',
      payload: {
        roomCode: currentRoom.code,
        cardId
      }
    });
  }, [currentRoom, playerInfo]);

  const drawCard = useCallback(() => {
    if (!currentRoom || !playerInfo) return;
    
    websocketService.sendEvent({
      type: 'draw_card',
      payload: {
        roomCode: currentRoom.code
      }
    });
  }, [currentRoom, playerInfo]);

  const sayMauMau = useCallback(() => {
    if (!currentRoom || !playerInfo) return;
    
    websocketService.sendEvent({
      type: 'say_mau_mau',
      payload: {
        roomCode: currentRoom.code
      }
    });
  }, [currentRoom, playerInfo]);

  const getPublicRooms = useCallback(() => {
    setIsLoading(true);
    setError(null); // Clear any previous errors
    websocketService.sendEvent({
      type: 'room_list',
      payload: { rooms: [] } // Empty payload, server will respond with rooms
    });
  }, []);

  // Context value
  const value = {
    status,
    isAuthenticated,
    playerInfo,
    publicRooms,
    currentRoom,
    chatMessages,
    isLoading,
    error,
    setNickname,
    createRoom,
    joinRoom,
    leaveRoom,
    kickPlayer,
    startGame,
    sendChatMessage,
    playCard,
    drawCard,
    sayMauMau,
    getPublicRooms,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
};

export const useMultiplayer = (): MultiplayerContextType => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};
