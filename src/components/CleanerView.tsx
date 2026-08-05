import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../lib/supabase';
import TaskList from './cleaner/TaskList';
import CleanerCalendarView from './cleaner/CleanerCalendarView';
import PropertyList from './cleaner/PropertyList';
import { Clock, Building, Calendar as CalendarIcon, Sparkles, Key, Check, AlertCircle, Loader2, KeyRound, X } from 'lucide-react';

interface CleanerViewProps {
  bookings: Booking[];
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
}

export default function CleanerView({ bookings, incidents, loading, onRefresh }: CleanerViewProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'calendar' | 'properties'>('jobs');
  const [properties, setProperties] = useState<Property[]>([]);

  // Modal & Kopplings-states
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('property_connections')
      .select('properties(*)')
      .eq('cleaner_id', session.user.id);

    if (data) {
      const props = data.map((item: any) => item.properties).filter(Boolean);
      setProperties(props as Property[]);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleRefreshAll = () => {
    fetchProperties();
    onRefresh();
  };

  const handleConnectProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const code = inviteCode.trim().toUpperCase();

    if (!code) return;
    setConnecting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      // Säkerställ att städerskans profil finns i 'profiles' först
      await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email,
        role: session.user.user_metadata?.role || 'agency_admin',
        full_name: session.user.user_metadata?.full_name || '',
      });

      // 1. Sök efter fastigheten baserat på invite_code eller passcode
      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('id, name')
        .or(`invite_code.eq.${code},passcode.eq.${code}`)
        .maybeSingle();

      if (propErr) throw propErr;

      if (!prop) {
        setErrorMsg('Código no válido. Verifica el código e inténtalo de nuevo.');
        setConnecting(false);
        return;
      }

      // 2. Skapa kopplingen i property_connections
      const { error: connectErr } = await supabase
        .from('property_connections')
        .insert({
          property_id: prop.id,
          cleaner_id: session.user.id,
        });

      if (connectErr) {
        if (connectErr.code === '23505') {
          setErrorMsg('Esta propiedad ya está conectada a tu cuenta.');
        } else {
          console.error('Connect error:', connectErr);
          setErrorMsg('Error al conectar con la propiedad. Por favor inténtalo de nuevo.');
        }
        setConnecting(false);
        return;
      }

      setSuccessMsg(`¡Propiedad "${prop.name}" conectada con éxito!`);
      setInviteCode('');
      setTimeout(() => {
        setShowConnectModal(false);
        setSuccessMsg(null);
        handleRefreshAll();
      }, 1200);

    } catch (err: any) {
      console.error('Error in handleConnectProperty:', err);
      setErrorMsg('Error al conectar la propiedad.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-2 sm:px-4 space-y-3">
      {/* TOPPMENY */}
      <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-black shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'jobs' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Tareas ({bookings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'calendar' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Calendario</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'properties' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Propiedades ({properties.length})</span>
        </button>
      </div>

      {/* VÄLKOMST-KORT OM FASTIGHETER SAKNAS */}
      {properties.length === 0 && !loading && (
        <div className="bg-gradient-to-br from-sky-900/90 via-slate-900 to-slate-900 border-2 border-sky-500/50 rounded-3xl p-5 space-y-3.5 text-white shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-2 text-sky-400">
            <Sparkles className="w-5 h-5 shrink-0" />
            <h3 className="font-black text-base">¡Bienvenida a CleanBook! 👋</h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Para empezar a ver tus tareas de limpieza y el calendario, conecta tu primera propiedad en 3 sencillos pasos:
          </p>

          <div className="bg-slate-950/80 rounded-2xl p-3.5 space-y-2 border border-sky-500/20 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-bold text-sky-400 shrink-0">1.</span>
              <p className="text-slate-200"><strong>Pide el código:</strong> Solicita el código de invitación a la anfitriona (ej. <span className="font-mono text-emerald-400">CLEAN-88A2</span>).</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-sky-400 shrink-0">2.</span>
              <p className="text-slate-200"><strong>Pulsa en Conectar:</strong> Pulsa el botón inferior para introducir el código.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-sky-400 shrink-0">3.</span>
              <p className="text-slate-200"><strong>¡Listo!</strong> Tus limpiezas y el calendario se actualizarán automáticamente.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setSuccessMsg(null);
              setShowConnectModal(true);
            }}
            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Key className="w-4 h-4" />
            <span>Conectar mi primera propiedad ahora</span>
          </button>
        </div>
      )}

      {/* MODAL FÖR ATT KOPPLA MED CÓDIGO */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-sky-600" /> Conectar nueva propiedad
              </h3>
              <button onClick={() => setShowConnectModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectProperty} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Introduce el código de invitación o clave secreta proporcionada por la anfitriona:
              </p>

              <div>
                <input
                  type="text"
                  placeholder="Ej. CLEAN-88A2 o GV45"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center font-mono font-black text-lg uppercase text-slate-900 outline-none focus:bg-white focus:border-sky-500 transition"
                  autoFocus
                  required
                />
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={connecting}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Conectar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* INNEHÅLL PÅ VALD FLIK */}
      {activeTab === 'jobs' ? (
        <TaskList
          bookings={bookings}
          incidents={incidents}
          properties={properties}
          loading={loading}
          onRefresh={handleRefreshAll}
        />
      ) : activeTab === 'calendar' ? (
        <CleanerCalendarView
          bookings={bookings}
          incidents={incidents}
          properties={properties}
          onRefresh={handleRefreshAll}
        />
      ) : (
        <PropertyList properties={properties} onRefresh={handleRefreshAll} />
      )}
    </div>
  );
}