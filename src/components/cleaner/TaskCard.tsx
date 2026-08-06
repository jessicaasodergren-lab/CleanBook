// src/components/cleaner/TaskCard.tsx
import { useState } from 'react';
import type { Booking, Incident, Property } from '../../lib/supabase';
import { formatDate } from '../../lib/constants';
import { getValidNote } from '../../utils/notes';
import type { CleanerLanguage } from '../CleanerView';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Check,
  Camera,
  RotateCcw,
  AlertCircle,
  ThumbsUp,
  Bell,
  AlertTriangle,
  User,
  Flame,
  Hourglass,
  CalendarCheck,
  Timer,
  Ruler,
  Bed,
  Bath,
  Lock,
  StickyNote,
  X,
  Clock,
} from 'lucide-react';

interface TaskCardProps {
  booking: Booking;
  allBookings: Booking[];
  incidents: Incident[];
  properties: Property[];
  lang: CleanerLanguage;
  txt: any;
  completingId: string | null;
  actionError: { id: string; msg: string } | null;
  onAccept: (b: Booking) => void;
  onComplete: (b: Booking) => void;
  onReopen: (b: Booking) => void;
  onOpenIncident: (bookingId: string) => void;
}

function parsePhotos(photoUrl: string | null): string[] {
  if (!photoUrl) return [];
  try {
    if (photoUrl.startsWith('[')) return JSON.parse(photoUrl) as string[];
  } catch (e) {}
  return [photoUrl];
}

