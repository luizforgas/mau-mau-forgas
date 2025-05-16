
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useMultiplayerHandlers } from './eventHandlers';
import { useMultiplayerEventListeners } from './eventListeners';
import { MultiplayerContextType } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import translations from '@/localization/pt-BR';

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export const MultiplayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handlers = useMultiplayerHandlers();
  const { user } = useAuth();
  const { toast } = useToast();
  
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

  // Sync authenticated user with playerInfo when user auth state changes
  useEffect(() => {
    const syncUserWithPlayerInfo = async () => {
      if (user) {
        try {
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
            handlers.setNickname(data.nickname);
          } else {
            // Fallback to metadata if no record in users table
            const nickname = user.user_metadata?.nickname;
            if (nickname) {
              console.log('Setting nickname from user metadata:', nickname);
              handlers.setNickname(nickname);
              
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
  }, [user, handlers.setNickname, toast]);

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
