// src/components/cleaner/PropertyList.tsx
import { useState, useEffect } from 'react';
import { supabase, type Property } from '../../lib/supabase';
import type { CleanerLanguage } from '../CleanerView';
import {
  Loader2,
  X,
  Building,
  MapPin,
  KeyRound,
  Ruler,
  Timer,
  Bed,
  Bath,
  StickyNote,
  Plus,
  Key,
  Check,
  AlertCircle,
  Unlink,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PropertyListProps {
  properties: Property[];
  onRefresh: () => void;
  lang?: CleanerLanguage;
}

interface ConnectionData {
  id: string;
  property_id: string;
  internal_notes: string | null;
  cleaning_time: string | null;
}

const propListTexts: Record<CleanerLanguage, any> = {
  es: {
    title: 'Mis Propiedades Conectadas',
    subtitleSingle: 'propiedad asignada',
    subtitlePlural: 'propiedades asignadas',
    btnConnectCode: 'Conectar código',
    noPropsTitle: 'No tienes propiedades conectadas',
    noPropsDesc: 'Pide el código a la anfitriona y pulsa en "Conectar código".',
    anfitriona: 'Anfitriona:',
    specSurface: 'Superficie',
    specRooms: 'Habitaciones',
    specBathrooms: 'Baños',
    specTime: 'Tiempo est.',
    noTimeSet: 'Sin tiempo',
    hostNotes: 'Notas fijas de la anfitriona:',
    myInternalSection: 'Mi tiempo y notas privadas:',
    editModalTimeLabel: 'Tiempo estimado de limpieza',
    editModalTimePlaceholder: 'Ej. 2.5 h',
    editModalNotesLabel: 'Mis notas privadas',
    editModalNotesPlaceholder: 'Ej. La cerradura va un poco dura. Traer mopa especial...',
    editModalNotesHelp: 'La anfitriona NO podrá ver esta nota.',
    btnSaveNotes: 'Guardar cambios',
    savedNotice: '¡Guardado!',
    btnDisconnect: 'Desconectar propiedad',
    confirmDisconnect: '¿Estás segura de que deseas desconectar esta propiedad?',
    errInvalidCode: 'Código no válido. Verifica el código e inténtalo de nuevo.',
    errAlreadyConnected: 'Esta propiedad ya está conectada a tu cuenta.',
    successConnected: '¡Propiedad conectada con éxito!',
    saveError: 'Error al guardar. Por favor intenta de nuevo.',
  },
  en: {
    title: 'My Connected Properties',
    subtitleSingle: 'assigned property',
    subtitlePlural: 'assigned properties',
    btnConnectCode: 'Connect code',
    noPropsTitle: 'You have no connected properties',
    noPropsDesc: 'Ask the host for the code and click "Connect code".',
    anfitriona: 'Host:',
    specSurface: 'Surface',
    specRooms: 'Bedrooms',
    specBathrooms: 'Bathrooms',
    specTime: 'Est. time',
    noTimeSet: 'No time set',
    hostNotes: 'Host permanent notes:',
    myInternalSection: 'My est. time & private notes:',
    editModalTimeLabel: 'Estimated cleaning time',
    editModalTimePlaceholder: 'E.g. 2.5 h',
    editModalNotesLabel: 'My private notes',
    editModalNotesPlaceholder: 'E.g. Lock is stiff. Bring special mop...',
    editModalNotesHelp: 'The host CANNOT see this note.',
    btnSaveNotes: 'Save changes',
    savedNotice: 'Saved!',
    btnDisconnect: 'Disconnect property',
    confirmDisconnect: 'Are you sure you want to disconnect this property?',
    errInvalidCode: 'Invalid code. Please check and try again.',
    errAlreadyConnected: 'This property is already connected to your account.',
    successConnected: 'Property connected successfully!',
    saveError: 'Error saving changes. Please try again.',
  },
  sv: {
    title: 'Mina Kopplade Fastigheter',
    subtitleSingle: 'tilldelad fastighet',
    subtitlePlural: 'tilldelade fastigheter',
    btnConnectCode: 'Koppla kod',
    noPropsTitle: 'Du har inga kopplade fastigheter',
    noPropsDesc: 'Be värden om koden och klicka på "Koppla kod".',
    anfitriona: 'Värd:',
    specSurface: 'Boarea',
    specRooms: 'Rum',
    specBathrooms: 'Badrum',
    specTime: 'Städtid',
    noTimeSet: 'Ej angiven',
    hostNotes: 'Värdens fasta instruktioner:',
    myInternalSection: 'Min städtid & privata anteckningar:',
    editModalTimeLabel: 'Beräknad städtid',
    editModalTimePlaceholder: 'T.ex. 2.5 h',
    editModalNotesLabel: 'Mina privata anteckningar',
    editModalNotesPlaceholder: 'T.ex. Låset går trögt. Ta med specialmopp...',
    editModalNotesHelp: 'Värden kan INTE se denna anteckning.',
    btnSaveNotes: 'Spara ändringar',
    savedNotice: 'Sparat!',
    btnDisconnect: 'Koppla från fastighet',
    confirmDisconnect: 'Är du säker på att du vill koppla från denna fastighet?',
    errInvalidCode: 'Ogiltig kod. Kontrollera koden och försök igen.',
    errAlreadyConnected: 'Denna fastighet är redan kopplad till ditt konto.',
    successConnected: 'Fastigheten har kopplats!',
    saveError: 'Kunde inte spara ändringarna. Försök igen.',
  },
};

export default function PropertyList({ properties, onRefresh, lang = 'es' }: PropertyListProps) {
  const [expandedPropIds, setExpandedPropIds] = useState<string[]>([]);

  // Modal för att koppla NY fastighet via kod
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // Data om kopplingar
  const [connectionsMap, setConnectionsMap] = useState<Record<string, ConnectionData>>({});
  
  // LOKALT DATORMINNE FÖR FORMULÄR I KORTET
  const [formDataMap, setFormDataMap] = useState<Record<string, { time: string; notes: string }>>({});
  const [savingPropId, setSavingPropId] = useState<string | null>(null);
  const [savedSuccessPropId, setSavedSuccessPropId] = useState<string | null>(null);
  const [saveInlineError, setSaveInlineError] = useState<{ id: string; msg: string } | null>(null);

  const txt = propListTexts[lang] || propListTexts.es;

  const fetchConnections = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('property_connections')
      .select('id, property_id, internal_notes, cleaning_time')
      .eq('cleaner_id', session.user.id);

    if (data) {
      const map: Record<string, ConnectionData> = {};
      data.forEach((item: any) => {
        map[item.property_id] = item;
      });
      setConnectionsMap(map);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [properties]);

  const toggleExpandProperty = (id: string) => {
    setExpandedPropIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const getPropertyFormData = (p: Property) => {
    const conn = connectionsMap[p.id];
    const timeVal = formDataMap[p.id]?.time ?? (conn?.cleaning_time || p.cleaning_time || '');
    const notesVal = formDataMap[p.id]?.notes ?? (conn?.internal_notes || '');
    return { timeVal, notesVal };
  };

  const handleFormChange = (propId: string, field: 'time' | 'notes', value: string) => {
    setFormDataMap((prev) => {
      const conn = connectionsMap[propId];
      const p = properties.find((item) => item.id === propId);
      const currentTime = prev[propId]?.time ?? (conn?.cleaning_time || p?.cleaning_time || '');
      const currentNotes = prev[propId]?.notes ?? (conn?.internal_notes || '');

      return {
        ...prev,
        [propId]: {
          time: field === 'time' ? value : currentTime,
          notes: field === 'notes' ? value : currentNotes,
        },
      };
    });
  };

  // DIREKT-SPARANDE SOM SÄKERSTÄLLER ATT DET SPARAS OAVSETT KOPPLINGS-ID
  const handleSaveInline = async (p: Property) => {
    setSavingPropId(p.id);
    setSaveInlineError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { timeVal, notesVal } = getPropertyFormData(p);

      // Uppdatera direkt via cleaner_id och property_id
      const { error: updateErr } = await supabase
        .from('property_connections')
        .update({
          cleaning_time: timeVal.trim() || null,
          internal_notes: notesVal.trim() || null,
        })
        .eq('property_id', p.id)
        .eq('cleaner_id', session.user.id);

      if (updateErr) {
        console.error('Update error:', updateErr);
        setSaveInlineError({ id: p.id, msg: updateErr.message || txt.saveError });
        setSavingPropId(null);
        return;
      }

      await fetchConnections();
      setSavedSuccessPropId(p.id);
      setTimeout(() => setSavedSuccessPropId(null), 2500);
    } catch (err: any) {
      console.error('Save error:', err);
      setSaveInlineError({ id: p.id, msg: err.message || txt.saveError });
    } finally {
      setSavingPropId(null);
    }
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
      if (!session) throw new Error('No session');

      await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email,
        role: session.user.user_metadata?.role || 'agency_admin',
        full_name: session.user.user_metadata?.full_name || '',
      });

      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('id, name')
        .or(`invite_code.eq.${code},passcode.eq.${code}`)
        .maybeSingle();

      if (propErr) throw propErr;

      if (!prop) {
        setErrorMsg(txt.errInvalidCode);
        setConnecting(false);
        return;
      }

      const { error: connectErr } = await supabase
        .from('property_connections')
        .insert({
          property_id: prop.id,
          cleaner_id: session.user.id,
        });

      if (connectErr) {
        if (connectErr.code === '23505') {
          setErrorMsg(txt.errAlreadyConnected);
        } else {
          setErrorMsg(connectErr.message || 'Error');
        }
        setConnecting(false);
        return;
      }

      setSuccessMsg(txt.successConnected);
      setInviteCode('');
      setTimeout(() => {
        setShowConnectModal(false);
        setSuccessMsg(null);
        onRefresh();
      }, 1200);

    } catch (err: any) {
      console.error('Error connecting property:', err);
      setErrorMsg(err.message || 'Error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (p: Property) => {
    if (!window.confirm(`${txt.confirmDisconnect} "${p.name}"?`)) return;

    setDisconnectingId(p.id);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('property_connections')
        .delete()
        .eq('property_id', p.id)
        .eq('cleaner_id', session.user.id);
      onRefresh();
    }
    setDisconnectingId(null);
  };

  return (
    <div className="space-y-4">
      {/* SEKTIONSHUVUD */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-400" /> {txt.title}
          </h3>
          <p className="text-[11px] font-semibold text-slate-400">
            {properties.length} {properties.length === 1 ? txt.subtitleSingle : txt.subtitlePlural}
          </p>
        </div>

        <button
          onClick={() => {
            setShowConnectModal(true);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-sky-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{txt.btnConnectCode}</span>
        </button>
      </div>

      {/* MODAL: KOPPLA NY FASTIGHET VIA KOD */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-sky-600" /> {txt.btnConnectCode}
              </h3>
              <button onClick={() => setShowConnectModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectProperty} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                {txt.noPropsDesc}
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
                {txt.btnConnectCode}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LISTA ÖVER FASTIGHETER */}
      <div className="space-y-3">
        {properties.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-slate-400 text-xs space-y-2">
            <Building className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-bold text-white">{txt.noPropsTitle}</p>
            <p>{txt.noPropsDesc}</p>
          </div>
        ) : (
          properties.map((p) => {
            const isExpanded = expandedPropIds.includes(p.id);

            const connData = connectionsMap[p.id];
            const displayTime = connData?.cleaning_time || p.cleaning_time || txt.noTimeSet;

            const { timeVal, notesVal } = getPropertyFormData(p);
            const isSaving = savingPropId === p.id;
            const isSaved = savedSuccessPropId === p.id;
            const inlineErr = saveInlineError?.id === p.id ? saveInlineError.msg : null;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xl space-y-3 text-slate-900 relative overflow-hidden transition-all"
              >
                {/* KOMPAKT ÖVERSIKT (ALLTID SYNLIG) */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={() => toggleExpandProperty(p.id)}>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black shrink-0 mt-0.5">
                      <Building className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
                        {p.name}
                        {p.host_name && (
                          <span className="text-slate-500 font-semibold text-xs ml-1.5">
                            ({txt.anfitriona} {p.host_name})
                          </span>
                        )}
                      </h5>

                      {p.address && (
                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 truncate pt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{p.address}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-extrabold bg-sky-50 text-sky-900 border border-sky-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-sky-600" />
                      <span>{displayTime}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleExpandProperty(p.id)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition border border-slate-200"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* EXPANDERAD DETALJVY */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200 text-xs">
                    {/* SPECIFIKATIONER GRID */}
                    {(p.kvm || p.rooms || p.bathrooms) && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 space-y-0.5">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                            <Ruler className="w-3 h-3 text-slate-500" /> {txt.specSurface}
                          </span>
                          <span className="font-extrabold text-slate-900 text-xs">
                            {p.kvm ? `${p.kvm} m²` : '-'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 space-y-0.5">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                            <Bed className="w-3 h-3 text-slate-500" /> {txt.specRooms}
                          </span>
                          <span className="font-extrabold text-slate-900 text-xs">
                            {p.rooms ? `${p.rooms}` : '-'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 space-y-0.5">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                            <Bath className="w-3 h-3 text-slate-500" /> {txt.specBathrooms}
                          </span>
                          <span className="font-extrabold text-slate-900 text-xs">
                            {p.bathrooms ? `${p.bathrooms}` : '-'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* VÄRDENS FASTA INSTRUKTIONER */}
                    {p.property_notes && (
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                        <span className="font-black text-slate-700 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                          <StickyNote className="w-3.5 h-3.5 text-slate-500" /> {txt.hostNotes}
                        </span>
                        <p className="font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                          {p.property_notes}
                        </p>
                      </div>
                    )}

                    {/* STÄDERSKANS PRIVATA ANTECKNINGAR OCH TIDSÅTGÅNG */}
                    <div className="bg-sky-50/80 border border-sky-200 p-3.5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sky-900 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-sky-600" /> {txt.myInternalSection}
                        </span>

                        {isSaved && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1 animate-in fade-in">
                            <Check className="w-3 h-3 text-emerald-600" /> {txt.savedNotice}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-sky-900 mb-1 flex items-center gap-1">
                            <Timer className="w-3 h-3 text-sky-600" /> {txt.editModalTimeLabel}
                          </label>
                          <input
                            type="text"
                            placeholder={txt.editModalTimePlaceholder}
                            value={timeVal}
                            onChange={(e) => handleFormChange(p.id, 'time', e.target.value)}
                            className="w-full bg-white border border-sky-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/30"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-sky-900 mb-1 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-600" /> {txt.editModalNotesLabel}
                          </label>
                          <textarea
                            rows={3}
                            placeholder={txt.editModalNotesPlaceholder}
                            value={notesVal}
                            onChange={(e) => handleFormChange(p.id, 'notes', e.target.value)}
                            className="w-full bg-white border border-sky-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/30"
                          />
                          <p className="text-[10px] text-sky-700/80 mt-1">{txt.editModalNotesHelp}</p>
                        </div>

                        {inlineErr && (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                            <span>{inlineErr}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveInline(p)}
                          disabled={isSaving}
                          className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md active:scale-98 disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{txt.btnSaveNotes}</span>
                        </button>
                      </div>
                    </div>

                    {/* KNAPP FÖR ATT KOPPLA FRÅN */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleDisconnect(p)}
                        disabled={disconnectingId === p.id}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold text-[11px] rounded-xl transition flex items-center gap-1 border border-slate-200 active:scale-95"
                      >
                        {disconnectingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" /> : <Unlink className="w-3.5 h-3.5" />}
                        <span>{txt.btnDisconnect}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}