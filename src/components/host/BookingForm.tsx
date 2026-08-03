import { useState } from 'react';
import {
  supabase,
  translateToSpanish,
  type Property,
  type Booking,
  type DepartureTimeWindow,
  type ArrivalTimeWindow,
} from '../../lib/supabase';
import { formatDate, APP_CONFIG } from '../../lib/constants';
import type { HostLanguage } from '../HostView';
import {
  Loader2,
  Calendar,
  Clock,
  User,
  Users,
  FileText,
  Check,
  AlertCircle,
  MessageSquare,
  MapPin,
  Lock,
} from 'lucide-react';

interface BookingFormProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onBookingCreated: () => void;
  lang?: HostLanguage;
}

const formTexts = {
  sv: {
    title: 'Skapa Ny Gästbokning',
    property: 'Fastighet',
    locked: 'Låst',
    guestTitle: 'Gästens namn / Bokningens titel *',
    guestPlaceholder: 'T.ex. Familjen Svensson',
    checkInDate: 'Incheckning (Datum) *',
    exactArrival: 'Exakt ankomsttid (frivilligt)',
    arrivalWindow: 'Ankomstfönster (Tid på dagen) *',
    morning: 'Förmiddag',
    afternoon: 'Eftermiddag',
    evening: 'Kväll',
    checkOutDate: 'Utcheckning (Datum) *',
    exactDeparture: 'Exakt utcheckningstid (frivilligt)',
    departureWindow: 'Utcheckningsfönster (Städstart) *',
    guestsCount: 'Antal gäster',
    laundryLabel: 'Sängkläder & Tvätt?',
    laundryYes: '🧺 Ja, tvätta lakan/handdukar',
    laundryNo: '🚫 Nej, ingen tvätt',
    notesLabel: 'Instruktioner till Maria',
    notesPlaceholder: 'T.ex. Kom ihåg att ställa ut terrassmöblerna...',
    notesHelp: 'Texten översätts automatiskt till spanska.',
    saveBtn: 'Spara & Schemalägg Städning',
    savedTitle: 'Bokningen är sparad!',
    savedSub: 'Klicka nedan för att skicka notis till Maria på WhatsApp.',
    whatsappBtn: 'Skicka WhatsApp-notis till Maria nu',
    errNoProperty: 'Hittade ingen giltig fastighet.',
    errRequired: 'Fyll i alla obligatoriska fält (Gästnamn, Incheckning och Utcheckning).',
    errWindowRequired: 'Vänligen välj ett ankomstfönster och ett utcheckningsfönster.',
    errDepartureBeforeArrival: 'Utcheckningsdatumet kan inte vara före incheckningsdatumet.',
  },
  en: {
    title: 'Create New Guest Booking',
    property: 'Property',
    locked: 'Locked',
    guestTitle: 'Guest Name / Booking Title *',
    guestPlaceholder: 'E.g. The Smith Family',
    checkInDate: 'Check-in (Date) *',
    exactArrival: 'Exact arrival time (optional)',
    arrivalWindow: 'Arrival Window (Time of day) *',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    checkOutDate: 'Check-out (Date) *',
    exactDeparture: 'Exact departure time (optional)',
    departureWindow: 'Departure Window (Cleaning start) *',
    guestsCount: 'Number of guests',
    laundryLabel: 'Bed linen & Laundry?',
    laundryYes: '🧺 Yes, wash linen/towels',
    laundryNo: '🚫 No laundry',
    notesLabel: 'Instructions for Maria',
    notesPlaceholder: 'E.g. Remember to put out the terrace furniture...',
    notesHelp: 'Text is automatically translated to Spanish.',
    saveBtn: 'Save & Schedule Cleaning',
    savedTitle: 'Booking saved!',
    savedSub: 'Click below to notify Maria on WhatsApp.',
    whatsappBtn: 'Send WhatsApp notification to Maria now',
    errNoProperty: 'No valid property found.',
    errRequired: 'Please fill in all required fields (Guest Name, Check-in, and Check-out).',
    errWindowRequired: 'Please select an arrival window and a departure window.',
    errDepartureBeforeArrival: 'Check-out date cannot be before check-in date.',
  },
  da: {
    title: 'Opret ny gæstebooking',
    property: 'Ejendom',
    locked: 'Låst',
    guestTitle: 'Gæstens navn / Bookingens titel *',
    guestPlaceholder: 'F.eks. Familien Hansen',
    checkInDate: 'Indtjekning (Dato) *',
    exactArrival: 'Præcis ankomsttid (valgfrit)',
    arrivalWindow: 'Ankomstvindue (Tid på dagen) *',
    morning: 'Formiddag',
    afternoon: 'Eftermiddag',
    evening: 'Aften',
    checkOutDate: 'Udtjekning (Dato) *',
    exactDeparture: 'Præcis udtjekningstid (valgfrit)',
    departureWindow: 'Udtjekningsvindue (Rengøringsstart) *',
    guestsCount: 'Antal gæster',
    laundryLabel: 'Sengelinned & Vask?',
    laundryYes: '🧺 Ja, vask linned/håndklæder',
    laundryNo: '🚫 Ingen vask',
    notesLabel: 'Instruktioner til Maria',
    notesPlaceholder: 'F.eks. Husk at stille terrassemøblerne ud...',
    notesHelp: 'Teksten oversættes automatisk til spansk.',
    saveBtn: 'Gem & planlæg rengøring',
    savedTitle: 'Bookingen er gemt!',
    savedSub: 'Klik nedenfor for at sende besked til Maria på WhatsApp.',
    whatsappBtn: 'Send WhatsApp-notifikation til Maria nu',
    errNoProperty: 'Ingen gyldig ejendom fundet.',
    errRequired: 'Udfyld venligst alle obligatoriske felter (Gæstenavn, Indtjekning og Udtjekning).',
    errWindowRequired: 'Vælg venligst et ankomstvindue og et udtjekningsvindue.',
    errDepartureBeforeArrival: 'Udtjekningsdatoen kan ikke være før indtjekningsdatoen.',
  },
};

