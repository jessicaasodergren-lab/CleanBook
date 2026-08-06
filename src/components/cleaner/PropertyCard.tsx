// src/components/cleaner/PropertyCard.tsx
import { useState } from 'react';
import type { Property } from '../../lib/supabase';
import { propertyService } from '../../services/propertyService';
import { formatDate } from '../../lib/constants';
import { translations } from '../../i18n/translations';
import type { CleanerLanguage } from '../CleanerView';
import {
  Building,
  MapPin,
  Timer,
  ChevronDown,
  ChevronUp,
  Ruler,
  Bed,
  Bath,
  StickyNote,
  Lock,
  Check,
  AlertCircle,
  Loader2,
  Unlink,
  Clock,
} from 'lucide-react';

interface ConnectionData {
  id: string;
  property_id: string;
  internal_notes: string | null;
  cleaning_time: string | null;
}

interface PropertyCardProps {
  property: Property;
  connectionData?: ConnectionData;
  lang?: CleanerLanguage;
  onRefresh: () => void;
}

const defaultCardTexts: Record<CleanerLanguage, any> = {
  es: {
    noTimeSet: 'Sin tiempo fijado',
    anfitriona: 'Anfitriona:',
    saveError: 'Error al guardar los datos',
    confirmDisconnect: '¿Estás segura de que deseas desconectar la propiedad',
    specSurface: 'Superficie',
    specRooms: 'Habitaciones',
    specBathrooms: 'Baños',
    hostNotes: 'Instrucciones fijas del anfitrión',
    notesUpdatedAt: 'Actualizado',
    myInternalSection: 'Mis notas privadas y tiempo (privado)',
    savedNotice: '¡Guardado!',
    editModalTimeLabel: 'Mi tiempo de limpieza estimado:',
    editModalTimePlaceholder: 'Ej. 3h 30min',
    editModalNotesLabel: 'Mis notas privadas:',
    editModalNotesPlaceholder: 'Ej. Dar dos vueltas a la llave, fregona extra...',
    editModalNotesHelp: 'Estas notas solo son visibles para ti, no para la anfitriona.',
    btnSaveNotes: 'Guardar notas y tiempo',
    btnDisconnect: 'Desconectar propiedad',
  },
  en: {
    noTimeSet: 'No time set',
    anfitriona: 'Host:',
    saveError: 'Error saving data',
    confirmDisconnect: 'Are you sure you want to disconnect property',
    specSurface: 'Surface',
    specRooms: 'Rooms',
    specBathrooms: 'Bathrooms',
    hostNotes: 'Fixed host instructions',
    notesUpdatedAt: 'Updated',
    myInternalSection: 'My private notes & time (private)',
    savedNotice: 'Saved!',
    editModalTimeLabel: 'My estimated cleaning time:',
    editModalTimePlaceholder: 'E.g. 3h 30min',
    editModalNotesLabel: 'My private notes:',
    editModalNotesPlaceholder: 'E.g. Turn key twice, extra mop needed...',
    editModalNotesHelp: 'These notes are only visible to you, not the host.',
    btnSaveNotes: 'Save notes & time',
    btnDisconnect: 'Disconnect property',
  },
  sv: {
    noTimeSet: 'Ej angiven tid',
    anfitriona: 'Värd:',
    saveError: 'Kunde inte spara uppgifter',
    confirmDisconnect: 'Är du säker på att du vill koppla från fastigheten',
    specSurface: 'Yta',
    specRooms: 'Rum',
    specBathrooms: 'Badrum',
    hostNotes: 'Värdens fasta instruktioner',
    notesUpdatedAt: 'Uppdaterades',
    myInternalSection: 'Mina privata anteckningar & tid (privat)',
    savedNotice: 'Sparat!',
    editModalTimeLabel: 'Min beräknade städtid:',
    editModalTimePlaceholder: 'T.ex. 3t 30min',
    editModalNotesLabel: 'Mina privata anteckningar:',
    editModalNotesPlaceholder: 'T.ex. Lås två varv, extra mopp behövs...',
    editModalNotesHelp: 'Dessa anteckningar syns bara för dig, inte för värden.',
    btnSaveNotes: 'Spara anteckningar och tid',
    btnDisconnect: 'Koppla från fastighet',
  },
};

