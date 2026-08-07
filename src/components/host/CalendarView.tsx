// src/components/host/CalendarView.tsx
import { useState } from 'react';
import { supabase, type Booking } from '../../lib/supabase';
import { formatDate, APP_CONFIG } from '../../lib/constants';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  MapPin,
  Clock,
  Users,
  FileText,
  MessageSquare,
  Building,
  CheckCircle2,
  Clock3,
  Bell,
  Trash2,
  Loader2,
} from 'lucide-react';

interface CalendarViewProps {
  bookings: Booking[];
  onRefresh?: () => void;
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

function getValidNote(notesEs: string | null | undefined, notesSv: string | null | undefined): string | null {
  if (notesEs && !notesEs.toUpperCase().includes('QUERY LENGTH LIMIT') && !notesEs.toUpperCase().includes('MYMEMORY')) {
    return notesEs;
  }
  return notesSv || null;
}

function formatTimeOrWindow(exactTime: string | null | undefined, timeWindow: string | null | undefined): string | null {
  if (exactTime) {
    return `kl ${exactTime}`;
  }
  if (timeWindow === 'morning') return '🌅 Förmiddag';
  if (timeWindow === 'afternoon') return '☀️ Eftermiddag';
  if (timeWindow === 'evening') return '🌙 Kväll';
  return null;
}

function getWhatsAppUrl(b: Booking): string {
  const phone = APP_CONFIG.mariaPhoneNumber || '34600000000';
  const depDate = formatDate(b.check_out_date, 'es');
  const depTime = b.check_out_exact_time ? `kl ${b.check_out_exact_time}` : '';
  const arrDate = formatDate(b.check_in_date, 'es');
  const arrTime = b.check_in_exact_time ? `kl ${b.check_in_exact_time}` : '';
  
  const validNoteEs = getValidNote(b.notes_es, b.notes);
  const notesText = validNoteEs || b.notes;

  const msg = 
`¡Hola Maria! 🧹
Reserva en CleanBook:

📍 *Propiedad:* ${b.property_name} (${b.property_address || b.property_name})
📅 *Salida (Limpieza):* ${depDate} ${depTime}
📅 *Entrada del huésped:* ${arrDate} ${arrTime}
👥 *Huéspedes:* ${b.guests}
🧺 *Lavar:* ${b.laundry ? 'SÍ' : 'NO'}
${notesText ? `📝 *Instrucciones:* ${notesText}\n` : ''}
Por favor, entra en CleanBook para aceptar la tarea.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export default function CalendarView({ bookings, onRefresh }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNameRaw = currentDate.toLocaleDateString('sv', { month: 'long' });
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

  const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const monthBookings = bookings.filter(
    (b) => (b.check_in_date && b.check_in_date >= monthStartStr && b.check_in_date <= monthEndStr) ||
           (b.check_out_date && b.check_out_date >= monthStartStr && b.check_out_date <= monthEndStr)
  );

  const pendingMonthCount = monthBookings.filter((b) => b.status === 'pending').length;
  const acceptedMonthCount = monthBookings.filter((b) => b.status === 'accepted').length;
  const finishedMonthCount = monthBookings.filter((b) => b.status === 'finished').length;

  const handleDelete = async (b: Booking) => {
    if (b.status !== 'pending') {
      alert('Kan inte radera: Bokningen är redan accepterad av Maria eller utförd.');
      return;
    }
    if (!window.confirm(`Är du säker på att du vill ta bort bokningen "${b.booking_title}"?`)) return;

    setDeletingId(b.id);
    await supabase.from('bookings').delete().eq('id', b.id);
    setDeletingId(null);
    setSelectedBooking(null);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base leading-tight">
              {monthName} {year}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Bokningsöversikt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition border border-slate-200 mr-1"
          >
            Idag
          </button>
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition border border-slate-200">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition border border-slate-200">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Veckodagar */}
      <div className="grid grid-cols-7 text-center font-black text-[11px] text-slate-400 uppercase tracking-wider">
        <div>Mån</div><div>Tis</div><div>Ons</div><div>Tor</div><div>Fre</div><div>Lör</div><div>Sön</div>
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

              {/* Flerdagarsfält - visar ENDAST bokningstitel */}
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

                  const isFinished = b.status === 'finished';
                  const isAccepted = b.status === 'accepted';
                  
                  const pillStyle = isFinished
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : isAccepted
                    ? 'bg-sky-500 hover:bg-sky-600 text-white'
                    : 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black';

                  const roundedLeft = isTrueStart ? 'rounded-l-xl' : 'rounded-l-none';
                  const roundedRight = isTrueEnd ? 'rounded-r-xl' : 'rounded-r-none';

                  return (
                    <button
                      key={`${b.id}-week-${weekIdx}`}
                      onClick={() => setSelectedBooking(b)}
                      className={`w-full text-left py-1 px-2 text-[9px] sm:text-[10px] font-extrabold truncate block transition shadow-sm active:scale-98 ${pillStyle} ${roundedLeft} ${roundedRight} ${colStartClasses[colStart]} ${colSpanClasses[colSpan]}`}
                      title={`${b.booking_title} (${b.check_in_date} till ${b.check_out_date})`}
                    >
                      {b.booking_title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sammanfattning */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600 font-bold">
        <span>
          Totalt i {monthName}: <strong className="text-slate-900">{monthBookings.length} bokningar</strong>
        </span>

        <div className="flex items-center gap-2 text-[11px] flex-wrap">
          <span className="text-amber-900 font-black flex items-center gap-1 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
            🟡 {pendingMonthCount} väntar på svar
          </span>
          <span className="text-sky-900 font-black flex items-center gap-1 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300">
            🔵 {acceptedMonthCount} accepterade
          </span>
          <span className="text-emerald-900 font-black flex items-center gap-1 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
            💚 {finishedMonthCount} slutförda
          </span>
        </div>
      </div>

      {/* Detaljmodal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Bokningsdetaljer</span>
                <h3 className="font-black text-base text-white">{selectedBooking.booking_title}</h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-500">Status för städning:</span>
                {selectedBooking.status === 'finished' && (
                  <span className="text-[11px] font-black px-3 py-1 rounded-full uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Utförd städning
                  </span>
                )}
                {selectedBooking.status === 'accepted' && (
                  <span className="text-[11px] font-black px-3 py-1 rounded-full uppercase bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1">
                    <Clock3 className="w-3.5 h-3.5 text-sky-600" /> Accepterad av Maria
                  </span>
                )}
                {selectedBooking.status === 'pending' && (
                  <span className="text-[11px] font-black px-3 py-1 rounded-full uppercase bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                    <Bell className="w-3.5 h-3.5 text-slate-950" /> Väntar på Marias svar
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Fastighet</span>
                <p className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-sky-600 shrink-0" />
                  {selectedBooking.property_name}
                </p>
                {selectedBooking.property_address && (
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {selectedBooking.property_address}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-sky-50/70 p-3 rounded-2xl border border-sky-100 space-y-1">
                  <span className="text-[10px] font-bold text-sky-900 uppercase block">Incheckning</span>
                  <span className="font-black text-slate-900 block flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
                    {formatDate(selectedBooking.check_in_date, 'sv')}
                  </span>
                  {formatTimeOrWindow(selectedBooking.check_in_exact_time, selectedBooking.check_in_time_window) && (
                    <span className="text-[11px] font-bold text-slate-600 block flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-sky-600" />
                      {formatTimeOrWindow(selectedBooking.check_in_exact_time, selectedBooking.check_in_time_window)}
                    </span>
                  )}
                </div>

                <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100 space-y-1">
                  <span className="text-[10px] font-bold text-amber-900 uppercase block">Utcheckning / Städstart</span>
                  <span className="font-black text-slate-900 block flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-amber-600" />
                    {formatDate(selectedBooking.check_out_date, 'sv')}
                  </span>
                  {formatTimeOrWindow(selectedBooking.check_out_exact_time, selectedBooking.check_out_time_window) && (
                    <span className="text-[11px] font-bold text-slate-600 block flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {formatTimeOrWindow(selectedBooking.check_out_exact_time, selectedBooking.check_out_time_window)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 font-bold">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>{selectedBooking.guests} gäster</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 font-bold">
                  <span>{selectedBooking.laundry ? '🧺 Tvätt: Ja' : '🚫 Ingen tvätt'}</span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl space-y-1.5">
                  <span className="font-black text-amber-900 uppercase text-[10px] flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-600" /> Dina instruktioner:
                  </span>
                  <p className="font-bold text-amber-950 leading-relaxed whitespace-pre-line">
                    {selectedBooking.notes}
                  </p>
                  {getValidNote(selectedBooking.notes_es, selectedBooking.notes) !== selectedBooking.notes && (
                    <div className="pt-1.5 border-t border-amber-200/60">
                      <span className="text-[10px] font-extrabold text-amber-800 uppercase block">
                        Spansk översättning (till Maria):
                      </span>
                      <p className="font-medium text-amber-900 italic leading-relaxed">
                        {getValidNote(selectedBooking.notes_es, selectedBooking.notes)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                {selectedBooking.status === 'pending' ? (
                  <>
                    <a
                      href={getWhatsAppUrl(selectedBooking)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <MessageSquare className="w-4 h-4 fill-white" />
                      Avisera Maria på WhatsApp
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDelete(selectedBooking)}
                      disabled={deletingId === selectedBooking.id}
                      className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 border border-rose-200 active:scale-95"
                    >
                      {deletingId === selectedBooking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-rose-600" />}
                      Ta bort denna bokning
                    </button>
                  </>
                ) : (
                  <div className="w-full py-2.5 px-3.5 bg-slate-100 text-slate-500 font-bold text-[11px] text-center rounded-2xl border border-slate-200">
                    Låst (accepterad/utförd av Maria)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}