// Supabase configuration
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
};

// App configuration
export const appConfig = {
  tableName: 'messages',
  toastDuration: 3000, // 3 seconds
  maxMessageLength: 2000
};