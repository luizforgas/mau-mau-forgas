
import React, { useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useAuth } from '@/contexts/AuthContext';
import translations from '@/localization/pt-BR';

const PlayerLogin: React.FC = () => {
  const { setNickname } = useMultiplayer();
  const { user, getUserProfile } = useAuth();
  
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        const profile = await getUserProfile();
        if (profile && profile.nickname) {
          // Use the nickname from the user's profile
          setNickname(profile.nickname);
        }
      }
    };
    
    loadUserProfile();
  }, [user, getUserProfile, setNickname]);
  
  return (
    <div className="flex items-center justify-center w-full">
      <Card className="w-full max-w-md p-6 bg-black/30 border border-white/10 backdrop-blur-sm shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">{translations.auth.welcome}</h2>
        
        {user ? (
          <div className="text-center">
            <p className="text-white mb-4">{translations.auth.loadingProfile}</p>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-300 mx-auto"></div>
          </div>
        ) : (
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {translations.auth.login}
          </Button>
        )}
      </Card>
    </div>
  );
};

export default PlayerLogin;