function getTimeWindowFromExactTime(timeStr: string): ArrivalTimeWindow | DepartureTimeWindow | null {
  if (!timeStr) return null;
  const [hoursStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) return null;

  if (hours < 12) return 'morning';
  if (hours < 18) return 'afternoon';
  return 'evening';
}

export default function BookingForm({ properties, selectedPropertyId, onBookingCreated, lang = 'sv' }: BookingFormProps) {
  const txt = formTexts[lang] || formTexts.sv;

  const currentProperty = properties.find((p) => p.id === selectedPropertyId) || properties[0];
  const [propertyId, setPropertyId] = useState(currentProperty?.id || '');

  const [bookingTitle, setBookingTitle] = useState('');

  // Incheckning
  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTimeWindow, setCheckInTimeWindow] = useState<ArrivalTimeWindow | ''>('');
  const [checkInExactTime, setCheckInExactTime] = useState('');

  // Utcheckning
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTimeWindow, setCheckOutTimeWindow] = useState<DepartureTimeWindow | ''>('');
  const [checkOutExactTime, setCheckOutExactTime] = useState('');

  const [guests, setGuests] = useState(2);
  const [laundry, setLaundry] = useState(true);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const handleArrivalExactTimeChange = (timeValue: string) => {
    setCheckInExactTime(timeValue);
    const autoWindow = getTimeWindowFromExactTime(timeValue);
    if (autoWindow) {
      setCheckInTimeWindow(autoWindow as ArrivalTimeWindow);
    }
  };

  const handleDepartureExactTimeChange = (timeValue: string) => {
    setCheckOutExactTime(timeValue);
    const autoWindow = getTimeWindowFromExactTime(timeValue);
    if (autoWindow) {
      setCheckOutTimeWindow(autoWindow as DepartureTimeWindow);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCreatedBooking(null);

    const prop = properties.find((p) => p.id === (selectedPropertyId || propertyId)) || currentProperty;
    if (!prop) {
      setErrorMsg(txt.errNoProperty);
      return;
    }

    if (!checkInDate || !checkOutDate || !bookingTitle.trim()) {
      setErrorMsg(txt.errRequired);
      return;
    }

    if (!checkInTimeWindow || !checkOutTimeWindow) {
      setErrorMsg(txt.errWindowRequired);
      return;
    }

    if (checkOutDate < checkInDate) {
      setErrorMsg(txt.errDepartureBeforeArrival);
      return;
    }

    setSubmitting(true);

    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id, booking_title, check_out_date, check_in_date')
      .eq('property_name', prop.name);

    if (existingBookings && existingBookings.length > 0) {
      const overlappingBooking = existingBookings.find((b) => {
        if (!b.check_out_date || !b.check_in_date) return false;
        return checkOutDate < b.check_in_date && b.check_out_date < checkInDate;
      });

      if (overlappingBooking) {
        setSubmitting(false);
        setErrorMsg(
          `Det finns redan en krockande bokning ("${overlappingBooking.booking_title}") för ${prop.name} mellan datumen ${formatDate(overlappingBooking.check_in_date, lang)} och ${formatDate(overlappingBooking.check_out_date, lang)}.`
        );
        return;
      }
    }

    let notesEs: string | null = null;
    const cleanNotes = notes.trim();

    if (cleanNotes) {
      try {
        const safeTextToTranslate = cleanNotes.length > 450 ? cleanNotes.slice(0, 450) : cleanNotes;
        const translated = await translateToSpanish(safeTextToTranslate);

        if (
          translated &&
          !translated.toUpperCase().includes('QUERY LENGTH LIMIT') &&
          !translated.toUpperCase().includes('MYMEMORY')
        ) {
          notesEs = translated;
        } else {
          notesEs = cleanNotes;
        }
      } catch (e) {
        notesEs = cleanNotes;
      }
    }

    const newBookingData = {
      property_name: prop.name,
      property_address: prop.address || prop.name,
      host_name: prop.host_name || 'Värd',
      booking_title: bookingTitle.trim(),
      check_in_date: checkInDate,
      check_in_time_window: checkInTimeWindow,
      check_in_exact_time: checkInExactTime.trim() || null,
      check_out_date: checkOutDate,
      check_out_time_window: checkOutTimeWindow,
      check_out_exact_time: checkOutExactTime.trim() || null,
      guests: Number(guests) || 1,
      laundry: laundry,
      notes: cleanNotes || null,
      notes_es: notesEs || null,
      status: 'pending' as const,
      no_next_guest: false,
    };

    const { data, error } = await supabase.from('bookings').insert(newBookingData).select('*');

    setSubmitting(false);

    if (error) {
      setErrorMsg(`Error: ${error.message}`);
    } else {
      const inserted = data && data.length > 0 ? (data[0] as Booking) : (newBookingData as Booking);
      setCreatedBooking(inserted);

      setBookingTitle('');
      setCheckInDate('');
      setCheckInTimeWindow('');
      setCheckInExactTime('');
      setCheckOutDate('');
      setCheckOutTimeWindow('');
      setCheckOutExactTime('');
      setNotes('');
      onBookingCreated();
    }
  };

  const getWhatsAppUrl = (b: Booking) => {
    const phone = APP_CONFIG.mariaPhoneNumber || '34600000000';
    const depDate = formatDate(b.check_out_date, 'es');
    const depTime = b.check_out_exact_time ? `kl ${b.check_out_exact_time}` : '';
    const arrDate = formatDate(b.check_in_date, 'es');
    const arrTime = b.check_in_exact_time ? `kl ${b.check_in_exact_time}` : '';
    const notesText = b.notes_es || b.notes;

    const msg = `¡Hola Maria! 🧹
Nueva reserva para gestionar en CleanBook:

📍 *Propiedad:* ${b.property_name} (${b.property_address || b.property_name})
📅 *Salida (Limpieza):* ${depDate} ${depTime}
📅 *Entrada del huésped:* ${arrDate} ${arrTime}
👥 *Huéspedes:* ${b.guests}
🧺 *Lavar:* ${b.laundry ? 'SÍ' : 'NO'}
${notesText ? `📝 *Instrucciones:* ${notesText}\n` : ''}
Por favor, entra en CleanBook para aceptar la tarea.`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4">
      {createdBooking && (
        <div className="bg-emerald-500 text-slate-950 p-5 rounded-3xl space-y-3 shadow-xl border border-emerald-400 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <Check className="w-6 h-6 bg-slate-950 text-emerald-400 p-1 rounded-full shrink-0" />
            <div>
              <h4 className="font-black text-sm text-slate-950">{txt.savedTitle}</h4>
              <p className="text-xs font-bold opacity-90">{txt.savedSub}</p>
            </div>
          </div>

          <a
            href={getWhatsAppUrl(createdBooking)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-950 hover:bg-slate-900 text-emerald-400 font-black py-3.5 px-4 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg active:scale-98"
          >
            <MessageSquare className="w-4 h-4 fill-emerald-400 text-slate-950" />
            {txt.whatsappBtn}
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-200">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900">{txt.title}</h3>
        </div>

        <div className="space-y-4 text-xs">
          {selectedPropertyId ? (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{txt.property}</span>
                <p className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  {currentProperty?.name}
                  {currentProperty?.address && (
                    <span className="text-xs font-bold text-slate-500">· {currentProperty.address}</span>
                  )}
                </p>
              </div>
              <span className="text-[10px] font-extrabold bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full border border-sky-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-sky-600" /> {txt.locked}
              </span>
            </div>
          ) : (
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {txt.property} *
              </label>
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
              <User className="w-3.5 h-3.5 text-slate-500" /> {txt.guestTitle}
            </label>
            <input
              type="text"
              placeholder={txt.guestPlaceholder}
              value={bookingTitle}
              onChange={(e) => setBookingTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-sky-500 transition"
              required
            />
          </div>

          {/* INCHECKNING (GÄST ANKOMMER) */}
          <div className="bg-sky-50/60 p-3.5 rounded-2xl border border-sky-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-sky-900 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" /> {txt.checkInDate}
                </label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-sky-900 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-600" /> {txt.exactArrival}
                </label>
                <input
                  type="time"
                  value={checkInExactTime}
                  onChange={(e) => handleArrivalExactTimeChange(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-sky-950 mb-1.5 text-[11px]">{txt.arrivalWindow}</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCheckInTimeWindow('morning')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    checkInTimeWindow === 'morning'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                      : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  🌅 {txt.morning}
                </button>
                <button
                  type="button"
                  onClick={() => setCheckInTimeWindow('afternoon')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    checkInTimeWindow === 'afternoon'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                      : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  ☀️ {txt.afternoon}
                </button>
                <button
                  type="button"
                  onClick={() => setCheckInTimeWindow('evening')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    checkInTimeWindow === 'evening'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                      : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  🌙 {txt.evening}
                </button>
              </div>
            </div>
          </div>

          {/* UTCHECKNING / STÄDSTART */}
          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> {txt.checkOutDate}
                </label>
                <input
                  type="date"
                  value={checkOutDate}
                  min={checkInDate || undefined}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> {txt.exactDeparture}
                </label>
                <input
                  type="time"
                  value={checkOutExactTime}
                  onChange={(e) => handleDepartureExactTimeChange(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-amber-950 mb-1.5 text-[11px]">{txt.departureWindow}</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCheckOutTimeWindow('morning')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    checkOutTimeWindow === 'morning'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  🌅 {txt.morning}
                </button>
                <button
                  type="button"
                  onClick={() => setCheckOutTimeWindow('afternoon')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    checkOutTimeWindow === 'afternoon'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  ☀️ {txt.afternoon}
                </button>
                <button
                  type="button"
                  onClick={() => setCheckOutTimeWindow('evening')}
                  className={`py-2.5 px-2 text-xs font-extrabold rounded-xl border transition text-center ${
                    checkOutTimeWindow === 'evening'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  🌙 {txt.evening}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" /> {txt.guestsCount}
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
              <label className="block font-bold text-slate-700 mb-1">{txt.laundryLabel}</label>
              <button
                type="button"
                onClick={() => setLaundry(!laundry)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  laundry
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {laundry ? txt.laundryYes : txt.laundryNo}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> {txt.notesLabel}
            </label>
            <textarea
              rows={3}
              placeholder={txt.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:bg-white focus:border-sky-500 transition"
            />
            <p className="text-[10px] text-slate-400 mt-1">{txt.notesHelp}</p>
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
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {txt.saveBtn}
        </button>
      </form>
    </div>
  );
}