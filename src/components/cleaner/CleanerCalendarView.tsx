// src/components/cleaner/CleanerCalendarView.tsx
import { useState } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../../lib/supabase';
import { formatDate } from '../../lib/constants';
import IncidentModal from './IncidentModal';
import type { CleanerLanguage } from '../CleanerView';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  MapPin,
  Camera,
  User,
  Loader2,
  ThumbsUp,
  Check,
} from 'lucide-react';

interface CleanerCalendarViewProps {
  bookings: Booking[];
  incidents: Incident[];
  properties: Property[];
  onRefresh: () => void;
  lang?: CleanerLanguage;
}

const colStartClasses: Record<number, string> = {
  1: 'col-start-1',
  2: 'col-start-2',
  3: 'col-start-3',
  4: 'col-start-4',
  5: 'col-start-5',
  6: 'col-start-6',
  7: 'col-start-7',
};

const colSpanClasses: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
};

const daysOfWeekMap: Record<CleanerLanguage, string[]> = {
  sv: ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'],
  es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  da: ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'],
};

const legendTexts: Record<CleanerLanguage, any> = {
  sv: {
    title: 'Städkalender',
    btnToday: 'Idag',
    legendPending: '🟡 Väntar',
    legendAccepted: '🔵 Accepterad',
    legendFinished: '💚 Slutförd',
    modalTitle: 'Städdetaljer',
    modalStatusLabel: 'Uppdragsstatus:',
    modalHostLabel: 'Värd:',
    modalInstruction: 'Värdens instruktion:',
    modalNextArrival: 'Nästa incheckning (Deadline):',
    departure: 'Utcheckning / Städdag',
    arrival: 'Incheckning',
    noNextArrival: 'Ingen nästa incheckning',
    guests: 'gäster',
    laundryYes: '🧺 Tvätta lakan/handdukar',
    laundryNo: '🚫 Ingen tvätt',
    btnAccept: 'Acceptera uppdrag',
    btnComplete: 'Slutförd',
    btnIncident: 'Foto / Skada',
  },
  es: {
    title: 'Calendario de Limpiezas',
    btnToday: 'Hoy',
    legendPending: '🟡 Por aceptar',
    legendAccepted: '🔵 Aceptada',
    legendFinished: '💚 Completada',
    modalTitle: 'Detalles de Limpieza',
    modalStatusLabel: 'Estado de tarea:',
    modalHostLabel: 'Anfitriona:',
    modalInstruction: 'Instrucción del anfitrión:',
    modalNextArrival: 'Próxima entrada (Límite):',
    departure: 'Salida / Limpieza',
    arrival: 'Entrada',
    noNextArrival: 'Sin próxima entrada',
    guests: 'huéspedes',
    laundryYes: '🧺 Lavar lencería',
    laundryNo: '🚫 Sin colada',
    btnAccept: 'Aceptar tarea',
    btnComplete: 'Completado',
    btnIncident: 'Foto / Daño',
  },
  en: {
    title: 'Cleaning Calendar',
    btnToday: 'Today',
    legendPending: '🟡 Pending',
    legendAccepted: '🔵 Accepted',
    legendFinished: '💚 Completed',
    modalTitle: 'Cleaning Details',
    modalStatusLabel: 'Task Status:',
    modalHostLabel: 'Host:',
    modalInstruction: 'Host Instruction:',
    modalNextArrival: 'Next arrival (Deadline):',
    departure: 'Departure / Cleaning',
    arrival: 'Arrival',
    noNextArrival: 'No upcoming arrival',
    guests: 'guests',
    laundryYes: '🧺 Wash linen',
    laundryNo: '🚫 No laundry',
    btnAccept: 'Accept task',
    btnComplete: 'Completed',
    btnIncident: 'Photo / Damage',
  },
  da: {
    title: 'Rengøringskalender',
    btnToday: 'I dag',
    legendPending: '🟡 Afventer',
    legendAccepted: '🔵 Accepteret',
    legendFinished: '💚 Gennemført',
    modalTitle: 'Detaljer om rengøring',
    modalStatusLabel: 'Opgavestatus:',
    modalHostLabel: 'Vært:',
    modalInstruction: 'Værtens instruktion:',
    modalNextArrival: 'Næste ankomst (Deadline):',
    departure: 'Udtjekning / Rengøring',
    arrival: 'Indtjekning',
    noNextArrival: 'Ingen næste ankomst',
    guests: 'gæster',
    laundryYes: '🧺 Vask linned/håndklæder',
    laundryNo: '🚫 Ingen vask',
    btnAccept: 'Accepter opgave',
    btnComplete: 'Gennemført',
    btnIncident: 'Foto / Skade',
  },
};

