import { useEffect, useState, useCallback } from 'react';
import { supabase, type Booking, type Incident } from './lib/supabase';
import { APP_CONFIG } from './lib/constants';
import HostView, { type HostLanguage } from './components/HostView';
import CleanerView from './components/CleanerView';
import { Sparkles, Home, Lock, KeyRound, LogOut, ArrowRight } from 'lucide-react';

type ViewMode = 'landing' | 'host' | 'cleaner';

const CLEANER_PIN = '1234';

// Dynamiska etiketter för "Byt roll"-knappen baserat på aktivt språk/roll
const changeRoleLabels: Record<string, string> = {
  sv: 'Byt roll',
  en: 'Change role',
  da: 'Skift rolle',
  es: 'Cambiar rol',
};

export default function App() {
  const [view, setView] = useState<ViewMode>('landing');
  const [hostLang, setHostLang] = useState<HostLanguage>('sv');
  const [cleanerAuth, setCleanerAuth] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [imgError, setImgError] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [bRes, iRes] = await Promise.all([
      supabase.from('bookings').select('*').order('departure_date', { ascending: true }),
      supabase.from('incidents').select('*').order('created_at', { ascending: false }),
    ]);

    if (bRes.error) console.error('Error fetching bookings:', bRes.error);
    if (iRes.error) console.error('Error fetching incidents:', iRes.error);

    setBookings((bRes.data as Booking[]) ?? []);
    setIncidents((iRes.data as Incident[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSelectHost = (lang: HostLanguage) => {
    setHostLang(lang);
    setView('host');
  };

  const handleCleanerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === CLEANER_PIN) {
      setCleanerAuth(true);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  const handleGoHome = () => {
    setView('landing');
    setCleanerAuth(false);
    setPinInput('');
    setPinError(false);
  };

  // Bestäm vilket språk som gäller för "Byt roll"-knappen
  const activeLangKey = view === 'cleaner' ? 'es' : hostLang;
  const changeRoleText = changeRoleLabels[activeLangKey] || 'Byt roll';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group select-none"
            onClick={handleGoHome}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all overflow-hidden border border-emerald-400/30">
              {!imgError ? (
                <img 
                  src="/apple-touch-icon.png" 
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

          {view !== 'landing' && (
            <button
              onClick={handleGoHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700/80 shadow-md active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-emerald-400" />
              <span>{changeRoleText}</span>
            </button>
          )}
        </div>
      </header>

      {/* HUVUDINNEHÅLL */}
      <main className="py-6 sm:py-8">
        {view === 'landing' ? (
          /* STARTSIDA & ROLLVÄLJARE */
          <div className="max-w-md mx-auto px-4 py-4 space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                Välkommen till <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                  {APP_CONFIG.name}
                </span>
              </h1>
              <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                Välj din profil och språk för att hantera städbokningar
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 block">
                Värd / Fastighetsägare (Host)
              </span>

              {/* VÄRD (SVENSKA) */}
              <button
                type="button"
                onClick={() => handleSelectHost('sv')}
                className="w-full text-left bg-slate-900/80 hover:bg-slate-800/90 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 group shadow-xl relative overflow-hidden active:scale-98"
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                        Värd (Svenska) <span className="text-xs">🇸🇪</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Boka städning med din fastighetskod
                      </p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-emerald-500 group-hover:text-slate-950 flex items-center justify-center transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>

              {/* HOST (ENGLISH) */}
              <button
                type="button"
                onClick={() => handleSelectHost('en')}
                className="w-full text-left bg-slate-900/80 hover:bg-slate-800/90 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 group shadow-xl relative overflow-hidden active:scale-98"
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                        Host (English) <span className="text-xs">🇬🇧</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Book cleaning with your property code
                      </p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-emerald-500 group-hover:text-slate-950 flex items-center justify-center transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>

              {/* VÆRT (DANSK) */}
              <button
                type="button"
                onClick={() => handleSelectHost('da')}
                className="w-full text-left bg-slate-900/80 hover:bg-slate-800/90 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 group shadow-xl relative overflow-hidden active:scale-98"
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                        Vært (Dansk) <span className="text-xs">🇩🇰</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Bestil rengøring med din ejendomskode
                      </p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-emerald-500 group-hover:text-slate-950 flex items-center justify-center transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>

              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 block pt-3">
                Städning / Limpieza (Cleaner)
              </span>

              {/* LIMPIADORA (ESPAÑOL) */}
              <button
                type="button"
                onClick={() => setView('cleaner')}
                className="w-full text-left bg-slate-900/80 hover:bg-slate-800/90 p-4 rounded-2xl border border-slate-800 hover:border-sky-500/50 transition-all duration-300 group shadow-xl relative overflow-hidden active:scale-98"
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 group-hover:scale-105 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-sky-400 transition-colors flex items-center gap-2">
                        Limpiadora (Español) <span className="text-xs">🇪🇸</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Panel de tareas para Maria
                      </p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-sky-500 group-hover:text-slate-950 flex items-center justify-center transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : view === 'host' ? (
          <HostView
            bookings={bookings}
            incidents={incidents}
            loading={loading}
            onRefresh={fetchAll}
            lang={hostLang}
          />
        ) : !cleanerAuth ? (
          /* PIN-INLOGGNING FÖR MARIA (CLEANER) */
          <div className="max-w-sm mx-auto px-4 py-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl backdrop-blur-md">
              <div className="w-14 h-14 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center mx-auto border border-sky-500/20 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Acceso restringido</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Introduce la contraseña de limpiadora
                </p>
              </div>

              <form onSubmit={handleCleanerLogin} className="space-y-4">
                <input
                  type="password"
                  placeholder="PIN (1234)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all font-bold"
                  autoFocus
                />
                {pinError && (
                  <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                    Contraseña incorrecta. (Prueba 1234)
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-3.5 rounded-2xl transition shadow-lg shadow-sky-500/20 active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  <KeyRound className="w-4 h-4" /> Entrar
                </button>
              </form>
            </div>
          </div>
        ) : (
          <CleanerView
            bookings={bookings}
            incidents={incidents}
            loading={loading}
            onRefresh={fetchAll}
          />
        )}
      </main>
    </div>
  );
}