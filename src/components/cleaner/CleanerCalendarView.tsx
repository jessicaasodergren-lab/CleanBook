import { useState } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../../lib/supabase';
import { formatDate } from '../../lib/constants';
import IncidentModal from './IncidentModal';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  MapPin,
  Clock,
  Users,
  FileText,
  Building,
  CheckCircle2,
  Clock3,
  Bell,
  RefreshCw,
  ThumbsUp,
  Check,
  Camera,
  User,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface CleanerCalendarViewProps {
  bookings: Booking[];
  incidents: Incident[];
  properties: Property[];
  onRefresh: () => void;
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

export default function CleanerCalendarView({ bookings, incidents, properties, onRefresh }: CleanerCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [openIncidentFor, setOpenIncidentFor] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNamesEs = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const todayStr = new Date().toISOString().split('T')[0];

  const calendarGrid = [];
  for (let i = 0; i < startDayOfWeek; i++) calendarGrid.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarGrid.push({ day, dateStr: dayStr });
  }

  const handleAcceptTask = async (b: Booking) => {
    setCompletingId(b.id);
    await supabase.from('bookings').update({ status: 'accepted' }).eq('id', b.id);
    setCompletingId(null);
    setSelectedBooking({ ...b, status: 'accepted' });
    onRefresh();
  };

  const handleCompleteTask = async (b: Booking) => {
    setCompletingId(b.id);
    await supabase.from('bookings').update({ status: 'finished' }).eq('id', b.id);
    setCompletingId(null);
    setSelectedBooking({ ...b, status: 'finished' });
    onRefresh();
  };

  return (
    <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-3.5 sm:p-5 border border-slate-200 space-y-3">
      {/* 1. KALENDER HEADER & NAVIGERING */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
            <CalendarIcon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
              {monthNamesEs[month]} {year}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Calendario de Limpiezas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition border border-slate-200 mr-0.5"
          >
            Hoy
          </button>
          <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-700 transition border border-slate-200">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-700 transition border border-slate-200">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. VECKODAGAR (LUN - DOM) */}
      <div className="grid grid-cols-7 text-center font-black text-[10px] text-slate-400 uppercase tracking-wider">
        <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
      </div>

      {/* 3. KALENDERGRID */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {calendarGrid.map((item, idx) => {
          if (!item) return <div key={`empty-${idx}`} className="h-16 sm:h-20 bg-slate-50/40 rounded-2xl" />;

          const isToday = item.dateStr === todayStr;

          // Hämta bokningar där utcheckning / städning sker denna dag
          const dayCleaningBookings = bookings.filter((b) => b.check_out_date === item.dateStr);

          // Kolla om det är en bytardag samma dag (Turnover)
          const isCheckInSameDay = bookings.some((b) => b.check_in_date === item.dateStr);
          const isTurnover = dayCleaningBookings.length > 0 && isCheckInSameDay;

          return (
            <div
              key={item.dateStr}
              className={`min-h-[64px] sm:min-h-[80px] border rounded-2xl p-1 flex flex-col justify-between transition-all ${
                isToday
                  ? 'border-sky-500 bg-sky-50/40 shadow-sm ring-2 ring-sky-500/20'
                  : 'border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  {item.day}
                </span>

                {isTurnover && (
                  <span
                    className="text-[8px] font-black px-1 rounded bg-rose-500 text-white flex items-center gap-0.5"
                    title="¡Cambio el mismo día!"
                  >
                    ⚡
                  </span>
                )}
              </div>

              {/* TAREAS PÅ DENNA DAG */}
              <div className="space-y-1 overflow-y-auto max-h-12 pt-0.5">
                {dayCleaningBookings.map((b) => {
                  const isFinished = b.status === 'finished';
                  const isAccepted = b.status === 'accepted';

                  const matchedProp = properties.find(
                    (p) =>
                      p.name.toLowerCase() === b.property_name.toLowerCase() ||
                      p.address.toLowerCase() === (b.property_address || '').toLowerCase()
                  );

                  const displayName = matchedProp?.address || b.property_address || b.property_name;
                  
                  const pillStyle = isFinished
                    ? 'bg-emerald-500 text-white'
                    : isAccepted
                    ? 'bg-sky-500 text-white'
                    : 'bg-amber-400 text-slate-950 font-black';

                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className={`w-full text-left px-1 py-0.5 rounded-lg text-[9px] font-extrabold truncate block transition shadow-sm active:scale-95 ${pillStyle}`}
                      title={displayName}
                    >
                      🧹 {displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. TECKENFÖRKLARING (LEYENDA) */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex items-center justify-around text-[10.5px] font-bold text-slate-600">
        <span className="flex items-center gap-1 text-amber-900 font-black">
          🟡 Por aceptar
        </span>
        <span className="flex items-center gap-1 text-sky-900 font-black">
          🔵 Aceptada
        </span>
        <span className="flex items-center gap-1 text-emerald-900 font-black">
          💚 Completada
        </span>
      </div>

      {/* 5. MODAL FÖR BOKNINGSDETALJER I KALENDERN */}
      {selectedBooking && (() => {
        const b = selectedBooking;
        const matchedProp = properties.find(
          (p) =>
            p.name.toLowerCase() === b.property_name.toLowerCase() ||
            p.address.toLowerCase() === (b.property_address || '').toLowerCase()
        );

        const displayAddress = matchedProp?.address || b.property_address || b.property_name;
        const displayHost = matchedProp?.host_name || b.host_name;
        const displayNote = getValidNote(b.notes_es, b.notes);

        const nextBooking = bookings.find((other) => {
          if (other.id === b.id) return false;
          if (other.property_name.toLowerCase() !== b.property_name.toLowerCase()) return false;
          if (!other.check_in_date || !b.check_out_date) return false;
          return other.check_in_date >= b.check_out_date;
        });

        const departureTimeFormatted = formatTimeOrWindowEs(b.check_out_exact_time, b.check_out_time_window);
        const nextArrivalTimeFormatted = nextBooking
          ? formatTimeOrWindowEs(nextBooking.check_in_exact_time, nextBooking.check_in_time_window)
          : null;

        const bookingIncidents = incidents.filter((i) => i.booking_id === b.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
            <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
              {/* TOPPHEADER */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Detalles de Limpieza</span>
                  <h3 className="font-black text-base text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    {displayAddress}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
                {/* STATUS BADGE */}
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-500">Estado de tarea:</span>
                  {b.status === 'finished' && (
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Completada
                    </span>
                  )}
                  {b.status === 'accepted' && (
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-sky-100 text-sky-900 border border-sky-300">
                      Aceptada
                    </span>
                  )}
                  {b.status === 'pending' && (
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-amber-400 text-slate-950">
                      Por aceptar
                    </span>
                  )}
                </div>

                {/* VÄRD */}
                {displayHost && displayHost !== 'Värd' && (
                  <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Anfitriona: {displayHost} ({b.property_name})
                  </p>
                )}

                {/* INSTRUKTIONER */}
                {displayNote && (
                  <div className="bg-amber-100/90 border-l-4 border-amber-500 p-3 rounded-r-xl text-xs space-y-1">
                    <span className="font-black text-amber-900 text-[10px] uppercase block flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Instrucción del anfitrión:
                    </span>
                    <p className="font-bold text-amber-950 whitespace-pre-line leading-relaxed">{displayNote}</p>
                  </div>
                )}

                {/* STÄDFÖNSTER */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-black text-[10px] uppercase text-slate-400 block">Ventana de Limpieza</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-500 uppercase block">🚪 Salida</span>
                      <span className="font-black text-slate-900 block text-xs">{formatDate(b.check_out_date, 'es')}</span>
                      {departureTimeFormatted && <span className="text-[10.5px] font-bold text-amber-800 block">{departureTimeFormatted}</span>}
                    </div>

                    <div className="bg-sky-50 p-2 rounded-xl border border-sky-200">
                      <span className="text-[10px] font-black text-sky-900 uppercase block">🔑 Entrada</span>
                      {nextBooking ? (
                        <>
                          <span className="font-black text-slate-900 block text-xs">{formatDate(nextBooking.check_in_date, 'es')}</span>
                          {nextArrivalTimeFormatted && <span className="text-[10.5px] font-bold text-sky-800 block">{nextArrivalTimeFormatted}</span>}
                        </>
                      ) : (
                        <span className="text-[10.5px] font-bold text-slate-400 block italic">Sin próxima entrada</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 font-bold pt-1">
                    <span>👥 {b.guests} huéspedes</span>
                    <span>{b.laundry ? '🧺 Lavar lencería' : '🚫 Sin colada'}</span>
                  </div>
                </div>

                {/* ÅTGÄRDER */}
                <div className="pt-1 flex items-center gap-2">
                  {b.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleAcceptTask(b)}
                      disabled={completingId === b.id}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                      Aceptar tarea
                    </button>
                  )}

                  {b.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(b)}
                      disabled={completingId === b.id}
                      className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Completado
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOpenIncidentFor(b.id);
                    }}
                    className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>Foto / Daño</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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