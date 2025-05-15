
import React, { useState, FormEvent } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import translations from '@/localization/pt-BR';

const PlayerLogin: React.FC = () => {
  const [nickname, setNickname] = useState<string>('');
  const { setNickname: submitNickname } = useMultiplayer();
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (nickname.trim().length < 3) {
      return; // Nickname too short
    }
    
    submitNickname(nickname.trim());
  };
  
  return (
    <div className="flex items-center justify-center w-full">
      <Card className="w-full max-w-md p-6 bg-black/30 border border-white/10 backdrop-blur-sm shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">{translations.auth.welcome}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium block text-white">
              {translations.auth.nickname}
            </label>
            <Input 
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={translations.auth.nickname}
              className="w-full bg-black/20 text-white placeholder:text-gray-400"
              autoComplete="off"
              minLength={3}
              maxLength={20}
              required
            />
            <p className="text-xs text-gray-400">
              {translations.auth.nicknameRequirements}
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            disabled={nickname.trim().length < 3}
          >
            {translations.auth.continue}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default PlayerLogin;
