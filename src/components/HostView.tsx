// src/components/HostView.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../lib/supabase';
import BookingForm from './host/BookingForm';
import BookingList from './host/BookingList';
import CalendarView from './host/CalendarView';
import {
  PlusCircle,
  List,
  Calendar as CalendarIcon,
  Loader2,
  Home,
  Share2,
  Copy,
  Check,
  Plus,
  X,
  KeyRound,
  Ruler,
  Bed,
  Bath,
  StickyNote,
  Globe,
  AlertCircle,
} from 'lucide-react';

export type HostLanguage = 'sv' | 'en' | 'da';

interface HostViewProps {
  bookings: Booking[];
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
  lang?: HostLanguage;
  onLangChange?: (newLang: HostLanguage) => void;
}

const hostTexts = {
  sv: {
    tabNew: 'Ny bokning',
    tabList: 'Mina bokningar',
    tabCal: 'Kalender',
    inviteCodeLabel: 'Inbjudningskod till städerska:',
    addPropBtn: 'Ny fastighet',
  },
  en: {
    tabNew: 'New booking',
    tabList: 'My bookings',
    tabCal: 'Calendar',
    inviteCodeLabel: 'Cleaner invite code:',
    addPropBtn: 'New property',
  },
  da: {
    tabNew: 'Ny booking',
    tabList: 'Mine bookinger',
    tabCal: 'Kalender',
    inviteCodeLabel: 'Rengøringskode:',
    addPropBtn: 'Ny ejendom',
  },
};

