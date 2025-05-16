
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

// Password regex for strong password policy
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;

// Register validation schema
const registerSchema = z.object({
  email: z.string().email(translations.auth.invalidEmail),
  password: z.string()
    .min(12, translations.auth.passwordMinLength)
    .regex(
      strongPasswordRegex,
      'A senha deve conter pelo menos 12 caracteres, incluindo letra maiúscula, letra minúscula, número e símbolo.'
    ),
  nickname: z.string()
    .min(3, translations.auth.nicknameMinLength)
    .max(20, translations.auth.nicknameMaxLength),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      nickname: '',
    },
  });
  
  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    
    try {
      // Check if nickname is already taken
      const { data: nicknameCheck, error: nicknameError } = await supabase
        .rpc('is_nickname_taken', { nickname: values.nickname });
        
      if (nicknameError) throw nicknameError;
      
      if (nicknameCheck) {
        toast({
          title: translations.auth.registrationError,
          description: translations.auth.nicknameTaken,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      console.log('Registering user with:', { ...values, password: '********' });
      
      // Register user
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            nickname: values.nickname,
          },
        },
      });
      
      if (error) throw error;
      
      console.log('Registration response:', data);
      
      if (data.user) {
        // Registration successful - rely on database trigger for user record creation
        // The handle_new_user trigger will automatically create the user record
        
        toast({
          title: translations.auth.registrationSuccess,
          description: translations.auth.registrationMessage,
        });
        
        // Wait a moment to ensure the user record is fully created
        setTimeout(() => {
          // Force page reload for a completely clean state
          window.location.href = '/';
        }, 1000);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: translations.auth.registrationError,
        description: error.message || translations.auth.genericError,
        variant: "destructive",
      });
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
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">{translations.auth.nickname}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={translations.auth.nicknamePlaceholder} 
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
              <p className="text-xs text-gray-400 mt-2">
                {translations.auth.passwordRequirements}
              </p>
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full bg-indigo-600 hover:bg-indigo-700 mt-6" 
          disabled={isLoading}
        >
          {isLoading ? translations.app.loading : translations.auth.register}
        </Button>
      </form>
    </Form>
  );
};

export default RegisterForm;
