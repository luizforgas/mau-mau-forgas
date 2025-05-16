
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import translations from '@/localization/pt-BR';
import { cleanupAuthState } from '@/utils/authUtils';

// Login validation schema
const loginSchema = z.object({
  email: z.string().email(translations.auth.invalidEmail),
  password: z.string().min(6, translations.auth.passwordMinLength),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      // Clean up any existing auth state first
      cleanupAuthState();
      
      // Try global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      // Perform login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      
      if (error) {
        throw error;
      }
      
      if (data.user) {
        toast({
          title: translations.auth.loginSuccess,
          description: translations.auth.welcomeBack,
        });
        
        // Force page reload for a completely clean state
        window.location.href = '/';
      }
    } catch (error: any) {
      toast({
        title: translations.auth.loginError,
        description: error.message || translations.auth.genericError,
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">{translations.auth.email}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={translations.auth.emailPlaceholder} 
                  {...field} 
                  className="bg-black/20 text-white placeholder:text-gray-400"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">{translations.auth.password}</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder={translations.auth.passwordPlaceholder} 
                  {...field} 
                  className="bg-black/20 text-white placeholder:text-gray-400"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full bg-indigo-600 hover:bg-indigo-700 mt-6" 
          disabled={isLoading}
        >
          {isLoading ? translations.app.loading : translations.auth.login}
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;
