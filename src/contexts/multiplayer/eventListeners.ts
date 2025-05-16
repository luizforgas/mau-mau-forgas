
import { useEffect } from 'react';
import { websocketService, Room, ConnectionStatus } from '@/services/websocketService';
import { playerService, PlayerInfo } from '@/services/playerService';
import { useToast } from '@/hooks/use-toast';
import translations from '@/localization/pt-BR';

export function useMultiplayerEventListeners(
  playerInfo: PlayerInfo | null,
  setStatus: (status: ConnectionStatus) => void,
  setCurrentRoom: (room: any) => void,
  setPublicRooms: (rooms: Room[]) => void,
  setChatMessages: (messages: any) => void,
  setIsLoading: (isLoading: boolean) => void,
  setError: (error: string | null) => void,
  currentRoom: any
) {
  const { toast } = useToast();

  // Initialize player data and WebSocket connection
  useEffect(() => {
    // Set up connection status listener
    const unsubscribe = websocketService.on<{ status: ConnectionStatus }>('connection_status', 
      (data) => {
        setStatus(data.status);
        
        if (data.status === 'disconnected') {
          toast({
            title: translations.messages.disconnected,
            description: translations.messages.connectionLost,
            variant: "destructive"
          });
        }
      });
    
    // Clean up on unmount
    return () => {
      unsubscribe();
    };
  }, [toast, setStatus]);

  // Set up WebSocket event listeners
  useEffect(() => {
    // Handle room creation response
    const roomCreatedUnsubscribe = websocketService.on<{ room: Room }>('room_created', 
      (data) => {
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
    
    // Handle room join response
    const roomJoinedUnsubscribe = websocketService.on<{ room: any }>('room_joined', 
      (data) => {
        console.log('Room joined event received:', data);
        setIsLoading(false);
        setCurrentRoom(data.room);
        playerService.setCurrentRoom(data.room.code);
        
        console.log('Current room set after joining:', data.room);
      });
    
    // Handle room deletion
    const roomDeletedUnsubscribe = websocketService.on<{ roomCode: string }>('room_deleted',
      (data) => {
        console.log('Room deleted event received:', data);
        
        // If the current room was deleted and user is still viewing it
        if (currentRoom && currentRoom.code === data.roomCode) {
          toast({
            title: translations.app.error,
            description: translations.messages.connectionLost, // Using existing translation key instead
          });
          
          // Clear room data
          setCurrentRoom(null);
          playerService.setCurrentRoom(undefined);
        }
      });
    
    // Handle chat messages
    const chatMessageUnsubscribe = websocketService.on<{ message: any }>('chat_message', 
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
          title: translations.app.error,
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
        console.error('Server error:', data.message);
        setError(data.message);
        setIsLoading(false);
        
        // Auto-clear error after 5 seconds
        setTimeout(() => {
          setError(null);
        }, 5000);
      });
      
    // Handle player joining room
    const playerJoinedUnsubscribe = websocketService.on<{ 
      roomCode: string, 
      player: { id: string, nickname: string, isCreator: boolean } 
    }>('player_joined', 
      (data) => {
        console.log('Player joined event:', data);
        
        if (currentRoom && currentRoom.code === data.roomCode) {
          setCurrentRoom({
            ...currentRoom,
            players: [...currentRoom.players, data.player]
          });
          
          toast({
            title: translations.messages.playerJoined(data.player.nickname),
            description: '',
          });
        }
      });
      
    // Handle player leaving room
    const playerLeftUnsubscribe = websocketService.on<{ 
      roomCode: string,
      playerId: string,
      playerName: string
    }>('player_left', 
      (data) => {
        console.log('Player left event:', data);
        
        if (currentRoom && currentRoom.code === data.roomCode) {
          setCurrentRoom({
            ...currentRoom,
            players: currentRoom.players.filter(player => player.id !== data.playerId)
          });
          
          toast({
            title: translations.messages.playerLeft(data.playerName),
            description: '',
          });
        }
      });

    return () => {
      // Clean up all event listeners
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
  }, [toast, playerInfo, currentRoom, setStatus, setCurrentRoom, setPublicRooms, setChatMessages, setIsLoading, setError]);

  // Initialize player connection
  useEffect(() => {
    const setupPlayer = async () => {
      const player = playerService.getPlayerInfo();
      
      if (player) {
        // Connect to WebSocket
        try {
          await websocketService.connect();
          console.log('WebSocket connected successfully');
          
          // Check if player was in a room
          const currentRoomCode = player.currentRoom;
          if (currentRoomCode) {
            console.log('Rejoining previous room:', currentRoomCode);
            websocketService.sendEvent({
              type: 'join_room',
              payload: {
                roomCode: currentRoomCode,
                nickname: player.nickname,
                playerId: player.playerId
              }
            });
          }
        } catch (error) {
          console.error('Failed to connect to WebSocket:', error);
          setError(translations.messages.connectionLost);
        }
      }
    };
    
    if (playerInfo) {
      console.log('Setting up player with info:', playerInfo);
      setupPlayer();
    }
  }, [playerInfo, setError]);
}
