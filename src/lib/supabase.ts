import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://jmwbjvogmslpftkxsgyl.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptd2Jqdm9nbXNscGZ0a3hzZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NTczNzksImV4cCI6MjA5NjAzMzM3OX0.ZEx3qH95SQIWmnWWHYk7qUOrhu6LkrFtrGkKxuA-c6w').trim();

if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = 'https://' + supabaseUrl;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
