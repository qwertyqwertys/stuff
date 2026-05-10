import { createClient } from '@supabase/supabase-js';

// Replace 'YOUR_PROJECT_URL' with the one you just found
const supabaseUrl = 'https://brhspdppazqunhlptlhd.supabase.co'; 

// Replace 'YOUR_ANON_KEY' with the "Publishable key" you found earlier
const supabaseAnonKey = 'sb_publishable_kNCs1wUN0yAP-NGVo2fa3Q_MKMhs3jR';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
