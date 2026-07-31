import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property, type NewIncident } from '../lib/supabase';
import { formatDate } from '../lib/constants';
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
  Eye,
  EyeOff,
  RotateCcw,
  AlertCircle,
  Play,
  Flag,
  Ruler,
  Timer,
  Pencil,
  Bed,
  Bath,
  StickyNote,
} from 'lucide-react';

interface ExtendedProperty extends Property {
  kvm?: string | null;
  rooms?: string | null;
  bathrooms?: string | null;
  cleaning_time?: string | null;
  property_notes?: string | null;
}

interface CleanerViewProps {
  bookings: Booking[];
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
}

function parsePhotos(photoUrl: string | null): string[] {
  if (!photoUrl) return [];
  try {
    if (photoUrl.startsWith('[')) {
      return JSON.parse(photoUrl) as string[];
    }
  } catch (e) {
    // Om inte JSON
  }
  return [photoUrl];
}

// SMARTHJÄLP FÖR ATT BERÄKNA STÄDFÖNSTRET OCH VARNINGAR
function getTaskDeadlineAndUrgency(b: Booking, allBookings: Booking[]) {
  const currentDeparture = b.departure_date;
  if (!currentDeparture) {
    return {
      deadlineStr: 'Flexible',
      urgencyTitle: '🟢 FLEXIBLE',
      urgencyColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      topBannerColor: 'bg-emerald-500',
      urgencyType: 'flexible',
      daysGap: null,
      sortDate: '9999-99-99',
    };
  }

  // Sök nästa bokning på samma fastighet
  const nextBooking = allBookings
    .filter(
      (other) =>
        other.property_name === b.property_name &&
        other.id !== b.id &&
        (other.next_arrival_date || other.departure_date) >= currentDeparture
    )
    .sort((x, y) => {
      const arrX = x.next_arrival_date || x.departure_date || '';
      const arrY = y.next_arrival_date || y.departure_date || '';
      return arrX.localeCompare(arrY);
    })[0];

  if (!nextBooking) {
    return {
      deadlineStr: 'Flexible (Sin nueva reserva)',
      urgencyTitle: '🟢 FLEXIBLE (SIN PRÓXIMO HUÉSPED)',
      urgencyColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      topBannerColor: 'bg-emerald-500',
      urgencyType: 'flexible',
      daysGap: null,
      sortDate: '9999-99-99',
    };
  }

  const nextArrival = nextBooking.next_arrival_date || nextBooking.departure_date;
  const exactTimeStr = nextBooking.arrival_exact_time ? ` (kl ${nextBooking.arrival_exact_time})` : '';
  const formattedDeadline = `${formatDate(nextArrival, 'es')}${exactTimeStr}`;

  // Räkna ut skillnaden i dagar mellan avresa och nästa ankomst
  const d1 = new Date(currentDeparture);
  const d2 = new Date(nextArrival);
  const diffTime = d2.getTime() - d1.getTime();
  const daysGap = Math.round(diffTime / (1000 * 3600 * 24));

  if (daysGap <= 0) {
    return {
      deadlineStr: formattedDeadline,
      urgencyTitle: '⚡ URGENTE: MISMO DÍA',
      urgencyColor: 'bg-rose-500 text-white font-black animate-pulse',
      topBannerColor: 'bg-rose-500',
      urgencyType: 'same_day',
      daysGap: 0,
      sortDate: nextArrival,
    };
  } else if (daysGap === 1) {
    return {
      deadlineStr: formattedDeadline,
      urgencyTitle: '⏳ CAMBIO RÁPIDO (1 DÍA)',
      urgencyColor: 'bg-amber-500 text-slate-950 font-black',
      topBannerColor: 'bg-amber-500',
      urgencyType: 'tight',
      daysGap: 1,
      sortDate: nextArrival,
    };
  } else {
    return {
      deadlineStr: formattedDeadline,
      urgencyTitle: `📅 PLAZO: ${formatDate(nextArrival, 'es').toUpperCase()}`,
      urgencyColor: 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
      topBannerColor: 'bg-sky-500',
      urgencyType: 'standard',
      daysGap: daysGap,
      sortDate: nextArrival,
    };
  }
}

