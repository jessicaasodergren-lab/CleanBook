// src/App.tsx
import { useEffect, useState, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Profile } from './lib/supabase';
import { APP_CONFIG } from './lib/constants';
import HostView, { type HostLanguage } from './components/HostView';
import CleanerView, { type CleanerLanguage } from './components/CleanerView';
import { AuthView } from './components/AuthView';
import ProfileModal from './components/modals/ProfileModal';
import { Sparkles, LogOut, User } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [hostLang, setHostLang] = useState<HostLanguage>('sv');
  const [cleanerLang, setCleanerLang] = useState<CleanerLanguage>('es');
  const [imgError, setImgError] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Identifiera om appen körs i TEST / DEV-miljö
  const isDevEnv =
    import.meta.env.DEV ||
    window.location.hostname.includes('dev') ||
    window.location.hostname.includes('preview') ||
    window.location.hostname.includes('webcontainer') ||
    (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('zfjphhvpkeriuypishhy'));

  // Ändra ikon och titel i webbläsaren / mobilen om det är TEST-miljön
  useEffect(() => {
    if (isDevEnv) {
      document.title = '[TEST] CleanBook – Smart Cleaning Management';

      // Skapa en dynamisk orange TEST-ikon för hemskärm och flikar
      const testIconSvg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="28" fill="%23f59e0b"/><text x="50" y="62" font-size="34" font-weight="900" font-family="sans-serif" text-anchor="middle" fill="%230f172a">TEST</text></svg>`;

      const linkIcons = document.querySelectorAll("link[rel*='icon']");
      linkIcons.forEach((link) => {
        (link as HTMLLinkElement).href = testIconSvg;
      });

      const appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']");
      if (appleTouchIcon) {
        (appleTouchIcon as HTMLLinkElement).href = testIconSvg;
      } else {
        const newAppleIcon = document.createElement('link');
        newAppleIcon.rel = 'apple-touch-icon';
        newAppleIcon.href = testIconSvg;
        document.head.appendChild(newAppleIcon);
      }
    }
  }, [isDevEnv]);

  const fetchUserProfile = async (sessionUser: any) => {
    try {
      const userId = sessionUser.id;
      const userEmail = sessionUser.email;
      const userMeta = sessionUser.user_metadata;

      let { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!data) {
        const assignedRole = userMeta?.role || 'host';
        const fullName = userMeta?.full_name || '';
        const savedLang = userMeta?.language || (assignedRole === 'host' ? 'sv' : 'es');

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

        setUserProfile(newProfile);
        if (newProfile?.language) {
          if (assignedRole === 'host') setHostLang(newProfile.language as HostLanguage);
          else setCleanerLang(newProfile.language as CleanerLanguage);
        }
      } else {
        setUserProfile(data);
        if (data.language) {
          if (data.role === 'host') setHostLang(data.language as HostLanguage);
          else setCleanerLang(data.language as CleanerLanguage);
        }
      }
    } catch (err) {
      console.error('Kunde inte hämta profil:', err);
    } finally {
      setAuthLoading(false);
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
        setUserProfile(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAll = useCallback(async () => {
    if (!session || !userProfile) return;
    setLoadingData(true);

    try {
      const userId = session.user.id;
      let targetPropertyIds: string[] = [];

      if (userProfile.role === 'host') {
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
  }, [session, userProfile]);

  useEffect(() => {
    if (session && userProfile) {
      fetchAll();
    }
  }, [session, userProfile, fetchAll]);

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

  const userRole = userProfile?.role || 'host';

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
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-lg tracking-wider block leading-none">
                  {APP_CONFIG.name}
                </span>
                {isDevEnv && (
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    🧪 TEST
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block pt-0.5">
                {APP_CONFIG.tagline}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfileModal(true)}
              title="Min Profil & Inställningar"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700/80 shadow-md active:scale-95"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{userProfile?.full_name || 'Profil'}</span>
            </button>

            <button
              onClick={handleSignOut}
              title="Logga ut"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700/80 shadow-md active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Logga ut</span>
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
          />
        ) : (
          <CleanerView
            bookings={bookings}
            incidents={incidents}
            loading={loadingData}
            onRefresh={fetchAll}
            lang={cleanerLang}
          />
        )}
      </main>

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={userProfile}
        onProfileUpdated={() => fetchUserProfile(session.user)}
      />
    </div>
  );
}