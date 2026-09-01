import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://omnvdvmmmarwsobadlsb.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nUzUqD6WBgXey6SRU76zUA_Q5mlC1B5';

export const supabase = createClient(supabaseUrl, supabaseKey);
