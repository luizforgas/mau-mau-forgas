
import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { MultiplayerContextType, RoomData } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import translations from '@/localization/pt-BR';
import { supabaseService } from '@/services/websocket/SupabaseService';
import { playerService } from '@/services/playerService';
import { Room, ChatMessage } from '@/services/websocket/types';

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export const MultiplayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  
  // Set up WebSocket event listeners
  useEffect(() => {
    // Connection status
    const connectionStatusUnsubscribe = supabaseService.on('connection_status', 
      (data: { status: 'connecting' | 'connected' | 'disconnected' }) => {
        setStatus(data.status);
        
        if (data.status === 'disconnected') {
          toast({
            title: translations.messages.disconnected,
            description: translations.messages.connectionLost,
            variant: "destructive"
          });
        }
      });
      
    // Room created
    const roomCreatedUnsubscribe = supabaseService.on('room_created', 
      (data: { room: Room }) => {
        console.log('Room created event received:', data);
        setIsLoading(false);
        
        // Save room code
        playerService.setCurrentRoom(data.room.code);
        
        // Create initial room data
        const newRoom = {
          code: data.room.code,
          players: [
            { id: playerInfo?.playerId || '', nickname: playerInfo?.nickname || '', isCreator: true }
          ],
          messages: [],
          gameStarted: false,
          creatorId: playerInfo?.playerId || '',
          isPrivate: data.room.isPrivate,
        };
        
        setCurrentRoom(newRoom);
        
        console.log('Setting current room after creation:', newRoom);
        
        toast({
          title: translations.messages.roomCreated,
          description: `${translations.lobby.roomCode}: ${data.room.code}`,
        });
      });
      
    // Room joined
    const roomJoinedUnsubscribe = supabaseService.on('room_joined', 
      (data: { room: RoomData }) => {
        console.log('Room joined event received:', data);
        setIsLoading(false);
        setCurrentRoom(data.room);
        playerService.setCurrentRoom(data.room.code);
        setChatMessages(data.room.messages || []);
        
        console.log('Current room set after joining:', data.room);
      });
      
    // Room deleted
    const roomDeletedUnsubscribe = supabaseService.on('room_deleted',
      (data: { roomCode: string }) => {
        console.log('Room deleted event received:', data);
        
        // If the current room was deleted and user is still viewing it
        if (currentRoom && currentRoom.code === data.roomCode) {
          toast({
            title: translations.messages.roomDeleted,
            description: translations.messages.roomNoLongerExists,
          });
          
          // Clear room data
          setCurrentRoom(null);
          playerService.setCurrentRoom(undefined);
        }
      });
      
    // Chat message
    const chatMessageUnsubscribe = supabaseService.on('chat_message', 
      (data: { message: ChatMessage }) => {
        setChatMessages(prevMessages => [...prevMessages, data.message]);
      });
      
    // Room list
    const roomListUnsubscribe = supabaseService.on('room_list', 
      (data: { rooms: Room[] }) => {
        setPublicRooms(data.rooms);
        setIsLoading(false);
      });
      
    // Player kicked
    const playerKickedUnsubscribe = supabaseService.on('player_kicked', 
      (data: { reason: string }) => {
        toast({
          title: translations.app.error,
          description: data.reason,
          variant: "destructive"
        });
        
        // Clear room data
        setCurrentRoom(null);
        playerService.setCurrentRoom(undefined);
      });
      
    // Game started
    const gameStartedUnsubscribe = supabaseService.on('game_started', 
      () => {
        if (currentRoom) {
          setCurrentRoom({
            ...currentRoom,
            gameStarted: true
          });
          
          toast({
            title: translations.messages.gameStarted,
            description: translations.messages.gameStartedByHost,
          });
        }
      });
      
    // Error
    const errorUnsubscribe = supabaseService.on('error',
      (data: { message: string }) => {
        console.error('Server error:', data.message);
        setError(data.message);
        setIsLoading(false);
        
        toast({
          title: translations.app.error,
          description: data.message,
          variant: "destructive"
        });
        
        // Auto-clear error after 5 seconds
        setTimeout(() => {
          setError(null);
        }, 5000);
      });
      
    // Player joined
    const playerJoinedUnsubscribe = supabaseService.on('player_joined', 
      (data: { 
        roomCode: string, 
        player: { id: string, nickname: string, isCreator: boolean } 
      }) => {
        console.log('Player joined event:', data);
        
        if (currentRoom && currentRoom.code === data.roomCode) {
          setCurrentRoom(prevRoom => {
            if (!prevRoom) return null;
            
            return {
              ...prevRoom,
              players: [...prevRoom.players, data.player]
            };
          });
          
          toast({
            title: translations.messages.playerJoined(data.player.nickname),
            description: '',
          });
        }
      });
      
    // Player left
    const playerLeftUnsubscribe = supabaseService.on('player_left', 
      (data: { 
        roomCode: string,
        playerId: string,
        playerName: string
      }) => {
        console.log('Player left event:', data);
        
        if (currentRoom && currentRoom.code === data.roomCode) {
          setCurrentRoom(prevRoom => {
            if (!prevRoom) return null;
            
            return {
              ...prevRoom,
              players: prevRoom.players.filter(player => player.id !== data.playerId)
            };
          });
          
          toast({
            title: translations.messages.playerLeft(data.playerName),
            description: '',
          });
        }
      });
      
    // Clean up on unmount
    return () => {
      connectionStatusUnsubscribe();
      roomCreatedUnsubscribe();
      roomJoinedUnsubscribe();
      roomDeletedUnsubscribe();
      chatMessageUnsubscribe();
      roomListUnsubscribe();
      playerKickedUnsubscribe();
      gameStartedUnsubscribe();
      errorUnsubscribe();
      playerJoinedUnsubscribe();
      playerLeftUnsubscribe();
    };
  }, [toast, playerInfo, currentRoom]);
  
  // Sync authenticated user with playerInfo when user auth state changes
  useEffect(() => {
    const syncUserWithPlayerInfo = async () => {
      if (user) {
        try {
          console.log('Syncing user profile with player info');
          // Get the user's nickname from the users table
          const { data, error } = await supabase
            .from('users')
            .select('nickname')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error('Error fetching user profile:', error);
            return;
          }
          
          if (data && data.nickname) {
            console.log('Setting nickname from user profile:', data.nickname);
            setNickname(data.nickname);
          } else {
            // Fallback to metadata if no record in users table
            const nickname = user.user_metadata?.nickname;
            if (nickname) {
              console.log('Setting nickname from user metadata:', nickname);
              setNickname(nickname);
              
              // Try to create user record if it doesn't exist using upsert instead of insert
              try {
                const { error: upsertError } = await supabase
                  .from('users')
                  .upsert({
                    id: user.id,
                    nickname: nickname
                  }, {
                    onConflict: 'id'
                  });
                  
                if (upsertError) {
                  console.error('Failed to create user record:', upsertError);
                }
              } catch (err) {
                console.warn('Error ensuring user record exists:', err);
              }
            }
          }
        } catch (err) {
          console.error('Error syncing user with player info:', err);
          toast({
            title: 'Error',
            description: translations.auth.profileLoadError,
            variant: 'destructive'
          });
        }
      }
    };
    
    // Use setTimeout to avoid potential deadlocks with auth state changes
    if (user) {
      setTimeout(() => {
        syncUserWithPlayerInfo();
      }, 0);
    }
  }, [user, toast]);

  // Handler functions
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
    supabaseService.connect().catch(error => {
      console.error('Failed to connect to WebSocket:', error);
      setError(translations.messages.connectionLost);
    });
  }, []);
  
  const createRoom = useCallback((isPrivate: boolean = false) => {
    if (!isAuthenticated || !playerInfo) {
      setError('Você precisa estar logado para criar uma sala');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    supabaseService.sendEvent({
      type: 'create_room',
      payload: {
        nickname: playerInfo.nickname,
        playerId: playerInfo.playerId,
        isPrivate
      }
    });
  }, [isAuthenticated, playerInfo]);
  
  const joinRoom = useCallback((roomCode: string) => {
    if (!isAuthenticated || !playerInfo) {
      setError('Você precisa estar logado para entrar em uma sala');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    supabaseService.sendEvent({
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
    
    supabaseService.sendEvent({
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
        title: translations.messages.permissionDenied,
        description: translations.messages.onlyHostCanKick,
        variant: "destructive"
      });
      return;
    }
    
    supabaseService.sendEvent({
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
        title: translations.messages.permissionDenied,
        description: translations.messages.onlyHostCanStart,
        variant: "destructive"
      });
      return;
    }
    
    supabaseService.sendEvent({
      type: 'start_game',
      payload: {
        roomCode: currentRoom.code
      }
    });
  }, [currentRoom, playerInfo, toast]);
  
  const sendChatMessage = useCallback((message: string) => {
    if (!currentRoom || !playerInfo) return;
    
    supabaseService.sendEvent({
      type: 'chat_message',
      payload: {
        roomCode: currentRoom.code,
        message,
        playerId: playerInfo.playerId
      }
    });
  }, [currentRoom, playerInfo]);
  
  const playCard = useCallback((cardId: string) => {
    if (!currentRoom || !playerInfo) return;
    
    supabaseService.sendEvent({
      type: 'play_card',
      payload: {
        roomCode: currentRoom.code,
        cardId
      }
    });
  }, [currentRoom, playerInfo]);
  
  const drawCard = useCallback(() => {
    if (!currentRoom || !playerInfo) return;
    
    supabaseService.sendEvent({
      type: 'draw_card',
      payload: {
        roomCode: currentRoom.code
      }
    });
  }, [currentRoom, playerInfo]);
  
  const sayMauMau = useCallback(() => {
    if (!currentRoom || !playerInfo) return;
    
    supabaseService.sendEvent({
      type: 'say_mau_mau',
      payload: {
        roomCode: currentRoom.code
      }
    });
  }, [currentRoom, playerInfo]);
  
  const getPublicRooms = useCallback(() => {
    setIsLoading(true);
    setError(null);
    supabaseService.sendEvent({
      type: 'room_list',
      payload: { rooms: [] }
    });
  }, []);

  // Context value
  const value: MultiplayerContextType = {
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
