
import React, { useState, useRef, useEffect } from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

const Chat: React.FC = () => {
  const { chatMessages, sendChatMessage, playerInfo } = useMultiplayer();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendChatMessage(message.trim());
      setMessage('');
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto mb-3 px-1">
        {chatMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm italic">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {chatMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={`
                  flex flex-col max-w-[85%] rounded-lg p-2.5 
                  ${msg.playerId === 'system' 
                    ? 'bg-gray-800/50 mx-auto max-w-none text-center text-sm' 
                    : msg.playerId === playerInfo?.playerId
                      ? 'bg-indigo-900/50 ml-auto' 
                      : 'bg-gray-800/70 mr-auto'
                  }
                `}
              >
                {msg.playerId !== 'system' && (
                  <span className="text-xs font-medium text-gray-400 mb-1">
                    {msg.playerId === playerInfo?.playerId ? 'You' : msg.nickname}
                  </span>
                )}
                <span className="text-white break-words">{msg.message}</span>
                <span className="text-xs text-gray-500 mt-1 self-end">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-auto">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-black/40 border-white/10 focus-visible:ring-indigo-500/50 text-white"
          maxLength={200}
        />
        <Button 
          type="submit" 
          size="icon"
          disabled={!message.trim()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default Chat;
