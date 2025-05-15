
import { useState, useCallback } from 'react';
import { websocketService, Room, ChatMessage, WebSocketEvent } from '@/services/websocketService';
import { playerService, PlayerInfo } from '@/services/playerService';
import { useToast } from '@/hooks/use-toast';
import { RoomData } from './types';
import translations from '@/localization/pt-BR';

export function useMultiplayerHandlers() {
  const { toast } = useToast();
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

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
      setError(translations.messages.connectionLost);
    });
  }, []);

  // Room actions
  const createRoom = useCallback((isPrivate: boolean = false) => {
    if (!isAuthenticated || !playerInfo) {
      setError('Você precisa estar logado para criar uma sala');
      return;
    }
    
    setIsLoading(true);
    setError(null); // Clear any previous errors
    websocketService.sendEvent({
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
        title: translations.messages.permissionDenied,
        description: translations.messages.onlyHostCanKick,
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
        title: translations.messages.permissionDenied,
        description: translations.messages.onlyHostCanStart,
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

  return {
    status,
    setStatus,
    isAuthenticated,
    playerInfo,
    setPlayerInfo,
    publicRooms,
    setPublicRooms,
    currentRoom,
    setCurrentRoom,
    chatMessages,
    setChatMessages,
    isLoading,
    setIsLoading,
    error,
    setError,
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
    getPublicRooms
  };
}
