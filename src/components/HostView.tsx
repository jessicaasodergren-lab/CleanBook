import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../lib/supabase';
import BookingForm from './host/BookingForm';
import BookingList from './host/BookingList';
import CalendarView from './host/CalendarView';
import { PlusCircle, List, Calendar as CalendarIcon, Loader2, Home, KeyRound, RefreshCw } from 'lucide-react';

export type HostLanguage = 'sv' | 'en' | 'da';

interface HostViewProps {
  bookings: Booking[];
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
  lang?: HostLanguage;
}

const hostTexts = {
  sv: {
    loginTitle: 'Värdinloggning',
    loginSub: 'Ange fastighetens kod för att hantera bokningar',
    loginPlaceholder: 'Fastighetens kod (t.ex. GV45)',
    loginError: 'Felaktigt lösenord. Kontrollera koden för din fastighet.',
    loginBtn: 'Logga in',
    changeProp: 'Byt fastighet',
    tabNew: 'Ny bokning',
    tabList: 'Mina bokningar',
    tabCal: 'Kalender',
  },
  en: {
    loginTitle: 'Host Login',
    loginSub: 'Enter property code to manage bookings',
    loginPlaceholder: 'Property code (e.g. GV45)',
    loginError: 'Incorrect passcode. Please check your property code.',
    loginBtn: 'Log In',
    changeProp: 'Change property',
    tabNew: 'New booking',
    tabList: 'My bookings',
    tabCal: 'Calendar',
  },
  da: {
    loginTitle: 'Vært Log ind',
    loginSub: 'Indtast ejendomskode for at administrere bookinger',
    loginPlaceholder: 'Ejendomskode (f.eks. GV45)',
    loginError: 'Forkert adgangskode. Tjek koden for din ejendom.',
    loginBtn: 'Log ind',
    changeProp: 'Skift ejendom',
    tabNew: 'New booking',
    tabList: 'Mine bookinger',
    tabCal: 'Calendar',
  },
};

export default function HostView({ bookings, incidents, loading, onRefresh, lang = 'sv' }: HostViewProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'calendar'>('create');

  const txt = hostTexts[lang] || hostTexts.sv;

  const fetchProperties = useCallback(async () => {
    const { data } = await supabase.from('properties').select('*').order('name');
    if (data) setProperties(data as Property[]);
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const match = properties.find((p) => p.passcode.toUpperCase() === passcode.trim().toUpperCase());
    if (match) {
      setSelectedProperty(match);
      setAuthenticated(true);
    } else {
      setAuthError(txt.loginError);
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center mx-auto border border-sky-500/20 shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{txt.loginTitle}</h2>
            <p className="text-xs text-slate-400 mt-1">{txt.loginSub}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder={txt.loginPlaceholder}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                className="w-full text-center text-xs font-mono font-bold uppercase p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-sky-500 transition"
                required
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-xs font-bold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-center">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-3.5 rounded-2xl transition shadow-lg active:scale-95 text-sm"
            >
              {txt.loginBtn}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const propertyBookings = selectedProperty
    ? bookings.filter(
        (b) =>
          b.property_name.toLowerCase() === selectedProperty.name.toLowerCase() ||
          b.property_address?.toLowerCase() === selectedProperty.address.toLowerCase()
      )
    : bookings;

  return (
    <div className="max-w-xl mx-auto px-2 sm:px-4 space-y-3">
      {/* TYDLIG FASTIGHETSINDIKATOR HÖGST UPP + BYT FASTIGHET-KNAPP */}
      <div className="flex items-center justify-between bg-slate-900/90 p-2.5 px-3.5 rounded-2xl border border-slate-800 shadow-lg gap-2 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-black shrink-0">
            <Home className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-black text-xs sm:text-sm text-white truncate leading-tight flex items-center gap-1.5">
              <span>{selectedProperty?.name}</span>
            </h2>
            {selectedProperty?.address && selectedProperty.address.toLowerCase() !== selectedProperty.name.toLowerCase() && (
              <p className="text-[11px] font-medium text-slate-400 truncate pt-0.5">
                {selectedProperty.address}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAuthenticated(false)}
          className="text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1.5 rounded-xl border border-sky-500/30 transition shrink-0 active:scale-95 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>{txt.changeProp}</span>
        </button>
      </div>

      {/* MOBILSMARTA COMPACT FLIKAR */}
      <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-black shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'create' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>{txt.tabNew}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'list' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>{txt.tabList} ({propertyBookings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'calendar' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>{txt.tabCal}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      ) : activeTab === 'create' ? (
        <BookingForm
          properties={properties}
          selectedPropertyId={selectedProperty?.id || null}
          onBookingCreated={onRefresh}
          lang={lang}
        />
      ) : activeTab === 'list' ? (
        <BookingList bookings={propertyBookings} incidents={incidents} onRefresh={onRefresh} />
      ) : (
        <CalendarView bookings={propertyBookings} />
      )}
    </div>
  );
}