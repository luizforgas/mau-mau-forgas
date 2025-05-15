
import { PlayerInfo } from '@/services/playerService';
import { Room, ChatMessage, ConnectionStatus } from '@/services/websocketService';

export interface RoomData {
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
  isPrivate?: boolean;
}

export interface MultiplayerContextType {
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
  createRoom: (isPrivate?: boolean) => void;
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
