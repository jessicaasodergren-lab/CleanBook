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
    <div className="max-w-xl mx-auto px-4 space-y-6">
      {/* FLIK-REGLEGE */}
      <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 text-xs font-black shadow-xl">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'jobs' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Tareas ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'properties' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" /> Mis Propiedades ({properties.length})
        </button>
      </div>

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