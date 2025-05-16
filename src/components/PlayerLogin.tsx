
import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import translations from '@/localization/pt-BR';
import { useToast } from '@/hooks/use-toast';

const PlayerLogin: React.FC = () => {
  const { setNickname } = useMultiplayer();
  const { user, getUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // First try to get profile from getUserProfile
        let profile = await getUserProfile();
        
        // If profile not found, try to get directly from users table
        if (!profile || !profile.nickname) {
          console.log('Profile not found via getUserProfile, trying direct query');
          
          const { data, error } = await supabase
            .from('users')
            .select('nickname')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error('Error fetching user profile:', error);
            throw error;
          }
          
          profile = data;
        }
        
        // If profile exists and has nickname, set it
        if (profile && profile.nickname) {
          console.log('Setting nickname from profile:', profile.nickname);
          setNickname(profile.nickname);
        } else {
          // If we still don't have a profile, check if we can get the nickname from user metadata
          const metadata = user.user_metadata;
          if (metadata && metadata.nickname) {
            console.log('Setting nickname from metadata:', metadata.nickname);
            setNickname(metadata.nickname);
            
            // Try to create user record if it doesn't exist
            await supabase.from('users').insert({
              id: user.id,
              nickname: metadata.nickname
            }).then(({ error }) => {
              if (error && !error.message.includes('duplicate')) {
                console.warn('Failed to create user record:', error);
              }
            });
          } else {
            setError('No nickname found for user. Please update your profile or log out and register again.');
          }
        }
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError(err.message || 'Failed to load user profile');
        toast({
          title: 'Error',
          description: 'Failed to load user profile. Please try refreshing the page.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserProfile();
  }, [user, getUserProfile, setNickname, toast]);
  
  return (
    <div className="flex items-center justify-center w-full">
      <Card className="w-full max-w-md p-6 bg-black/30 border border-white/10 backdrop-blur-sm shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">{translations.auth.welcome}</h2>
        
        {user ? (
          isLoading ? (
            <div className="text-center">
              <p className="text-white mb-4">{translations.auth.loadingProfile}</p>
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-300 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button 
                onClick={() => window.location.href = '/auth'}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-green-400 mb-4">Profile loaded successfully!</p>
            </div>
          )
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
