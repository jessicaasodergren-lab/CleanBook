// src/components/host/BookingForm.tsx
import { useState } from 'react';
import {
  supabase,
  type Property,
  type Booking,
  type DepartureTimeWindow,
  type ArrivalTimeWindow,
} from '../../lib/supabase';
import { bookingService } from '../../services/bookingService';
import { getBookingWhatsAppUrl } from '../../utils/whatsapp';
import { formatDate } from '../../lib/constants';
import { translations } from '../../i18n/translations';
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
  properties?: Property[];
  selectedPropertyId?: string | null;
  propertyName?: string;
  propertyAddress?: string;
  propertyId?: string;
  existingBookings?: Booking[];
  onBookingCreated?: () => void;
  onSuccess?: () => void;
  lang?: HostLanguage;
}

function getTimeWindowFromExactTime(timeStr: string): ArrivalTimeWindow | DepartureTimeWindow | null {
  if (!timeStr) return null;
  const [hoursStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) return null;

  if (hours < 12) return 'morning';
  if (hours < 18) return 'afternoon';
  return 'evening';
}

export default function BookingForm({
  properties = [],
  selectedPropertyId,
  propertyName,
  propertyAddress,
  propertyId: directPropertyId,
  existingBookings: initialBookings = [],
  onBookingCreated,
  onSuccess,
  lang = 'sv',
}: BookingFormProps) {
  const txt = translations.bookingForm[lang] || translations.bookingForm.sv;

  const effectiveProperties: Property[] = properties.length > 0
    ? properties
    : directPropertyId
    ? [{ id: directPropertyId, name: propertyName || '', address: propertyAddress || '', host_name: 'Värd' } as Property]
    : [];

  const currentProperty = effectiveProperties.find((p) => p.id === (selectedPropertyId || directPropertyId)) || effectiveProperties[0];
  const [propertyId, setPropertyId] = useState(currentProperty?.id || directPropertyId || '');

  const [bookingTitle, setBookingTitle] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTimeWindow, setCheckInTimeWindow] = useState<ArrivalTimeWindow | ''>('');
  const [checkInExactTime, setCheckInExactTime] = useState('');

  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTimeWindow, setCheckOutTimeWindow] = useState<DepartureTimeWindow | ''>('');
  const [checkOutExactTime, setCheckOutExactTime] = useState('');

  const [guests, setGuests] = useState(2);
  const [laundry, setLaundry] = useState(true);
  const [notes, setNotes] = useState('');
  const [sendWhatsAppDirectly, setSendWhatsAppDirectly] = useState(false);

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

    const prop = effectiveProperties.find((p) => p.id === (selectedPropertyId || propertyId || directPropertyId)) || currentProperty;
    if (!prop) {
      setErrorMsg(txt.errNoProperty);
      return;
    }

    if (!checkInDate || !checkOutDate) {
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

    try {
      let candidateBookings: { id?: string; booking_title?: string; check_in_date: string; check_out_date: string }[] = [...initialBookings];

      const { data: dbBookings, error: fetchErr } = await supabase
        .from('bookings')
        .select('id, booking_title, check_out_date, check_in_date, property_id, property_name')
        .or(`property_id.eq.${prop.id},property_name.eq.${prop.name}`);

      if (fetchErr) {
        console.error('Fel vid hämtning av existerande bokningar för överlappskontroll:', fetchErr);
      }

      if (dbBookings && dbBookings.length > 0) {
        const map = new Map();
        [...candidateBookings, ...dbBookings].forEach((b) => {
          if (b.id) map.set(b.id, b);
        });
        candidateBookings = Array.from(map.values());
      }

      if (candidateBookings.length > 0) {
        const newStart = checkInDate.trim();
        const newEnd = checkOutDate.trim();

        const overlappingBooking = candidateBookings.find((b) => {
          if (!b.check_out_date || !b.check_in_date) return false;

          const existingStart = b.check_in_date.split('T')[0].trim();
          const existingEnd = b.check_out_date.split('T')[0].trim();

          return newStart < existingEnd && newEnd > existingStart;
        });

        if (overlappingBooking) {
          setSubmitting(false);
          const titleStr = overlappingBooking.booking_title?.trim()
            ? ` ("${overlappingBooking.booking_title}")`
            : '';
          setErrorMsg(
            `Det finns redan en krockande bokning${titleStr} för ${prop.name} mellan datumen ${formatDate(overlappingBooking.check_in_date, lang)} och ${formatDate(overlappingBooking.check_out_date, lang)}.`
          );
          return;
        }
      }

      const inserted = await bookingService.createBooking({
        property_id: prop.id,
        property_name: prop.name,
        property_address: prop.address || prop.name,
        host_name: prop.host_name || 'Värd',
        booking_title: bookingTitle.trim(),
        check_in_date: checkInDate,
        check_in_time_window: checkInTimeWindow as ArrivalTimeWindow,
        check_in_exact_time: checkInExactTime.trim() || null,
        check_out_date: checkOutDate,
        check_out_time_window: checkOutTimeWindow as DepartureTimeWindow,
        check_out_exact_time: checkOutExactTime.trim() || null,
        guests: Number(guests) || 1,
        laundry: laundry,
        notes: notes.trim() || null,
        no_next_guest: false,
      });

      setCreatedBooking(inserted);

      if (sendWhatsAppDirectly) {
        const waUrl = getBookingWhatsAppUrl(inserted);
        window.open(waUrl, '_blank');
      }

      setBookingTitle('');
      setCheckInDate('');
      setCheckInTimeWindow('');
      setCheckInExactTime('');
      setCheckOutDate('');
      setCheckOutTimeWindow('');
      setCheckOutExactTime('');
      setNotes('');
      setSendWhatsAppDirectly(false);
      
      if (onBookingCreated) onBookingCreated();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
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
            href={getBookingWhatsAppUrl(createdBooking)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-950 hover:bg-slate-900 text-emerald-400 font-black py-3.5 px-4 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg active:scale-98"
          >
            <MessageSquare className="w-4 h-4 fill-emerald-400 text-slate-950" />
            {txt.whatsappBtn}
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white text-slate-900 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-200">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900">{txt.title}</h3>
        </div>

        <div className="space-y-4 text-xs">
          {(selectedPropertyId || directPropertyId) ? (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{txt.property}</span>
                <p className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  {currentProperty?.name || propertyName}
                  {(currentProperty?.address || propertyAddress) && (
                    <span className="text-xs font-bold text-slate-500">· {currentProperty?.address || propertyAddress}</span>
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
                {effectiveProperties.map((p) => (
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
            />
          </div>

          {/* INCHECKNING: Datum & Ankomsttid bredvid varandra även på mobil */}
          <div className="bg-sky-50/60 p-3.5 rounded-2xl border border-sky-100 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-sky-900 mb-1 truncate flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="truncate">{txt.checkInDate}</span>
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
                <label className="block font-bold text-sky-900 mb-1 truncate flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="truncate">{txt.exactArrival}</span>
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
                  className={`py-2.5 px-1 sm:px-2 text-[11px] sm:text-xs font-extrabold rounded-xl border transition text-center ${
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
                  className={`py-2.5 px-1 sm:px-2 text-[11px] sm:text-xs font-extrabold rounded-xl border transition text-center ${
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
                  className={`py-2.5 px-1 sm:px-2 text-[11px] sm:text-xs font-extrabold rounded-xl border transition text-center ${
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

          {/* UTCHECKNING: Datum & Utcheckningstid bredvid varandra även på mobil */}
          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-amber-900 mb-1 truncate flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">{txt.checkOutDate}</span>
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
                <label className="block font-bold text-amber-900 mb-1 truncate flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">{txt.exactDeparture}</span>
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
                  className={`py-2.5 px-1 sm:px-2 text-[11px] sm:text-xs font-extrabold rounded-xl border transition text-center ${
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
                  className={`py-2.5 px-1 sm:px-2 text-[11px] sm:text-xs font-extrabold rounded-xl border transition text-center ${
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
                  className={`py-2.5 px-1 sm:px-2 text-[11px] sm:text-xs font-extrabold rounded-xl border transition text-center ${
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

          {/* GÄSTER & TVÄTT: Bredvid varandra även på mobil */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1 truncate flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{txt.guestsCount}</span>
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
              <label className="block font-bold text-slate-700 mb-1 truncate">{txt.laundryLabel}</label>
              <button
                type="button"
                onClick={() => setLaundry(!laundry)}
                className={`w-full py-2.5 px-2 rounded-xl border text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${
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

          <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl flex items-center gap-2.5">
            <input
              type="checkbox"
              id="sendWhatsAppDirectly"
              checked={sendWhatsAppDirectly}
              onChange={(e) => setSendWhatsAppDirectly(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer shrink-0"
            />
            <label htmlFor="sendWhatsAppDirectly" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
              {txt.sendWhatsAppDirectly}
            </label>
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