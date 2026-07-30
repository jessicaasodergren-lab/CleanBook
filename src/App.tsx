import { useEffect, useState, useCallback } from 'react';
import { supabase, type Booking, type Incident } from './lib/supabase';
import HostView from './components/HostView';
import CleanerView from './components/CleanerView';
import { Sparkles, Home, UserCheck, Lock, KeyRound, LogOut } from 'lucide-react';

type ViewMode = 'landing' | 'host' | 'cleaner';

const CLEANER_PIN = '1234'; // Lösenord för Maria

export default function App() {
  const [view, setView] = useState<ViewMode>('landing');
  const [cleanerAuth, setCleanerAuth] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [bRes, iRes] = await Promise.all([
      supabase.from('bookings').select('*').order('departure_date', { ascending: true }),
      supabase.from('incidents').select('*').order('created_at', { ascending: false }),
    ]);

    if (bRes.error) console.error('Fel vid hämtning av bokningar:', bRes.error);
    if (iRes.error) console.error('Fel vid hämtning av incidenter:', iRes.error);

    setBookings((bRes.data as Booking[]) ?? []);
    setIncidents((iRes.data as Incident[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCleanerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === CLEANER_PIN) {
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
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleGoHome}>
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg">CleanBook</span>
          </div>

          {/* Hem / Byt roll-knapp när man är inne i en vy */}
          {view !== 'landing' && (
            <button
              onClick={handleGoHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-300"
              title="Gå till startsidan / Byt roll"
            >
              <LogOut className="w-4 h-4" />
              <span>Startsida</span>
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main>
        {view === 'landing' ? (
          /* VÄLKOMMENSKÄRM / ROLLVAL */
          <div className="max-w-md mx-auto px-4 py-12 space-y-8 text-center">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-black text-slate-900">Välkommen till CleanBook</h1>
              <p className="text-slate-600 text-sm">Välj din roll för att fortsätta</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* KORT 1: VÄRD */}
              <button
                onClick={() => setView('host')}
                className="bg-white hover:bg-emerald-50/50 p-6 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 shadow-md transition text-left flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-emerald-600" />
                    <span className="text-xl font-bold text-slate-900">Värd (Svenska)</span>
                  </div>
                  <p className="text-xs text-slate-500">Boka städning med din fastighetskod</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-400 transition">
                  →
                </div>
              </button>

              {/* KORT 2: LIMPIADORA */}
              <button
                onClick={() => setView('cleaner')}
                className="bg-white hover:bg-sky-50/50 p-6 rounded-2xl border-2 border-slate-200 hover:border-sky-600 shadow-md transition text-left flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-sky-600" />
                    <span className="text-xl font-bold text-slate-900">Limpiadora (Español)</span>
                  </div>
                  <p className="text-xs text-slate-500">Panel de tareas y propiedades para Maria</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center text-slate-400 transition">
                  →
                </div>
              </button>
            </div>
          </div>
        ) : view === 'host' ? (
          <HostView bookings={bookings} loading={loading} onRefresh={fetchAll} />
        ) : !cleanerAuth ? (
          /* LÖSENORDSSKÄRM FÖR MARIAS VY */
          <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
            <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto text-sky-600">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Acceso restringido</h2>
            <p className="text-sm text-slate-600">Introduce la contraseña de limpiadora para acceder.</p>

            <form onSubmit={handleCleanerLogin} className="space-y-4">
              <input
                type="password"
                placeholder="PIN (1234)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center text-xl font-mono tracking-widest p-3 border-2 border-slate-300 rounded-xl focus:border-sky-600 outline-none"
                autoFocus
              />
              {pinError && <p className="text-sm font-bold text-red-600">Contraseña incorrecta. (Prueba 1234)</p>}
              <button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <KeyRound className="w-5 h-5" /> Entrar
              </button>
            </form>
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