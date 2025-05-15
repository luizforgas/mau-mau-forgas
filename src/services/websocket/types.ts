
// WebSocket connection states
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

// Room visibility type
export type RoomVisibility = 'public' | 'private';

// Events that can be sent/received via WebSocket
export type WebSocketEvent = 
  | { type: 'join_room', payload: { roomCode: string, nickname: string, playerId: string } }
  | { type: 'create_room', payload: { nickname: string, playerId: string, isPrivate: boolean } }
  | { type: 'leave_room', payload: { roomCode: string, playerId: string } }
  | { type: 'start_game', payload: { roomCode: string } }
  | { type: 'kick_player', payload: { roomCode: string, targetPlayerId: string } }
  | { type: 'chat_message', payload: { roomCode: string, message: string, playerId: string } }
  | { type: 'play_card', payload: { roomCode: string, cardId: string } }
  | { type: 'draw_card', payload: { roomCode: string } }
  | { type: 'say_mau_mau', payload: { roomCode: string } }
  | { type: 'room_list', payload: { rooms: Room[] } }
  | { type: 'game_state_update', payload: { gameState: any } }
  | { type: 'player_kicked', payload: { reason: string } }
  | { type: 'error', payload: { message: string } };

// Room data structure
export interface Room {
  code: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  creatorId: string;
  isPrivate: boolean;
}

// Chat message structure
export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  message: string;
  timestamp: number;
}

// Active room data
export interface ActiveRoom {
  code: string;
  name: string;
  players: { id: string; nickname: string; isCreator: boolean }[];
  createdAt: number;
  maxPlayers: number;
  isPrivate: boolean;
  creatorId: string;
}

// Global type for the window object with our custom properties
declare global {
  interface Window {
    activeRoomsMap: Map<string, ActiveRoom>;
  }
}

// Make sure the global room storage is initialized
export const initializeGlobalRoomStorage = (): void => {
  if (!window.activeRoomsMap) {
    window.activeRoomsMap = new Map<string, ActiveRoom>();
  }
};
