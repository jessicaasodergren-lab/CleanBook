import { useState } from 'react';
import { supabase, type Booking, type Property, translateToSpanish } from '../lib/supabase';
import { TIME_WINDOWS, TIME_LABELS, formatDate } from '../lib/constants';
import {
  Users,
  BedDouble,
  ClipboardList,
  Check,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  KeyRound,
  CheckCircle2,
  Sparkles,
  Clock,
  Info,
  PlayCircle,
  Tag,
  CalendarDays,
} from 'lucide-react';

interface HostViewProps {
  bookings: Booking[];
  loading: boolean;
  onRefresh: () => void;
}

const QUICK_NOTES = [
  'Nyckel i kodboxen',
  'Extra handdukar finns i garderoben',
  'Tvätta sängkläder extra noga',
  'Släng soporna på balkongen',
];

export default function HostView({ bookings, loading, onRefresh }: HostViewProps) {
  const [activeView, setActiveView] = useState<'form' | 'list'>('form');
  const [passcode, setPasscode] = useState('');
  const [verifiedProperty, setVerifiedProperty] = useState<Property | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Namn på bokningen (internt för värden)
  const [bookingTitle, setBookingTitle] = useState('');

  // 1. Tidigast start
  const [vacantNow, setVacantNow] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTimeWindow, setStartTimeWindow] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  // 2. Deadline / Nästa ankomst
  const [noNextGuest, setNoNextGuest] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTimeWindow, setDeadlineTimeWindow] = useState<'morning' | 'afternoon' | 'evening' | ''>('afternoon');

  // 3. Information om uppdraget
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
      setPasscodeError('Felaktig kod. Fråga Maria efter rätt fastighetskod.');
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
      setError('Du måste ange och verifiera din fastighetskod först.');
      return;
    }

    const effectiveStartDate = vacantNow ? new Date().toISOString().split('T')[0] : startDate;

    if (!vacantNow && !effectiveStartDate) {
      setError('Ange tidigaste startdatum.');
      return;
    }

    if (!noNextGuest && !deadlineDate) {
      setError('Ange deadline (nästa ankomst) eller bocka i "Ingen ny gäst bokad ännu".');
      return;
    }

    setSubmitting(true);

    let notesEs = '';
    if (notes.trim()) {
      notesEs = await translateToSpanish(notes.trim());
    }

    const payload = {
      property_name: verifiedProperty.name,
      property_address: verifiedProperty.address,
      host_name: verifiedProperty.host_name || 'Värd',
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
      setError('Kunde inte spara städuppdraget: ' + insertError.message);
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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* KODVERIFIERING */}
      {!verifiedProperty ? (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-600" /> Välj Fastighet med Lösenord
          </h2>
          <p className="text-sm text-slate-600">
            Ange den hemliga fastighetskoden du fått av Maria.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="T.ex. GV45 eller BACH71"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.toUpperCase())}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 font-mono text-base font-bold text-slate-900 uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              type="button"
              onClick={handleVerifyPasscode}
              disabled={verifying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verifiera kod'}
            </button>
          </div>

          {passcodeError && <p className="text-sm text-red-600 font-medium bg-red-50 p-2.5 rounded-lg">{passcodeError}</p>}
        </section>
      ) : (
        /* FASTIGHETSBANNER & KNAPP */
        <div className="space-y-6">
          <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-700 font-bold uppercase">Inloggad fastighet</p>
              <h2 className="text-xl font-black text-emerald-950">{verifiedProperty.name}</h2>
              <p className="text-xs text-emerald-800">{verifiedProperty.address} {verifiedProperty.host_name ? `· Värd: ${verifiedProperty.host_name}` : ''}</p>
            </div>

            <button
              onClick={() => setActiveView(activeView === 'form' ? 'list' : 'form')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition"
            >
              {activeView === 'form' ? (
                <>
                  <CalendarDays className="w-4 h-4" />
                  <span>Se bokade datum ({myBookings.length})</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Boka ny städning</span>
                </>
              )}
            </button>
          </div>

          {activeView === 'form' ? (
            /* BOKA NYTT STÄDUPPDRAG */
            <section className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                
                {/* NAMN PÅ BOKNINGEN (ENBART FÖR VÄRDEN) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-emerald-600" /> Namn / Etikett på bokningen (Valfritt - visas bara för dig)
                  </label>
                  <input
                    type="text"
                    placeholder="T.ex. 'Gäster Svensson', 'Juli-bokning'"
                    value={bookingTitle}
                    onChange={(e) => setBookingTitle(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 1. TIDIGAST START */}
                <div className="bg-amber-50/80 p-5 rounded-2xl border-2 border-amber-300 space-y-3">
                  <h3 className="text-base font-black text-amber-950 flex items-center gap-2 border-b border-amber-200 pb-2">
                    <PlayCircle className="w-5 h-5 text-amber-600" /> 1. Tidigast start (När kan Maria tidigast påbörja städningen?)
                  </h3>

                  <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-3 rounded-xl border border-amber-300 shadow-sm">
                    <input
                      type="checkbox"
                      checked={vacantNow}
                      onChange={(e) => setVacantNow(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <span className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                      Maria kan påbörja städningen direkt (Bostaden står tom nu)
                    </span>
                  </label>

                  {!vacantNow && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Tidigaste startdatum *</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold"
                          required={!vacantNow}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Tidsfönster för start</label>
                        <div className="grid grid-cols-3 gap-1">
                          {TIME_WINDOWS.map((tw) => {
                            const isSelected = startTimeWindow === tw;
                            return (
                              <button
                                key={tw}
                                type="button"
                                onClick={() => setStartTimeWindow(tw)}
                                className={`py-2 px-1 text-xs font-bold rounded-lg transition border flex items-center justify-center gap-1 ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border-amber-700 shadow ring-2 ring-amber-500 scale-105'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {isSelected && '✓ '}
                                {tw === 'morning' ? 'Förmiddag' : tw === 'afternoon' ? 'Eftermiddag' : 'Kväll'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. DEADLINE */}
                <div className="bg-sky-50/80 p-5 rounded-2xl border-2 border-sky-300 space-y-3">
                  <h3 className="text-base font-black text-sky-950 flex items-center gap-2 border-b border-sky-200 pb-2">
                    <Clock className="w-5 h-5 text-sky-600" /> 2. Deadline (När kommer nästa gäst?)
                  </h3>

                  <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-3 rounded-xl border border-sky-300 shadow-sm">
                    <input
                      type="checkbox"
                      checked={noNextGuest}
                      onChange={(e) => setNoNextGuest(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <span className="text-sm font-bold text-sky-950 flex items-center gap-1">
                      <Info className="w-4 h-4 text-sky-600" /> Ingen ny gäst bokad ännu (Flexibel städning)
                    </span>
                  </label>

                  {!noNextGuest && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nästa gästs ankomstdatum *</label>
                        <input
                          type="date"
                          value={deadlineDate}
                          onChange={(e) => setDeadlineDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold"
                          required={!noNextGuest}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Senast klar tidpunkt</label>
                        <div className="grid grid-cols-3 gap-1">
                          {TIME_WINDOWS.map((tw) => {
                            const isSelected = deadlineTimeWindow === tw;
                            return (
                              <button
                                key={tw}
                                type="button"
                                onClick={() => setDeadlineTimeWindow(isSelected ? '' : tw)}
                                className={`py-2 px-1 text-xs font-bold rounded-lg transition border flex items-center justify-center gap-1 ${
                                  isSelected
                                    ? 'bg-sky-600 text-white border-sky-700 shadow ring-2 ring-sky-500 scale-105'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {isSelected && '✓ '}
                                {tw === 'morning' ? 'Förmiddag' : tw === 'afternoon' ? 'Eftermiddag' : 'Kväll'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. INFORMATION OM BOSTADEN & UPPDRAGET */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-300 space-y-4">
                  <h3 className="text-base font-black text-slate-900 border-b border-slate-200 pb-2">
                    3. Information om bostaden & uppdraget
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" /> Antal gäster
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5 text-slate-500" /> Ska sängkläder/handdukar tvättas?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLaundry(true)}
                          className={`py-2.5 rounded-lg font-extrabold text-xs transition border ${
                            laundry
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow ring-2 ring-emerald-500'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {laundry && '✓ '} JA
                        </button>
                        <button
                          type="button"
                          onClick={() => setLaundry(false)}
                          className={`py-2.5 rounded-lg font-extrabold text-xs transition border ${
                            !laundry
                              ? 'bg-slate-800 text-white border-slate-900 shadow ring-2 ring-slate-700'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {!laundry && '✓ '} NEJ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Meddelande */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                      Övriga instruktioner/meddelande till Maria <Sparkles className="w-3.5 h-3.5 text-amber-500" /> (Översätts till spanska)
                    </label>

                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {QUICK_NOTES.map((qn) => (
                        <button
                          key={qn}
                          type="button"
                          onClick={() => setNotes((prev) => (prev ? `${prev}. ${qn}` : qn))}
                          className="text-xs bg-white hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 transition shadow-sm"
                        >
                          + {qn}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Skriv instruktioner på svenska här..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm"
                    />
                  </div>
                </div>

                {error && <p className="text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}
                {success && <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">✅ Städuppdrag sparat! Du kan lägga till nästa direkt.</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  SPARA STÄDUPPDRAG
                </button>
              </form>
            </section>
          ) : (
            /* LISTA PÅ BOKADE STÄDNINGAR */
            <section className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                <ClipboardList className="w-5 h-5 text-emerald-600" /> Bokade Städuppdrag för {verifiedProperty.name} ({myBookings.length})
              </h3>

              {myBookings.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center">Inga bokade städuppdrag ännu.</p>
              ) : (
                <div className="space-y-3">
                  {myBookings.map((b) => (
                    <div key={b.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-emerald-600" />
                          <span className="font-extrabold text-slate-900">{b.booking_title || 'Städuppdrag'}</span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Tidigast start: {b.vacant_now ? <b className="text-emerald-700">Kan starta direkt</b> : <b>{formatDate(b.departure_date, 'sv')}</b>} ({TIME_LABELS.sv[b.departure_time_window as keyof typeof TIME_LABELS.sv] || b.departure_time_window})
                        </p>
                        <p className="text-xs text-slate-600">
                          Deadline: {b.no_next_guest || !b.next_arrival_date ? <b className="text-emerald-700">Flexibel (Ingen gäst bokad)</b> : <b>{formatDate(b.next_arrival_date, 'sv')}</b>}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition"
                        title="Ta bort"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
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