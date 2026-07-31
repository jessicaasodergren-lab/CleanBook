import { useState } from 'react';
import { supabase, type Booking, type Incident } from '../../lib/supabase';
import { formatDate, APP_CONFIG } from '../../lib/constants';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Clock,
  Users,
  Camera,
  Trash2,
  Loader2,
  FileText,
  Lock,
  MessageSquare,
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

function getWhatsAppUrl(b: Booking): string {
  const phone = APP_CONFIG.mariaPhoneNumber || '34600000000';
  const depDate = formatDate(b.departure_date, 'es');
  const depTime = b.departure_exact_time ? `kl ${b.departure_exact_time}` : '';
  const arrDate = formatDate(b.next_arrival_date, 'es');
  const arrTime = b.arrival_exact_time ? `kl ${b.arrival_exact_time}` : '';
  const notesText = b.notes_es || b.notes;

  const msg = 
`¡Hola Maria! 🧹
Nueva reserva para gestionar en CleanBook:

📍 *Propiedad:* ${b.property_name} (${b.property_address || b.property_name})
📅 *Salida (Limpieza):* ${depDate} ${depTime}
📅 *Próxima entrada:* ${arrDate} ${arrTime}
👥 *Huéspedes:* ${b.guests}
🧺 *Lavar:* ${b.laundry ? 'SÍ' : 'NO'}
${notesText ? `📝 *Instrucciones:* ${notesText}\n` : ''}
Por favor, entra en CleanBook para aceptar la tarea.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export default function BookingList({ bookings, incidents, onRefresh }: BookingListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (b: Booking) => {
    if (b.status !== 'pending') {
      alert('Kan inte radera: Bokningen är redan accepterad av Maria eller utförd.');
      return;
    }
    if (!window.confirm('Är du säker på att du vill ta bort denna bokning?')) return;
    
    setDeletingId(b.id);
    await supabase.from('bookings').delete().eq('id', b.id);
    setDeletingId(null);
    onRefresh();
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    return (b.departure_date || '').localeCompare(a.departure_date || '');
  });

  if (sortedBookings.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 space-y-2">
        <p className="text-white font-black text-lg">Inga bokningar ännu</p>
        <p className="text-slate-400 text-xs">Använd formuläret ovan för att lägga till din första gästvistelse.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-black text-white text-xs uppercase tracking-wider px-1">
        Mina Bokningar ({sortedBookings.length})
      </h4>

      <div className="space-y-3">
        {sortedBookings.map((b) => {
          const isPending = b.status === 'pending';
          const isAccepted = b.status === 'accepted';
          const isFinished = b.status === 'finished';
          const isExpanded = expandedId === b.id;
          const bookingIncidents = incidents.filter((i) => i.booking_id === b.id);

          return (
            <div
              key={b.id}
              className={`bg-white text-slate-900 rounded-3xl overflow-hidden shadow-xl border transition-all ${
                isFinished
                  ? 'border-emerald-300'
                  : isAccepted
                  ? 'border-sky-300 shadow-sky-500/10'
                  : 'border-amber-200'
              }`}
            >
              <div
                className={`h-2.5 w-full ${
                  isFinished ? 'bg-emerald-500' : isAccepted ? 'bg-sky-500' : 'bg-amber-400'
                }`}
              />

              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isPending && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          🟡 Väntar på Marias svar
                        </span>
                      )}
                      {isAccepted && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-sky-100 text-sky-900 border border-sky-300 font-bold">
                          🔵 Accepterad av Maria
                        </span>
                      )}
                      {isFinished && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-600 text-white">
                          ✓ Utförd städning
                        </span>
                      )}

                      {bookingIncidents.length > 0 && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-sky-600" />
                          {bookingIncidents.length} {bookingIncidents.length === 1 ? 'foto' : 'foton'}
                        </span>
                      )}

                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {b.guests} gäster
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-base leading-snug">
                      {b.booking_title}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.property_address || b.property_name}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(b.id)}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition shrink-0 mt-1"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Incheckning</span>
                    <span className="font-black text-slate-900 block flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-sky-600" /> {formatDate(b.next_arrival_date, 'sv')}
                    </span>
                    {b.arrival_exact_time && (
                      <span className="text-[10px] font-bold text-slate-500 block flex items-center gap-1">
                        <Clock className="w-3 h-3" /> kl {b.arrival_exact_time}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Utcheckning / Städstart</span>
                    <span className="font-black text-slate-900 block flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-600" /> {formatDate(b.departure_date, 'sv')}
                    </span>
                    {b.departure_exact_time && (
                      <span className="text-[10px] font-bold text-slate-500 block flex items-center gap-1">
                        <Clock className="w-3 h-3" /> kl {b.departure_exact_time}
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                    {b.notes && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl space-y-1">
                        <span className="font-black text-amber-900 uppercase text-[10px] block flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-amber-600" /> Dina instruktioner:
                        </span>
                        <p className="font-bold text-amber-950 leading-relaxed whitespace-pre-line">{b.notes}</p>
                        {b.notes_es && (
                          <div className="pt-1.5 border-t border-amber-200/60 mt-1">
                            <span className="text-[10px] font-extrabold text-amber-700 block uppercase">
                              Spansk översättning (till Maria):
                            </span>
                            <p className="font-medium text-amber-900 italic leading-relaxed">{b.notes_es}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {bookingIncidents.length > 0 && (
                      <div className="bg-sky-50 border border-sky-200 p-3 rounded-2xl space-y-2">
                        <span className="font-black text-sky-900 uppercase text-[10px] block flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-sky-600" /> Marias fotorapport ({bookingIncidents.length}):
                        </span>
                        <div className="space-y-2">
                          {bookingIncidents.map((inc) => {
                            const photoList = parsePhotos(inc.photo_url);
                            return (
                              <div key={inc.id} className="bg-white p-2.5 rounded-xl border border-sky-200 space-y-2">
                                {photoList.length > 0 && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {photoList.map((url, idx) => (
                                      <img
                                        key={idx}
                                        src={url}
                                        alt={`Foto ${idx + 1}`}
                                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                                      />
                                    ))}
                                  </div>
                                )}
                                <p className="font-bold text-slate-800 text-xs">{inc.note}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ÅTGÄRDER (WHATSAPP & TA BORT) */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      <a
                        href={getWhatsAppUrl(b)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-emerald-300 shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        Avisera Maria på WhatsApp
                      </a>

                      {isPending ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
                          disabled={deletingId === b.id}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-rose-200"
                        >
                          {deletingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Ta bort
                        </button>
                      ) : (
                        <div className="py-2 px-3 bg-slate-100 text-slate-400 font-bold text-[11px] rounded-xl flex items-center gap-1 border border-slate-200">
                          <Lock className="w-3 h-3" /> Låst (accepterad/utförd)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}