export default function TaskCard({
  booking: b,
  allBookings,
  incidents,
  properties,
  lang,
  txt,
  completingId,
  actionError,
  onAccept,
  onComplete,
  onReopen,
  onOpenIncident,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isPending = b.status === 'pending';
  const isAccepted = b.status === 'accepted';
  const isFinished = b.status === 'finished';

  const displayNote = getValidNote(b.notes_es, b.notes);

  const matchedProp = properties.find(
    (p) =>
      (b.property_id && p.id === b.property_id) ||
      p.name.toLowerCase() === b.property_name.toLowerCase() ||
      p.address.toLowerCase() === (b.property_address || '').toLowerCase()
  );

  const displayAddress = matchedProp?.address || b.property_address || b.property_name;
  const displayHost = matchedProp?.host_name || b.host_name;
  const estCleaningTime = matchedProp?.cleaning_time;
  const cleanerInternalNotes = (matchedProp as any)?.internal_notes;

  const bookingIncidents = incidents.filter((i) => i.booking_id === b.id);

  const nextBooking = allBookings.find((other) => {
    if (other.id === b.id) return false;
    if (other.property_name.toLowerCase() !== b.property_name.toLowerCase()) return false;
    if (!other.check_in_date || !b.check_out_date) return false;
    return other.check_in_date >= b.check_out_date;
  });

  let daysGap: number | null = null;
  if (nextBooking && nextBooking.check_in_date && b.check_out_date) {
    const dOut = new Date(b.check_out_date);
    const dIn = new Date(nextBooking.check_in_date);
    const diffMs = dIn.getTime() - dOut.getTime();
    daysGap = Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  const isCriticalSameDay = daysGap === 0;
  const isUrgentNextDay = daysGap === 1;

  const cardStyle = isPending
    ? 'bg-amber-50 text-slate-900 border-2 border-amber-400 shadow-amber-500/10'
    : isFinished
    ? 'bg-white text-slate-900 border border-slate-200 opacity-80 shadow-md'
    : 'bg-white text-slate-900 border border-slate-200 shadow-md';

  return (
    <div className={`rounded-3xl p-4 sm:p-5 transition-all space-y-3 ${cardStyle}`}>
      {/* TOPP-INDIKATORER & BADGES */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isPending && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Bell className="w-3 h-3 text-slate-950" /> {txt.statusPending}
              </span>
            )}

            {isAccepted && (
              <span className="bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {txt.statusAccepted}
              </span>
            )}

            {isFinished && (
              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {txt.statusFinished}
              </span>
            )}

            {isCriticalSameDay && (
              <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Flame className="w-3 h-3 text-white fill-white" />
                {txt.turnoverToday}
              </span>
            )}

            {isUrgentNextDay && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Hourglass className="w-3 h-3 text-slate-950" />
                {txt.turnoverTomorrow}
              </span>
            )}

            {bookingIncidents.length > 0 && (
              <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Camera className="w-3 h-3 text-rose-600" />
                {bookingIncidents.length} {txt.photosLabel || 'fotos'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight flex items-center gap-1.5 truncate">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{displayAddress}</span>
            </h3>

            {estCleaningTime && (
              <span className="text-[11px] font-extrabold bg-sky-100 text-sky-900 border border-sky-300 px-2.5 py-1 rounded-xl flex items-center gap-1 shrink-0 shadow-sm">
                <Timer className="w-3.5 h-3.5 text-sky-600" />
                <span>{estCleaningTime}</span>
              </span>
            )}
          </div>
          
          {displayHost && (
            <p className="text-xs font-bold text-slate-600 flex items-center gap-1 pt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {txt.hostLabel || 'Anfitriona:'} {displayHost}
                {b.property_name && displayAddress.toLowerCase() !== b.property_name.toLowerCase() && (
                  <span className="text-slate-400 font-medium"> ({b.property_name})</span>
                )}
              </span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 bg-white/80 hover:bg-slate-100 rounded-xl text-slate-600 transition border border-slate-200 shrink-0 mt-1"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* VÄRDENS EXTRA BOKNINGSINSTRUKTIONER (SVE -> ES) */}
      {displayNote && (
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-amber-100/90 border-l-4 border-amber-500 p-3 rounded-r-xl text-xs font-bold text-amber-950 cursor-pointer hover:bg-amber-200/80 transition shadow-sm space-y-1"
        >
          <div className="flex items-center gap-1 font-black text-amber-900 text-[10px] uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>{txt.instructionHost}</span>
          </div>

          <p className="font-medium text-amber-950 leading-relaxed">
            {isExpanded ? (
              <span className="whitespace-pre-line">{displayNote}</span>
            ) : (
              <span>
                {displayNote.length > 75 ? `${displayNote.slice(0, 75)}...` : displayNote}
              </span>
            )}
          </p>
        </div>
      )}

      {/* STÄDFÖNSTER & TIDER */}
      <div className="bg-white/90 rounded-2xl p-3 border border-slate-200/80 space-y-2.5 text-xs shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
          <span className="font-black text-[10px] uppercase tracking-wider text-slate-500">
            {txt.windowLabel}
          </span>

          {isCriticalSameDay && (
            <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.2 rounded-md border border-rose-200">
              {txt.turnoverSameDayShort}
            </span>
          )}
          {isUrgentNextDay && (
            <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.2 rounded-md border border-amber-300">
              {txt.marginOneDayShort}
            </span>
          )}
          {daysGap !== null && daysGap > 1 && (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded-md border border-emerald-200 flex items-center gap-1">
              <CalendarCheck className="w-3 h-3 text-emerald-600" />
              {daysGap} {txt.daysMargin}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-black text-slate-500 uppercase block">
              {txt.departureLabel}
            </span>
            <span className="font-black text-slate-900 block text-xs">
              {formatDate(b.check_out_date, lang)}
            </span>
          </div>

          <div className="bg-sky-50/80 p-2 rounded-xl border border-sky-200 space-y-0.5">
            <span className="text-[10px] font-black text-sky-900 uppercase block">
              {txt.arrivalLabel}
            </span>
            {nextBooking ? (
              <span className="font-black text-slate-900 block text-xs">
                {formatDate(nextBooking.check_in_date, lang)}
              </span>
            ) : (
              <span className="text-[10.5px] font-extrabold text-slate-400 block pt-0.5 italic">
                {txt.noNextGuest}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-slate-600 font-bold pt-0.5">
          <span>👥 {b.guests} {txt.guests}</span>
          <span>{b.laundry ? txt.laundryYes : txt.laundryNo}</span>
        </div>
      </div>

      {/* DETALJER VID UTFÄLLT KORT */}
      {isExpanded && (
        <div className="pt-2 border-t border-slate-200/80 space-y-3 text-xs animate-in fade-in duration-200">
          
          {/* FASTIGHETSFAKTA (KVM, RUM, BADRUM) */}
          {matchedProp && (matchedProp.kvm || matchedProp.rooms || matchedProp.bathrooms) && (
            <div className="space-y-1">
              <span className="font-black text-[10px] uppercase text-slate-500 tracking-wider block">
                {txt.houseInfo || 'Información de la casa:'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block flex items-center gap-1">
                    <Ruler className="w-3 h-3 text-slate-500" /> Kvm
                  </span>
                  <span className="font-black text-slate-900 text-xs">
                    {matchedProp.kvm ? `${matchedProp.kvm} m²` : '-'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block flex items-center gap-1">
                    <Bed className="w-3 h-3 text-slate-500" /> Hab.
                  </span>
                  <span className="font-black text-slate-900 text-xs">
                    {matchedProp.rooms || '-'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block flex items-center gap-1">
                    <Bath className="w-3 h-3 text-slate-500" /> Baños
                  </span>
                  <span className="font-black text-slate-900 text-xs">
                    {matchedProp.bathrooms || '-'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STÄDERSKANS PRIVATA ANTECKNINGAR */}
          {cleanerInternalNotes && (
            <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-xl space-y-1">
              <span className="font-black text-sky-900 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-sky-600" /> Mi nota privada para esta casa:
              </span>
              <p className="font-bold text-sky-950 leading-relaxed whitespace-pre-line">
                {cleanerInternalNotes}
              </p>
            </div>
          )}

          {/* VÄRDENS FASTA INSTRUKTIONER FÖR HUSET MED TIDSSTÄMPEL */}
          {matchedProp?.property_notes && (
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-700 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                  <StickyNote className="w-3.5 h-3.5 text-slate-500" /> Notas fijas de la casa:
                </span>

                {matchedProp.notes_updated_at && (
                  <span className="text-[9.5px] font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Actualizado: {formatDate(matchedProp.notes_updated_at, lang)}
                  </span>
                )}
              </div>

              <p className="font-bold text-slate-900 leading-relaxed whitespace-pre-line pt-0.5">
                {matchedProp.property_notes}
              </p>
            </div>
          )}

          {/* RAPPORTERADE INCIDENTER OCH FOTON */}
          {bookingIncidents.length > 0 && (
            <div className="bg-rose-50/80 border border-rose-200 p-3 rounded-2xl space-y-2">
              <span className="font-black text-rose-900 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-rose-600" /> Incidencias reportadas ({bookingIncidents.length}):
              </span>
              <div className="space-y-2">
                {bookingIncidents.map((inc) => {
                  const photoList = parsePhotos(inc.photo_url);
                  return (
                    <div key={inc.id} className="bg-white p-2.5 rounded-xl border border-rose-100 space-y-1.5 shadow-sm">
                      {photoList.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {photoList.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Foto ${idx + 1}`}
                              onClick={() => setSelectedImage(url)}
                              className="w-full h-20 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition"
                            />
                          ))}
                        </div>
                      )}
                      <p className="font-bold text-slate-800 text-xs leading-relaxed">{inc.note}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ÅTERÖPPNA KNAPP */}
          {isFinished && (
            <button
              type="button"
              onClick={() => onReopen(b)}
              disabled={completingId === b.id}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              {completingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} {txt.btnReopen}
            </button>
          )}
        </div>
      )}

      {/* ÅTGÄRDSKNAPPAR */}
      <div className="flex items-center gap-2 pt-0.5">
        {isPending && (
          <button
            type="button"
            onClick={() => onAccept(b)}
            disabled={completingId === b.id}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-98"
          >
            {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
            {txt.btnAccept}
          </button>
        )}

        {isAccepted && (
          <button
            type="button"
            onClick={() => onComplete(b)}
            disabled={completingId === b.id}
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-98"
          >
            {completingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {txt.btnComplete}
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenIncident(b.id)}
          className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 border border-slate-200 shrink-0 active:scale-95"
        >
          <Camera className="w-4 h-4 text-slate-500" />
          <span>{txt.btnIncident}</span>
        </button>
      </div>

      {actionError?.id === b.id && (
        <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError.msg}</span>
        </div>
      )}

      {/* BILDVISNINGS-LIGHTBOX */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl">
            <img src={selectedImage} alt="Foto incident" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 bg-slate-900/80 text-white font-black p-2 rounded-full text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}