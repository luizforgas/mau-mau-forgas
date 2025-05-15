
import { v4 as uuidv4 } from 'uuid';

export interface PlayerInfo {
  playerId: string;
  nickname: string;
  currentRoom?: string;
}

class PlayerService {
  // Session storage keys
  private PLAYER_ID_KEY = 'mauMauPlayerId';
  private NICKNAME_KEY = 'mauMauNickname';
  private CURRENT_ROOM_KEY = 'mauMauCurrentRoom';

  // Initialize or retrieve player ID
  getOrCreatePlayerId(): string {
    let playerId = sessionStorage.getItem(this.PLAYER_ID_KEY);
    
    if (!playerId) {
      playerId = uuidv4();
      sessionStorage.setItem(this.PLAYER_ID_KEY, playerId);
    }
    
    return playerId;
  }
  
  // Set player nickname
  setNickname(nickname: string): void {
    sessionStorage.setItem(this.NICKNAME_KEY, nickname);
  }
  
  // Get player nickname
  getNickname(): string | null {
    return sessionStorage.getItem(this.NICKNAME_KEY);
  }
  
  // Check if player has completed initial setup
  isPlayerSetup(): boolean {
    return !!this.getNickname() && !!sessionStorage.getItem(this.PLAYER_ID_KEY);
  }
  
  // Get full player info
  getPlayerInfo(): PlayerInfo | null {
    const playerId = sessionStorage.getItem(this.PLAYER_ID_KEY);
    const nickname = sessionStorage.getItem(this.NICKNAME_KEY);
    
    if (!playerId || !nickname) {
      return null;
    }
    
    return {
      playerId,
      nickname,
      currentRoom: sessionStorage.getItem(this.CURRENT_ROOM_KEY) || undefined
    };
  }
  
  // Set current room
  setCurrentRoom(roomCode?: string): void {
    if (roomCode) {
      sessionStorage.setItem(this.CURRENT_ROOM_KEY, roomCode);
    } else {
      sessionStorage.removeItem(this.CURRENT_ROOM_KEY);
    }
  }
  
  // Get current room
  getCurrentRoom(): string | null {
    return sessionStorage.getItem(this.CURRENT_ROOM_KEY);
  }
  
  // Clear all player data (for logout)
  clearPlayerData(): void {
    sessionStorage.removeItem(this.PLAYER_ID_KEY);
    sessionStorage.removeItem(this.NICKNAME_KEY);
    sessionStorage.removeItem(this.CURRENT_ROOM_KEY);
  }
}

// Create singleton instance
export const playerService = new PlayerService();
