// src/components/HostView.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../lib/supabase';
import { propertyService } from '../services/propertyService';
import { translations } from '../i18n/translations';
import { getPropertyInviteWhatsAppUrl } from '../utils/whatsapp';
import CreatePropertyModal from './modals/CreatePropertyModal';
import BookingForm from './host/BookingForm';
import BookingList from './host/BookingList';
import CalendarView from './host/CalendarView';
import { PlusCircle, List, Calendar as CalendarIcon, Loader2, Home, Share2, Copy, Check, Plus, Globe } from 'lucide-react';

export type HostLanguage = 'sv' | 'en' | 'da';

interface HostViewProps {
  bookings: Booking[];
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
  lang?: HostLanguage;
  onLangChange?: (newLang: HostLanguage) => void;
}

export default function HostView({ bookings, incidents, loading, onRefresh, lang = 'sv', onLangChange }: HostViewProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'calendar'>('create');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddPropModal, setShowAddPropModal] = useState(false);

  // Kraschsäker hämtning av texter med inbyggd reservöversättning
  const txt = translations?.host?.[lang] || translations?.host?.sv || {
    tabNew: 'Ny bokning',
    tabList: 'Mina bokningar',
    tabCal: 'Kalender',
    inviteCodeLabel: 'Inbjudningskod till städerska:',
    addPropBtn: 'Ny fastighet',
  };

  const fetchProperties = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const data = await propertyService.getHostProperties(session.user.id);
      setProperties(data);
      if (data.length > 0 && !selectedProperty) setSelectedProperty(data[0]);
    } catch (err) {
      console.error('Kunde inte hämta fastigheter:', err);
    }
  }, [selectedProperty]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const propertyBookings = selectedProperty
    ? bookings.filter((b) => b.property_id === selectedProperty.id || b.property_name.toLowerCase() === selectedProperty.name.toLowerCase())
    : bookings;

  return (
    <div className="max-w-xl mx-auto px-2 sm:px-4 space-y-3">
      {/* SPRÅKVÄLJARE */}
      <div className="flex justify-end items-center gap-2">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 flex items-center gap-1 text-[11px]">
          <Globe className="w-3 h-3 text-slate-400 mr-0.5" />
          <button onClick={() => onLangChange?.('sv')} className={`px-1.5 py-0.5 rounded font-bold ${lang === 'sv' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>🇸🇪 SV</button>
          <button onClick={() => onLangChange?.('en')} className={`px-1.5 py-0.5 rounded font-bold ${lang === 'en' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>🇬🇧 EN</button>
          <button onClick={() => onLangChange?.('da')} className={`px-1.5 py-0.5 rounded font-bold ${lang === 'da' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>🇩🇰 DA</button>
        </div>
      </div>

      {/* INGA FASTIGHETER */}
      {properties.length === 0 && !loading && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-center space-y-3 shadow-xl">
          <Home className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="font-black text-white text-base">Välkommen! Lägg till din första fastighet</h3>
          <p className="text-xs text-slate-400">
            För att kunna skapa bokningar och bjuda in din städerska behöver du först registrera en fastighet.
          </p>
          <button onClick={() => setShowAddPropModal(true)} className="bg-emerald-500 text-slate-950 font-black px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5 mx-auto active:scale-95 transition">
            <Plus className="w-4 h-4" /> Skapa fastighet nu
          </button>
        </div>
      )}

      {/* FASTIGHETSINDIKATOR */}
      {selectedProperty && (
        <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-lg space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-black shrink-0"><Home className="w-4 h-4" /></div>
              <div className="min-w-0">
                <h2 className="font-black text-xs sm:text-sm text-white truncate">{selectedProperty.name}</h2>
                {selectedProperty.address && <p className="text-[11px] text-slate-400 truncate pt-0.5">{selectedProperty.address}</p>}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {properties.length > 1 && (
                <select value={selectedProperty.id} onChange={(e) => setSelectedProperty(properties.find(p => p.id === e.target.value) || null)} className="text-[11px] font-bold text-sky-400 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 outline-none">
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <button onClick={() => setShowAddPropModal(true)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl transition border border-slate-700"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-semibold">{txt.inviteCodeLabel}</span>
              <span className="font-mono font-black text-emerald-400">{selectedProperty.invite_code || ''}</span>
              <button onClick={() => copyInviteCode(selectedProperty.invite_code || '')} className="text-slate-400 hover:text-white p-1" title="Kopiera kod">
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button onClick={() => window.open(getPropertyInviteWhatsAppUrl(selectedProperty), '_blank')} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition">
              <Share2 className="w-3 h-3" /> WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* FLIKAR */}
      {selectedProperty && (
        <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-black shadow-xl backdrop-blur-md">
          <button onClick={() => setActiveTab('create')} className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'create' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'}`}><PlusCircle className="w-3.5 h-3.5" /><span>{txt.tabNew}</span></button>
          <button onClick={() => setActiveTab('list')} className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'list' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'}`}><List className="w-3.5 h-3.5" /><span>{txt.tabList} ({propertyBookings.length})</span></button>
          <button onClick={() => setActiveTab('calendar')} className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'calendar' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'}`}><CalendarIcon className="w-3.5 h-3.5" /><span>{txt.tabCal}</span></button>
        </div>
      )}

      {/* MODAL */}
      <CreatePropertyModal
        isOpen={showAddPropModal}
        onClose={() => setShowAddPropModal(false)}
        onCreated={(createdProp) => {
          setSelectedProperty(createdProp);
          fetchProperties();
          onRefresh();
        }}
      />

      {/* FLIK-INNEHÅLL */}
      {selectedProperty && (
        loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-sky-400 animate-spin" /></div>
        ) : activeTab === 'create' ? (
          <BookingForm properties={properties} selectedPropertyId={selectedProperty.id} existingBookings={propertyBookings} onBookingCreated={onRefresh} lang={lang} />
        ) : activeTab === 'list' ? (
          <BookingList bookings={propertyBookings} incidents={incidents} onRefresh={onRefresh} />
        ) : (
          <CalendarView bookings={propertyBookings} />
        )
      )}
    </div>
  );
}