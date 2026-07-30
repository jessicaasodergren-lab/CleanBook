import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property, type NewIncident } from '../lib/supabase';
import { TIME_LABELS, formatDate, getUrgency } from '../lib/constants';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Clock,
  Building,
  MapPin,
  User,
  Check,
  Camera,
  Plus,
  KeyRound,
} from 'lucide-react';

interface CleanerViewProps {
  bookings: Booking[];
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
}

export default function CleanerView({ bookings, incidents, loading, onRefresh }: CleanerViewProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'properties'>('jobs');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openIncidentFor, setOpenIncidentFor] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropHost, setNewPropHost] = useState('');
  const [newPropPasscode, setNewPropPasscode] = useState('');
  const [savingProp, setSavingProp] = useState(false);
  const [propError, setPropError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    const { data } = await supabase.from('properties').select('*').order('name');
    if (data) setProperties(data as Property[]);
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setPropError(null);
    const code = newPropPasscode.trim().toUpperCase();

    if (!newPropName || !code) return;

    const { data: existing } = await supabase.from('properties').select('id').eq('passcode', code);
    if (existing && existing.length > 0) {
      setPropError('¡Este código ya existe! Por favor usa un código diferente.');
      return;
    }

    setSavingProp(true);

    await supabase.from('properties').insert({
      name: newPropName.trim(),
      address: newPropAddress.trim() || newPropName.trim(),
      host_name: newPropHost.trim() || null,
      passcode: code,
    });

    setNewPropName('');
    setNewPropAddress('');
    setNewPropHost('');
    setNewPropPasscode('');
    setSavingProp(false);
    fetchProperties();
  };

  const upcoming = [...bookings]
    .filter((b) => b.status === 'pending')
    .sort((a, b) => (a.departure_date ?? '').localeCompare(b.departure_date ?? ''));

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    await supabase.from('bookings').update({ status: 'finished' }).eq('id', id);
    setCompletingId(null);
    onRefresh();
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-xl mx-auto px-4 space-y-6">
      {/* FLIK-REGLEGE */}
      <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 text-xs font-black shadow-xl">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'jobs' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Tareas de Limpieza ({upcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'properties' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" /> Mis Propiedades ({properties.length})
        </button>
      </div>

      {activeTab === 'jobs' ? (
        loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 space-y-2">
            <p className="text-white font-black text-lg">¡Todo limpio!</p>
            <p className="text-slate-400 text-xs">No hay tareas pendientes en este momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((b) => {
              const urgency = getUrgency(b);
              const isSameDay = urgency.type === 'same_day';
              const isExpanded = expandedId === b.id;
              const displayNote = b.notes_es || b.notes;

              const displayAddress = b.property_address || b.property_name;
              const displayHost =
                b.host_name && b.host_name !== 'Värd'
                  ? b.host_name
                  : b.property_name !== displayAddress
                  ? b.property_name
                  : null;

              return (
                <div
                  key={b.id}
                  className="bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl transition-all border border-slate-200"
                >
                  <div
                    className={`h-2.5 w-full ${
                      isSameDay ? 'bg-rose-500 animate-pulse' : urgency.type === 'flexible' ? 'bg-emerald-500' : 'bg-sky-500'
                    }`}
                  />

                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isSameDay
                                ? 'bg-rose-500 text-white'
                                : urgency.type === 'flexible'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-sky-100 text-sky-800 border border-sky-300'
                            }`}
                          >
                            {urgency.title}
                          </span>

                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                              b.laundry
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.laundry ? '🧺 Lavar: SÍ' : '🚫 No lavar'}
                          </span>
                        </div>

                        <h3 className="font-black text-slate-900 text-lg leading-snug flex items-center gap-1.5 pt-0.5">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">{displayAddress}</span>
                        </h3>

                        <p className="text-xs text-slate-600 font-semibold">
                          Plazo límite:{" "}
                          <span className="font-black text-slate-900">{urgency.text}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpand(b.id)}
                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition shrink-0 mt-1"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                        <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 border border-slate-100">
                          {displayHost && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-bold flex items-center gap-1">
                                <User className="w-3.5 h-3.5" /> Anfitriona:
                              </span>
                              <span className="font-black text-slate-900">{displayHost}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold">Huéspedes:</span>
                            <span className="font-black text-slate-900">{b.guests} personas</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold">Inicio más temprano:</span>
                            <span className="font-black text-slate-900">
                              {b.vacant_now
                                ? 'Puede empezar ya (Vacía)'
                                : `${formatDate(b.departure_date, 'es')} (${TIME_LABELS.es[b.departure_time_window as keyof typeof TIME_LABELS.es] || b.departure_time_window})`}
                            </span>
                          </div>
                        </div>

                        {displayNote && (
                          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1">
                            <span className="font-black text-amber-900 block uppercase text-[10px] tracking-wider">
                              Instrucciones:
                            </span>
                            <p className="font-bold text-amber-950 leading-relaxed">{displayNote}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setOpenIncidentFor(b.id)}
                            className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            <Camera className="w-4 h-4 text-slate-600" /> Reportar foto
                          </button>
                          <button
                            type="button"
                            onClick={() => handleComplete(b.id)}
                            disabled={completingId === b.id}
                            className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                          >
                            {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Completado
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* FASTIGHETSFLIKEN (MIS PROPIEDADES) */
        <div className="space-y-6">
          {/* REGISTRERA FORMULÄR */}
          <form onSubmit={handleCreateProperty} className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Registrar Nueva Propiedad</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la propiedad *</label>
                <input
                  type="text"
                  placeholder="Ej. Gran Vista 45"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la anfitriona (Värd)</label>
                <input
                  type="text"
                  placeholder="Ej. Jessica"
                  value={newPropHost}
                  onChange={(e) => setNewPropHost(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium outline-none focus:bg-white focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección completa *</label>
                <input
                  type="text"
                  placeholder="Ej. Calle Bach 71, Gran Alacant"
                  value={newPropAddress}
                  onChange={(e) => setNewPropAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium outline-none focus:bg-white focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Código Secreto / Contraseña *</label>
                <input
                  type="text"
                  placeholder="Ej. GV45"
                  value={newPropPasscode}
                  onChange={(e) => setNewPropPasscode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold uppercase text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            {propError && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">{propError}</p>}

            <button
              type="submit"
              disabled={savingProp}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {savingProp ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Guardar Propiedad
            </button>
          </form>

          {/* FASTIGHETER MED KORT & ETIKETTER */}
          <div className="space-y-3">
            <h4 className="font-black text-white text-xs uppercase tracking-wider px-1">
              Tus Propiedades ({properties.length})
            </h4>

            {properties.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl space-y-4 text-slate-900 relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-black text-slate-900 text-base leading-tight">
                        {p.name}
                      </h5>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Fastighet / Propiedad
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                      Lösen / Código
                    </span>
                    <span className="inline-block px-3 py-1 bg-slate-900 text-emerald-400 font-mono font-black text-xs rounded-xl border border-slate-700 shadow-sm mt-0.5">
                      🔑 {p.passcode}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-600" /> Värd / Anfitriona
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs">
                      {p.host_name || 'Ej angiven'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Adress / Dirección
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs truncate block">
                      {p.address || p.name}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL FÖR FOTO */}
      {openIncidentFor && (
        <IncidentModal
          bookingId={openIncidentFor}
          onClose={() => setOpenIncidentFor(null)}
          onSaved={() => {
            setOpenIncidentFor(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function IncidentModal({
  bookingId,
  onClose,
  onSaved,
}: {
  bookingId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    const payload: NewIncident = {
      booking_id: bookingId,
      note: note.trim(),
      photo_url: photo,
    };
    await supabase.from('incidents').insert(payload);
    setSubmitting(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900">Reportar foto / incidencia</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Foto (Opcional)</label>
            <input type="file" accept="image/*" onChange={handleFile} className="block w-full text-xs text-slate-600" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nota explicativa *</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ej. Silla rota en terraza..."
              className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-xs outline-none focus:bg-white focus:border-slate-400 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar reporte
          </button>
        </form>
      </div>
    </div>
  );
}