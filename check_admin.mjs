import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jmwbjvogmslpftkxsgyl.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptd2Jqdm9nbXNscGZ0a3hzZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NTczNzksImV4cCI6MjA5NjAzMzM3OX0.ZEx3qH95SQIWmnWWHYk7qUOrhu6LkrFtrGkKxuA-c6w');

async function check() {
  const { data, error } = await supabase.from('user_profiles').select('*');
  console.log(data);
}
check();
