import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../lib/supabase';
import { APP_CONFIG } from '../lib/constants';
import BookingForm from './host/BookingForm';
import BookingList from './host/BookingList';
import CalendarView from './host/CalendarView';
import { PlusCircle, List, Calendar as CalendarIcon, KeyRound, Loader2, Building, Home, Sparkles } from 'lucide-react';

interface HostViewProps {
  bookings: Booking[];
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
}

export default function HostView({ bookings, incidents, loading, onRefresh }: HostViewProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'calendar'>('create');

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
      setAuthError('Felaktigt lösenord. Kontrollera koden för din fastighet.');
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto px-4 py-8 space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{APP_CONFIG.tagline}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">{APP_CONFIG.name}</h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-200">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 mx-auto flex items-center justify-center font-black">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Värdinloggning</h2>
            <p className="text-xs text-slate-500">Ange fastighetens kod för att hantera bokningar</p>
          </div>

          <div>
            <input
              type="text"
              placeholder="Fastighetens kod (t.ex. GV45)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold uppercase text-center text-slate-900 outline-none focus:bg-white focus:border-sky-500 transition"
              required
            />
          </div>

          {authError && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">{authError}</p>}

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg shadow-sky-600/20"
          >
            Logga in
          </button>
        </form>
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
    <div className="max-w-xl mx-auto px-4 space-y-4">
      {/* SAMMANSLAGEN KOMPAKT HEADER & FASTIGHETSBAADGE */}
      <div className="bg-slate-900/90 text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-black shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-xs text-white tracking-tight">{APP_CONFIG.name}</span>
              <span className="text-[9px] uppercase font-black bg-sky-500/20 text-sky-400 px-1.5 py-0.2 rounded-md border border-sky-500/30">
                Host
              </span>
            </div>
            <p className="font-black text-sm text-sky-400 truncate leading-tight">
              {selectedProperty?.name}
              {selectedProperty?.address && (
                <span className="text-xs font-semibold text-slate-400 ml-1.5 font-normal">
                  · {selectedProperty.address}
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => setAuthenticated(false)}
          className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition shrink-0 active:scale-95"
        >
          Byt fastighet
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700 text-xs font-black shadow-xl">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'create' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Ny bokning
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'list' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <List className="w-4 h-4" /> Mina bokningar ({propertyBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'calendar' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CalendarIcon className="w-4 h-4" /> Kalender
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
        />
      ) : activeTab === 'list' ? (
        <BookingList bookings={propertyBookings} incidents={incidents} onRefresh={onRefresh} />
      ) : (
        <CalendarView bookings={propertyBookings} />
      )}
    </div>
  );
}