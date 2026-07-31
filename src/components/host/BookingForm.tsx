import { useState } from 'react';
import { supabase, translateToSpanish, type Property, type Booking, type DepartureTimeWindow, type ArrivalTimeWindow } from '../../lib/supabase';
import { formatDate, APP_CONFIG } from '../../lib/constants';
import { Loader2, Calendar, Clock, User, Users, FileText, Check, AlertCircle, MessageSquare, Building, Lock } from 'lucide-react';

interface BookingFormProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onBookingCreated: () => void;
}

// Hjälpfunktion för att räkna ut tidsfönster från exakt klockslag
function getTimeWindowFromExactTime(timeStr: string): ArrivalTimeWindow | DepartureTimeWindow | null {
  if (!timeStr) return null;
  const [hoursStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) return null;

  if (hours < 12) return 'morning';
  if (hours < 18) return 'afternoon';
  return 'evening';
}

export default function BookingForm({ properties, selectedPropertyId, onBookingCreated }: BookingFormProps) {
  // Lås till den inloggade fastigheten
  const currentProperty = properties.find((p) => p.id === selectedPropertyId) || properties[0];
  const [propertyId, setPropertyId] = useState(currentProperty?.id || '');

  const [bookingTitle, setBookingTitle] = useState('');
  
  // Incheckning
  const [nextArrivalDate, setNextArrivalDate] = useState('');
  const [arrivalTimeWindow, setArrivalTimeWindow] = useState<ArrivalTimeWindow>('afternoon');
  const [arrivalExactTime, setArrivalExactTime] = useState('');
  
  // Utcheckning / Städstart
  const [departureDate, setDepartureDate] = useState('');
  const [departureTimeWindow, setDepartureTimeWindow] = useState<DepartureTimeWindow>('morning');
  const [departureExactTime, setDepartureExactTime] = useState('');
  
  const [guests, setGuests] = useState(2);
  const [laundry, setLaundry] = useState(true);
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  // Hantera exakt ankomsttid och sätt tidsfönster automatiskt
  const handleArrivalExactTimeChange = (timeValue: string) => {
    setArrivalExactTime(timeValue);
    const autoWindow = getTimeWindowFromExactTime(timeValue);
    if (autoWindow) {
      setArrivalTimeWindow(autoWindow as ArrivalTimeWindow);
    }
  };

  // Hantera exakt utcheckningstid och sätt tidsfönster automatiskt
  const handleDepartureExactTimeChange = (timeValue: string) => {
    setDepartureExactTime(timeValue);
    const autoWindow = getTimeWindowFromExactTime(timeValue);
    if (autoWindow) {
      setDepartureTimeWindow(autoWindow as DepartureTimeWindow);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCreatedBooking(null);

    const prop = properties.find((p) => p.id === (selectedPropertyId || propertyId)) || currentProperty;
    if (!prop) {
      setErrorMsg('Hittade ingen giltig fastighet.');
      return;
    }

    if (!nextArrivalDate || !departureDate || !bookingTitle.trim()) {
      setErrorMsg('Fyll i alla obligatoriska fält (Gästnamn, Incheckning och Utcheckning).');
      return;
    }

    if (departureDate < nextArrivalDate) {
      setErrorMsg('Utcheckningsdatumet (städstart) kan inte vara före incheckningsdatumet.');
      return;
    }

    setSubmitting(true);

    let notesEs = '';
    if (notes.trim()) {
      notesEs = await translateToSpanish(notes.trim());
    }

    const newBookingData = {
      property_name: prop.name,
      property_address: prop.address || prop.name,
      host_name: prop.host_name || 'Värd',
      booking_title: bookingTitle.trim(),
      next_arrival_date: nextArrivalDate,
      next_arrival_time_window: arrivalTimeWindow,
      arrival_exact_time: arrivalExactTime.trim() || null,
      departure_date: departureDate,
      departure_time_window: departureTimeWindow,
      departure_exact_time: departureExactTime.trim() || null,
      guests: Number(guests) || 1,
      laundry: laundry,
      notes: notes.trim() || null,
      notes_es: notesEs || null,
      status: 'pending' as const,
      no_next_guest: false,
    };

    const { data, error } = await supabase.from('bookings').insert(newBookingData).select('*');

    setSubmitting(false);

    if (error) {
      setErrorMsg(`Kunde inte skapa bokningen: ${error.message}`);
    } else {
      const inserted = data ? (data[0] as Booking) : (newBookingData as Booking);
      setCreatedBooking(inserted);
      
      // Återställ formuläret
      setBookingTitle('');
      setNextArrivalDate('');
      setArrivalExactTime('');
      setDepartureDate('');
      setDepartureExactTime('');
      setNotes('');
      onBookingCreated();
    }
  };

  const getWhatsAppUrl = (b: Booking) => {
    const phone = APP_CONFIG.mariaPhoneNumber || '46721886174';
    const depDate = formatDate(b.departure_date, 'es');
    const depTime = b.departure_exact_time ? `kl ${b.departure_exact_time}` : '';
    const arrDate = formatDate(b.next_arrival_date, 'es');
    const arrTime = b.arrival_exact_time ? `kl ${b.arrival_exact_time}` : '';
    const notesText = b.notes_es || b.notes;

    const msg = 
`¡Hola Maria! 🧹
Nueva reserva para gestionar en CleanBook:

📍 *Propiedad:* ${b.property_name} (${b.property_address || b.property_name})
📅 *Salida (Limpieza):* ${depDate} ${depTime}
📅 *Próxima entrada:* ${arrDate} ${arrTime}
👥 *Huéspedes:* ${b.guests}
🧺 *Lavar:* ${b.laundry ? 'SÍ' : 'NO'}
${notesText ? `📝 *Instrucciones:* ${notesText}\n` : ''}
Por favor, entra en CleanBook para aceptar la tarea.`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4">
      {/* LYCKAD BOKNING MODAL / BOX */}
      {createdBooking && (
        <div className="bg-emerald-500 text-slate-950 p-5 rounded-3xl space-y-3 shadow-xl border border-emerald-400">
          <div className="flex items-center gap-2">
            <Check className="w-6 h-6 bg-slate-950 text-emerald-400 p-1 rounded-full shrink-0" />
            <div>
              <h4 className="font-black text-sm text-slate-950">Bokningen är sparad!</h4>
              <p className="text-xs font-bold opacity-90">Klicka nedan för att skicka notis till Maria på WhatsApp.</p>
            </div>
          </div>

          <a
            href={getWhatsAppUrl(createdBooking)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-950 hover:bg-slate-900 text-emerald-400 font-black py-3.5 px-4 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
          >
            <MessageSquare className="w-4 h-4 fill-emerald-400 text-slate-950" />
            Skicka WhatsApp-notis till Maria nu
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-200">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900">Skapa Ny Gästbokning</h3>
        </div>

        <div className="space-y-4 text-xs">
          {/* LÅST FASTIGHET */}
          {selectedPropertyId ? (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Fastighet</span>
                <p className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-sky-600 shrink-0" />
                  {currentProperty?.name}
                  {currentProperty?.address && <span className="text-xs font-bold text-slate-500">· {currentProperty.address}</span>}
                </p>
              </div>
              <span className="text-[10px] font-extrabold bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full border border-sky-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-sky-600" /> Låst
              </span>
            </div>
          ) : (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fastighet *</label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-sky-500 transition"
                required
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.address})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" /> Gästens namn / Bokningens titel *
            </label>
            <input
              type="text"
              placeholder="T.ex. Familjen Svensson"
              value={bookingTitle}
              onChange={(e) => setBookingTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-sky-500 transition"
              required
            />
          </div>

          {/* INCHECKNING (NÄSTA GÄST ANKOMMER) */}
          <div className="bg-sky-50/60 p-3.5 rounded-2xl border border-sky-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-sky-900 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" /> Incheckning (Datum) *
                </label>
                <input
                  type="date"
                  value={nextArrivalDate}
                  onChange={(e) => setNextArrivalDate(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-sky-900 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-600" /> Exakt ankomsttid (frivilligt)
                </label>
                <input
                  type="time"
                  value={arrivalExactTime}
                  onChange={(e) => handleArrivalExactTimeChange(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* KNAPPAR FÖR ANKOMSTTID */}
            <div>
              <label className="block font-bold text-sky-950 mb-1.5 text-[11px]">
                Ankomstfönster (Tid på dagen): *
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setArrivalTimeWindow('morning')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    arrivalTimeWindow === 'morning'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                      : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  🌅 Förmiddag
                </button>
                <button
                  type="button"
                  onClick={() => setArrivalTimeWindow('afternoon')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    arrivalTimeWindow === 'afternoon'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                      : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  ☀️ Eftermiddag
                </button>
                <button
                  type="button"
                  onClick={() => setArrivalTimeWindow('evening')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    arrivalTimeWindow === 'evening'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                      : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  🌙 Kväll
                </button>
              </div>
            </div>
          </div>

          {/* UTCHECKNING / STÄDSTART */}
          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> Utcheckning (Datum) *
                </label>
                <input
                  type="date"
                  value={departureDate}
                  min={nextArrivalDate || undefined}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Exakt utcheckningstid (frivilligt)
                </label>
                <input
                  type="time"
                  value={departureExactTime}
                  onChange={(e) => handleDepartureExactTimeChange(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* KNAPPAR FÖR UTCHECKNINGSTID */}
            <div>
              <label className="block font-bold text-amber-950 mb-1.5 text-[11px]">
                Utcheckningsfönster (Städstart): *
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDepartureTimeWindow('morning')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    departureTimeWindow === 'morning'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  🌅 Förmiddag
                </button>
                <button
                  type="button"
                  onClick={() => setDepartureTimeWindow('afternoon')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    departureTimeWindow === 'afternoon'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  ☀️ Eftermiddag
                </button>
                <button
                  type="button"
                  onClick={() => setDepartureTimeWindow('evening')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    departureTimeWindow === 'evening'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  🌙 Kväll
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" /> Antal gäster
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Sängkläder & Tvätt?</label>
              <button
                type="button"
                onClick={() => setLaundry(!laundry)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  laundry
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {laundry ? '🧺 Ja, tvätta lakan/handdukar' : '🚫 Nej, ingen tvätt'}
              </button>
            </div>
          </div>

          {/* INSTRUKTIONER TILL MARIA */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> Instruktioner till Maria (Svenska)
            </label>
            <textarea
              rows={2}
              placeholder="T.ex. Kom ihåg att ställa ut terrassmöblerna..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:bg-white focus:border-sky-500 transition"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Texten du skriver översätts automatiskt till spanska så att Maria förstår instruktionerna.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Spara & Schemalägg Städning
        </button>
      </form>
    </div>
  );
}