export default function CleanerView({ bookings, incidents, loading, onRefresh }: CleanerViewProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'properties'>('jobs');
  const [jobFilter, setJobFilter] = useState<'pending' | 'finished' | 'all'>('pending');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openIncidentFor, setOpenIncidentFor] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  const [revealedPropIds, setRevealedPropIds] = useState<string[]>([]);

  const [properties, setProperties] = useState<ExtendedProperty[]>([]);
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropHost, setNewPropHost] = useState('');
  const [newPropPasscode, setNewPropPasscode] = useState('');
  const [newPropKvm, setNewPropKvm] = useState('');
  const [newPropRooms, setNewPropRooms] = useState('');
  const [newPropBathrooms, setNewPropBathrooms] = useState('');
  const [newPropTime, setNewPropTime] = useState('');
  const [newPropNotes, setNewPropNotes] = useState('');
  const [savingProp, setSavingProp] = useState(false);
  const [propError, setPropError] = useState<string | null>(null);

  // REDIGERINGS-MODAL FÖR FASTIGHETER
  const [editingProperty, setEditingProperty] = useState<ExtendedProperty | null>(null);

  const fetchProperties = useCallback(async () => {
    const { data } = await supabase.from('properties').select('*').order('name');
    if (data) setProperties(data as ExtendedProperty[]);
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const toggleRevealPasscode = (id: string) => {
    setRevealedPropIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

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
      kvm: newPropKvm.trim() || null,
      rooms: newPropRooms.trim() || null,
      bathrooms: newPropBathrooms.trim() || null,
      cleaning_time: newPropTime.trim() || null,
      property_notes: newPropNotes.trim() || null,
    });

    setNewPropName('');
    setNewPropAddress('');
    setNewPropHost('');
    setNewPropPasscode('');
    setNewPropKvm('');
    setNewPropRooms('');
    setNewPropBathrooms('');
    setNewPropTime('');
    setNewPropNotes('');
    setSavingProp(false);
    fetchProperties();
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    setSavingProp(true);
    await supabase
      .from('properties')
      .update({
        name: editingProperty.name,
        address: editingProperty.address,
        host_name: editingProperty.host_name,
        passcode: editingProperty.passcode.toUpperCase(),
        kvm: editingProperty.kvm || null,
        rooms: editingProperty.rooms || null,
        bathrooms: editingProperty.bathrooms || null,
        cleaning_time: editingProperty.cleaning_time || null,
        property_notes: editingProperty.property_notes || null,
      })
      .eq('id', editingProperty.id);

    setSavingProp(false);
    setEditingProperty(null);
    fetchProperties();
  };

  const pendingJobs = bookings.filter((b) => b.status === 'pending');
  const finishedJobs = bookings.filter((b) => b.status === 'finished');

  // SORTERA STIGANDE UTIFRÅN STÄDFÖNSTRETS DEADLINE
  const filteredJobs = bookings
    .filter((b) => {
      if (jobFilter === 'pending') return b.status === 'pending';
      if (jobFilter === 'finished') return b.status === 'finished';
      return true;
    })
    .sort((a, b) => {
      const deadlineA = getTaskDeadlineAndUrgency(a, bookings).sortDate;
      const deadlineB = getTaskDeadlineAndUrgency(b, bookings).sortDate;
      if (deadlineA !== deadlineB) {
        return deadlineA.localeCompare(deadlineB);
      }
      return (a.departure_date || '').localeCompare(b.departure_date || '');
    });

  const handleToggleStatus = async (b: Booking) => {
    setActionError(null);

    if (b.status === 'pending') {
      const todayYMD = new Date().toISOString().split('T')[0];

      if (!b.vacant_now && b.departure_date && todayYMD < b.departure_date) {
        setActionError({
          id: b.id,
          msg: `No puedes completar esta tarea antes de la salida del huésped (${formatDate(b.departure_date, 'es')}).`,
        });
        setTimeout(() => setActionError(null), 5000);
        return;
      }
    }

    setCompletingId(b.id);
    const newStatus = b.status === 'finished' ? 'pending' : 'finished';
    await supabase.from('bookings').update({ status: newStatus }).eq('id', b.id);
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
          <Clock className="w-4 h-4" /> Tareas ({bookings.length})
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
        <div className="space-y-4">
          {/* UNDERFILTER */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl text-xs font-bold gap-1 border border-slate-700/60 shadow-md">
            <button
              type="button"
              onClick={() => setJobFilter('pending')}
              className={`flex-1 py-2 rounded-lg transition text-center ${
                jobFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⏳ Pendientes ({pendingJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setJobFilter('finished')}
              className={`flex-1 py-2 rounded-lg transition text-center ${
                jobFilter === 'finished'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💚 Completadas ({finishedJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setJobFilter('all')}
              className={`flex-1 py-2 rounded-lg transition text-center ${
                jobFilter === 'all'
                  ? 'bg-slate-700 text-white font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 Todas ({bookings.length})
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 space-y-2">
              <p className="text-white font-black text-lg">Sin tareas aquí</p>
              <p className="text-slate-400 text-xs">No hay tareas encontradas en este filtro.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((b) => {
                const isFinished = b.status === 'finished';
                const isExpanded = expandedId === b.id;
                const displayNote = b.notes_es || b.notes;

                const displayAddress = b.property_address || b.property_name;
                const displayHost =
                  b.host_name && b.host_name !== 'Värd'
                    ? b.host_name
                    : b.property_name !== displayAddress
                    ? b.property_name
                    : null;

                // MATCHA MED FASTIGHET FÖR SPECIFIKATIONER OCH SPECIELLA ANTECKNINGAR
                const matchedProp = properties.find(
                  (p) =>
                    p.name.toLowerCase() === b.property_name.toLowerCase() ||
                    p.address.toLowerCase() === displayAddress.toLowerCase() ||
                    (p.name && b.property_name && b.property_name.toLowerCase().includes(p.name.toLowerCase()))
                );

                const bookingIncidents = incidents.filter((i) => i.booking_id === b.id);
                const isEarlyError = actionError?.id === b.id;

                // BERÄKNA DYNAMISK STÄDFÖNSTER
                const taskUrgency = getTaskDeadlineAndUrgency(b, bookings);

                const hasSpecs =
                  matchedProp &&
                  (matchedProp.kvm || matchedProp.rooms || matchedProp.bathrooms || matchedProp.cleaning_time);

                return (
                  <div
                    key={b.id}
                    className={`bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl transition-all border ${
                      isFinished ? 'opacity-90 border-emerald-300' : 'border-slate-200'
                    }`}
                  >
                    <div
                      className={`h-2.5 w-full ${
                        isFinished ? 'bg-emerald-500' : taskUrgency.topBannerColor
                      }`}
                    />

                    <div className="p-5 space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 min-w-0">
                          {/* BADGES */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isFinished ? (
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-600 text-white">
                                ✓ COMPLETADA
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${taskUrgency.urgencyColor}`}
                              >
                                {taskUrgency.urgencyTitle}
                              </span>
                            )}

                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                b.laundry
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {b.laundry ? '🧺 Lavar: SÍ' : '🚫 No lavar'}
                            </span>
                          </div>

                          {/* ADRESS */}
                          <h3 className="font-black text-slate-900 text-lg leading-snug flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate">{displayAddress}</span>
                          </h3>

                          {/* DEDIKERADE BADGES FÖR KVM, RUM, BADRUM & TIDSÅTGÅNG */}
                          {hasSpecs && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {matchedProp.kvm && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                                  <Ruler className="w-3 h-3 text-slate-500" />
                                  {matchedProp.kvm} m²
                                </span>
                              )}
                              {matchedProp.rooms && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                                  <Bed className="w-3 h-3 text-slate-500" />
                                  {matchedProp.rooms} hab
                                </span>
                              )}
                              {matchedProp.bathrooms && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                                  <Bath className="w-3 h-3 text-slate-500" />
                                  {matchedProp.bathrooms} baños
                                </span>
                              )}
                              {matchedProp.cleaning_time && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black bg-sky-50 text-sky-900 px-2 py-0.5 rounded-lg border border-sky-200">
                                  <Timer className="w-3 h-3 text-sky-600" />
                                  Est: {matchedProp.cleaning_time}
                                </span>
                              )}
                            </div>
                          )}

                          {/* TYDLIGT STÄDFÖNSTER (VENTANA DE LIMPIEZA) */}
                          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 space-y-2">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                              <span className="flex items-center gap-1 text-slate-700">
                                <Clock className="w-3.5 h-3.5 text-emerald-600" /> VENTANA DE LIMPIEZA
                              </span>
                              {taskUrgency.daysGap !== null && (
                                <span className="text-slate-500 font-extrabold">
                                  {taskUrgency.daysGap === 0 ? 'Mismo día' : `${taskUrgency.daysGap} ${taskUrgency.daysGap === 1 ? 'día' : 'días'}`}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {/* BOX 1: START / SALIDA */}
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-0.5">
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 block flex items-center gap-1">
                                  <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" /> Puede empezar (Salida)
                                </span>
                                <span className="font-black text-slate-900 block">
                                  {formatDate(b.departure_date, 'es')}
                                </span>
                                {b.departure_exact_time && (
                                  <span className="text-[11px] font-bold text-slate-500 block">
                                    kl {b.departure_exact_time}
                                  </span>
                                )}
                              </div>

                              {/* BOX 2: DEADLINE / LLEGADA */}
                              <div
                                className={`p-2.5 rounded-xl border space-y-0.5 ${
                                  taskUrgency.urgencyType === 'same_day'
                                    ? 'bg-rose-50 border-rose-200'
                                    : taskUrgency.urgencyType === 'tight'
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-emerald-50/60 border-emerald-200'
                                }`}
                              >
                                <span className="text-[10px] font-extrabold uppercase text-slate-500 block flex items-center gap-1">
                                  <Flag className="w-3 h-3 text-slate-700 fill-slate-700" /> Plazo límite (Llegada)
                                </span>
                                <span className="font-black text-slate-900 block">
                                  {taskUrgency.deadlineStr}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExpand(b.id)}
                          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition shrink-0 mt-1"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* FELMEDDELANDE OM FÖR TIDIG SLUTFÖRNING */}
                      {isEarlyError && (
                        <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{actionError.msg}</span>
                        </div>
                      )}

                      {/* DETALJER NÄR EXPANDERAD */}
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
                              <span className="text-slate-500 font-bold">Huéspedes salientes:</span>
                              <span className="font-black text-slate-900">{b.guests} personas</span>
                            </div>
                          </div>

                          {/* FASTIGHETENS SPECIELLA FASTA ANTECKNINGAR */}
                          {matchedProp?.property_notes && (
                            <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-2xl space-y-1">
                              <span className="font-black text-sky-900 block uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                <StickyNote className="w-3.5 h-3.5 text-sky-600" /> Notas fijas de la propiedad (Fasta instruktioner):
                              </span>
                              <p className="font-bold text-sky-950 leading-relaxed whitespace-pre-line">
                                {matchedProp.property_notes}
                              </p>
                            </div>
                          )}

                          {/* BOKNINGSSPECIFIKA INSTRUKTIONER */}
                          {displayNote && (
                            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1">
                              <span className="font-black text-amber-900 block uppercase text-[10px] tracking-wider">
                                Instrucciones del anfitrión (Esta estancia):
                              </span>
                              <p className="font-bold text-amber-950 leading-relaxed whitespace-pre-line">{displayNote}</p>
                            </div>
                          )}

                          {/* FOTON */}
                          {bookingIncidents.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
                              <span className="font-black text-slate-900 block uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                <Camera className="w-3.5 h-3.5 text-slate-600" /> Fotos e incidencias enviadas ({bookingIncidents.length}):
                              </span>
                              <div className="space-y-2">
                                {bookingIncidents.map((inc) => {
                                  const photoList = parsePhotos(inc.photo_url);
                                  return (
                                    <div key={inc.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                                      {photoList.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2">
                                          {photoList.map((url, idx) => (
                                            <img
                                              key={idx}
                                              src={url}
                                              alt={`Foto ${idx + 1}`}
                                              className="w-full h-28 object-cover rounded-lg border border-slate-200"
                                            />
                                          ))}
                                        </div>
                                      )}
                                      <p className="font-bold text-slate-800 text-xs leading-relaxed">{inc.note}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* KNAPPAR */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setOpenIncidentFor(b.id)}
                              className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                            >
                              <Camera className="w-4 h-4 text-slate-600" /> Reportar foto
                            </button>

                            {isFinished ? (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(b)}
                                disabled={completingId === b.id}
                                className="py-3 px-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                                title="Deshacer / Marcar como pendiente"
                              >
                                {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 text-amber-400" />}
                                Reabrir
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(b)}
                                disabled={completingId === b.id}
                                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                              >
                                {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Completado
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* FASTIGHETSFLIKEN (MIS PROPIEDADES) */
        <div className="space-y-6">
          {/* NY FASTIGHET FORMULÄR */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {/* SPECIFIKATIONER GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5 text-slate-500" /> Kvm (m²)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 85"
                    value={newPropKvm}
                    onChange={(e) => setNewPropKvm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-slate-500" /> Rum
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 3"
                    value={newPropRooms}
                    onChange={(e) => setNewPropRooms(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Bath className="w-3.5 h-3.5 text-slate-500" /> Badrum
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 2"
                    value={newPropBathrooms}
                    onChange={(e) => setNewPropBathrooms(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-sky-600" /> Tidsåtgång
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 2.5 h"
                    value={newPropTime}
                    onChange={(e) => setNewPropTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* SPECIELLA ANTECKNINGAR */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <StickyNote className="w-3.5 h-3.5 text-amber-600" /> Speciella anteckningar / Notas especiales
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Reservnyckel under stenen. Låset krånglar, vrid två varv åt vänster..."
                  value={newPropNotes}
                  onChange={(e) => setNewPropNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
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

          {/* LISTA ÖVER FASTIGHETER */}
          <div className="space-y-3">
            <h4 className="font-black text-white text-xs uppercase tracking-wider px-1">
              Tus Propiedades ({properties.length})
            </h4>

            {properties.map((p) => {
              const isRevealed = revealedPropIds.includes(p.id);

              return (
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

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingProperty(p)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                        title="Editar propiedad / Redigera"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <div className="text-right shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleRevealPasscode(p.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-mono font-black text-xs rounded-xl border border-slate-700 shadow-sm transition active:scale-95"
                          title={isRevealed ? 'Ocultar código' : 'Mostrar código'}
                        >
                          {isRevealed ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                              <span>{p.passcode}</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              <span>••••</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RUTNÄT MED SPECIFIKATIONER */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Ruler className="w-3 h-3 text-slate-500" /> Kvm
                      </span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        {p.kvm ? `${p.kvm} m²` : '-'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Bed className="w-3 h-3 text-slate-500" /> Rum
                      </span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        {p.rooms ? `${p.rooms} hab` : '-'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Bath className="w-3 h-3 text-slate-500" /> Badrum
                      </span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        {p.bathrooms ? `${p.bathrooms} baños` : '-'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Timer className="w-3 h-3 text-sky-600" /> Tiempo
                      </span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        {p.cleaning_time || '-'}
                      </span>
                    </div>
                  </div>

                  {/* SPECIELLA FASTA ANTECKNINGAR */}
                  {p.property_notes && (
                    <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl space-y-1 text-xs">
                      <span className="font-black text-sky-900 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                        <StickyNote className="w-3.5 h-3.5 text-sky-600" /> Notas fijas / Anteckningar:
                      </span>
                      <p className="font-bold text-sky-950 leading-relaxed whitespace-pre-line">
                        {p.property_notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL FÖR ATT REDIGERA FASTIGHET */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-emerald-600" /> Editar Propiedad
              </h3>
              <button onClick={() => setEditingProperty(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProperty} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingProperty.name}
                  onChange={(e) => setEditingProperty({ ...editingProperty, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={editingProperty.address}
                  onChange={(e) => setEditingProperty({ ...editingProperty, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Anfitriona (Värd)</label>
                  <input
                    type="text"
                    value={editingProperty.host_name || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, host_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código / Lösenord</label>
                  <input
                    type="text"
                    value={editingProperty.passcode}
                    onChange={(e) => setEditingProperty({ ...editingProperty, passcode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold uppercase outline-none focus:bg-white focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* SPECIFIKATIONER GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kvm (m²)</label>
                  <input
                    type="text"
                    placeholder="85"
                    value={editingProperty.kvm || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, kvm: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rum</label>
                  <input
                    type="text"
                    placeholder="3"
                    value={editingProperty.rooms || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, rooms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Badrum</label>
                  <input
                    type="text"
                    placeholder="2"
                    value={editingProperty.bathrooms || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, bathrooms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiempo</label>
                  <input
                    type="text"
                    placeholder="2.5 h"
                    value={editingProperty.cleaning_time || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, cleaning_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas especiales (Speciella anteckningar)</label>
                <textarea
                  rows={2}
                  value={editingProperty.property_notes || ''}
                  onChange={(e) => setEditingProperty({ ...editingProperty, property_notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingProp}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-1.5 mt-2"
              >
                {savingProp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar Cambios
              </button>
            </form>
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const readers = files.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((base64List) => {
      setPhotos((prev) => [...prev, ...base64List]);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);

    const payload: NewIncident = {
      booking_id: bookingId,
      note: note.trim(),
      photo_url: photos.length > 0 ? JSON.stringify(photos) : null,
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Fotos (Selecciona una o varias)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              className="block w-full text-xs text-slate-600"
            />
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {photos.map((url, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${idx}`}
                    className="w-full h-20 object-cover rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
            Guardar reporte ({photos.length} {photos.length === 1 ? 'foto' : 'fotos'})
          </button>
        </form>
      </div>
    </div>
  );
}