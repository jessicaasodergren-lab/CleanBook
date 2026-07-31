import { useState } from 'react';
import { supabase, translateToSpanish, type Property } from '../../lib/supabase';
import { Loader2, Plus, Calendar, Clock, User, Users, FileText, Check, AlertCircle } from 'lucide-react';

interface BookingFormProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onBookingCreated: () => void;
}

export default function BookingForm({ properties, selectedPropertyId, onBookingCreated }: BookingFormProps) {
  const [propertyId, setPropertyId] = useState(selectedPropertyId || (properties[0]?.id || ''));
  const [bookingTitle, setBookingTitle] = useState('');
  const [nextArrivalDate, setNextArrivalDate] = useState('');
  const [arrivalExactTime, setArrivalExactTime] = useState('15:00');
  const [departureDate, setDepartureDate] = useState('');
  const [departureExactTime, setDepartureExactTime] = useState('11:00');
  const [guests, setGuests] = useState(2);
  const [laundry, setLaundry] = useState(true);
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const prop = properties.find((p) => p.id === propertyId) || properties[0];
    if (!prop) {
      setErrorMsg('Selecciona una propiedad válida.');
      return;
    }

    if (!nextArrivalDate || !departureDate || !bookingTitle.trim()) {
      setErrorMsg('Fyll i alla obligatoriska fält (Gästnamn, Ankomst- och Avresedatum).');
      return;
    }

    setSubmitting(true);

    let notesEs = '';
    if (notes.trim()) {
      notesEs = await translateToSpanish(notes.trim());
    }

    const { error } = await supabase.from('bookings').insert({
      property_name: prop.name,
      property_address: prop.address || prop.name,
      host_name: prop.host_name || 'Värd',
      booking_title: bookingTitle.trim(),
      next_arrival_date: nextArrivalDate,
      arrival_exact_time: arrivalExactTime || '15:00',
      next_arrival_time_window: 'afternoon',
      departure_date: departureDate,
      departure_exact_time: departureExactTime || '11:00',
      departure_time_window: 'morning',
      guests: Number(guests) || 1,
      laundry: laundry,
      notes: notes.trim() || null,
      notes_es: notesEs || null,
      status: 'pending',
    });

    setSubmitting(false);

    if (error) {
      setErrorMsg(`Kunde inte skapa bokningen: ${error.message}`);
    } else {
      setBookingTitle('');
      setNextArrivalDate('');
      setDepartureDate('');
      setNotes('');
      onBookingCreated();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-black">
          <Plus className="w-5 h-5" />
        </div>
        <h3 className="text-base font-black text-slate-900">Skapa Ny Gästbokning</h3>
      </div>

      <div className="space-y-3 text-xs">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-sky-50/50 p-3 rounded-2xl border border-sky-100">
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
              <Clock className="w-3.5 h-3.5 text-sky-600" /> Ankomsttid
            </label>
            <input
              type="time"
              value={arrivalExactTime}
              onChange={(e) => setArrivalExactTime(e.target.value)}
              className="w-full bg-white border border-sky-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
          <div>
            <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" /> Utcheckning / Städstart *
            </label>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Utcheckningstid
            </label>
            <input
              type="time"
              value={departureExactTime}
              onChange={(e) => setDepartureExactTime(e.target.value)}
              className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
            />
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
  );
}