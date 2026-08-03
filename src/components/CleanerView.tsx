import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../lib/supabase';
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
      {/* HEADER: STÄDIKON (SPARKLES) + REN TITEL (UTAN CLEANBOOK-UPPREPNING) */}
      <div className="flex items-center justify-between bg-slate-900 p-3.5 px-4 rounded-2xl border border-slate-800 shadow-lg gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-black shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-black text-sm text-white truncate leading-tight">
              Panel de Limpieza
            </h2>
            <p className="text-xs font-medium text-slate-400 truncate mt-0.5">
              Gestión de tareas y propiedades
            </p>
          </div>
        </div>
      </div>

      {/* FLIKAR / REGLEGE */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-black shadow-xl">
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