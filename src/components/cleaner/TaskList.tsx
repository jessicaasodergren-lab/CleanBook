// src/components/cleaner/TaskList.tsx
import { useState } from 'react';
import type { Booking, Incident, Property } from '../../lib/supabase';
import { bookingService } from '../../services/bookingService';
import { translations } from '../../i18n/translations';
import { formatDate } from '../../lib/constants';
import IncidentModal from './IncidentModal';
import TaskCard from './TaskCard';
import type { CleanerLanguage } from '../CleanerView';
import { Loader2 } from 'lucide-react';

interface TaskListProps {
  bookings: Booking[];
  incidents: Incident[];
  properties: Property[];
  loading: boolean;
  onRefresh: () => void;
  lang?: CleanerLanguage;
}

export default function TaskList({ bookings, incidents, properties, loading, onRefresh, lang = 'es' }: TaskListProps) {
  const [jobFilter, setJobFilter] = useState<'active' | 'pending_only' | 'finished'>('active');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openIncidentFor, setOpenIncidentFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  // Hämtar från det centrala språk-registret!
  const txt = translations.taskList[lang] || translations.taskList.es;
  const todayYMD = new Date().toISOString().split('T')[0];

  const sortedByDeparture = [...bookings].sort((a, b) =>
    (a.check_out_date || '9999-99-99').localeCompare(b.check_out_date || '9999-99-99')
  );

  const activeJobs = sortedByDeparture.filter((b) => b.status === 'pending' || b.status === 'accepted');
  const pendingJobs = sortedByDeparture.filter((b) => b.status === 'pending');
  const finishedJobs = sortedByDeparture.filter((b) => b.status === 'finished');

  const displayedJobs =
    jobFilter === 'pending_only'
      ? pendingJobs
      : jobFilter === 'finished'
      ? finishedJobs
      : activeJobs;

  const handleAcceptTask = async (b: Booking) => {
    setCompletingId(b.id);
    await bookingService.updateStatus(b.id, 'accepted');
    setCompletingId(null);
    onRefresh();
  };

  const handleCompleteTask = async (b: Booking) => {
    setActionError(null);
    if (!b.vacant_now && b.check_out_date && todayYMD < b.check_out_date) {
      setActionError({
        id: b.id,
        msg: `${txt.errCannotCompleteEarly} (${formatDate(b.check_out_date, lang)}).`,
      });
      setTimeout(() => setActionError(null), 5000);
      return;
    }

    setCompletingId(b.id);
    await bookingService.updateStatus(b.id, 'finished');
    setCompletingId(null);
    onRefresh();
  };

  const handleReopenTask = async (b: Booking) => {
    setCompletingId(b.id);
    await bookingService.updateStatus(b.id, 'accepted');
    setCompletingId(null);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      {/* FILTERKNAPPAR */}
      <div className="flex bg-slate-800 p-1 rounded-2xl text-xs font-bold gap-1 border border-slate-700 shadow-md">
        <button
          type="button"
          onClick={() => setJobFilter('active')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black ${
            jobFilter === 'active' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          {txt.filterActive} ({activeJobs.length})
        </button>

        <button
          type="button"
          onClick={() => setJobFilter('pending_only')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black flex items-center justify-center gap-1 ${
            jobFilter === 'pending_only'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>{txt.filterPending} ({pendingJobs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setJobFilter('finished')}
          className={`flex-1 py-2 rounded-xl transition text-center font-black ${
            jobFilter === 'finished' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          {txt.filterFinished}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
        </div>
      ) : displayedJobs.length === 0 ? (
        <div className="text-center py-10 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-2">
          <p className="text-white font-black text-base">{txt.noTasksTitle}</p>
          <p className="text-slate-400 text-xs">{txt.noTasksDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedJobs.map((b) => (
            <TaskCard
              key={b.id}
              booking={b}
              allBookings={bookings}
              incidents={incidents}
              properties={properties}
              lang={lang}
              txt={txt}
              completingId={completingId}
              actionError={actionError}
              onAccept={handleAcceptTask}
              onComplete={handleCompleteTask}
              onReopen={handleReopenTask}
              onOpenIncident={(id) => setOpenIncidentFor(id)}
            />
          ))}
        </div>
      )}

      {openIncidentFor && (
        <IncidentModal
          bookingId={openIncidentFor}
          onClose={() => setOpenIncidentFor(null)}
          onSaved={() => {
            setOpenIncidentFor(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}