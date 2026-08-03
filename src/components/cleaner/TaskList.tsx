import { useState } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../../lib/supabase';
import { formatDate } from '../../lib/constants';
import IncidentModal from './IncidentModal';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Check,
  Camera,
  RotateCcw,
  AlertCircle,
  ThumbsUp,
  Bell,
  AlertTriangle,
  User,
  Flame,
  Hourglass,
  CalendarCheck,
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

function getValidNote(notesEs: string | null | undefined, notesSv: string | null | undefined): string | null {
  if (notesEs && !notesEs.toUpperCase().includes('QUERY LENGTH LIMIT') && !notesEs.toUpperCase().includes('MYMEMORY')) {
    return notesEs;
  }
  return notesSv || null;
}

function formatTimeOrWindowEs(exactTime: string | null | undefined, timeWindow: string | null | undefined): string | null {
  if (exactTime) {
    return `a las ${exactTime}`;
  }
  if (timeWindow === 'morning') return '🌅 Mañana';
  if (timeWindow === 'afternoon') return '☀️ Tarde';
  if (timeWindow === 'evening') return '🌙 Noche';
  return null;
}

export default function TaskList({ bookings, incidents, properties, loading, onRefresh }: TaskListProps) {
  const [jobFilter, setJobFilter] = useState<'active' | 'pending_only' | 'finished'>('active');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openIncidentFor, setOpenIncidentFor] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  const todayYMD = new Date().toISOString().split('T')[0];

  // Sortera alla bokningar kronologiskt efter utcheckning
  const sortedByDeparture = [...bookings].sort((a, b) => {
    const depA = a.check_out_date || '9999-99-99';
    const depB = b.check_out_date || '9999-99-99';
    return depA.localeCompare(depB);
  });

  const activeJobs = sortedByDeparture.filter((b) => b.status === 'pending' || b.status === 'accepted');
  const pendingJobs = sortedByDeparture.filter((b) => b.status === 'pending');
  const finishedJobs = sortedByDeparture.filter((b) => b.status === 'finished');

  const displayedJobs =
    jobFilter === 'pending_only'
      ? pendingJobs
      : jobFilter === 'finished'
      ? finishedJobs
      : activeJobs;

  const handleAcceptTask = async (b: Booking) => {
    setCompletingId(b.id);
    await supabase.from('bookings').update({ status: 'accepted' }).eq('id', b.id);
    setCompletingId(null);
    onRefresh();
  };

  const handleCompleteTask = async (b: Booking) => {
    setActionError(null);
    if (!b.vacant_now && b.check_out_date && todayYMD < b.check_out_date) {
      setActionError({
        id: b.id,
        msg: `No puedes completar esta tarea antes de la salida del huésped (${formatDate(b.check_out_date, 'es')}).`,
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

  const renderCard = (b: Booking) => {
    const isPending = b.status === 'pending';
    const isAccepted = b.status === 'accepted';
    const isFinished = b.status === 'finished';
    const isExpanded = expandedId === b.id;
    
    const displayNote = getValidNote(b.notes_es, b.notes);

    const matchedProp = properties.find(
      (p) =>
        p.name.toLowerCase() === b.property_name.toLowerCase() ||
        p.address.toLowerCase() === (b.property_address || '').toLowerCase()
    );

    const displayAddress = matchedProp?.address || b.property_address || b.property_name;
    const displayHost = matchedProp?.host_name || b.host_name;
    const bookingIncidents = incidents.filter((i) => i.booking_id === b.id);

    // FINN NÄSTA BOKNING I SAMMA FASTIGHET OCH BERÄKNA MARGINALEN I DAGAR
    const nextBooking = bookings.find((other) => {
      if (other.id === b.id) return false;
      if (other.property_name.toLowerCase() !== b.property_name.toLowerCase()) return false;
      if (!other.check_in_date || !b.check_out_date) return false;
      return other.check_in_date >= b.check_out_date;
    });

    let daysGap: number | null = null;
    if (nextBooking && nextBooking.check_in_date && b.check_out_date) {
      const dOut = new Date(b.check_out_date);
      const dIn = new Date(nextBooking.check_in_date);
      const diffMs = dIn.getTime() - dOut.getTime();
      daysGap = Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    const isCriticalSameDay = daysGap === 0;
    const isUrgentNextDay = daysGap === 1;

    const departureTimeFormatted = formatTimeOrWindowEs(b.check_out_exact_time, b.check_out_time_window);
    const nextArrivalTimeFormatted = nextBooking
      ? formatTimeOrWindowEs(nextBooking.check_in_exact_time, nextBooking.check_in_time_window)
      : null;

    const cardStyle = isPending
      ? 'bg-amber-50 text-slate-900 border-2 border-amber-400 shadow-amber-500/10'
      : isFinished
      ? 'bg-white text-slate-900 border border-slate-200 opacity-80 shadow-md'
      : 'bg-white text-slate-900 border border-slate-200 shadow-md';

    return (
      <div key={b.id} className={`rounded-3xl p-4 sm:p-5 transition-all space-y-3 ${cardStyle}`}>
        {/* 1. TOPP-INFO: ADRESS, VÄRD OCH BADGES */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isPending && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Bell className="w-3 h-3 text-slate-950" /> Por aceptar
                </span>
              )}

              {isAccepted && (
                <span className="bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Aceptada
                </span>
              )}

              {isFinished && (
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Completada
                </span>
              )}

              {isCriticalSameDay && (
                <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Flame className="w-3 h-3 text-white fill-white" />
                  🔴 Cambio hoy mismo
                </span>
              )}

              {isUrgentNextDay && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Hourglass className="w-3 h-3 text-slate-950" />
                  🟠 Entrada mañana
                </span>
              )}

              {bookingIncidents.length > 0 && (
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Camera className="w-3 h-3 text-slate-500" />
                  {bookingIncidents.length}
                </span>
              )}
            </div>

            {/* ADRESS SOM HUVUDRUBRIK */}
            <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight flex items-center gap-1.5 pt-0.5 truncate">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{displayAddress}</span>
            </h3>
            
            {/* VÄRD + FASTIGHETSNAMN */}
            {displayHost && displayHost !== 'Värd' && (
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1 pl-5">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Anfitriona: {displayHost}
                  {b.property_name && displayAddress.toLowerCase() !== b.property_name.toLowerCase() && (
                    <span className="text-slate-400 font-medium"> ({b.property_name})</span>
                  )}
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => toggleExpand(b.id)}
            className="p-1.5 bg-white/80 hover:bg-slate-100 rounded-xl text-slate-600 transition border border-slate-200 shrink-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. INSTRUKTIONSBOX */}
        {displayNote && (
          <div
            onClick={() => toggleExpand(b.id)}
            className="bg-amber-100/90 border-l-4 border-amber-500 p-3 rounded-r-xl text-xs font-bold text-amber-950 cursor-pointer hover:bg-amber-200/80 transition shadow-sm space-y-1"
          >
            <div className="flex items-center gap-1 font-black text-amber-900 text-[10px] uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Instrucción del anfitrión:</span>
            </div>

            <p className="font-medium text-amber-950 leading-relaxed">
              {isExpanded ? (
                <span className="whitespace-pre-line">{displayNote}</span>
              ) : (
                <span>
                  {displayNote.length > 75 ? `${displayNote.slice(0, 75)}...` : displayNote}
                </span>
              )}
            </p>
          </div>
        )}

        {/* 3. STÄDFÖNSTER (VENTANA DE LIMPIEZA) */}
        <div className="bg-white/90 rounded-2xl p-3 border border-slate-200/80 space-y-2.5 text-xs shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
            <span className="font-black text-[10px] uppercase tracking-wider text-slate-500">
              Ventana de Limpieza
            </span>

            {isCriticalSameDay && (
              <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.2 rounded-md border border-rose-200">
                ⚡ Pocas horas
              </span>
            )}
            {isUrgentNextDay && (
              <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.2 rounded-md border border-amber-300">
                ⏳ Margen 1 día
              </span>
            )}
            {daysGap !== null && daysGap > 1 && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded-md border border-emerald-200 flex items-center gap-1">
                <CalendarCheck className="w-3 h-3 text-emerald-600" />
                {daysGap} días de margen
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* START: SALIDA DEL HUÉSPED */}
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-black text-slate-500 uppercase block">
                🚪 Salida de huésped
              </span>
              <span className="font-black text-slate-900 block text-xs">
                {formatDate(b.check_out_date, 'es')}
              </span>
              {departureTimeFormatted && (
                <span className="text-[10.5px] font-bold text-amber-800 block">
                  {departureTimeFormatted}
                </span>
              )}
            </div>

            {/* DEADLINE: PRÓXIMA ENTRADA */}
            <div className="bg-sky-50/80 p-2 rounded-xl border border-sky-200 space-y-0.5">
              <span className="text-[10px] font-black text-sky-900 uppercase block">
                🔑 Próxima entrada
              </span>
              {nextBooking ? (
                <>
                  <span className="font-black text-slate-900 block text-xs">
                    {formatDate(nextBooking.check_in_date, 'es')}
                  </span>
                  {nextArrivalTimeFormatted && (
                    <span className="text-[10.5px] font-bold text-sky-800 block">
                      {nextArrivalTimeFormatted}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[10.5px] font-extrabold text-slate-400 block pt-0.5 italic">
                  Sin próxima entrada
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-slate-600 font-bold pt-0.5">
            <span>👥 {b.guests} huéspedes</span>
            <span>{b.laundry ? '🧺 Lavar lencería' : '🚫 Sin colada'}</span>
            {matchedProp?.cleaning_time && <span>⏱️ Est: {matchedProp.cleaning_time}</span>}
          </div>
        </div>

        {/* 4. HUVUDAKTIONER */}
        <div className="flex items-center gap-2 pt-0.5">
          {isPending && (
            <button
              type="button"
              onClick={() => handleAcceptTask(b)}
              disabled={completingId === b.id}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-98"
            >
              {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
              Aceptar tarea
            </button>
          )}

          {isAccepted && (
            <button
              type="button"
              onClick={() => handleCompleteTask(b)}
              disabled={completingId === b.id}
              className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition shadow-md shadow-sky-600/20 flex items-center justify-center gap-1.5 active:scale-98"
            >
              {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Completado
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpenIncidentFor(b.id)}
            className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 border border-slate-200 shrink-0 active:scale-95"
            title="Solo si hay desperfectos o cosas rotas"
          >
            <Camera className="w-4 h-4 text-slate-500" />
            <span>Incidencia / Daño</span>
          </button>
        </div>

        {actionError?.id === b.id && (
          <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError.msg}</span>
          </div>
        )}

        {/* 5. EXPANDERAT LÄGE */}
        {isExpanded && (
          <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
            {matchedProp && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                <span className="font-black text-slate-800 block text-[10px] uppercase tracking-wider">
                  Información de la casa:
                </span>

                {(matchedProp.kvm || matchedProp.rooms || matchedProp.bathrooms || matchedProp.cleaning_time) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-xs">
                    {matchedProp.kvm && (
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                        <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Superficie</span>
                        <span className="font-extrabold text-slate-900">{matchedProp.kvm} m²</span>
                      </div>
                    )}
                    {matchedProp.rooms && (
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                        <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Habitaciones</span>
                        <span className="font-extrabold text-slate-900">{matchedProp.rooms} hab</span>
                      </div>
                    )}
                    {matchedProp.bathrooms && (
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                        <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Baños</span>
                        <span className="font-extrabold text-slate-900">{matchedProp.bathrooms} baños</span>
                      </div>
                    )}
                    {matchedProp.cleaning_time && (
                      <div className="bg-sky-50 p-1.5 rounded-lg border border-sky-200">
                        <span className="text-[9.5px] font-bold text-sky-800 block uppercase">Tiempo est.</span>
                        <span className="font-extrabold text-sky-950">{matchedProp.cleaning_time}</span>
                      </div>
                    )}
                  </div>
                )}

                {matchedProp.property_notes && (
                  <div className="pt-1 border-t border-slate-200/80 space-y-0.5">
                    <span className="text-[9.5px] font-black text-slate-500 uppercase block">
                      Notas fijas / Instrucciones permanentes:
                    </span>
                    <p className="font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                      {matchedProp.property_notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {bookingIncidents.length > 0 && (
              <div className="bg-slate-100/70 border border-slate-200 p-3 rounded-xl space-y-1.5">
                <span className="font-black text-slate-900 block text-[10px] uppercase tracking-wider">
                  Fotos enviadas ({bookingIncidents.length}):
                </span>
                <div className="space-y-1.5">
                  {bookingIncidents.map((inc) => (
                    <div key={inc.id} className="bg-white p-2 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        {parsePhotos(inc.photo_url).map((url, idx) => (
                          <img key={idx} src={url} alt={`Foto ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                        ))}
                      </div>
                      <p className="font-bold text-slate-800 text-[11px]">{inc.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isFinished && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => handleReopenTask(b)}
                  disabled={completingId === b.id}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {completingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Reabrir tarea
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* FILTERBAR KOMPAKT */}
      <div className="flex bg-slate-800 p-1 rounded-2xl text-xs font-bold gap-1 border border-slate-700 shadow-md">
        <button
          type="button"
          onClick={() => setJobFilter('active')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black ${
            jobFilter === 'active' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🧹 Activas ({activeJobs.length})
        </button>

        <button
          type="button"
          onClick={() => setJobFilter('pending_only')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black flex items-center justify-center gap-1 ${
            jobFilter === 'pending_only'
              ? 'bg-amber-400 text-slate-950 shadow'
              : pendingJobs.length > 0
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🟡 Por Aceptar</span>
          {pendingJobs.length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {pendingJobs.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setJobFilter('finished')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black ${
            jobFilter === 'finished' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          💚 Completadas ({finishedJobs.length})
        </button>
      </div>

      {/* BOKNINGSLISTA */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
        </div>
      ) : displayedJobs.length === 0 ? (
        <div className="text-center py-10 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-2">
          <p className="text-white font-black text-base">Sin tareas aquí</p>
          <p className="text-slate-400 text-xs">No hay limpiezas encontradas en este filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedJobs.map((b) => renderCard(b))}
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