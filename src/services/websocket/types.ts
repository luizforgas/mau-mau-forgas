
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

// Adicionando a interface ActiveRoom para compatibilidade com mock-handlers.ts
export interface ActiveRoom {
  code: string;
  name?: string;
  players: {
    id: string;
    nickname: string;
    isCreator: boolean;
  }[];
  createdAt: number;
  maxPlayers: number;
  isPrivate: boolean;
  creatorId: string;
}

// Função para inicializar o armazenamento global de salas
export const initializeGlobalRoomStorage = (): void => {
  if (typeof window !== 'undefined' && !window.activeRoomsMap) {
    window.activeRoomsMap = new Map<string, ActiveRoom>();
  }
}

// Extensão do tipo Window para incluir activeRoomsMap
declare global {
  interface Window {
    activeRoomsMap: Map<string, ActiveRoom>;
  }
}
