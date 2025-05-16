
export const cleanupAuthState = () => {
  // Remove standard auth tokens
  sessionStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from sessionStorage
  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};