export default function HostView({ bookings, incidents, loading, onRefresh, lang = 'sv', onLangChange }: HostViewProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'calendar'>('create');
  const [copiedCode, setCopiedCode] = useState(false);

  // Modal för att skapa ny fastighet som Host
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropKvm, setNewPropKvm] = useState('');
  const [newPropRooms, setNewPropRooms] = useState('');
  const [newPropBathrooms, setNewPropBathrooms] = useState('');
  const [newPropNotes, setNewPropNotes] = useState('');
  const [savingProp, setSavingProp] = useState(false);
  const [addPropError, setAddPropError] = useState<string | null>(null);

  const txt = hostTexts[lang] || hostTexts.sv;

  const fetchProperties = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('host_id', session.user.id)
      .order('name');

    if (data && data.length > 0) {
      setProperties(data as Property[]);
      if (!selectedProperty) {
        setSelectedProperty(data[0] as Property);
      }
    } else {
      setProperties([]);
      setSelectedProperty(null);
    }
  }, [selectedProperty]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareWhatsApp = (prop: Property) => {
    const code = prop.invite_code || '';
    const msg = `¡Hola! Te invito a conectarte a mi propiedad "${prop.name}" en CleanBook.\n\nCódigo de invitación: *${code}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Skapa fastighet som Host
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim()) return;

    setAddPropError(null);
    setSavingProp(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setAddPropError('Du måste vara inloggad för att skapa en fastighet.');
      setSavingProp(false);
      return;
    }

    try {
      await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email,
        role: 'host',
        full_name: session.user.user_metadata?.full_name || '',
      });

      const generatedInviteCode = `CLEAN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data, error } = await supabase.from('properties').insert({
        host_id: session.user.id,
        name: newPropName.trim(),
        address: newPropAddress.trim() || newPropName.trim(),
        host_name: session.user.user_metadata?.full_name || 'Värd',
        invite_code: generatedInviteCode,
        kvm: newPropKvm.trim() || null,
        rooms: newPropRooms.trim() || null,
        bathrooms: newPropBathrooms.trim() || null,
        property_notes: newPropNotes.trim() || null,
      }).select().single();

      if (error) throw error;

      if (data) {
        setNewPropName('');
        setNewPropAddress('');
        setNewPropKvm('');
        setNewPropRooms('');
        setNewPropBathrooms('');
        setNewPropNotes('');
        setShowAddPropModal(false);
        setSelectedProperty(data as Property);
        fetchProperties();
        onRefresh();
      }
    } catch (err: any) {
      console.error('Kunde inte skapa fastighet:', err);
      setAddPropError(`Kunde inte spara fastigheten: ${err.message || 'Ett fel uppstod.'}`);
    } finally {
      setSavingProp(false);
    }
  };

  const propertyBookings = selectedProperty
    ? bookings.filter(
        (b) =>
          b.property_id === selectedProperty.id ||
          b.property_name.toLowerCase() === selectedProperty.name.toLowerCase()
      )
    : bookings;

  return (
    <div className="max-w-xl mx-auto px-2 sm:px-4 space-y-3">
      {/* SPRÅKVÄLJARE FÖR VÄRDEN */}
      <div className="flex justify-end items-center gap-2">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 flex items-center gap-1 text-[11px]">
          <Globe className="w-3 h-3 text-slate-400 mr-0.5" />
          <button
            onClick={() => onLangChange?.('sv')}
            className={`px-1.5 py-0.5 rounded font-bold ${lang === 'sv' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            🇸🇪 SV
          </button>
          <button
            onClick={() => onLangChange?.('en')}
            className={`px-1.5 py-0.5 rounded font-bold ${lang === 'en' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            🇬🇧 EN
          </button>
          <button
            onClick={() => onLangChange?.('da')}
            className={`px-1.5 py-0.5 rounded font-bold ${lang === 'da' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            🇩🇰 DA
          </button>
        </div>
      </div>

      {/* OM INGA FASTIGHETER FINNS ÄNNU */}
      {properties.length === 0 && !loading && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-center space-y-3 shadow-xl">
          <Home className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="font-black text-white text-base">Välkommen! Lägg till din första fastighet</h3>
          <p className="text-xs text-slate-400">
            För att kunna skapa bokningar och bjuda in din städerska behöver du först registrera en fastighet.
          </p>
          <button
            onClick={() => {
              setAddPropError(null);
              setShowAddPropModal(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-3 rounded-2xl text-xs transition shadow-lg flex items-center gap-1.5 mx-auto active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Skapa fastighet nu</span>
          </button>
        </div>
      )}

      {/* FASTIGHETSINDIKATOR + INBJUDNINGSKOD */}
      {selectedProperty && (
        <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-lg space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-black shrink-0">
                <Home className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-xs sm:text-sm text-white truncate leading-tight">
                  {selectedProperty.name}
                </h2>
                {selectedProperty.address && (
                  <p className="text-[11px] font-medium text-slate-400 truncate pt-0.5">
                    {selectedProperty.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {properties.length > 1 && (
                <select
                  value={selectedProperty.id}
                  onChange={(e) => {
                    const found = properties.find((p) => p.id === e.target.value);
                    if (found) setSelectedProperty(found);
                  }}
                  className="text-[11px] font-bold text-sky-400 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 outline-none"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => {
                  setAddPropError(null);
                  setShowAddPropModal(true);
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl transition border border-slate-700 text-xs font-bold flex items-center gap-1"
                title={txt.addPropBtn}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-semibold">{txt.inviteCodeLabel}</span>
              <span className="font-mono font-black text-emerald-400">{selectedProperty.invite_code || ''}</span>
              <button
                onClick={() => copyInviteCode(selectedProperty.invite_code || '')}
                className="text-slate-400 hover:text-white p-1"
                title="Kopiera kod"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={() => shareWhatsApp(selectedProperty)}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition"
            >
              <Share2 className="w-3 h-3" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {selectedProperty && (
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
      )}

      {/* MODAL: SKAPA FASTIGHET */}
      {showAddPropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Home className="w-4 h-4 text-emerald-600" /> Registrera ny fastighet
              </h3>
              <button onClick={() => setShowAddPropModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fastighetens namn *</label>
                <input
                  type="text"
                  placeholder="T.ex. Gran Vista 45"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fullständig adress</label>
                <input
                  type="text"
                  placeholder="T.ex. Calle Bach 71, Gran Alacant"
                  value={newPropAddress}
                  onChange={(e) => setNewPropAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Ruler className="w-3 h-3 text-slate-500" /> Kvm
                  </label>
                  <input
                    type="text"
                    placeholder="85"
                    value={newPropKvm}
                    onChange={(e) => setNewPropKvm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Bed className="w-3 h-3 text-slate-500" /> Rum
                  </label>
                  <input
                    type="text"
                    placeholder="3"
                    value={newPropRooms}
                    onChange={(e) => setNewPropRooms(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Bath className="w-3 h-3 text-slate-500" /> Badrum
                  </label>
                  <input
                    type="text"
                    placeholder="2"
                    value={newPropBathrooms}
                    onChange={(e) => setNewPropBathrooms(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <StickyNote className="w-3.5 h-3.5 text-amber-600" /> Fasta instruktioner till städerskan
                </label>
                <textarea
                  rows={2}
                  placeholder="T.ex. Nyckel under krukan..."
                  value={newPropNotes}
                  onChange={(e) => setNewPropNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              {addPropError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addPropError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={savingProp}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98 mt-2"
              >
                {savingProp ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Spara & Generera inbjudningskod
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedProperty && (
        loading ? (
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
        )
      )}
    </div>
  );
}