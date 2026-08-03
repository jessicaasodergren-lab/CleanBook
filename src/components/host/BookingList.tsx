import { useState } from 'react';
import { supabase, type Booking, type Incident } from '../../lib/supabase';
import { formatDate, APP_CONFIG } from '../../lib/constants';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Camera,
  Trash2,
  Loader2,
  Lock,
  MessageSquare,
  Bell,
  AlertTriangle,
  Check,
} from 'lucide-react';

interface BookingListProps {
  bookings: Booking[];
  incidents: Incident[];
  onRefresh: () => void;
}

function parsePhotos(photoUrl: string | null): string[] {
  if (!photoUrl) return [];
  try {
    if (photoUrl.startsWith('[')) return JSON.parse(photoUrl) as string[];
  } catch (e) {}
  return [photoUrl];
}

function getValidNote(notesEs: string | null | undefined, notesSv: string | null | undefined): string | null {
  if (notesEs && !notesEs.toUpperCase().includes('QUERY LENGTH LIMIT') && !notesEs.toUpperCase().includes('MYMEMORY')) {
    return notesEs;
  }
  return notesSv || null;
}

function formatTimeOrWindow(exactTime: string | null | undefined, timeWindow: string | null | undefined): string | null {
  if (exactTime) {
    return `kl ${exactTime}`;
  }
  if (timeWindow === 'morning') return '🌅 Förmiddag';
  if (timeWindow === 'afternoon') return '☀️ Eftermiddag';
  if (timeWindow === 'evening') return '🌙 Kväll';
  return null;
}

