
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://vecxmhqdbqeyhhndlggo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlY3htaHFkYnFleWhobmRsZ2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjI4MzEsImV4cCI6MjA2Mjc5ODgzMX0.E8Pnf8qNsk86fElqvEIb2f9xNPeQWlib1cFlt9KSU2M";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
