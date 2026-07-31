import { useState } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../../lib/supabase';
import { formatDate } from '../../lib/constants';
import IncidentModal from './IncidentModal';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
  MapPin,
  Check,
  Camera,
  RotateCcw,
  AlertCircle,
  Play,
  Flag,
  Ruler,
  Timer,
  Bed,
  Bath,
  StickyNote,
  Users,
  Info,
  Building,
  User,
  ThumbsUp,
} from 'lucide-react';

interface TaskListProps {
  bookings: Booking[];
  incidents: Incident[];
  properties: Property[];
  loading: boolean;
  onRefresh: () => void;
}

function parsePhotos(photoUrl: string | null): string[] {
  if (!photoUrl) return [];
  try {
    if (photoUrl.startsWith('[')) return JSON.parse(photoUrl) as string[];
  } catch (e) {}
  return [photoUrl];
}

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

export default function TaskList({ bookings, incidents, properties, loading, onRefresh }: TaskListProps) {
  const [jobFilter, setJobFilter] = useState<'pending' | 'accepted' | 'finished' | 'all'>('pending');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openIncidentFor, setOpenIncidentFor] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  const pendingJobs = bookings.filter((b) => b.status === 'pending');
  const acceptedJobs = bookings.filter((b) => b.status === 'accepted');
  const finishedJobs = bookings.filter((b) => b.status === 'finished');

  const filteredJobs = bookings
    .filter((b) => {
      if (jobFilter === 'pending') return b.status === 'pending';
      if (jobFilter === 'accepted') return b.status === 'accepted';
      if (jobFilter === 'finished') return b.status === 'finished';
      return true;
    })
    .sort((a, b) => {
      const deadlineA = getTaskDeadlineAndUrgency(a, bookings).sortDate;
      const deadlineB = getTaskDeadlineAndUrgency(b, bookings).sortDate;
      if (deadlineA !== deadlineB) return deadlineA.localeCompare(deadlineB);
      return (a.departure_date || '').localeCompare(b.departure_date || '');
    });

  const handleAcceptTask = async (b: Booking) => {
    setCompletingId(b.id);
    await supabase.from('bookings').update({ status: 'accepted' }).eq('id', b.id);
    setCompletingId(null);
    onRefresh();
  };

  const handleCompleteTask = async (b: Booking) => {
    setActionError(null);

    const todayYMD = new Date().toISOString().split('T')[0];
    if (!b.vacant_now && b.departure_date && todayYMD < b.departure_date) {
      setActionError({
        id: b.id,
        msg: `No puedes completar esta tarea antes de la salida del huésped (${formatDate(b.departure_date, 'es')}).`,
      });
      setTimeout(() => setActionError(null), 5000);
      return;
    }

    setCompletingId(b.id);
    await supabase.from('bookings').update({ status: 'finished' }).eq('id', b.id);
    setCompletingId(null);
    onRefresh();
  };

  const handleReopenTask = async (b: Booking) => {
    setCompletingId(b.id);
    await supabase.from('bookings').update({ status: 'accepted' }).eq('id', b.id);
    setCompletingId(null);
    onRefresh();
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* UNDERFILTER */}
      <div className="flex bg-slate-800/80 p-1 rounded-xl text-[11px] font-bold gap-1 border border-slate-700/60 shadow-md flex-wrap">
        <button
          type="button"
          onClick={() => setJobFilter('pending')}
          className={`flex-1 py-2 px-1 rounded-lg transition text-center whitespace-nowrap ${
            jobFilter === 'pending' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          ⏳ Por Aceptar ({pendingJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setJobFilter('accepted')}
          className={`flex-1 py-2 px-1 rounded-lg transition text-center whitespace-nowrap ${
            jobFilter === 'accepted' ? 'bg-sky-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🔵 Aceptadas ({acceptedJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setJobFilter('finished')}
          className={`flex-1 py-2 px-1 rounded-lg transition text-center whitespace-nowrap ${
            jobFilter === 'finished' ? 'bg-emerald-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          💚 Completadas ({finishedJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setJobFilter('all')}
          className={`flex-1 py-2 px-1 rounded-lg transition text-center whitespace-nowrap ${
            jobFilter === 'all' ? 'bg-slate-700 text-white font-black shadow' : 'text-slate-400 hover:text-white'
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
            const isPending = b.status === 'pending';
            const isAccepted = b.status === 'accepted';
            const isFinished = b.status === 'finished';
            const isExpanded = expandedId === b.id;
            const displayNote = b.notes_es || b.notes;

            const matchedProp = properties.find(
              (p) =>
                p.name.toLowerCase() === b.property_name.toLowerCase() ||
                p.address.toLowerCase() === (b.property_address || '').toLowerCase() ||
                (p.name && b.property_name && b.property_name.toLowerCase().includes(p.name.toLowerCase())) ||
                (p.address && b.property_address && b.property_address.toLowerCase().includes(p.address.toLowerCase()))
            );

            const displayPropertyName = matchedProp?.name || b.property_name;
            const displayAddress = matchedProp?.address || b.property_address || b.property_name;
            const displayHost =
              matchedProp?.host_name && matchedProp.host_name !== 'Värd'
                ? matchedProp.host_name
                : b.host_name && b.host_name !== 'Värd'
                ? b.host_name
                : null;

            const bookingIncidents = incidents.filter((i) => i.booking_id === b.id);
            const isEarlyError = actionError?.id === b.id;

            const hasBookingNotes = Boolean(displayNote);
            const hasPropertyNotes = Boolean(matchedProp?.property_notes);
            const taskUrgency = getTaskDeadlineAndUrgency(b, bookings);

            return (
              <div
                key={b.id}
                className={`bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl transition-all border ${
                  isFinished
                    ? 'opacity-90 border-emerald-300'
                    : isAccepted
                    ? 'border-sky-300 shadow-sky-500/10'
                    : 'border-amber-300'
                }`}
              >
                <div
                  className={`h-2.5 w-full ${
                    isFinished ? 'bg-emerald-500' : isAccepted ? 'bg-sky-500' : taskUrgency.topBannerColor
                  }`}
                />

                <div className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* BADGES */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isPending && (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            🟡 POR ACEPTAR
                          </span>
                        )}
                        {isAccepted && (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-sky-600 text-white">
                            🔵 TAREA ACEPTADA
                          </span>
                        )}
                        {isFinished && (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-600 text-white">
                            ✓ COMPLETADA
                          </span>
                        )}

                        {!isFinished && (
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${taskUrgency.urgencyColor}`}>
                            {taskUrgency.urgencyTitle}
                          </span>
                        )}

                        {hasBookingNotes && (
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0"
                            title="Nota específica para esta estancia"
                          >
                            <Info className="w-3 h-3 text-amber-700" />
                          </span>
                        )}

                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          {b.guests} {b.guests === 1 ? 'huésped' : 'huéspedes'}
                        </span>

                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${b.laundry ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                          {b.laundry ? '🧺 Lavar: SÍ' : '🚫 No lavar'}
                        </span>

                        {matchedProp?.cleaning_time && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-sky-50 text-sky-900 px-2 py-0.5 rounded-full border border-sky-200">
                            <Timer className="w-3 h-3 text-sky-600" />
                            Est: {matchedProp.cleaning_time}
                          </span>
                        )}
                      </div>

                      {/* ADRESS + VÄRD */}
                      <div className="space-y-0.5">
                        <h3 className="font-black text-slate-900 text-lg leading-snug flex items-center gap-1.5 flex-wrap">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{displayAddress}</span>
                          {displayHost && <span className="text-sm font-bold text-slate-400">· {displayHost}</span>}
                        </h3>
                      </div>

                      {/* STÄDFÖNSTER */}
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
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-0.5">
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 block flex items-center gap-1">
                              <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" /> Puede empezar (Salida)
                            </span>
                            <span className="font-black text-slate-900 block">{formatDate(b.departure_date, 'es')}</span>
                            {b.departure_exact_time && <span className="text-[11px] font-bold text-slate-500 block">kl {b.departure_exact_time}</span>}
                          </div>

                          <div className={`p-2.5 rounded-xl border space-y-0.5 ${taskUrgency.urgencyType === 'same_day' ? 'bg-rose-50 border-rose-200' : taskUrgency.urgencyType === 'tight' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
                            <span className="text-[10px] font-extrabold uppercase text-slate-500 block flex items-center gap-1">
                              <Flag className="w-3 h-3 text-slate-700 fill-slate-700" /> Plazo límite (Llegada)
                            </span>
                            <span className="font-black text-slate-900 block">{taskUrgency.deadlineStr}</span>
                          </div>
                        </div>
                      </div>

                      {/* SNABBKNAPP FÖR ATT ACCEPTERA RAKT PÅ KORTET OM PENDING */}
                      {isPending && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleAcceptTask(b)}
                            disabled={completingId === b.id}
                            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                          >
                            {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                            Aceptar tarea de limpieza
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(b.id)}
                      className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition shrink-0 mt-1"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {isEarlyError && (
                    <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{actionError.msg}</span>
                    </div>
                  )}

                  {/* EXPANDERAT LÄGE */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                        {displayPropertyName && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-emerald-600" /> Propiedad (Fastighet):
                            </span>
                            <span className="font-black text-slate-900">{displayPropertyName}</span>
                          </div>
                        )}

                        {displayHost && (
                          <div className="flex justify-between items-center border-t border-slate-200/50 pt-1.5">
                            <span className="text-slate-500 font-bold flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" /> Anfitriona (Värd):
                            </span>
                            <span className="font-black text-slate-900">{displayHost}</span>
                          </div>
                        )}

                        {(matchedProp?.kvm || matchedProp?.rooms || matchedProp?.bathrooms || matchedProp?.cleaning_time) && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/50 text-[11px]">
                            {matchedProp.kvm && (
                              <div className="bg-white p-2 rounded-xl border border-slate-200">
                                <span className="text-slate-400 font-bold block flex items-center gap-1">
                                  <Ruler className="w-3 h-3 text-slate-500" /> Tamaño
                                </span>
                                <span className="font-extrabold text-slate-900">{matchedProp.kvm} m²</span>
                              </div>
                            )}

                            {matchedProp.rooms && (
                              <div className="bg-white p-2 rounded-xl border border-slate-200">
                                <span className="text-slate-400 font-bold block flex items-center gap-1">
                                  <Bed className="w-3 h-3 text-slate-500" /> Rum
                                </span>
                                <span className="font-extrabold text-slate-900">{matchedProp.rooms} hab</span>
                              </div>
                            )}

                            {matchedProp.bathrooms && (
                              <div className="bg-white p-2 rounded-xl border border-slate-200">
                                <span className="text-slate-400 font-bold block flex items-center gap-1">
                                  <Bath className="w-3 h-3 text-slate-500" /> Badrum
                                </span>
                                <span className="font-extrabold text-slate-900">{matchedProp.bathrooms} baños</span>
                              </div>
                            )}

                            {matchedProp.cleaning_time && (
                              <div className="bg-white p-2 rounded-xl border border-slate-200">
                                <span className="text-slate-400 font-bold block flex items-center gap-1">
                                  <Timer className="w-3 h-3 text-sky-600" /> Tiempo
                                </span>
                                <span className="font-extrabold text-slate-900">{matchedProp.cleaning_time}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {displayNote && (
                        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1">
                          <span className="font-black text-amber-900 block uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                            <StickyNote className="w-3.5 h-3.5 text-amber-600" /> Instrucción del anfitrión:
                          </span>
                          <p className="font-bold text-amber-950 leading-relaxed whitespace-pre-line">{displayNote}</p>
                        </div>
                      )}

                      {hasPropertyNotes && (
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                          <span className="font-black text-slate-800 block uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                            <StickyNote className="w-3.5 h-3.5 text-slate-500" /> Notas fijas de la vivienda:
                          </span>
                          <p className="font-bold text-slate-900 leading-relaxed whitespace-pre-line">{matchedProp.property_notes}</p>
                        </div>
                      )}

                      {bookingIncidents.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
                          <span className="font-black text-slate-900 block uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-slate-600" /> Fotos enviadas ({bookingIncidents.length}):
                          </span>
                          <div className="space-y-2">
                            {bookingIncidents.map((inc) => {
                              const photoList = parsePhotos(inc.photo_url);
                              return (
                                <div key={inc.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                                  {photoList.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                      {photoList.map((url, idx) => (
                                        <img key={idx} src={url} alt={`Foto ${idx + 1}`} className="w-full h-28 object-cover rounded-lg border border-slate-200" />
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
                            onClick={() => handleReopenTask(b)}
                            disabled={completingId === b.id}
                            className="py-3 px-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 text-amber-400" />} Reabrir
                          </button>
                        ) : isPending ? (
                          <button
                            type="button"
                            onClick={() => handleAcceptTask(b)}
                            disabled={completingId === b.id}
                            className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                          >
                            {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />} Aceptar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCompleteTask(b)}
                            disabled={completingId === b.id}
                            className="py-3 px-3 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                          >
                            {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Completado
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