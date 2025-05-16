
import React, { createContext, useContext, ReactNode } from 'react';
import { useMultiplayerHandlers } from './eventHandlers';
import { useMultiplayerEventListeners } from './eventListeners';
import { MultiplayerContextType } from './types';
import { supabase } from '@/integrations/supabase/client';

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export const MultiplayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handlers = useMultiplayerHandlers();
  
  // Set up WebSocket event listeners
  useMultiplayerEventListeners(
    handlers.playerInfo,
    handlers.setStatus,
    handlers.setCurrentRoom,
    handlers.setPublicRooms,
    handlers.setChatMessages,
    handlers.setIsLoading,
    handlers.setError,
    handlers.currentRoom
  );

  // Context value
  const value: MultiplayerContextType = {
    status: handlers.status,
    isAuthenticated: handlers.isAuthenticated,
    playerInfo: handlers.playerInfo,
    publicRooms: handlers.publicRooms,
    currentRoom: handlers.currentRoom,
    chatMessages: handlers.chatMessages,
    isLoading: handlers.isLoading,
    error: handlers.error,
    setNickname: handlers.setNickname,
    createRoom: handlers.createRoom,
    joinRoom: handlers.joinRoom,
    leaveRoom: handlers.leaveRoom,
    kickPlayer: handlers.kickPlayer,
    startGame: handlers.startGame,
    sendChatMessage: handlers.sendChatMessage,
    playCard: handlers.playCard,
    drawCard: handlers.drawCard,
    sayMauMau: handlers.sayMauMau,
    getPublicRooms: handlers.getPublicRooms,
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
