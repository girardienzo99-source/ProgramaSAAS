import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fallback Mock Data Store (para desarrollo local interactivo sin conexión a base de datos)
export const isMockEnabled = !process.env.NEXT_PUBLIC_SUPABASE_URL;
