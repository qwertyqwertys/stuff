import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nilgxfmcwljqhawdrsot.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_K4ZLk0KkXTe8upyl7KoTcg_wD31DQ4U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
