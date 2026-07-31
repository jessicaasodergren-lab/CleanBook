import { useState } from 'react';
import { supabase, type Booking, type Incident, type Property, translateToSpanish } from '../lib/supabase';
import { TIME_LABELS, formatDate } from '../lib/constants';
import {
  KeyRound,
  CalendarDays,
  Plus,
  Trash2,
  Loader2,
  Users,
  BedDouble,
  Sparkles,
  MapPin,
  User,
  CheckCircle2,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  X,
  LogIn,
  LogOut as LogOutIcon,
} from 'lucide-react';

interface HostViewProps {
  bookings: Booking[];
  incidents?: Incident[];
  loading: boolean;
  onRefresh: () => void;
  lang?: 'sv' | 'en' | 'da';
}

function parsePhotos(photoUrl: string | null): string[] {
  if (!photoUrl) return [];
  try {
    if (photoUrl.startsWith('[')) {
      return JSON.parse(photoUrl) as string[];
    }
  } catch (e) {
    // Om inte JSON
  }
  return [photoUrl];
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DICTIONARY = {
  sv: {
    selectProp: 'Välj Fastighet',
    enterCodeSub: 'Ange din hemliga kod för att ladda din bostad privat.',
    loadPropBtn: 'Ladda min fastighet',
    badCodeErr: 'Felaktig kod. Fråga Maria efter rätt fastighetskod.',
    activeProp: 'Aktiv bostad',
    hostLabel: 'Värd',
    bookNewTab: 'Ny gästbokning',
    myBookingsTab: 'Mina bokningar',
    calendarTab: 'Kalender',
    todayBtn: 'I dag',
    bookingTitleLabel: 'Gästens namn / Bokningsnamn *',
    bookingTitleHint: 'T.ex. Amanda Alvin eller Peters grabbgäng',
    step1Title: '1. Gästens Ankomst (Incheckning)',
    step2Title: '2. Gästens Avresa (Utcheckning = Städstart)',
    checkInDateLabel: 'Incheckningsdatum *',
    checkOutDateLabel: 'Utcheckningsdatum *',
    timeWindowLabel: 'Tidsfönster',
    exactTimeLabel: 'Exakt klockslag (Valfritt)',
    exactTimePlaceholder: 'Ex. 10:30 eller 14:00',
    morning: 'Förmiddag',
    afternoon: 'Eftermiddag',
    evening: 'Kväll',
    step3Title: '3. Information om bostaden',
    guestsLabel: 'Antal gäster',
    laundryLabel: 'Tvätt av sängkläder?',
    yes: 'JA',
    no: 'NEJ',
    instructionsLabel: 'Instruktioner till Maria (Översätts automatiskt till spanska)',
    saveBtn: 'SPARA GÄSTBOKNING & STÄDNING',
    savedSuccess: 'Gästbokning sparad!',
    noBookingsYet: 'Inga bokade gäster ännu.',
    statusFinished: '✓ Utförd',
    statusPending: '⏳ Väntar på städning',
    incidentsTitle: 'Rapporterade foton / avvikelser',
    photosWord: 'foton',
    photoWord: 'foto',
    daysOfWeek: ['MÅN', 'TIS', 'ONS', 'TORS', 'FRE', 'LÖR', 'SÖN'],
  },
  en: {
    selectProp: 'Select Property',
    enterCodeSub: 'Enter your secret code to load your property privately.',
    loadPropBtn: 'Load my property',
    badCodeErr: 'Incorrect code. Ask Maria for the correct property code.',
    activeProp: 'Active property',
    hostLabel: 'Host',
    bookNewTab: 'New Guest Booking',
    myBookingsTab: 'My bookings',
    calendarTab: 'Calendar',
    todayBtn: 'Today',
    bookingTitleLabel: 'Guest Name / Booking Title *',
    bookingTitleHint: 'E.g. Amanda Alvin or Smith Family',
    step1Title: '1. Guest Arrival (Check-in)',
    step2Title: '2. Guest Departure (Check-out = Cleaning Start)',
    checkInDateLabel: 'Check-in date *',
    checkOutDateLabel: 'Check-out date *',
    timeWindowLabel: 'Time window',
    exactTimeLabel: 'Exact time (Optional)',
    exactTimePlaceholder: 'E.g. 10:30 AM or 14:00',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    step3Title: '3. Property information',
    guestsLabel: 'Number of guests',
    laundryLabel: 'Bed linen laundry?',
    yes: 'YES',
    no: 'NO',
    instructionsLabel: 'Instructions for Maria (Automatically translated to Spanish)',
    saveBtn: 'SAVE GUEST BOOKING',
    savedSuccess: 'Guest booking saved!',
    noBookingsYet: 'No guest bookings yet.',
    statusFinished: '✓ Completed',
    statusPending: '⏳ Pending cleaning',
    incidentsTitle: 'Reported photos / incidents',
    photosWord: 'photos',
    photoWord: 'photo',
    daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  },
  da: {
    selectProp: 'Vælg Ejendom',
    enterCodeSub: 'Indtast din hemmelige kode for at indlæse din bolig privat.',
    loadPropBtn: 'Indlæs min ejendom',
    badCodeErr: 'Forkert kode. Spørg Maria om den korrekte ejendomskode.',
    activeProp: 'Aktiv bolig',
    hostLabel: 'Vært',
    bookNewTab: 'Ny gæstebooking',
    myBookingsTab: 'Mine bookinger',
    calendarTab: 'Kalender',
    todayBtn: 'I dag',
    bookingTitleLabel: 'Gæstens navn / Bookingnavn *',
    bookingTitleHint: 'F.eks. Amanda Alvin eller Familien Hansen',
    step1Title: '1. Gæstens Ankomst (Tjek-ind)',
    step2Title: '2. Gæstens Afrejse (Tjek-ud = Rengøringsstart)',
    checkInDateLabel: 'Tjek-ind dato *',
    checkOutDateLabel: 'Tjek-ud dato *',
    timeWindowLabel: 'Tidsvindue',
    exactTimeLabel: 'Præcist tidspunkt (Valgfrit)',
    exactTimePlaceholder: 'F.eks. 10:30 eller 14:00',
    morning: 'Formiddag',
    afternoon: 'Eftermiddag',
    evening: 'Aften',
    step3Title: '3. Information om boligen',
    guestsLabel: 'Antal gæster',
    laundryLabel: 'Vask af sengelinned?',
    yes: 'JA',
    no: 'NEJ',
    instructionsLabel: 'Instruktioner til Maria (Oversættes automatisk til spansk)',
    saveBtn: 'GEM GÆSTEBOOKING',
    savedSuccess: 'Gæstebooking gemt!',
    noBookingsYet: 'Ingen gæstebookinger endnu.',
    statusFinished: '✓ Udført',
    statusPending: '⏳ Venter på rengøring',
    incidentsTitle: 'Rapporterede fotos / hændelser',
    photosWord: 'fotos',
    photoWord: 'foto',
    daysOfWeek: ['MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR', 'SØN'],
  },
};

const QUICK_NOTES = [
  'Nyckel i kodboxen',
  'Extra handdukar finns i garderoben',
  'Tvätta sängkläder extra noga',
  'Släng soporna på balkongen',
];

export default function HostView({ bookings, incidents = [], loading, onRefresh, lang = 'sv' }: HostViewProps) {
  const t = DICTIONARY[lang];

  const [activeView, setActiveView] = useState<'form' | 'list' | 'calendar'>('form');
  const [passcode, setPasscode] = useState('');
  const [verifiedProperty, setVerifiedProperty] = useState<Property | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [selectedCalendarBooking, setSelectedCalendarBooking] = useState<Booking | null>(null);

  // KALENDER TILLSTÅND
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // BOKNINGSFORMULÄR TILLSTÅND
  const [bookingTitle, setBookingTitle] = useState('');
  
  // INCHECKNING (ANKOMST)
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTimeWindow, setArrivalTimeWindow] = useState<'morning' | 'afternoon' | 'evening'>('afternoon');
  const [arrivalExactTime, setArrivalExactTime] = useState('');

  // UTCHECKNING (AVRESA)
  const [departureDate, setDepartureDate] = useState('');
  const [departureTimeWindow, setDepartureTimeWindow] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [departureExactTime, setDepartureExactTime] = useState('');

  // INFO
  const [guests, setGuests] = useState(2);
  const [laundry, setLaundry] = useState(true);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleVerifyPasscode = async () => {
    if (!passcode.trim()) return;
    setVerifying(true);
    setPasscodeError(null);

    const { data, error: fetchErr } = await supabase
      .from('properties')
      .select('*')
      .eq('passcode', passcode.trim().toUpperCase())
      .single();

    setVerifying(false);
    if (fetchErr || !data) {
      setPasscodeError(t.badCodeErr);
      setVerifiedProperty(null);
    } else {
      setVerifiedProperty(data as Property);
    }
  };

  const resetForm = () => {
    setBookingTitle('');
    setArrivalDate('');
    setArrivalExactTime('');
    setDepartureDate('');
    setDepartureExactTime('');
    setNotes('');
    setGuests(2);
    setLaundry(true);
  };

  const toggleExpandBooking = (id: string) => {
    setExpandedBookingId((prev) => (prev === id ? null : id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!verifiedProperty) {
      setError('Please verify property code first.');
      return;
    }

    if (!bookingTitle.trim()) {
      setError('Ange gästens namn eller bokningsnamn.');
      return;
    }

    if (!arrivalDate) {
      setError('Ange incheckningsdatum.');
      return;
    }

    if (!departureDate) {
      setError('Ange utcheckningsdatum.');
      return;
    }

    if (departureDate < arrivalDate) {
      setError('Utcheckningsdatum kan inte vara före incheckningsdatum.');
      return;
    }

    setSubmitting(true);

    let notesEs = '';
    if (notes.trim()) {
      notesEs = await translateToSpanish(notes.trim());
    }

    // SPARA GÄSTBOKNING I SUPABASE
    const payload = {
      property_name: verifiedProperty.name,
      property_address: verifiedProperty.address || verifiedProperty.name,
      host_name: verifiedProperty.host_name || (verifiedProperty.name !== verifiedProperty.address ? verifiedProperty.name : null),
      booking_title: bookingTitle.trim(),
      
      // INCHECKNING (När gästen kommer)
      next_arrival_date: arrivalDate,
      next_arrival_time_window: arrivalTimeWindow,
      arrival_exact_time: arrivalExactTime.trim() || null,

      // UTCHECKNING (När gästen åker = städstart)
      departure_date: departureDate,
      departure_time_window: departureTimeWindow,
      departure_exact_time: departureExactTime.trim() || null,

      vacant_now: false,
      no_next_guest: true, // Beräknas automatiskt dynamiskt utifrån nästa bokning!
      
      guests: Number(guests) || 1,
      laundry,
      notes: notes.trim() || null,
      notes_es: notesEs || null,
    };

    const { error: insertError } = await supabase.from('bookings').insert(payload);

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    resetForm();
    onRefresh();
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('bookings').delete().eq('id', id);
    if (selectedCalendarBooking?.id === id) setSelectedCalendarBooking(null);
    onRefresh();
  };

  // SORTERA BOKNINGAR FALLANDE UTIFRÅN INCHECKNING/AVRESA
  const myBookings = verifiedProperty
    ? bookings
        .filter((b) => b.property_name === verifiedProperty.name)
        .sort((a, b) => {
          const dateA = a.next_arrival_date || a.departure_date || '';
          const dateB = b.next_arrival_date || b.departure_date || '';
          return dateB.localeCompare(dateA);
        })
    : [];

  // KALENDER TILLSTÅND OCH GENERERING
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex < 0) firstDayIndex = 6;

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const calendarDays: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    calendarDays.push({ date: d, isCurrentMonth: false });
  }

  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i);
    calendarDays.push({ date: d, isCurrentMonth: true });
  }

  const remainingSlots = 7 - (calendarDays.length % 7);
  if (remainingSlots < 7) {
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(year, month + 1, i);
      calendarDays.push({ date: d, isCurrentMonth: false });
    }
  }

  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
  const goToday = () => setCalendarDate(new Date());

  const monthName = calendarDate.toLocaleDateString(
    lang === 'en' ? 'en-US' : lang === 'da' ? 'da-DK' : 'sv-SE',
    { month: 'long', year: 'numeric' }
  );

  const todayYMD = toYMD(new Date());

  return (
    <div className="max-w-[85rem] mx-auto px-4 space-y-6">
      {!verifiedProperty ? (
        /* KODINMATNING */
        <section className="max-w-xl mx-auto bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{t.selectProp}</h2>
              <p className="text-xs text-slate-400">{t.enterCodeSub}</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <input
              type="text"
              placeholder="Ex. GV45"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.toUpperCase())}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 font-mono text-sm font-bold text-white uppercase tracking-widest outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            <button
              type="button"
              onClick={handleVerifyPasscode}
              disabled={verifying}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm py-3.5 rounded-2xl transition shadow-lg shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t.loadPropBtn} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>

          {passcodeError && (
            <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
              {passcodeError}
            </p>
          )}
        </section>
      ) : (
        /* INLOGGAD VY */
        <div className="space-y-6">
          {/* BANNER MED FLIKAR */}
          <div className="max-w-xl mx-auto bg-gradient-to-r from-emerald-950/80 via-slate-800 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-2 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {t.activeProp}
                </span>
                <h2 className="text-2xl font-black text-white">{verifiedProperty.name}</h2>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {verifiedProperty.address}
                </p>
              </div>

              {verifiedProperty.host_name && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">{t.hostLabel}</span>
                  <span className="text-xs font-extrabold text-white flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-400" /> {verifiedProperty.host_name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 text-xs font-extrabold gap-1">
              <button
                type="button"
                onClick={() => setActiveView('form')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeView === 'form' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4" /> {t.bookNewTab}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeView === 'list' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDays className="w-4 h-4" /> {t.myBookingsTab} ({myBookings.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveView('calendar')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeView === 'calendar' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-4 h-4" /> {t.calendarTab}
              </button>
            </div>
          </div>

          {activeView === 'form' ? (
            /* FORMULÄR: NY GÄSTBOKNING */
            <section className="max-w-xl mx-auto bg-white text-slate-900 rounded-3xl p-6 shadow-2xl space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-800 block">
                    {t.bookingTitleLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="T.ex. 'Amanda Alvin' eller 'Peters grabbgäng'"
                    value={bookingTitle}
                    onChange={(e) => setBookingTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 font-bold outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    required
                  />
                  <p className="text-[11px] text-slate-400 pl-1">{t.bookingTitleHint}</p>
                </div>

                {/* STEG 1: GÄSTENS ANKOMST (INCHECKNING) */}
                <div className="bg-slate-50 border border-slate-200/90 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                      <LogIn className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      {t.step1Title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.checkInDateLabel}</label>
                      <input
                        type="date"
                        value={arrivalDate}
                        onChange={(e) => setArrivalDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-extrabold text-slate-900 outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.timeWindowLabel}</label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-xl">
                        {(['morning', 'afternoon', 'evening'] as const).map((tw) => (
                          <button
                            key={tw}
                            type="button"
                            onClick={() => setArrivalTimeWindow(tw)}
                            className={`py-1.5 text-[10px] font-extrabold rounded-lg transition ${
                              arrivalTimeWindow === tw
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {tw === 'morning' ? t.morning : tw === 'afternoon' ? t.afternoon : t.evening}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* EXAKT KLOCKSLAG FÖR INCHECKNING */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {t.exactTimeLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={t.exactTimePlaceholder}
                      value={arrivalExactTime}
                      onChange={(e) => setArrivalExactTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* STEG 2: GÄSTENS AVRESA (UTCHECKNING = STÄDSTART) */}
                <div className="bg-slate-50 border border-slate-200/90 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                      <LogOutIcon className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      {t.step2Title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.checkOutDateLabel}</label>
                      <input
                        type="date"
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-extrabold text-slate-900 outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.timeWindowLabel}</label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-xl">
                        {(['morning', 'afternoon', 'evening'] as const).map((tw) => (
                          <button
                            key={tw}
                            type="button"
                            onClick={() => setDepartureTimeWindow(tw)}
                            className={`py-1.5 text-[10px] font-extrabold rounded-lg transition ${
                              departureTimeWindow === tw
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {tw === 'morning' ? t.morning : tw === 'afternoon' ? t.afternoon : t.evening}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {t.exactTimeLabel}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex. kl 10:00 utcheckad"
                      value={departureExactTime}
                      onChange={(e) => setDepartureExactTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* STEG 3: INFO */}
                <div className="bg-slate-50 border border-slate-200/90 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-md">
                      3
                    </div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      {t.step3Title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> {t.guestsLabel}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5 text-slate-400" /> {t.laundryLabel}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setLaundry(true)}
                          className={`py-2 rounded-lg font-black text-xs transition ${
                            laundry ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t.yes}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLaundry(false)}
                          className={`py-2 rounded-lg font-black text-xs transition ${
                            !laundry ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t.no}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                      {t.instructionsLabel} <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_NOTES.map((qn) => (
                        <button
                          key={qn}
                          type="button"
                          onClick={() => setNotes((prev) => (prev ? `${prev}. ${qn}` : qn))}
                          className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 px-3 py-1.5 rounded-full border border-slate-200 hover:border-emerald-300 transition shadow-sm"
                        >
                          + {qn}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t.savedSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm py-4 rounded-2xl transition shadow-xl shadow-emerald-600/30 active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {t.saveBtn}
                </button>
              </form>
            </section>
          ) : activeView === 'list' ? (
            /* KOMPAKT LISTA */
            <section className="max-w-xl mx-auto space-y-3">
              {myBookings.length === 0 ? (
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-700/50 text-slate-400 flex items-center justify-center mx-auto">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">{t.noBookingsYet}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myBookings.map((b) => {
                    const isFinished = b.status === 'finished';
                    const bookingIncidents = incidents.filter((i) => i.booking_id === b.id);
                    const isExpanded = expandedBookingId === b.id;

                    const totalPhotosCount = bookingIncidents.reduce((acc, inc) => {
                      return acc + parsePhotos(inc.photo_url).length;
                    }, 0);

                    return (
                      <div
                        key={b.id}
                        className={`bg-slate-800/80 border rounded-3xl overflow-hidden shadow-xl transition-all ${
                          isFinished ? 'border-emerald-500/40' : 'border-slate-700/80'
                        }`}
                      >
                        <div
                          onClick={() => toggleExpandBooking(b.id)}
                          className="p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/90 transition select-none"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isFinished ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase border border-emerald-500/30">
                                  <Check className="w-3 h-3 text-emerald-400" /> {t.statusFinished}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase border border-amber-500/30">
                                  {t.statusPending}
                                </span>
                              )}

                              {totalPhotosCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black uppercase border border-sky-500/30">
                                  <Camera className="w-3 h-3 text-sky-400" /> {totalPhotosCount} {totalPhotosCount === 1 ? t.photoWord : t.photosWord}
                                </span>
                              )}
                            </div>

                            <h4 className="font-extrabold text-white text-base truncate">
                              {b.booking_title || 'Gästbokning'}
                            </h4>

                            <p className="text-xs text-slate-300 font-medium">
                              Vistelse: <span className="text-white font-bold">{formatDate(b.next_arrival_date || b.departure_date, 'sv')} ➔ {formatDate(b.departure_date, 'sv')}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(b.id);
                              }}
                              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="text-slate-400">
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-emerald-400" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 border-t border-slate-700/60 bg-slate-900/40 space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 space-y-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Gästens Ankomst (Incheckning)</span>
                                <span className="font-bold text-white">
                                  {formatDate(b.next_arrival_date || b.departure_date, 'sv')}{" "}
                                  {b.arrival_exact_time ? `(kl ${b.arrival_exact_time})` : ''}
                                </span>
                              </div>

                              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 space-y-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Gästens Avresa (Städstart)</span>
                                <span className="font-bold text-white">
                                  {formatDate(b.departure_date, 'sv')}{" "}
                                  {b.departure_exact_time ? `(kl ${b.departure_exact_time})` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 space-y-1 text-slate-300">
                              <p><span className="font-bold text-white">Gäster:</span> {b.guests} personer/gäster</p>
                              <p><span className="font-bold text-white">Tvätt av sängkläder:</span> {b.laundry ? 'JA' : 'NEJ'}</p>
                              {b.notes && <p><span className="font-bold text-white">Instruktioner till Maria:</span> {b.notes}</p>}
                            </div>

                            {/* FOTOGALLERI */}
                            {bookingIncidents.length > 0 && (
                              <div className="space-y-2 pt-1">
                                <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5" /> {t.incidentsTitle} ({bookingIncidents.length})
                                </span>

                                <div className="space-y-2">
                                  {bookingIncidents.map((inc) => {
                                    const photoList = parsePhotos(inc.photo_url);

                                    return (
                                      <div key={inc.id} className="bg-slate-900/90 p-3 rounded-2xl border border-amber-500/30 space-y-2">
                                        {photoList.length > 0 && (
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {photoList.map((url, idx) => (
                                              <img
                                                key={idx}
                                                src={url}
                                                alt={`Photo ${idx + 1}`}
                                                className="w-full h-32 object-cover rounded-xl border border-slate-700 hover:scale-105 transition"
                                              />
                                            ))}
                                          </div>
                                        )}
                                        <p className="text-xs text-slate-200 font-medium leading-relaxed">{inc.note}</p>
                                        <span className="text-[10px] text-slate-400 block">
                                          {formatDate(inc.created_at, 'sv')}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            /* GOOGLE CALENDAR MÅNADSKALENDER (VISAR GÄSTVISTELSER) */
            <section className="bg-white text-slate-900 rounded-3xl p-4 md:p-6 shadow-2xl space-y-4 border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goToday}
                    className="px-3.5 py-1.5 rounded-full border border-slate-300 hover:bg-slate-100 text-xs font-extrabold text-slate-700 transition"
                  >
                    {t.todayBtn}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="text-lg md:text-xl font-black text-slate-900 capitalize">
                    {monthName}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center font-black text-[11px] text-slate-400 tracking-wider">
                {t.daysOfWeek.map((day, idx) => (
                  <div key={idx} className="py-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 border-t border-l border-slate-200 rounded-2xl overflow-hidden text-xs">
                {calendarDays.map((cell, idx) => {
                  const dYMD = toYMD(cell.date);
                  const isToday = dYMD === todayYMD;

                  // BOKNINGAR/GÄSTER SOM BOR PÅ DETTA DATUM (Från Incheckning till Utcheckning)
                  const dayBookings = myBookings.filter((b) => {
                    const checkIn = b.next_arrival_date || b.departure_date;
                    const checkOut = b.departure_date;
                    if (!checkIn || !checkOut) return false;
                    return dYMD >= checkIn && dYMD <= checkOut;
                  });

                  return (
                    <div
                      key={idx}
                      className={`min-h-[90px] md:min-h-[110px] p-1 md:p-1.5 border-r border-b border-slate-200 flex flex-col justify-start transition ${
                        cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                      }`}
                    >
                      <div className="flex justify-start mb-1">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isToday
                              ? 'bg-blue-600 text-white font-black shadow-sm'
                              : cell.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                      </div>

                      <div className="space-y-1 overflow-y-auto max-h-[75px] scrollbar-none">
                        {dayBookings.map((b) => {
                          const isFinished = b.status === 'finished';

                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setSelectedCalendarBooking(b)}
                              className={`w-full text-left px-2 py-1 rounded-md text-[10px] font-bold truncate transition shadow-xs flex items-center gap-1 ${
                                isFinished
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                              }`}
                              title={`${b.booking_title} (${b.next_arrival_date} ➔ ${b.departure_date})`}
                            >
                              <span className="truncate">{b.booking_title || 'Gäst'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* MODAL FÖR VALD BOKNING I KALENDERN */}
          {selectedCalendarBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
              <div className="bg-slate-800 text-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-700 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                      {selectedCalendarBooking.status === 'finished' ? t.statusFinished : t.statusPending}
                    </span>
                    <h3 className="font-black text-lg text-white mt-1">
                      {selectedCalendarBooking.booking_title || 'Gästbokning'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedCalendarBooking(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-700/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Gästens Incheckning</span>
                    <span className="font-bold text-white">
                      {formatDate(selectedCalendarBooking.next_arrival_date || selectedCalendarBooking.departure_date, 'sv')}{" "}
                      {selectedCalendarBooking.arrival_exact_time ? `(kl ${selectedCalendarBooking.arrival_exact_time})` : ''}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Gästens Utcheckning (Städstart)</span>
                    <span className="font-bold text-white">
                      {formatDate(selectedCalendarBooking.departure_date, 'sv')}{" "}
                      {selectedCalendarBooking.departure_exact_time ? `(kl ${selectedCalendarBooking.departure_exact_time})` : ''}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700 space-y-1 text-slate-300">
                    <p><span className="font-bold text-white">Gäster:</span> {selectedCalendarBooking.guests} personer</p>
                    <p><span className="font-bold text-white">Tvätt:</span> {selectedCalendarBooking.laundry ? 'JA' : 'NEJ'}</p>
                    {selectedCalendarBooking.notes && <p><span className="font-bold text-white">Instruktion:</span> {selectedCalendarBooking.notes}</p>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCalendarBooking(null)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-xs transition"
                >
                  Stäng
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}