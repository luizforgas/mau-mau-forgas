
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from './types';
import { EventEmitter } from './EventEmitter';

class ChatService {
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Sends a chat message
   */
  async sendMessage(roomCode: string, playerId: string, message: string): Promise<void> {
    try {
      console.log('Sending message in room', roomCode);
      
      // Find the room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (roomError) {
        console.error('Error finding room:', roomError);
        throw roomError;
      }

      // Get current user session
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('User not authenticated');
      }

      // Insert the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          room_id: roomData.id,
          user_id: session.session.user.id,
          content: message
        });

      if (messageError) {
        console.error('Error sending message:', messageError);
        throw messageError;
      }
      
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  /**
   * Formats a chat message from Supabase into our standard format
   */
  formatMessage(message: any, senderNickname: string): ChatMessage {
    return {
      id: message.id,
      playerId: message.user_id,
      playerName: senderNickname || 'Unknown',
      content: message.content,
      timestamp: message.created_at
    };
  }
}

export { ChatService };
