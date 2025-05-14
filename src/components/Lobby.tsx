
import React, { useState, useEffect } from 'react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoIcon, RefreshCw, PlusCircle, LogIn } from 'lucide-react';
import { Room } from '@/services/websocketService';

const Lobby: React.FC = () => {
  const { 
    publicRooms, 
    createRoom, 
    joinRoom, 
    getPublicRooms,
    isLoading,
    playerInfo
  } = useMultiplayer();
  
  const [joinCode, setJoinCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('browse');
  
  // Load public rooms on component mount
  useEffect(() => {
    getPublicRooms();
  }, [getPublicRooms]);
  
  // Handle joining by code
  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      joinRoom(joinCode.trim().toUpperCase());
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="bg-black/30 border border-white/10 backdrop-blur-sm shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Game Lobby</h2>
          {playerInfo && (
            <div className="text-sm text-gray-300">
              Playing as: <span className="font-semibold text-white">{playerInfo.nickname}</span>
            </div>
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="browse">Browse Games</TabsTrigger>
            <TabsTrigger value="join">Join by Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="browse">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Available Rooms</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={getPublicRooms}
                  disabled={isLoading}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
              
              {isLoading ? (
                <div className="text-center py-8 text-gray-400">
                  Loading available rooms...
                </div>
              ) : publicRooms.length > 0 ? (
                <div className="space-y-2">
                  {publicRooms.map((room) => (
                    <RoomCard 
                      key={room.code}
                      room={room}
                      onJoin={() => joinRoom(room.code)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 rounded-md border border-dashed border-gray-700 bg-black/20">
                  <InfoIcon className="h-10 w-10 mx-auto mb-2 text-gray-500" />
                  <p className="text-gray-400">No public rooms available</p>
                  <p className="text-sm text-gray-500 mt-1">Create a new room to get started</p>
                </div>
              )}
              
              <div className="pt-4">
                <Button 
                  onClick={createRoom}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Room
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="join">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Join Private Room</h3>
              
              <form onSubmit={handleJoinByCode} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="roomCode" className="block text-sm font-medium text-gray-300">
                    Room Code
                  </label>
                  <Input
                    id="roomCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code (e.g. ABC123)"
                    className="bg-black/20 text-white placeholder:text-gray-500"
                    maxLength={6}
                  />
                </div>
                
                <Button 
                  type="submit"
                  disabled={!joinCode.trim() || isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Join Room
                </Button>
              </form>
              
              <div className="text-center pt-4">
                <span className="text-sm text-gray-400">Don't have a code?</span>
                <Button 
                  variant="link" 
                  onClick={() => setActiveTab('browse')}
                  className="text-indigo-400 hover:text-indigo-300 p-0 ml-1"
                >
                  Browse public rooms
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

// Room card component
const RoomCard: React.FC<{ room: Room; onJoin: () => void }> = ({ room, onJoin }) => {
  return (
    <div className="flex items-center justify-between p-3 rounded-md bg-black/40 border border-white/5">
      <div>
        <h4 className="font-medium text-white">{room.name || `Room ${room.code}`}</h4>
        <div className="text-sm text-gray-400 mt-1">
          {room.playerCount}/{room.maxPlayers} players · Code: {room.code}
        </div>
      </div>
      <Button onClick={onJoin} size="sm">
        Join
      </Button>
    </div>
  );
};

export default Lobby;
