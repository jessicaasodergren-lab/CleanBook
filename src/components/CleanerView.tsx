// src/components/CleanerView.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../lib/supabase';
import { propertyService } from '../services/propertyService';
import { translations } from '../i18n/translations';
import TaskList from './cleaner/TaskList';
import CleanerCalendarView from './cleaner/CleanerCalendarView';
import PropertyList from './cleaner/PropertyList';
import { Clock, Building, Calendar as CalendarIcon, Sparkles, Key, Check, AlertCircle, Loader2, KeyRound, X, Globe } from 'lucide-react';

export type CleanerLanguage = 'es' | 'en' | 'sv';

interface CleanerViewProps {
  bookings: Booking[];
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
  lang?: CleanerLanguage;
  onLangChange?: (newLang: CleanerLanguage) => void;
}

export default function CleanerView({
  bookings,
  incidents,
  loading,
  onRefresh,
  lang = 'es',
  onLangChange,
}: CleanerViewProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'calendar' | 'properties'>('jobs');
  const [properties, setProperties] = useState<Property[]>([]);

  // Modal & Kopplings-states
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const txt = translations?.cleaner?.[lang] || translations?.cleaner?.es || {
    tabJobs: 'Tareas',
    tabCalendar: 'Calendario',
    tabProps: 'Propiedades',
    welcomeTitle: '¡Bienvenida a CleanBook! 👋',
    welcomeDesc: 'Para empezar a ver tus tareas de limpieza y el calendario, conecta tu primera propiedad en 3 sencillos pasos:',
    step1: 'Pide el código:',
    step1Desc: 'Solicita el código de invitación a la anfitriona (ej. CLEAN-88A2).',
    step2: 'Pulsa en Conectar:',
    step2Desc: 'Pulsa el botón inferior para introducir el código.',
    step3: '¡Listo!',
    step3Desc: 'Tus limpiezas y el calendario se actualizarán automáticamente.',
    btnConnectNow: 'Conectar mi primera propiedad ahora',
    modalTitle: 'Conectar nueva propiedad',
    modalDesc: 'Introduce el código de invitación o clave secreta proporcionada por la anfitriona:',
    placeholderCode: 'Ej. CLEAN-88A2 o GV45',
    btnSubmitConnect: 'Conectar',
    errInvalidCode: 'Código no válido. Verifica el código e inténtalo de nuevo.',
    errAlreadyConnected: 'Esta propiedad ya está conectada a tu cuenta.',
    successConnected: '¡Propiedad conectada con éxito!',
  };

  const fetchProperties = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      // Servicen ersätter direkt-anropet!
      const props = await propertyService.getCleanerProperties(session.user.id);
      setProperties(props);
    } catch (err) {
      console.error('Kunde inte hämta städerskans fastigheter:', err);
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
    if (!inviteCode.trim()) return;

    setConnecting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email,
        role: session.user.user_metadata?.role || 'agency_admin',
        full_name: session.user.user_metadata?.full_name || '',
      });

      // Servicen ersätter direkt-anropet!
      await propertyService.connectByInviteCode(session.user.id, inviteCode);

      setSuccessMsg(txt.successConnected);
      setInviteCode('');
      setTimeout(() => {
        setShowConnectModal(false);
        setSuccessMsg(null);
        handleRefreshAll();
      }, 1200);

    } catch (err: any) {
      if (err.message === 'INVALID_CODE') setErrorMsg(txt.errInvalidCode);
      else if (err.message === 'ALREADY_CONNECTED') setErrorMsg(txt.errAlreadyConnected);
      else setErrorMsg('Error occurred');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-2 sm:px-4 space-y-3">
      {/* SPRÅKVÄLJARE */}
      <div className="flex justify-end items-center gap-2">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 flex items-center gap-1 text-[11px]">
          <Globe className="w-3 h-3 text-slate-400 mr-0.5" />
          <button
            onClick={() => onLangChange?.('es')}
            className={`px-1.5 py-0.5 rounded font-bold ${lang === 'es' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            🇪🇸 ES
          </button>
          <button
            onClick={() => onLangChange?.('en')}
            className={`px-1.5 py-0.5 rounded font-bold ${lang === 'en' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            🇬🇧 EN
          </button>
          <button
            onClick={() => onLangChange?.('sv')}
            className={`px-1.5 py-0.5 rounded font-bold ${lang === 'sv' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            🇸🇪 SV
          </button>
        </div>
      </div>

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
          <span>{txt.tabJobs} ({bookings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'calendar' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>{txt.tabCalendar}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'properties' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>{txt.tabProps} ({properties.length})</span>
        </button>
      </div>

      {/* VÄLKOMST-KORT */}
      {properties.length === 0 && !loading && (
        <div className="bg-gradient-to-br from-sky-900/90 via-slate-900 to-slate-900 border-2 border-sky-500/50 rounded-3xl p-5 space-y-3.5 text-white shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-2 text-sky-400">
            <Sparkles className="w-5 h-5 shrink-0" />
            <h3 className="font-black text-base">{txt.welcomeTitle}</h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {txt.welcomeDesc}
          </p>

          <div className="bg-slate-950/80 rounded-2xl p-3.5 space-y-2 border border-sky-500/20 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-bold text-sky-400 shrink-0">1.</span>
              <p className="text-slate-200"><strong>{txt.step1}</strong> {txt.step1Desc}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-sky-400 shrink-0">2.</span>
              <p className="text-slate-200"><strong>{txt.step2}</strong> {txt.step2Desc}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-sky-400 shrink-0">3.</span>
              <p className="text-slate-200"><strong>{txt.step3}</strong> {txt.step3Desc}</p>
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
            <span>{txt.btnConnectNow}</span>
          </button>
        </div>
      )}

      {/* MODAL FÖR ATT KOPPLA MED CÓDIGO */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-sky-600" /> {txt.modalTitle}
              </h3>
              <button onClick={() => setShowConnectModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectProperty} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                {txt.modalDesc}
              </p>

              <div>
                <input
                  type="text"
                  placeholder={txt.placeholderCode}
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
                {txt.btnSubmitConnect}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FLIKINNEHÅLL */}
      {activeTab === 'jobs' ? (
        <TaskList
          bookings={bookings}
          incidents={incidents}
          properties={properties}
          loading={loading}
          onRefresh={handleRefreshAll}
          lang={lang}
        />
      ) : activeTab === 'calendar' ? (
        <CleanerCalendarView
          bookings={bookings}
          incidents={incidents}
          properties={properties}
          onRefresh={handleRefreshAll}
          lang={lang}
        />
      ) : (
        <PropertyList properties={properties} onRefresh={handleRefreshAll} lang={lang} />
      )}
    </div>
  );
}