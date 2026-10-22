import { createClient } from '@supabase/supabase-js';

// Placeholders keep the build working when the variables are absent; auth calls will then fail loudly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://missing-supabase-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'missing-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});
