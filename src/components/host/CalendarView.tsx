import { useState } from 'react';
import type { Booking } from '../../lib/supabase';
import { formatDate } from '../../lib/constants';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface CalendarViewProps {
  bookings: Booking[];
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

      <div className="grid grid-cols-7 text-center font-black text-[11px] text-slate-400 uppercase tracking-wider">
        <div>Mån</div><div>Tis</div><div>Ons</div><div>Tor</div><div>Fre</div><div>Lör</div><div>Sön</div>
      </div>

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
                {dayBookings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className="w-full text-left px-1.5 py-0.5 rounded text-[9px] font-black truncate block bg-sky-500 text-white hover:bg-sky-600 transition shadow-sm"
                  >
                    {b.booking_title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900">{selectedBooking.booking_title}</h3>
              <button onClick={() => setSelectedBooking(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="font-bold text-slate-500">{selectedBooking.property_address || selectedBooking.property_name}</p>

              <div className="bg-slate-50 p-3 rounded-xl space-y-1 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Incheckning:</span>
                  <span className="font-black">{formatDate(selectedBooking.next_arrival_date, 'sv')} (kl {selectedBooking.arrival_exact_time || '15:00'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Utcheckning:</span>
                  <span className="font-black">{formatDate(selectedBooking.departure_date, 'sv')} (kl {selectedBooking.departure_exact_time || '11:00'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Gäster:</span>
                  <span className="font-black">{selectedBooking.guests} st</span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950 font-bold">
                  {selectedBooking.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}