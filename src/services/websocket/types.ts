
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface Room {
  code: string;
  name?: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
  creatorNickname?: string;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: string;
}

export interface WebSocketEvent {
  type: string;
  payload: any;
}

export interface EventData<T = any> {
  type: string;
  data: T;
}
