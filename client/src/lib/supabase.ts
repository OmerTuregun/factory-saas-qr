import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types
export interface Database {
  public: {
    Tables: {
      factories: {
        Row: {
          id: string;
          name: string;
          code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          role: string | null;
          factory_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          role?: string | null;
          factory_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          role?: string | null;
          factory_id?: string | null;
          created_at?: string;
        };
      };
      machines: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          status: string | null;
          location: string | null;
          image_url: string | null;
          qr_code: string | null;
          factory_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string | null;
          status?: string | null;
          location?: string | null;
          image_url?: string | null;
          qr_code?: string | null;
          factory_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string | null;
          status?: string | null;
          location?: string | null;
          image_url?: string | null;
          qr_code?: string | null;
          factory_id?: string;
          created_at?: string;
        };
      };
      maintenance_logs: {
        Row: {
          id: string;
          machine_id: string | null;
          title: string;
          description: string | null;
          status: string | null;
          priority: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          machine_id?: string | null;
          title: string;
          description?: string | null;
          status?: string | null;
          priority?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          machine_id?: string | null;
          title?: string;
          description?: string | null;
          status?: string | null;
          priority?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

