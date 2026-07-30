import { useState } from 'react';
import { supabase, type Booking, type Property, translateToSpanish } from '../lib/supabase';
import { TIME_WINDOWS, TIME_LABELS, formatDate } from '../lib/constants';
import {
  KeyRound,
  CalendarDays,
  Plus,
  Trash2,
  Loader2,
  Users,
  BedDouble,
  Sparkles,
  Clock,
  PlayCircle,
  Tag,
  MapPin,
  User,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface HostViewProps {
  bookings: Booking[];
  loading: boolean;
  onRefresh: () => void;
  lang?: 'sv' | 'en' | 'da';
}

const DICTIONARY = {
  sv: {
    selectProp: 'Välj Fastighet',
    enterCodeSub: 'Ange din hemliga kod för att ladda din bostad privat.',
    loadPropBtn: 'Ladda min fastighet',
    badCodeErr: 'Felaktig kod. Fråga Maria efter rätt fastighetskod.',
    activeProp: 'Aktiv bostad',
    hostLabel: 'Värd',
    bookNewTab: 'Boka ny städning',
    myBookingsTab: 'Mina bokningar',
    bookingTitleLabel: 'Namn / Etikett på bokningen',
    bookingTitleHint: 'Syns bara för dig (Maria ser inte detta namn).',
    step1Title: '1. Tidigast start',
    vacantNow: 'Bostaden står tom nu (Maria kan starta direkt)',
    startDateLabel: 'Tidigaste startdatum *',
    timeWindowLabel: 'Tidsfönster för start',
    morning: 'Förmiddag',
    afternoon: 'Eftermiddag',
    evening: 'Kväll',
    step2Title: '2. Deadline (Nästa gästs ankomst)',
    noNextGuest: 'Ingen ny gäst bokad ännu (Flexibel städning)',
    nextGuestLabel: 'Nästa gästs ankomst *',
    step3Title: '3. Information om bostaden',
    guestsLabel: 'Antal gäster',
    laundryLabel: 'Tvätt av sängkläder?',
    yes: 'JA',
    no: 'NEJ',
    instructionsLabel: 'Instruktioner till Maria (Översätts automatiskt till spanska)',
    saveBtn: 'SPARA STÄDUPPDRAG',
    savedSuccess: 'Städuppdrag sparat!',
    noBookingsYet: 'Inga bokade städuppdrag ännu.',
  },
  en: {
    selectProp: 'Select Property',
    enterCodeSub: 'Enter your secret code to load your property privately.',
    loadPropBtn: 'Load my property',
    badCodeErr: 'Incorrect code. Ask Maria for the correct property code.',
    activeProp: 'Active property',
    hostLabel: 'Host',
    bookNewTab: 'Book new cleaning',
    myBookingsTab: 'My bookings',
    bookingTitleLabel: 'Booking Name / Label',
    bookingTitleHint: 'Only visible to you (Maria does not see this name).',
    step1Title: '1. Earliest start',
    vacantNow: 'The property is vacant now (Maria can start immediately)',
    startDateLabel: 'Earliest start date *',
    timeWindowLabel: 'Start time window',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    step2Title: '2. Deadline (Next guest arrival)',
    noNextGuest: 'No next guest booked yet (Flexible cleaning)',
    nextGuestLabel: 'Next guest arrival *',
    step3Title: '3. Property information',
    guestsLabel: 'Number of guests',
    laundryLabel: 'Bed linen laundry?',
    yes: 'YES',
    no: 'NO',
    instructionsLabel: 'Instructions for Maria (Automatically translated to Spanish)',
    saveBtn: 'SAVE CLEANING JOB',
    savedSuccess: 'Cleaning job saved!',
    noBookingsYet: 'No booked cleaning jobs yet.',
  },
  da: {
    selectProp: 'Vælg Ejendom',
    enterCodeSub: 'Indtast din hemmelige kode for at indlæse din bolig privat.',
    loadPropBtn: 'Indlæs min ejendom',
    badCodeErr: 'Forkert kode. Spørg Maria om den korrekte ejendomskode.',
    activeProp: 'Aktiv bolig',
    hostLabel: 'Vært',
    bookNewTab: 'Bestil ny rengøring',
    myBookingsTab: 'Mine bookinger',
    bookingTitleLabel: 'Navn / Mærke på bookingen',
    bookingTitleHint: 'Kun synlig for dig (Maria ser ikke dette navn).',
    step1Title: '1. Tidligste start',
    vacantNow: 'Boligen står tom nu (Maria kan starte med det samme)',
    startDateLabel: 'Tidligste startdato *',
    timeWindowLabel: 'Tidsvindue for start',
    morning: 'Formiddag',
    afternoon: 'Eftermiddag',
    evening: 'Aften',
    step2Title: '2. Deadline (Næste gæsts ankomst)',
    noNextGuest: 'Ingen ny gæst booket endnu (Fleksibel rengøring)',
    nextGuestLabel: 'Næste gæsts ankomst *',
    step3Title: '3. Information om boligen',
    guestsLabel: 'Antal gæster',
    laundryLabel: 'Vask af sengelinned?',
    yes: 'JA',
    no: 'NEJ',
    instructionsLabel: 'Instruktioner til Maria (Oversættes automatisk til spansk)',
    saveBtn: 'GEM RENGØRINGSOPGAVE',
    savedSuccess: 'Rengøringsopgave gemt!',
    noBookingsYet: 'Ingen bookede rengøringsopgaver endnu.',
  },
};

const QUICK_NOTES = [
  'Nyckel i kodboxen',
  'Extra handdukar finns i garderoben',
  'Tvätta sängkläder extra noga',
  'Släng soporna på balkongen',
];

export default function HostView({ bookings, loading, onRefresh, lang = 'sv' }: HostViewProps) {
  const t = DICTIONARY[lang];

  const [activeView, setActiveView] = useState<'form' | 'list'>('form');
  const [passcode, setPasscode] = useState('');
  const [verifiedProperty, setVerifiedProperty] = useState<Property | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const [bookingTitle, setBookingTitle] = useState('');

  // 1. Start
  const [vacantNow, setVacantNow] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTimeWindow, setStartTimeWindow] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  // 2. Deadline
  const [noNextGuest, setNoNextGuest] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTimeWindow, setDeadlineTimeWindow] = useState<'morning' | 'afternoon' | 'evening' | ''>('afternoon');

  // 3. Info
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
    setStartDate('');
    setDeadlineDate('');
    setVacantNow(false);
    setNoNextGuest(false);
    setNotes('');
    setGuests(2);
    setLaundry(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!verifiedProperty) {
      setError('Please verify property code first.');
      return;
    }

    const effectiveStartDate = vacantNow ? new Date().toISOString().split('T')[0] : startDate;

    if (!vacantNow && !effectiveStartDate) {
      setError('Please select earliest start date.');
      return;
    }

    if (!noNextGuest && !deadlineDate) {
      setError('Please select deadline date.');
      return;
    }

    setSubmitting(true);

    let notesEs = '';
    if (notes.trim()) {
      notesEs = await translateToSpanish(notes.trim());
    }

    const payload = {
      property_name: verifiedProperty.name,
      property_address: verifiedProperty.address || verifiedProperty.name,
      host_name: verifiedProperty.host_name || (verifiedProperty.name !== verifiedProperty.address ? verifiedProperty.name : null),
      booking_title: bookingTitle.trim() || null,
      departure_date: effectiveStartDate,
      departure_time_window: startTimeWindow,
      vacant_now: vacantNow,
      no_next_guest: noNextGuest,
      next_arrival_date: noNextGuest ? null : deadlineDate || null,
      next_arrival_time_window: noNextGuest || !deadlineTimeWindow ? null : deadlineTimeWindow,
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
    onRefresh();
  };

  const myBookings = verifiedProperty
    ? bookings.filter((b) => b.property_name === verifiedProperty.name)
    : [];

  return (
    <div className="max-w-xl mx-auto px-4 space-y-6">
      {!verifiedProperty ? (
        /* KODINMATNING */
        <section className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-5">
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
          <div className="bg-gradient-to-r from-emerald-950/80 via-slate-800 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-4">
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

            <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 text-xs font-extrabold">
              <button
                type="button"
                onClick={() => setActiveView('form')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
                  activeView === 'form' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4" /> {t.bookNewTab}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
                  activeView === 'list' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDays className="w-4 h-4" /> {t.myBookingsTab} ({myBookings.length})
              </button>
            </div>
          </div>

          {activeView === 'form' ? (
            /* BOKA FORMULÄR */
            <section className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-emerald-600" /> {t.bookingTitleLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="T.ex. 'Guests' or 'July booking'"
                    value={bookingTitle}
                    onChange={(e) => setBookingTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 font-bold outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                  <p className="text-[11px] text-slate-400 pl-1">{t.bookingTitleHint}</p>
                </div>

                {/* STEG 1 */}
                <div className="bg-slate-50 border border-slate-200/90 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-md shadow-amber-500/20">
                      1
                    </div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <PlayCircle className="w-4 h-4 text-amber-500" /> {t.step1Title}
                    </h3>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm hover:border-amber-400 transition">
                    <input
                      type="checkbox"
                      checked={vacantNow}
                      onChange={(e) => setVacantNow(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span className="text-xs font-extrabold text-slate-800">
                      {t.vacantNow}
                    </span>
                  </label>

                  {!vacantNow && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.startDateLabel}</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-extrabold text-slate-900 outline-none focus:border-amber-500"
                          required={!vacantNow}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.timeWindowLabel}</label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-xl">
                          {TIME_WINDOWS.map((tw) => (
                            <button
                              key={tw}
                              type="button"
                              onClick={() => setStartTimeWindow(tw)}
                              className={`py-1.5 text-[10px] font-extrabold rounded-lg transition ${
                                startTimeWindow === tw
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
                  )}
                </div>

                {/* STEG 2 */}
                <div className="bg-slate-50 border border-slate-200/90 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <div className="w-7 h-7 rounded-full bg-sky-500 text-white font-black text-xs flex items-center justify-center shadow-md shadow-sky-500/20">
                      2
                    </div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-sky-500" /> {t.step2Title}
                    </h3>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm hover:border-sky-400 transition">
                    <input
                      type="checkbox"
                      checked={noNextGuest}
                      onChange={(e) => setNoNextGuest(e.target.checked)}
                      className="w-4 h-4 text-sky-500 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="text-xs font-extrabold text-slate-800">
                      {t.noNextGuest}
                    </span>
                  </label>

                  {!noNextGuest && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.nextGuestLabel}</label>
                        <input
                          type="date"
                          value={deadlineDate}
                          onChange={(e) => setDeadlineDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-extrabold text-slate-900 outline-none focus:border-sky-500"
                          required={!noNextGuest}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.timeWindowLabel}</label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-xl">
                          {TIME_WINDOWS.map((tw) => (
                            <button
                              key={tw}
                              type="button"
                              onClick={() => setDeadlineTimeWindow(deadlineTimeWindow === tw ? '' : tw)}
                              className={`py-1.5 text-[10px] font-extrabold rounded-lg transition ${
                                deadlineTimeWindow === tw
                                  ? 'bg-sky-500 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {tw === 'morning' ? t.morning : tw === 'afternoon' ? t.afternoon : t.evening}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* STEG 3 */}
                <div className="bg-slate-50 border border-slate-200/90 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-emerald-600/20">
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
          ) : (
            /* LISTA */
            <section className="space-y-3">
              {myBookings.length === 0 ? (
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-700/50 text-slate-400 flex items-center justify-center mx-auto">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">{t.noBookingsYet}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myBookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-3 text-white"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-3">
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                          {b.booking_title || 'Cleaning job'}
                        </span>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Start</span>
                          <span className="font-black text-white">
                            {b.vacant_now ? 'Vacant now' : formatDate(b.departure_date, 'sv')}{" "}
                            ({TIME_LABELS.sv[b.departure_time_window as keyof typeof TIME_LABELS.sv] || b.departure_time_window})
                          </span>
                        </div>

                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Deadline</span>
                          <span className="font-black text-white">
                            {b.no_next_guest || !b.next_arrival_date ? 'Flexible' : formatDate(b.next_arrival_date, 'sv')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}