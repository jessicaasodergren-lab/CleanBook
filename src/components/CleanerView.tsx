import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../lib/supabase';
import { APP_CONFIG } from '../lib/constants';
import TaskList from './cleaner/TaskList';
import PropertyList from './cleaner/PropertyList';
import { Clock, Building, Sparkles } from 'lucide-react';

interface CleanerViewProps {
  bookings: Booking[];
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
}

export default function CleanerView({ bookings, incidents, loading, onRefresh }: CleanerViewProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'properties'>('jobs');
  const [properties, setProperties] = useState<Property[]>([]);

  const fetchProperties = useCallback(async () => {
    const { data } = await supabase.from('properties').select('*').order('name');
    if (data) setProperties(data as Property[]);
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleRefreshAll = () => {
    fetchProperties();
    onRefresh();
  };

  return (
    <div className="max-w-xl mx-auto px-4 space-y-4">
      {/* ULTRAKOMPAKT BRAND HEADER */}
      <div className="bg-slate-900/90 text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-black shrink-0">
            <Sparkles className="w-5 h-5 text-sky-400" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-xs text-white tracking-tight">{APP_CONFIG.name}</span>
              <span className="text-[9px] uppercase font-black bg-sky-500/20 text-sky-400 px-1.5 py-0.2 rounded-md border border-sky-500/30">
                Cleaner
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate leading-tight">
              {APP_CONFIG.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* FLIKAR / REGLEGE */}
      <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700 text-xs font-black shadow-xl">
        <button
          type="button"
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'jobs' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Tareas ({bookings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'properties' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" /> Mis Propiedades ({properties.length})
        </button>
      </div>

      {/* INNEHÅLL PÅ VALD FLIK */}
      {activeTab === 'jobs' ? (
        <TaskList
          bookings={bookings}
          incidents={incidents}
          properties={properties}
          loading={loading}
          onRefresh={handleRefreshAll}
        />
      ) : (
        <PropertyList properties={properties} onRefresh={handleRefreshAll} />
      )}
    </div>
  );
}