function getBookingWindowInfo(b: Booking, allBookings: Booking[]) {
  const samePropBookings = allBookings.filter(
    (other) =>
      other.id !== b.id &&
      (other.property_id === b.property_id ||
        other.property_name.toLowerCase() === b.property_name.toLowerCase())
  );

  const nextBooking = samePropBookings
    .filter((other) => other.check_in_date >= b.check_out_date)
    .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))[0];

  const windowStart = b.check_out_date;
  const windowEnd = nextBooking ? nextBooking.check_in_date : null;

  return { nextBooking, windowStart, windowEnd };
}

export default function CleanerCalendarView({
  bookings,
  incidents,
  properties,
  onRefresh,
  lang = 'es',
}: CleanerCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [openIncidentFor, setOpenIncidentFor] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const txt = legendTexts[lang] || legendTexts.es;
  const daysOfWeek = daysOfWeekMap[lang] || daysOfWeekMap.es;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNameRaw = currentDate.toLocaleDateString(lang, { month: 'long' });
  const monthName = monthNameRaw.charAt(0).toUpperCase() + monthNameRaw.slice(1);

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const todayStr = new Date().toISOString().split('T')[0];

  const monthDays: ({ day: number; dateStr: string } | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) monthDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    monthDays.push({ day, dateStr: dayStr });
  }
  while (monthDays.length % 7 !== 0) {
    monthDays.push(null);
  }

  const weeks: ({ day: number; dateStr: string } | null)[][] = [];
  for (let i = 0; i < monthDays.length; i += 7) {
    weeks.push(monthDays.slice(i, i + 7));
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
    <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-3.5 sm:p-5 border border-slate-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
            <CalendarIcon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
              {monthName} {year}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {txt.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition border border-slate-200 mr-0.5"
          >
            {txt.btnToday}
          </button>
          <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-700 transition border border-slate-200">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-700 transition border border-slate-200">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Veckodags-rubriker */}
      <div className="grid grid-cols-7 text-center font-black text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider">
        {daysOfWeek.map((day: string, idx: number) => (
          <div key={idx}>{day}</div>
        ))}
      </div>

      {/* Vecko-Grid */}
      <div className="space-y-2">
        {weeks.map((week, weekIdx) => {
          const validWeekDays = week.filter((d) => d !== null) as { day: number; dateStr: string }[];
          if (validWeekDays.length === 0) return null;

          const weekStartStr = validWeekDays[0].dateStr;
          const weekEndStr = validWeekDays[validWeekDays.length - 1].dateStr;

          const weekBookings = bookings.filter((b) => {
            if (!b.check_in_date || !b.check_out_date) return false;
            return b.check_in_date <= weekEndStr && b.check_out_date >= weekStartStr;
          });

          return (
            <div key={`week-${weekIdx}`} className="border border-slate-200/80 rounded-2xl bg-slate-50/30 p-1.5 space-y-1.5">
              {/* Dagshuvuden */}
              <div className="grid grid-cols-7 gap-1">
                {week.map((dayObj, dayIdx) => {
                  if (!dayObj) return <div key={`empty-${dayIdx}`} className="h-6" />;
                  const isToday = dayObj.dateStr === todayStr;

                  return (
                    <div key={dayObj.dateStr} className="text-center">
                      <span
                        className={`inline-flex items-center justify-center text-[10px] sm:text-[11px] font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full ${
                          isToday ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-500/20' : 'text-slate-700'
                        }`}
                      >
                        {dayObj.day}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Flerdagarsfält - visar ENDAST adressen */}
              <div className="grid grid-cols-7 gap-y-1">
                {weekBookings.map((b) => {
                  let startColIdx = week.findIndex((d) => d && d.dateStr >= b.check_in_date);
                  if (startColIdx === -1) startColIdx = week.findIndex((d) => d !== null);

                  let endColIdx = 6;
                  for (let i = 6; i >= 0; i--) {
                    if (week[i] && week[i]!.dateStr <= b.check_out_date) {
                      endColIdx = i;
                      break;
                    }
                  }

                  const colStart = startColIdx + 1;
                  const colSpan = Math.max(1, endColIdx - startColIdx + 1);

                  const isTrueStart = week[startColIdx]?.dateStr === b.check_in_date;
                  const isTrueEnd = week[endColIdx]?.dateStr === b.check_out_date;

                  const matchedProp = properties.find(
                    (p) =>
                      p.name.toLowerCase() === b.property_name.toLowerCase() ||
                      p.address.toLowerCase() === (b.property_address || '').toLowerCase()
                  );

                  // Endast adressen (eller namn om adress saknas)
                  const displayAddress = matchedProp?.address || b.property_address || b.property_name;

                  const isFinished = b.status === 'finished';
                  const isAccepted = b.status === 'accepted';

                  const pillBg = isFinished
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : isAccepted
                    ? 'bg-sky-500 text-white hover:bg-sky-600'
                    : 'bg-amber-400 text-slate-950 font-black hover:bg-amber-500';

                  const roundedLeft = isTrueStart ? 'rounded-l-xl' : 'rounded-l-none';
                  const roundedRight = isTrueEnd ? 'rounded-r-xl' : 'rounded-r-none';

                  return (
                    <button
                      key={`${b.id}-week-${weekIdx}`}
                      onClick={() => setSelectedBooking(b)}
                      className={`w-full text-left py-1 px-2 text-[9px] sm:text-[10px] font-extrabold truncate block transition shadow-sm active:scale-98 ${pillBg} ${roundedLeft} ${roundedRight} ${colStartClasses[colStart]} ${colSpanClasses[colSpan]}`}
                      title={`${displayAddress} (${b.check_in_date} till ${b.check_out_date})`}
                    >
                      {displayAddress}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex items-center justify-around text-[10.5px] font-bold text-slate-600">
        <span className="flex items-center gap-1 text-amber-900 font-black">
          {txt.legendPending}
        </span>
        <span className="flex items-center gap-1 text-sky-900 font-black">
          {txt.legendAccepted}
        </span>
        <span className="flex items-center gap-1 text-emerald-900 font-black">
          {txt.legendFinished}
        </span>
      </div>

      {/* Detaljmodal vid klick */}
      {selectedBooking && (() => {
        const b = selectedBooking;
        const matchedProp = properties.find(
          (p) =>
            p.name.toLowerCase() === b.property_name.toLowerCase() ||
            p.address.toLowerCase() === (b.property_address || '').toLowerCase()
        );

        const displayAddress = matchedProp?.address || b.property_address || b.property_name;
        const displayHost = matchedProp?.host_name || b.host_name;

        const { nextBooking } = getBookingWindowInfo(b, bookings);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
            <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">{txt.modalTitle}</span>
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
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-500">{txt.modalStatusLabel}</span>
                  {b.status === 'finished' && (
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {txt.legendFinished}
                    </span>
                  )}
                  {b.status === 'accepted' && (
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-sky-100 text-sky-900 border border-sky-300">
                      {txt.legendAccepted}
                    </span>
                  )}
                  {b.status === 'pending' && (
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-amber-400 text-slate-950">
                      {txt.legendPending}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500">{txt.arrival}:</span>
                    <span className="font-black text-slate-900">
                      {formatDate(b.check_in_date, lang)} ({b.check_in_time_window})
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                    <span className="font-bold text-slate-500">{txt.departure}:</span>
                    <span className="font-black text-slate-900">
                      {formatDate(b.check_out_date, lang)} ({b.check_out_time_window})
                    </span>
                  </div>
                  {nextBooking && (
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                      <span className="font-bold text-slate-500">{txt.modalNextArrival}</span>
                      <span className="font-black text-emerald-700">
                        {formatDate(nextBooking.check_in_date, lang)} ({nextBooking.check_in_time_window})
                      </span>
                    </div>
                  )}
                </div>

                {b.notes_es || b.notes ? (
                  <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-xs space-y-1">
                    <span className="font-bold text-amber-900 block">{txt.modalInstruction}</span>
                    <p className="text-slate-800 font-medium whitespace-pre-line">{b.notes_es || b.notes}</p>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-slate-600 font-bold px-1">
                  <span>{b.laundry ? txt.laundryYes : txt.laundryNo}</span>
                  <span>{b.guests} {txt.guests}</span>
                </div>

                {displayHost && displayHost !== 'Värd' && (
                  <p className="text-xs font-bold text-slate-600 flex items-center gap-1 border-t border-slate-100 pt-2">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {txt.modalHostLabel} {displayHost} ({b.property_name})
                  </p>
                )}

                <div className="pt-1 flex items-center gap-2">
                  {b.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleAcceptTask(b)}
                      disabled={completingId === b.id}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                      {txt.btnAccept}
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
                      {txt.btnComplete}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setOpenIncidentFor(b.id)}
                    className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>{txt.btnIncident}</span>
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