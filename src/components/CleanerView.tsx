import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Incident, type Property } from '../lib/supabase';
import TaskList from './cleaner/TaskList';
import PropertyList from './cleaner/PropertyList';
import { Clock, Building } from 'lucide-react';

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
    <div className="max-w-xl mx-auto px-2 sm:px-4 space-y-3">
      {/* ULTRA-KOMPAKT TOPPMENY (SPARAR ~150PX SKÄRMYTA) */}
      <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-black shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'jobs' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Tareas ({bookings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'properties' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Mis Propiedades ({properties.length})</span>
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