export default function PropertyCard({
  property: p,
  connectionData,
  lang = 'es',
  onRefresh,
}: PropertyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeVal, setTimeVal] = useState(connectionData?.cleaning_time || p.cleaning_time || '');
  const [notesVal, setNotesVal] = useState(connectionData?.internal_notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const fallback = defaultCardTexts[lang] || defaultCardTexts.es;
  const txt = {
    ...fallback,
    ...((translations as any)?.propertyList?.[lang] || (translations as any)?.propertyList?.es || {}),
  };

  const displayTime = connectionData?.cleaning_time || p.cleaning_time || txt.noTimeSet;

  const handleSaveInline = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
      if (!session) throw new Error('No session');

      await propertyService.updateCleanerConnection(session.user.id, p.id, timeVal, notesVal);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      onRefresh();
    } catch (err: any) {
      setSaveError(err.message || txt.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm(`${txt.confirmDisconnect} "${p.name}"?`)) return;

    setIsDisconnecting(true);
    try {
      const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
      if (session) {
        await propertyService.disconnectProperty(session.user.id, p.id);
        onRefresh();
      }
    } catch (err) {
      console.error('Kunde inte koppla från fastighet:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xl space-y-3 text-slate-900 relative overflow-hidden transition-all">
      {/* ÖVERSIKT (ALLTID SYNLIG) */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black shrink-0 mt-0.5">
            <Building className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
              {p.name}
              {p.host_name && (
                <span className="text-slate-500 font-semibold text-xs ml-1.5">
                  ({txt.anfitriona} {p.host_name})
                </span>
              )}
            </h5>

            {p.address && (
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 truncate pt-0.5">
                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">{p.address}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-extrabold bg-sky-50 text-sky-900 border border-sky-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-sky-600" />
            <span>{displayTime}</span>
          </span>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition border border-slate-200"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* EXPANDERADE DETALJER */}
      {isExpanded && (
        <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200 text-xs">
          {(p.kvm || p.rooms || p.bathrooms) && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 space-y-0.5">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-slate-500" /> {txt.specSurface}
                </span>
                <span className="font-extrabold text-slate-900 text-xs">
                  {p.kvm ? `${p.kvm} m²` : '-'}
                </span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 space-y-0.5">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Bed className="w-3 h-3 text-slate-500" /> {txt.specRooms}
                </span>
                <span className="font-extrabold text-slate-900 text-xs">
                  {p.rooms ? `${p.rooms}` : '-'}
                </span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 space-y-0.5">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Bath className="w-3 h-3 text-slate-500" /> {txt.specBathrooms}
                </span>
                <span className="font-extrabold text-slate-900 text-xs">
                  {p.bathrooms ? `${p.bathrooms}` : '-'}
                </span>
              </div>
            </div>
          )}

          {/* VÄRDENS FASTA INSTRUKTIONER + TIDSSTÄMPEL */}
          {p.property_notes && (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-700 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                  <StickyNote className="w-3.5 h-3.5 text-slate-500" /> {txt.hostNotes}
                </span>

                {p.notes_updated_at && (
                  <span className="text-[9.5px] font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {txt.notesUpdatedAt || 'Uppdaterades'}: {formatDate(p.notes_updated_at, lang)}
                  </span>
                )}
              </div>

              <p className="font-bold text-slate-900 leading-relaxed whitespace-pre-line pt-0.5">
                {p.property_notes}
              </p>
            </div>
          )}

          <div className="bg-sky-50/80 border border-sky-200 p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-sky-900 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-sky-600" /> {txt.myInternalSection}
              </span>

              {isSaved && (
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3 h-3 text-emerald-600" /> {txt.savedNotice}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-sky-900 mb-1 flex items-center gap-1">
                  <Timer className="w-3 h-3 text-sky-600" /> {txt.editModalTimeLabel}
                </label>
                <input
                  type="text"
                  placeholder={txt.editModalTimePlaceholder}
                  value={timeVal}
                  onChange={(e) => setTimeVal(e.target.value)}
                  className="w-full bg-white border border-sky-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-sky-900 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> {txt.editModalNotesLabel}
                </label>
                <textarea
                  rows={3}
                  placeholder={txt.editModalNotesPlaceholder}
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  className="w-full bg-white border border-sky-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/30"
                />
                <p className="text-[10px] text-sky-700/80 mt-1">{txt.editModalNotesHelp}</p>
              </div>

              {saveError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{saveError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveInline}
                disabled={isSaving}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md active:scale-98 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{txt.btnSaveNotes}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold text-[11px] rounded-xl transition flex items-center gap-1 border border-slate-200 active:scale-95"
            >
              {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" /> : <Unlink className="w-3.5 h-3.5" />}
              <span>{txt.btnDisconnect}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}