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
  RefreshCw,
} from 'lucide-react';

interface CalendarViewProps {
  bookings: Booking[];
  onRefresh?: () => void;
}

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

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNamesSv = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
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
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base leading-tight">
              {monthNamesSv[month]} {year}
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

      <div className="grid grid-cols-7 text-center font-black text-[11px] text-slate-400 uppercase tracking-wider">
        <div>Mån</div><div>Tis</div><div>Ons</div><div>Tor</div><div>Fre</div><div>Lör</div><div>Sön</div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {calendarGrid.map((item, idx) => {
          if (!item) return <div key={`empty-${idx}`} className="h-20 sm:h-24 bg-slate-50/40 rounded-2xl" />;

          const isToday = item.dateStr === todayStr;

          const dayBookings = bookings.filter((b) => {
            const start = b.check_in_date;
            const end = b.check_out_date;
            if (!start || !end) return false;
            return item.dateStr >= start && item.dateStr <= end;
          });

          const isCheckOutDay = dayBookings.some((b) => b.check_out_date === item.dateStr);
          const isCheckInDay = dayBookings.some((b) => b.check_in_date === item.dateStr);
          const isTurnover = isCheckOutDay && isCheckInDay && dayBookings.length > 1;

          return (
            <div
              key={item.dateStr}
              className={`min-h-[80px] sm:min-h-[96px] border rounded-2xl p-1 sm:p-1.5 flex flex-col justify-between transition-all ${
                isToday
                  ? 'border-sky-500 bg-sky-50/40 shadow-sm ring-2 ring-sky-500/20'
                  : 'border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-black w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  {item.day}
                </span>

                {isTurnover && (
                  <span
                    className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-500 text-slate-950 flex items-center gap-0.5 shadow-sm"
                    title="Byte samma dag!"
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Byte
                  </span>
                )}
              </div>

              <div className="space-y-1 overflow-y-auto max-h-14 sm:max-h-16 pt-1">
                {dayBookings.map((b) => {
                  const isFinished = b.status === 'finished';
                  const isAccepted = b.status === 'accepted';
                  
                  const pillStyle = isFinished
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : isAccepted
                    ? 'bg-sky-500 hover:bg-sky-600 text-white'
                    : 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black';

                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className={`w-full text-left px-1.5 py-1 rounded-lg text-[9.5px] font-black truncate block transition shadow-sm active:scale-95 ${pillStyle}`}
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

      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600 font-bold">
        <span>
          Totalt i {monthNamesSv[month]}: <strong className="text-slate-900">{monthBookings.length} bokningar</strong>
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