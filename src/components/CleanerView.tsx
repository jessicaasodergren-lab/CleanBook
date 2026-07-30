import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property, type NewIncident } from '../lib/supabase';
import { TIME_LABELS, formatDate, getUrgency } from '../lib/constants';
import {
  Check,
  Clock,
  Users,
  BedDouble,
  StickyNote,
  Camera,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle2,
  Home,
  User,
  Plus,
  KeyRound,
  Building2,
  PlayCircle,
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
      setPropError('¡Este código ya existe! Por favor usa un código diferente para esta propiedad.');
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* VÄXLA FLIKAR */}
      <div className="flex bg-slate-200 p-1 rounded-xl font-bold text-sm">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 py-2.5 rounded-lg transition flex items-center justify-center gap-2 ${
            activeTab === 'jobs' ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" /> Tareas de Limpieza ({upcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-2.5 rounded-lg transition flex items-center justify-center gap-2 ${
            activeTab === 'properties' ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" /> Mis Propiedades ({properties.length})
        </button>
      </div>

      {activeTab === 'jobs' ? (
        loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-300">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <p className="text-slate-800 font-bold text-lg">¡Todo limpio! No hay tareas pendientes.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.map((b) => {
              const urgency = getUrgency(b);
              const isSameDay = urgency.type === 'same_day';
              const displayNote = b.notes_es || b.notes;

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl border-4 shadow-lg overflow-hidden transition ${
                    isSameDay ? 'border-red-500' : 'border-slate-800'
                  }`}
                >
                  {/* DEADLINE / BRÅDSKA BANDÅ */}
                  <div
                    className={`px-5 py-3 font-black text-sm uppercase tracking-wide flex items-center justify-between ${
                      isSameDay
                        ? 'bg-red-600 text-white animate-pulse'
                        : urgency.type === 'flexible'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-sky-700 text-white'
                    }`}
                  >
                    <span>{urgency.title}</span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* FASTIGHET & VÄRD */}
                    <div className="border-b border-slate-200 pb-3">
                      <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Home className="w-6 h-6 text-slate-700" /> {b.property_name}
                      </h3>
                      {b.host_name && (
                        <p className="text-sm font-semibold text-slate-600 mt-1 flex items-center gap-1">
                          <User className="w-4 h-4" /> Anfitriona: <span className="text-slate-900 font-bold">{b.host_name}</span>
                        </p>
                      )}
                    </div>

                    {/* STÄDFÖNSTER: START & DEADLINE */}
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 space-y-2">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                        <PlayCircle className="w-5 h-5 text-amber-600" />
                        <span>Inicio más temprano: {b.vacant_now ? <b className="text-emerald-700">Puede empezar ya (Vacía)</b> : <b>{formatDate(b.departure_date, 'es')}</b>} ({TIME_LABELS.es[b.departure_time_window as keyof typeof TIME_LABELS.es] || b.departure_time_window})</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 pt-2 border-t border-slate-200">
                        📌 Plazo límite: {urgency.text}
                      </p>
                    </div>

                    {/* INFORMATION OM UPPDRAGET */}
                    <div className="flex flex-wrap gap-2">
                      <div className="bg-slate-200 text-slate-800 font-bold text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> {b.guests} huéspedes
                      </div>
                      <div
                        className={`font-bold text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                          b.laundry ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <BedDouble className="w-4 h-4" /> {b.laundry ? '🧺 Lavar ropa usada: SÍ' : '🚫 Lavar ropa: NO'}
                      </div>
                    </div>

                    {/* ANTECKNINGAR */}
                    {displayNote && (
                      <div className="bg-amber-100 border-2 border-amber-300 p-3 rounded-xl flex items-start gap-2">
                        <StickyNote className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-900 uppercase">Instrucciones de la anfitriona:</p>
                          <p className="text-sm font-bold text-amber-950">{displayNote}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* KNAPPAR */}
                  <div className="grid grid-cols-2 divide-x-2 divide-slate-800 border-t-2 border-slate-800">
                    <button
                      onClick={() => setOpenIncidentFor(b.id)}
                      className="py-4 bg-slate-100 hover:bg-slate-200 font-bold text-slate-900 flex items-center justify-center gap-2 transition"
                    >
                      <Camera className="w-5 h-5 text-slate-700" /> Reportar foto
                    </button>
                    <button
                      onClick={() => handleComplete(b.id)}
                      disabled={completingId === b.id}
                      className="py-4 bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white flex items-center justify-center gap-2 transition"
                    >
                      {completingId === b.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Completado
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* FASTIGHETS-FLIKEN */
        <div className="space-y-6">
          <form onSubmit={handleCreateProperty} className="bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-md space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> Registrar Nueva Propiedad
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la propiedad *</label>
              <input
                type="text"
                placeholder="Ej. Gran Vista 45"
                value={newPropName}
                onChange={(e) => setNewPropName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la anfitriona (Värd)</label>
              <input
                type="text"
                placeholder="Ej. Anna"
                value={newPropHost}
                onChange={(e) => setNewPropHost(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dirección completa</label>
              <input
                type="text"
                placeholder="Ej. Calle Bach 71, Gran Alacant"
                value={newPropAddress}
                onChange={(e) => setNewPropAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Código Secreto / Contraseña *</label>
              <input
                type="text"
                placeholder="Ej. GV45 o BACH71"
                value={newPropPasscode}
                onChange={(e) => setNewPropPasscode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-mono font-bold uppercase text-slate-900"
                required
              />
            </div>

            {propError && <p className="text-sm font-bold text-red-600 bg-red-50 p-2.5 rounded-lg">{propError}</p>}

            <button
              type="submit"
              disabled={savingProp}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {savingProp ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
              Guardar Propiedad y Código
            </button>
          </form>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-base">Tus Propiedades Registradas ({properties.length})</h4>
            {properties.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h5 className="font-black text-slate-900">{p.name}</h5>
                  <p className="text-xs text-slate-500">{p.address} {p.host_name ? `· Anfitriona: ${p.host_name}` : ''}</p>
                </div>
                <div className="bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" /> Código: {p.passcode}
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
          existing={incidents.filter((i) => i.booking_id === openIncidentFor)}
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
  existing,
  onClose,
  onSaved,
}: {
  bookingId: string;
  existing: Incident[];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Reportar foto / incidencia
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Foto (Opcional)</label>
            <input type="file" accept="image/*" onChange={handleFile} className="block w-full text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nota explicativa *</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ej. Silla rota en terraza, llave dejada en buzón..."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Guardar reporte
          </button>
        </form>
      </div>
    </div>
  );
}