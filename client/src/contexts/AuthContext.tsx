import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  factoryId: string; // UUID
  factoryName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  factoryCode: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is already logged in (on mount)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Fetch user profile
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile from database using native fetch
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('🔄 Fetching user profile with native fetch...');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Fetch profile with factory info
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*,factory:factories(id,name,code)`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!profileResponse.ok) {
        console.warn('⚠️ Profile fetch failed, user might be registering');
        return; // Don't throw, just return
      }

      const profiles = await profileResponse.json();
      
      if (!profiles || profiles.length === 0) {
        console.warn('⚠️ Profile not found yet, user might be registering');
        return; // Don't throw, just return
      }

      const profile = profiles[0];
      console.log('✅ Profile fetched:', profile);

      const userData: User = {
        id: profile.id,
        email: profile.email || '',
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        role: profile.role || 'operator',
        factoryId: profile.factory_id || '',
        factoryName: profile.factory?.name || '',
      };

      setUser(userData);
      console.log('✅ User state updated');
    } catch (error) {
      console.error('⚠️ Error fetching profile (might be registering):', error);
      // Don't throw error, just log it
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      console.log('🔄 Login attempt with native fetch...');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Sign in with native fetch
      const signInResponse = await fetch(
        `${supabaseUrl}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      if (!signInResponse.ok) {
        const errorData = await signInResponse.json();
        console.error('❌ Login failed:', signInResponse.status, errorData);
        throw new Error(errorData.error_description || errorData.msg || 'Giriş başarısız');
      }

      const signInData = await signInResponse.json();
      console.log('✅ Sign-in response received');

      if (!signInData.user) {
        throw new Error('Giriş başarısız');
      }

      // Set the session in Supabase client
      await supabase.auth.setSession({
        access_token: signInData.access_token,
        refresh_token: signInData.refresh_token,
      });

      // Fetch user profile
      await fetchUserProfile(signInData.user.id);

      console.log('✅ Login successful!');
      
      // Navigate to dashboard
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      console.log('Register attempt:', data);
      console.log('🔍 Step 1: Validating factory code:', data.factoryCode.toUpperCase());
      console.log('🌐 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('🔑 Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

      // Step 1: Validate Factory Code using native fetch (more reliable in Docker)
      console.log('⏳ Validating factory code with direct fetch...');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const factoryResponse = await fetch(
        `${supabaseUrl}/rest/v1/factories?code=eq.${data.factoryCode.toUpperCase()}`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!factoryResponse.ok) {
        console.error('❌ Factory fetch failed:', factoryResponse.status);
        throw new Error('Fabrika kodu doğrulanamadı. Lütfen tekrar deneyin.');
      }

      const factories = await factoryResponse.json();
      console.log('📊 Factory query result:', factories);

      if (!factories || factories.length === 0) {
        throw new Error('Bu kod kayıtlı bir fabrikaya ait değil. Lütfen kurum kodunuzu kontrol edin.');
      }

      const factory = factories[0];
      console.log('✅ Factory found:', factory);

      // Step 2: Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Kullanıcı oluşturulamadı');
      }

      console.log('✅ User account created:', authData.user.id);

      // Wait a bit for Supabase to fully create the user in auth.users table
      console.log('⏳ Waiting for user to be fully created in auth system...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      // Step 3: Create/Update profile with factory_id using native fetch
      console.log('🔄 Creating/Updating profile with native fetch...');
      
      const profileData = {
        id: authData.user.id,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'operator',
        factory_id: factory.id,
      };

      // Try POST first (create new profile)
      let profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(profileData),
        }
      );

      // If 409 conflict (profile already exists), try PATCH to update
      if (profileResponse.status === 409) {
        console.log('⚠️ Profile already exists, updating instead...');
        profileResponse = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${authData.user.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(profileData),
          }
        );
      }

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('❌ Profile upsert failed:', profileResponse.status, errorText);
        throw new Error('Profil oluşturulamadı. Lütfen tekrar deneyin.');
      }

      console.log('✅ Profile created/updated successfully!');

      // Step 4: Navigate to login page (no auto sign-in)
      console.log('✅ Registration successful! Redirecting to login...');
      
      navigate('/login', {
        state: {
          message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.',
          email: data.email,
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      setUser(null);
      
      console.log('✅ Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login even if sign out fails
      setUser(null);
      navigate('/login');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