function getWhatsAppUrl(b: Booking): string {
  const phone = APP_CONFIG.mariaPhoneNumber || '34600000000';
  const depDate = formatDate(b.check_out_date, 'es');
  const depTime = b.check_out_exact_time ? `kl ${b.check_out_exact_time}` : '';
  const arrDate = formatDate(b.check_in_date, 'es');
  const arrTime = b.check_in_exact_time ? `kl ${b.check_in_exact_time}` : '';
  
  const validNoteEs = getValidNote(b.notes_es, b.notes);
  const notesText = validNoteEs || b.notes;

  const msg = 
`¡Hola Maria! 🧹
Nueva reserva para gestionar en CleanBook:

📍 *Propiedad:* ${b.property_name} (${b.property_address || b.property_name})
📅 *Salida (Limpieza):* ${depDate} ${depTime}
📅 *Entrada del huésped:* ${arrDate} ${arrTime}
👥 *Huéspedes:* ${b.guests}
🧺 *Lavar:* ${b.laundry ? 'SÍ' : 'NO'}
${notesText ? `📝 *Instrucciones:* ${notesText}\n` : ''}
Por favor, entra en CleanBook para aceptar la tarea.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export default function BookingList({ bookings, incidents, onRefresh }: BookingListProps) {
  const [jobFilter, setJobFilter] = useState<'active' | 'pending_only' | 'finished'>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (b: Booking) => {
    if (b.status !== 'pending') {
      alert('Kan inte radera: Bokningen är redan accepterad av Maria eller utförd.');
      return;
    }
    if (!window.confirm(`Är du säker på att du vill ta bort bokningen "${b.booking_title}"?`)) return;
    
    setDeletingId(b.id);
    await supabase.from('bookings').delete().eq('id', b.id);
    setDeletingId(null);
    onRefresh();
  };

  // Sortera STIGANDE efter check_in_date (tidigaste incheckning först)
  const sortedBookings = [...bookings].sort((a, b) => {
    const dateA = a.check_in_date || a.check_out_date || '9999-99-99';
    const dateB = b.check_in_date || b.check_out_date || '9999-99-99';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.check_out_date || '').localeCompare(b.check_out_date || '');
  });

  const activeJobs = sortedBookings.filter((b) => b.status === 'pending' || b.status === 'accepted');
  const pendingJobs = sortedBookings.filter((b) => b.status === 'pending');
  const finishedJobs = sortedBookings.filter((b) => b.status === 'finished');

  const displayedJobs =
    jobFilter === 'pending_only'
      ? pendingJobs
      : jobFilter === 'finished'
      ? finishedJobs
      : activeJobs;

  if (sortedBookings.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-2">
        <p className="text-white font-black text-base">Inga bokningar ännu</p>
        <p className="text-slate-400 text-xs">Använd formuläret för att lägga till din första gästvistelse.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* FILTERBAR KOMPAKT */}
      <div className="flex bg-slate-800 p-1 rounded-2xl text-xs font-bold gap-1 border border-slate-700 shadow-md">
        <button
          type="button"
          onClick={() => setJobFilter('active')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black ${
            jobFilter === 'active' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🧹 Aktiva ({activeJobs.length})
        </button>

        <button
          type="button"
          onClick={() => setJobFilter('pending_only')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black flex items-center justify-center gap-1 ${
            jobFilter === 'pending_only'
              ? 'bg-amber-400 text-slate-950 shadow'
              : pendingJobs.length > 0
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🟡 Väntar</span>
          {pendingJobs.length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {pendingJobs.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setJobFilter('finished')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black ${
            jobFilter === 'finished' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          💚 Slutförda ({finishedJobs.length})
        </button>
      </div>

      {/* BOKNINGSLISTA */}
      <div className="space-y-3">
        {displayedJobs.length === 0 ? (
          <div className="text-center py-10 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-2">
            <p className="text-white font-black text-base">Inga bokningar här</p>
            <p className="text-slate-400 text-xs">Det finns inga gästvistelser i denna vy.</p>
          </div>
        ) : (
          displayedJobs.map((b) => {
            const isPending = b.status === 'pending';
            const isAccepted = b.status === 'accepted';
            const isFinished = b.status === 'finished';
            const isExpanded = expandedId === b.id;
            const bookingIncidents = incidents.filter((i) => i.booking_id === b.id);
            const validNoteEs = getValidNote(b.notes_es, b.notes);

            const arrivalTimeFormatted = formatTimeOrWindow(b.check_in_exact_time, b.check_in_time_window);
            const departureTimeFormatted = formatTimeOrWindow(b.check_out_exact_time, b.check_out_time_window);

            return (
              <div
                key={b.id}
                className={`rounded-3xl p-4 sm:p-5 shadow-xl transition-all space-y-3 ${
                  isPending
                    ? 'bg-amber-50 text-slate-900 border-2 border-amber-400 shadow-amber-500/10'
                    : isFinished
                    ? 'bg-white text-slate-900 border border-slate-200 opacity-80'
                    : 'bg-white text-slate-900 border border-slate-200'
                }`}
              >
                {/* TOPP-INFO */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPending && (
                        <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                          <Bell className="w-3 h-3 text-slate-950" /> Väntar på Marias svar
                        </span>
                      )}
                      {isAccepted && (
                        <span className="bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3 text-sky-600" /> Accepterad av Maria
                        </span>
                      )}
                      {isFinished && (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Slutförd städning
                        </span>
                      )}

                      {bookingIncidents.length > 0 && (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Camera className="w-3 h-3 text-slate-500" />
                          {bookingIncidents.length}
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight pt-0.5 truncate">
                      {b.booking_title}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.property_address || b.property_name}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(b.id)}
                    className="p-1.5 bg-white/80 hover:bg-slate-100 rounded-xl text-slate-600 transition border border-slate-200 shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* INSTRUKTIONSBLOCK */}
                {b.notes && (
                  <div
                    onClick={() => toggleExpand(b.id)}
                    className="bg-amber-100/90 border-l-4 border-amber-500 p-3 rounded-r-xl text-xs cursor-pointer hover:bg-amber-200/80 transition shadow-sm space-y-1"
                  >
                    <div className="flex items-center gap-1 font-black text-amber-900 text-[10px] uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Dina extra instruktioner:</span>
                    </div>

                    <p className="font-bold text-amber-950 leading-relaxed">
                      {isExpanded ? (
                        <span className="whitespace-pre-line">{b.notes}</span>
                      ) : (
                        <span>
                          {b.notes.length > 75 ? `${b.notes.slice(0, 75)}...` : b.notes}
                        </span>
                      )}
                    </p>

                    {isExpanded && validNoteEs && validNoteEs !== b.notes && (
                      <div className="pt-1.5 border-t border-amber-200/60 mt-1.5">
                        <span className="text-[9.5px] font-extrabold text-amber-800 block uppercase">
                          Spansk översättning (till Maria):
                        </span>
                        <p className="font-medium text-amber-900 italic leading-relaxed">{validNoteEs}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TIDER & SPECS */}
                <div className="bg-white/90 rounded-2xl p-3 border border-slate-200/80 space-y-2 text-xs shadow-sm">
                  <div className="grid grid-cols-2 gap-2 pb-1.5 border-b border-slate-200/60">
                    <div className="bg-sky-50/80 p-2 rounded-xl border border-sky-100">
                      <span className="text-[10px] font-black text-sky-900 uppercase block">
                        Incheckning
                      </span>
                      <span className="font-black text-sky-950 block text-xs">
                        {formatDate(b.check_in_date, 'sv')}
                      </span>
                      {arrivalTimeFormatted && (
                        <span className="text-[10.5px] font-bold text-sky-700 block mt-0.5">
                          {arrivalTimeFormatted}
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Utcheckning
                      </span>
                      <span className="font-black text-slate-900 block text-xs">
                        {formatDate(b.check_out_date, 'sv')}
                      </span>
                      {departureTimeFormatted && (
                        <span className="text-[10.5px] font-bold text-slate-500 block mt-0.5">
                          {departureTimeFormatted}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 font-bold pt-0.5">
                    <span>{b.guests} gäster</span>
                    <span>{b.laundry ? '🧺 Tvätta lakan/handdukar' : '🚫 Ingen tvätt'}</span>
                  </div>
                </div>

                {/* EXPANDERAT INNEHÅLL */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-2 text-xs animate-in fade-in duration-200">
                    {bookingIncidents.length > 0 && (
                      <div className="bg-slate-100/70 border border-slate-200 p-3 rounded-xl space-y-1.5">
                        <span className="font-black text-slate-900 uppercase text-[10px] block flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-slate-600" /> Marias fotorapport ({bookingIncidents.length}):
                        </span>
                        <div className="space-y-1.5">
                          {bookingIncidents.map((inc) => {
                            const photoList = parsePhotos(inc.photo_url);
                            return (
                              <div key={inc.id} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5 shadow-sm">
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
                                <p className="font-bold text-slate-800 text-[11px]">{inc.note}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      {isPending ? (
                        <>
                          <a
                            href={getWhatsAppUrl(b)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 flex-1"
                          >
                            <MessageSquare className="w-4 h-4 fill-white" />
                            Avisera Maria på WhatsApp
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(b)}
                            disabled={deletingId === b.id}
                            className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 border border-rose-200 active:scale-95"
                          >
                            {deletingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                            Ta bort
                          </button>
                        </>
                      ) : (
                        <div className="w-full py-2 px-3 bg-slate-100 text-slate-500 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 border border-slate-200">
                          <Lock className="w-3.5 h-3.5 text-slate-400" /> Låst (accepterad/utförd av Maria)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl">
            <img src={selectedImage} alt="Förstorad bild" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 bg-slate-900/80 text-white font-black p-2 rounded-full text-xs"
            >
              ✕ Stäng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}