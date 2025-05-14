
import React from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  PlayCircle, 
  Copy, 
  ArrowLeft, 
  UserX, 
  MessageCircle 
} from 'lucide-react';
import Chat from '@/components/Chat';
import { toast } from '@/hooks/use-toast';

const WaitingRoom: React.FC = () => {
  const { 
    currentRoom, 
    playerInfo, 
    leaveRoom, 
    kickPlayer, 
    startGame 
  } = useMultiplayer();
  
  if (!currentRoom || !playerInfo) return null;
  
  const isCreator = playerInfo.playerId === currentRoom.creatorId;
  const playerCount = currentRoom.players.length;
  const minPlayersRequired = 2;
  
  const copyRoomCode = () => {
    navigator.clipboard.writeText(currentRoom.code);
    toast({
      title: "Room code copied!",
      description: "Share this code with friends to join",
    });
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Room info and player list */}
      <Card className="md:col-span-2 bg-black/30 border border-white/10 backdrop-blur-sm shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Waiting Room</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm bg-black/40 px-3 py-1 rounded-full text-white font-mono">
              {currentRoom.code}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={copyRoomCode}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-black/20 rounded-md p-4">
            <h3 className="text-md font-medium text-white mb-3">Players ({playerCount}/4)</h3>
            <div className="space-y-2">
              {currentRoom.players.map((player) => (
                <div 
                  key={player.id} 
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-black/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-white">{player.nickname}</span>
                    {player.isCreator && (
                      <span className="text-xs bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded">
                        Host
                      </span>
                    )}
                  </div>
                  
                  {isCreator && player.id !== playerInfo.playerId && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => kickPlayer(player.id)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button 
              onClick={leaveRoom}
              variant="outline"
              className="text-gray-300 border-gray-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Leave Room
            </Button>
            
            {isCreator && (
              <Button 
                onClick={startGame}
                disabled={playerCount < minPlayersRequired}
                className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Start Game
                {playerCount < minPlayersRequired && " (Need more players)"}
              </Button>
            )}
          </div>
          
          {!isCreator && (
            <p className="text-center text-sm text-gray-400 mt-2">
              Waiting for the host to start the game...
            </p>
          )}
        </div>
      </Card>
      
      {/* Chat section */}
      <Card className="bg-black/30 border border-white/10 backdrop-blur-sm shadow-lg p-4 h-[500px] flex flex-col">
        <h3 className="text-lg font-medium text-white flex items-center px-2 mb-2">
          <MessageCircle className="mr-2 h-4 w-4" />
          Room Chat
        </h3>
        <Separator className="bg-white/10 my-2" />
        <Chat />
      </Card>
    </div>
  );
};

export default WaitingRoom;
