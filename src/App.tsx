// src/App.tsx
import { useEffect, useState, useCallback } from 'react';
import { supabase, type Booking, type Incident } from './lib/supabase';
import { APP_CONFIG } from './lib/constants';
import HostView, { type HostLanguage } from './components/HostView';
import CleanerView from './components/CleanerView';
import { AuthView } from './components/AuthView';
import { Sparkles, LogOut } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<'host' | 'agency_admin' | 'agency_cleaner' | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);

  const [hostLang, setHostLang] = useState<HostLanguage>('sv');
  const [imgError, setImgError] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Hämtar profilen och ställer in sparat språk
  const fetchUserProfile = async (sessionUser: any) => {
    try {
      const userId = sessionUser.id;
      const userEmail = sessionUser.email;
      const userMeta = sessionUser.user_metadata;

      let { data } = await supabase
        .from('profiles')
        .select('role, full_name, language')
        .eq('id', userId)
        .maybeSingle();

      if (!data) {
        const assignedRole = userMeta?.role || 'host';
        const fullName = userMeta?.full_name || '';
        const savedLang = userMeta?.language || 'sv';

        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: userEmail,
            role: assignedRole,
            full_name: fullName,
            language: savedLang,
          })
          .select()
          .single();

        setUserRole(newProfile?.role || assignedRole);
        setUserName(newProfile?.full_name || fullName);
        if (newProfile?.language) setHostLang(newProfile.language as HostLanguage);
      } else {
        setUserRole(data.role);
        setUserName(data.full_name || '');
        if (data.language && (data.language === 'sv' || data.language === 'en' || data.language === 'da')) {
          setHostLang(data.language as HostLanguage);
        }
      }
    } catch (err) {
      console.error('Kunde inte hämta profil:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Ändra och spara värdens valda språk i databasen
  const handleHostLangChange = async (newLang: HostLanguage) => {
    setHostLang(newLang);
    if (session?.user?.id) {
      await supabase.from('profiles').update({ language: newLang }).eq('id', session.user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setUserRole(null);
        setUserName('');
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAll = useCallback(async () => {
    if (!session || !userRole) return;
    setLoadingData(true);

    try {
      const userId = session.user.id;
      let targetPropertyIds: string[] = [];

      if (userRole === 'host') {
        const { data: props } = await supabase
          .from('properties')
          .select('id')
          .eq('host_id', userId);
        
        targetPropertyIds = (props || []).map((p) => p.id);
      } else {
        const { data: conns } = await supabase
          .from('property_connections')
          .select('property_id')
          .eq('cleaner_id', userId);

        targetPropertyIds = (conns || []).map((c) => c.property_id);
      }

      if (targetPropertyIds.length === 0) {
        setBookings([]);
        setIncidents([]);
        setLoadingData(false);
        return;
      }

      const [bRes, iRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .in('property_id', targetPropertyIds)
          .order('check_out_date', { ascending: true }),
        supabase
          .from('incidents')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      setBookings((bRes.data as Booking[]) ?? []);
      setIncidents((iRes.data as Incident[]) ?? []);
    } catch (err) {
      console.error('Fel vid datahämtning:', err);
    } finally {
      setLoadingData(false);
    }
  }, [session, userRole]);

  useEffect(() => {
    if (session && userRole) {
      fetchAll();
    }
  }, [session, userRole, fetchAll]);

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
        <p className="text-sm font-medium">Startar CleanBook...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 overflow-hidden border border-emerald-400/30">
              {!imgError ? (
                <img 
                  src="/icon-192.png" 
                  alt="CleanBook Logo" 
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <Sparkles className="w-5 h-5 text-slate-950" />
              )}
            </div>
            <div>
              <span className="font-black text-white text-lg tracking-wider block leading-none">
                {APP_CONFIG.name}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block pt-0.5">
                {APP_CONFIG.tagline}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{userName || session.user.email}</span>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                {userRole === 'host' ? 'Fastighetsvärd' : 'Städerska'}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              title="Logga ut"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700/80 shadow-md active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Logga ut</span>
            </button>
          </div>
        </div>
      </header>

      <main className="py-6 sm:py-8">
        {userRole === 'host' ? (
          <HostView
            bookings={bookings}
            incidents={incidents}
            loading={loadingData}
            onRefresh={fetchAll}
            lang={hostLang}
            onLangChange={handleHostLangChange}
          />
        ) : (
          <CleanerView
            bookings={bookings}
            incidents={incidents}
            loading={loadingData}
            onRefresh={fetchAll}
          />
        )}
      </main>
    </div>
  );
}