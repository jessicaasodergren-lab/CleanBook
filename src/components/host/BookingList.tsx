// src/components/host/BookingList.tsx
import { useState } from 'react';
import type { Booking, Incident } from '../../lib/supabase';
import BookingCard from './BookingCard';

interface BookingListProps {
  bookings: Booking[];
  incidents: Incident[];
  onRefresh: () => void;
}

export default function BookingList({ bookings, incidents, onRefresh }: BookingListProps) {
  const [jobFilter, setJobFilter] = useState<'active' | 'pending_only' | 'finished'>('active');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
      {/* FILTERKNAPPAR */}
      <div className="flex bg-slate-800 p-1 rounded-2xl text-xs font-bold gap-1 border border-slate-700 shadow-md">
        <button
          type="button"
          onClick={() => setJobFilter('active')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black ${
            jobFilter === 'active' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400'
          }`}
        >
          🧹 Aktiva ({activeJobs.length})
        </button>

        <button
          type="button"
          onClick={() => setJobFilter('pending_only')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black flex items-center justify-center gap-1 ${
            jobFilter === 'pending_only' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400'
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
            jobFilter === 'finished' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'
          }`}
        >
          💚 Slutförda ({finishedJobs.length})
        </button>
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {displayedJobs.length === 0 ? (
          <div className="text-center py-10 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-2">
            <p className="text-white font-black text-base">Inga bokningar här</p>
            <p className="text-slate-400 text-xs">Det finns inga gästvistelser i denna vy.</p>
          </div>
        ) : (
          displayedJobs.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              incidents={incidents}
              onRefresh={onRefresh}
              onSelectImage={(url) => setSelectedImage(url)}
            />
          ))
        )}
      </div>

      {/* FÖRSTORAD BILD MODAL */}
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