
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import translations from '@/localization/pt-BR';

const Auth: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('login');
  
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mau Mau</h1>
          <p className="text-indigo-200">{translations.auth.welcomeMessage}</p>
        </div>
        
        <Card className="bg-black/30 border border-white/10 backdrop-blur-sm shadow-lg p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">{translations.auth.login}</TabsTrigger>
              <TabsTrigger value="register">{translations.auth.register}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <LoginForm />
              
              <p className="text-center text-sm text-gray-400 mt-6">
                {translations.auth.noAccount}{' '}
                <button 
                  className="text-indigo-400 hover:text-indigo-300" 
                  onClick={() => setActiveTab('register')}
                >
                  {translations.auth.createAccount}
                </button>
              </p>
            </TabsContent>
            
            <TabsContent value="register">
              <RegisterForm />
              
              <p className="text-center text-sm text-gray-400 mt-6">
                {translations.auth.haveAccount}{' '}
                <button 
                  className="text-indigo-400 hover:text-indigo-300" 
                  onClick={() => setActiveTab('login')}
                >
                  {translations.auth.loginNow}
                </button>
              </p>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
