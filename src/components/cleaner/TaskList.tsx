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
  Clock,
  AlertTriangle,
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

// Hjälpfunktion för att hämta giltig text (filtrerar bort översättningsfel från MyMemory)
function getValidNote(notesEs: string | null | undefined, notesSv: string | null | undefined): string | null {
  if (notesEs && !notesEs.toUpperCase().includes('QUERY LENGTH LIMIT') && !notesEs.toUpperCase().includes('MYMEMORY')) {
    return notesEs;
  }
  return notesSv || null;
}

export default function TaskList({ bookings, incidents, properties, loading, onRefresh }: TaskListProps) {
  const [jobFilter, setJobFilter] = useState<'active' | 'pending_only' | 'finished'>('active');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openIncidentFor, setOpenIncidentFor] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  const todayYMD = new Date().toISOString().split('T')[0];

  const activeJobs = bookings
    .filter((b) => b.status === 'pending' || b.status === 'accepted')
    .sort((a, b) => {
      const deadlineA = a.next_arrival_date || a.departure_date || '9999-99-99';
      const deadlineB = b.next_arrival_date || b.departure_date || '9999-99-99';
      if (deadlineA !== deadlineB) return deadlineA.localeCompare(deadlineB);
      return (a.departure_date || '').localeCompare(b.departure_date || '');
    });

  const pendingJobs = bookings.filter((b) => b.status === 'pending');
  const finishedJobs = bookings
    .filter((b) => b.status === 'finished')
    .sort((a, b) => (b.departure_date || '').localeCompare(a.departure_date || ''));

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

  const renderCard = (b: Booking) => {
    const isPending = b.status === 'pending';
    const isAccepted = b.status === 'accepted';
    const isFinished = b.status === 'finished';
    const isExpanded = expandedId === b.id;
    
    // Säkerställ att vi inte visar översättningsfel
    const displayNote = getValidNote(b.notes_es, b.notes);

    const matchedProp = properties.find(
      (p) =>
        p.name.toLowerCase() === b.property_name.toLowerCase() ||
        p.address.toLowerCase() === (b.property_address || '').toLowerCase()
    );

    const displayAddress = matchedProp?.address || b.property_address || b.property_name;
    const displayHost = matchedProp?.host_name || b.host_name;
    const bookingIncidents = incidents.filter((i) => i.booking_id === b.id);

    return (
      <div
        key={b.id}
        className={`rounded-3xl p-5 shadow-xl transition-all space-y-4 ${
          isPending
            ? 'bg-amber-50 text-slate-900 border-2 border-amber-400 shadow-amber-500/10'
            : isFinished
            ? 'bg-white text-slate-900 border border-slate-200 opacity-80'
            : 'bg-white text-slate-900 border border-slate-200'
        }`}
      >
        {/* 1. TOPP-INFO: ADRESS & BADGES */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
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

              {bookingIncidents.length > 0 && (
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Camera className="w-3 h-3 text-slate-500" />
                  {bookingIncidents.length} {bookingIncidents.length === 1 ? 'foto' : 'fotos'}
                </span>
              )}
            </div>

            <h3 className="font-black text-slate-900 text-lg leading-tight flex items-center gap-1.5 pt-1">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              {displayAddress}
            </h3>
            {displayHost && displayHost !== 'Värd' && (
              <p className="text-xs font-bold text-slate-500 pl-5">{displayHost}</p>
            )}
          </div>

          <button
            onClick={() => toggleExpand(b.id)}
            className="p-2 bg-white/80 hover:bg-slate-100 rounded-2xl text-slate-600 transition border border-slate-200 shrink-0"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* 2. INSTRUKTIONSBOX (VISAR MAX 80 TECKEN OCH TRE PRICKAR (...) OM HOPFÄLLT) */}
        {displayNote && (
          <div
            onClick={() => toggleExpand(b.id)}
            className="bg-amber-100/90 border-l-4 border-amber-500 p-3.5 rounded-r-2xl text-xs font-bold text-amber-950 cursor-pointer hover:bg-amber-200/80 transition shadow-sm space-y-1"
          >
            <div className="flex items-center gap-1.5 font-black text-amber-900 text-[11px] uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Instrucción del anfitrión:</span>
            </div>

            <p className="font-medium text-amber-950 leading-relaxed">
              {isExpanded ? (
                <span className="whitespace-pre-line">{displayNote}</span>
              ) : (
                <span>
                  {displayNote.length > 85 ? `${displayNote.slice(0, 85)}...` : displayNote}
                </span>
              )}
            </p>
          </div>
        )}

        {/* 3. TIDER & SPECS BLOCK */}
        <div className="bg-white/90 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs shadow-sm">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200/60">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Salida (Limpieza)
              </span>
              <span className="font-black text-slate-900 block text-sm">
                {formatDate(b.departure_date, 'es')}
              </span>
              {b.departure_exact_time && (
                <span className="text-[11px] font-bold text-slate-500">kl {b.departure_exact_time}</span>
              )}
            </div>

            <div className="bg-sky-50/80 p-2 rounded-xl border border-sky-100">
              <span className="text-[10px] font-black text-sky-900 uppercase block">
                Próxima entrada (Plazo)
              </span>
              <span className="font-black text-sky-950 block text-sm">
                {formatDate(b.next_arrival_date, 'es')}
              </span>
              {b.arrival_exact_time && (
                <span className="text-[11px] font-bold text-sky-700">kl {b.arrival_exact_time}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-slate-600 font-bold pt-0.5">
            <span>{b.guests} huéspedes</span>
            <span>{b.laundry ? '🧺 Lavar lencería' : '🚫 Sin colada'}</span>
            {matchedProp?.cleaning_time && <span>Est: {matchedProp.cleaning_time}</span>}
          </div>
        </div>

        {/* 4. HUVUDAKTIONER */}
        <div className="flex items-center gap-2">
          {isPending && (
            <button
              type="button"
              onClick={() => handleAcceptTask(b)}
              disabled={completingId === b.id}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-98"
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
              className="flex-1 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-2xl transition shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 active:scale-98"
            >
              {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Completado
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpenIncidentFor(b.id)}
            className="py-3.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 border border-slate-200 shrink-0 active:scale-95"
            title="Solo si hay desperfectos o cosas rotas"
          >
            <Camera className="w-4 h-4 text-slate-500" />
            <span>Incidencia / Daño</span>
          </button>
        </div>

        {actionError?.id === b.id && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError.msg}</span>
          </div>
        )}

        {/* 5. EXPANDERAT LÄGE */}
        {isExpanded && (
          <div className="pt-3 border-t border-slate-200 space-y-3 text-xs">
            {/* FASTIGHETSINFORMATION + NOTAS FIJAS */}
            {matchedProp && (
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3">
                <span className="font-black text-slate-800 block text-[10px] uppercase tracking-wider">
                  Información de la casa:
                </span>

                {(matchedProp.kvm || matchedProp.rooms || matchedProp.bathrooms || matchedProp.cleaning_time) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    {matchedProp.kvm && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Superficie</span>
                        <span className="font-extrabold text-slate-900">{matchedProp.kvm} m²</span>
                      </div>
                    )}
                    {matchedProp.rooms && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Habitaciones</span>
                        <span className="font-extrabold text-slate-900">{matchedProp.rooms} hab</span>
                      </div>
                    )}
                    {matchedProp.bathrooms && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Baños</span>
                        <span className="font-extrabold text-slate-900">{matchedProp.bathrooms} baños</span>
                      </div>
                    )}
                    {matchedProp.cleaning_time && (
                      <div className="bg-sky-50 p-2 rounded-xl border border-sky-200">
                        <span className="text-[10px] font-bold text-sky-800 block uppercase">Tiempo est.</span>
                        <span className="font-extrabold text-sky-950">{matchedProp.cleaning_time}</span>
                      </div>
                    )}
                  </div>
                )}

                {matchedProp.property_notes && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase block">
                      Notas fijas / Instrucciones permanentes:
                    </span>
                    <p className="font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                      {matchedProp.property_notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* FOTORAPPORTER */}
            {bookingIncidents.length > 0 && (
              <div className="bg-slate-100/70 border border-slate-200 p-3.5 rounded-2xl space-y-2">
                <span className="font-black text-slate-900 block text-[10px] uppercase tracking-wider">
                  Fotos enviadas ({bookingIncidents.length}):
                </span>
                <div className="space-y-2">
                  {bookingIncidents.map((inc) => (
                    <div key={inc.id} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {parsePhotos(inc.photo_url).map((url, idx) => (
                          <img key={idx} src={url} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover rounded-xl" />
                        ))}
                      </div>
                      <p className="font-bold text-slate-800 text-xs">{inc.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isFinished && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleReopenTask(b)}
                  disabled={completingId === b.id}
                  className="w-full py-3 px-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Reabrir tarea
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* FILTERMENY / FLIKAR */}
      <div className="flex bg-slate-800 p-1 rounded-2xl text-xs font-bold gap-1 border border-slate-700 shadow-md">
        <button
          type="button"
          onClick={() => setJobFilter('active')}
          className={`flex-1 py-2.5 rounded-xl transition text-center font-black ${
            jobFilter === 'active' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🧹 Activas ({activeJobs.length})
        </button>

        <button
          type="button"
          onClick={() => setJobFilter('pending_only')}
          className={`flex-1 py-2.5 rounded-xl transition text-center font-black flex items-center justify-center gap-1 ${
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
          className={`flex-1 py-2.5 rounded-xl transition text-center font-black ${
            jobFilter === 'finished' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          💚 Completadas ({finishedJobs.length})
        </button>
      </div>

      {/* RUBRIK / SORTERINGSINFO */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-sky-400" />
          {jobFilter === 'active' && 'Ordenadas por plazo (Próxima entrada)'}
          {jobFilter === 'pending_only' && 'Tareas pendientes de aceptar'}
          {jobFilter === 'finished' && 'Tareas completadas'}
        </span>
        <span className="text-slate-400 font-medium">
          {displayedJobs.length} {displayedJobs.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>

      {/* BOKNINGSLISTA */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      ) : displayedJobs.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 space-y-2">
          <p className="text-white font-black text-lg">Sin tareas aquí</p>
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