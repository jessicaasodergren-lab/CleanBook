// src/components/HostView.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../lib/supabase';
import { propertyService } from '../services/propertyService';
import { translations, type Language } from '../i18n/translations';
import { getPropertyInviteWhatsAppUrl } from '../utils/whatsapp';
import CreatePropertyModal from './modals/CreatePropertyModal';
import EditPropertyModal from './modals/EditPropertyModal';
import BookingForm from './host/BookingForm';
import BookingList from './host/BookingList';
import CalendarView from './host/CalendarView';
import { PlusCircle, List, Calendar as CalendarIcon, Loader2, Home, Share2, Copy, Check, Plus, Pencil, UserCheck, Phone, Trash2 } from 'lucide-react';

export type HostLanguage = Language;

interface HostViewProps {
  bookings: Booking[];
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
  lang?: HostLanguage;
}

export default function HostView({ bookings, incidents, loading, onRefresh, lang = 'sv' }: HostViewProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'calendar'>('create');
  const [copiedCode, setCopiedCode] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [showEditPropModal, setShowEditPropModal] = useState(false);

  const txt = translations.host[lang];

  const fetchProperties = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const data = await propertyService.getHostProperties(session.user.id);
      setProperties(data);
      if (data.length > 0) {
        setSelectedProperty((prev) => {
          if (!prev) return data[0];
          const updatedCurrent = data.find((p) => p.id === prev.id);
          return updatedCurrent || data[0];
        });
      }
    } catch (err) {
      console.error('Kunde inte hämta fastigheter:', err);
    }
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  useEffect(() => {
    setInviteCode(null);
    setHostError(null);
  }, [selectedProperty?.id]);

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const createInvite = async () => {
    if (!selectedProperty) return;
    setInviteBusy(true);
    setHostError(null);
    try {
      setInviteCode(await propertyService.createInvitation(selectedProperty.id));
    } catch (err) {
      console.error('Kunde inte skapa inbjudningskod:', err);
      setHostError(txt.errInviteCreate);
    } finally {
      setInviteBusy(false);
    }
  };

  const removeCleaner = async (connectionId: string) => {
    if (!window.confirm(txt.confirmRemoveCleaner)) return;
    setRemovingId(connectionId);
    setHostError(null);
    try {
      await propertyService.endConnection(connectionId);
      await fetchProperties();
      onRefresh();
    } catch (err) {
      console.error('Kunde inte ta bort städerskan:', err);
      setHostError(txt.errRemoveCleaner);
    } finally {
      setRemovingId(null);
    }
  };

  const propertyBookings = selectedProperty
    ? bookings.filter((b) => b.property_id === selectedProperty.id)
    : bookings;

  if (loading && properties.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-2 sm:px-4 space-y-3">
      {/* INGA FASTIGHETER */}
      {properties.length === 0 && !loading && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-center space-y-3 shadow-xl">
          <Home className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="font-black text-white text-base">{txt.welcomeTitle}</h3>
          <p className="text-xs text-slate-400">
            {txt.welcomeDesc}
          </p>
          <button onClick={() => setShowAddPropModal(true)} className="bg-emerald-500 text-slate-950 font-black px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5 mx-auto active:scale-95 transition">
            <Plus className="w-4 h-4" /> {txt.createPropNow}
          </button>
        </div>
      )}

      {/* FASTIGHETSINDIKATOR MED KOPPLAD STÄDERSKA & REDIGERA-KNAPP */}
      {selectedProperty && (
        <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-lg space-y-2.5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-black shrink-0"><Home className="w-4 h-4" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-black text-xs sm:text-sm text-white truncate">{selectedProperty.name}</h2>
                  <button
                    onClick={() => setShowEditPropModal(true)}
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition border border-slate-700/80 shrink-0"
                    title={txt.editPropTitle}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                {selectedProperty.address && <p className="text-[11px] text-slate-400 truncate pt-0.5">{selectedProperty.address}</p>}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {properties.length > 1 && (
                <select value={selectedProperty.id} onChange={(e) => setSelectedProperty(properties.find(p => p.id === e.target.value) || null)} className="text-[11px] font-bold text-sky-400 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 outline-none">
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <button onClick={() => setShowAddPropModal(true)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl transition border border-slate-700" title={txt.addPropBtn}><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* KOPPLADE STADERSKOR */}
          {selectedProperty.cleaners && selectedProperty.cleaners.length > 0 ? (
            <div className="space-y-1.5">
              {selectedProperty.cleaners.map((c) => (
                <div key={c.connection_id} className="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px] font-bold text-emerald-300 truncate">{c.full_name || c.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.phone && (
                      <a
                        href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-emerald-400 bg-emerald-900/60 hover:bg-emerald-900/90 px-2 py-0.5 rounded-lg border border-emerald-500/40 flex items-center gap-1"
                      >
                        <Phone className="w-2.5 h-2.5" /> WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeCleaner(c.connection_id)}
                      disabled={removingId === c.connection_id}
                      className="text-[10px] font-bold text-rose-300 hover:text-rose-200 bg-rose-950/60 hover:bg-rose-900/60 px-2 py-0.5 rounded-lg border border-rose-500/40 flex items-center gap-1 transition disabled:opacity-50"
                    >
                      {removingId === c.connection_id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                      {txt.btnRemoveCleaner}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              {inviteCode ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-slate-400 font-semibold truncate">{txt.inviteCodeLabel}</span>
                      <span className="font-mono font-black text-emerald-400">{inviteCode}</span>
                      <button onClick={() => copyInviteCode(inviteCode)} className="text-slate-400 hover:text-white p-1" title={txt.copyCodeTitle}>
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      onClick={() => window.open(getPropertyInviteWhatsAppUrl(txt.inviteWhatsAppText.replace('{name}', selectedProperty.name).replace('{code}', inviteCode)), '_blank')}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition shrink-0"
                    >
                      <Share2 className="w-3 h-3" /> WhatsApp
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">{txt.inviteOneTimeHint}</p>
                </>
              ) : (
                <button
                  onClick={createInvite}
                  disabled={inviteBusy}
                  className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold py-2 rounded-lg border border-emerald-500/30 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  {inviteBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {txt.btnCreateInvite}
                </button>
              )}
            </div>
          )}
          {hostError && <p className="text-[11px] font-bold text-rose-400">{hostError}</p>}
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

      {/* MODAL FÖR SKAPA FASTIGHET */}
      <CreatePropertyModal
        isOpen={showAddPropModal}
        lang={lang}
        onClose={() => setShowAddPropModal(false)}
        onCreated={(createdProp) => {
          setSelectedProperty(createdProp);
          fetchProperties();
          onRefresh();
        }}
      />

      {/* MODAL FÖR REDIGERA FASTIGHET */}
      <EditPropertyModal
        property={selectedProperty}
        isOpen={showEditPropModal}
        lang={lang}
        onClose={() => setShowEditPropModal(false)}
        onUpdated={(updatedProp) => {
          setSelectedProperty(updatedProp);
          fetchProperties();
          onRefresh();
        }}
      />

      {/* FLIK-INNEHÅLL */}
      {selectedProperty && (
        activeTab === 'create' ? (
          <BookingForm
            key={selectedProperty.id}
            properties={properties}
            selectedPropertyId={selectedProperty.id}
            existingBookings={propertyBookings}
            onBookingCreated={onRefresh}
            lang={lang}
          />
        ) : activeTab === 'list' ? (
          <BookingList bookings={propertyBookings} incidents={incidents} onRefresh={onRefresh} lang={lang} />
        ) : (
          <CalendarView bookings={propertyBookings} lang={lang} />
        )
      )}
    </div>
  );
}
