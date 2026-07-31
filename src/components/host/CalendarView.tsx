import { useState } from 'react';
import type { Booking } from '../../lib/supabase';
import { formatDate, APP_CONFIG, TIME_LABELS } from '../../lib/constants';
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
} from 'lucide-react';

interface CalendarViewProps {
  bookings: Booking[];
}

function getWhatsAppUrl(b: Booking): string {
  const phone = APP_CONFIG.mariaPhoneNumber || '46721886174';
  const depDate = formatDate(b.departure_date, 'es');
  const depTime = b.departure_exact_time ? `kl ${b.departure_exact_time}` : '';
  const arrDate = formatDate(b.next_arrival_date, 'es');
  const arrTime = b.arrival_exact_time ? `kl ${b.arrival_exact_time}` : '';
  const notesText = b.notes_es || b.notes;

  const msg = 
`¡Hola Maria! 🧹
Reserva en CleanBook:

📍 *Propiedad:* ${b.property_name} (${b.property_address || b.property_name})
📅 *Salida (Limpieza):* ${depDate} ${depTime}
📅 *Próxima entrada:* ${arrDate} ${arrTime}
👥 *Huéspedes:* ${b.guests}
🧺 *Lavar:* ${b.laundry ? 'SÍ' : 'NO'}
${notesText ? `📝 *Instrucciones:* ${notesText}\n` : ''}
Por favor, entra en CleanBook para aceptar la tarea.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export default function CalendarView({ bookings }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

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

  return (
    <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-5 border border-slate-200 space-y-4">
      {/* KALENDER HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-sky-600" />
          <h3 className="font-black text-slate-900 text-base">
            {monthNamesSv[month]} {year}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition mr-1"
          >
            Idag
          </button>
          <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* VECKODAGAR */}
      <div className="grid grid-cols-7 text-center font-black text-[11px] text-slate-400 uppercase tracking-wider">
        <div>Mån</div><div>Tis</div><div>Ons</div><div>Tor</div><div>Fre</div><div>Lör</div><div>Sön</div>
      </div>

      {/* KALENDERGRID */}
      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.map((item, idx) => {
          if (!item) return <div key={`empty-${idx}`} className="h-20 bg-slate-50/50 rounded-xl" />;

          const isToday = item.dateStr === todayStr;
          const dayBookings = bookings.filter((b) => {
            const start = b.next_arrival_date;
            const end = b.departure_date;
            if (!start || !end) return false;
            return item.dateStr >= start && item.dateStr <= end;
          });

          return (
            <div
              key={item.dateStr}
              className={`h-20 border rounded-xl p-1 flex flex-col justify-between overflow-hidden transition ${
                isToday ? 'border-sky-500 bg-sky-50/30' : 'border-slate-100 bg-slate-50/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-black w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-sky-600 text-white' : 'text-slate-700'
                  }`}
                >
                  {item.day}
                </span>
              </div>

              <div className="space-y-1 overflow-y-auto max-h-12">
                {dayBookings.map((b) => {
                  const isFinished = b.status === 'finished';
                  const isAccepted = b.status === 'accepted';
                  
                  // FÄRGKODADE REMSOR PÅ STATUS
                  const stripColor = isFinished
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : isAccepted
                    ? 'bg-sky-500 hover:bg-sky-600'
                    : 'bg-amber-500 hover:bg-amber-600';

                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[9px] font-black truncate block text-white transition shadow-sm ${stripColor}`}
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

      {/* BOKNINGSDETALJER MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            {/* TOPPHEADER */}
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
              {/* STATUS BADGE */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-500">Status för städning:</span>
                {selectedBooking.status === 'finished' && (
                  <span className="text-[11px] font-black px-3 py-1 rounded-full uppercase bg-emerald-600 text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Utförd städning
                  </span>
                )}
                {selectedBooking.status === 'accepted' && (
                  <span className="text-[11px] font-black px-3 py-1 rounded-full uppercase bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1">
                    <Clock3 className="w-3.5 h-3.5 text-sky-600" /> Accepterad av Maria
                  </span>
                )}
                {selectedBooking.status === 'pending' && (
                  <span className="text-[11px] font-black px-3 py-1 rounded-full uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    🟡 Väntar på Marias svar
                  </span>
                )}
              </div>

              {/* FASTIGHET & ADRESS */}
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

              {/* TIDER & TIDSFÖNSTER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-sky-50/70 p-3 rounded-2xl border border-sky-100 space-y-1">
                  <span className="text-[10px] font-bold text-sky-900 uppercase block">Incheckning</span>
                  <span className="font-black text-slate-900 block flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
                    {formatDate(selectedBooking.next_arrival_date, 'sv')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Fönster: {TIME_LABELS.sv[selectedBooking.next_arrival_time_window || 'afternoon']}
                  </span>
                  {selectedBooking.arrival_exact_time && (
                    <span className="text-[11px] font-bold text-slate-500 block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-600" /> Exakt: kl {selectedBooking.arrival_exact_time}
                    </span>
                  )}
                </div>

                <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100 space-y-1">
                  <span className="text-[10px] font-bold text-amber-900 uppercase block">Utcheckning / Städstart</span>
                  <span className="font-black text-slate-900 block flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-amber-600" />
                    {formatDate(selectedBooking.departure_date, 'sv')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Fönster: {TIME_LABELS.sv[selectedBooking.departure_time_window || 'morning']}
                  </span>
                  {selectedBooking.departure_exact_time && (
                    <span className="text-[11px] font-bold text-slate-500 block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> Exakt: kl {selectedBooking.departure_exact_time}
                    </span>
                  )}
                </div>
              </div>

              {/* GÄSTER & TVÄTT */}
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 font-bold">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>{selectedBooking.guests} gäster</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 font-bold">
                  <span>{selectedBooking.laundry ? '🧺 Tvätt: Ja' : '🚫 Ingen tvätt'}</span>
                </div>
              </div>

              {/* INSTRUKTIONER */}
              {selectedBooking.notes && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl space-y-1.5">
                  <span className="font-black text-amber-900 uppercase text-[10px] flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-600" /> Dina instruktioner:
                  </span>
                  <p className="font-bold text-amber-950 leading-relaxed whitespace-pre-line">
                    {selectedBooking.notes}
                  </p>
                  {selectedBooking.notes_es && (
                    <div className="pt-1.5 border-t border-amber-200/60">
                      <span className="text-[10px] font-extrabold text-amber-800 uppercase block">
                        Spansk översättning (till Maria):
                      </span>
                      <p className="font-medium text-amber-900 italic leading-relaxed">
                        {selectedBooking.notes_es}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* WHATSAPP KNAPP */}
              <div className="pt-2">
                <a
                  href={getWhatsAppUrl(selectedBooking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  Avisera Maria på WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}