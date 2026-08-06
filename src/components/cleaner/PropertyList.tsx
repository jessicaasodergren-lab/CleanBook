// src/components/cleaner/PropertyList.tsx
import { useState, useEffect } from 'react';
import { supabase, type Property } from '../../lib/supabase';
import type { CleanerLanguage } from '../CleanerView';
import { translations } from '../../i18n/translations';
import PropertyCard from './PropertyCard';
import ConnectPropertyModal from '../modals/ConnectPropertyModal';
import { Building, Plus } from 'lucide-react';

interface PropertyListProps {
  properties: Property[];
  onRefresh: () => void;
  lang?: CleanerLanguage;
}

// Inbyggda reservöversättningar för att förhindra krasch vid saknade i18n-nycklar
const defaultPropListTexts: Record<CleanerLanguage, any> = {
  es: {
    title: 'Propiedades conectadas',
    subtitleSingle: 'propiedad vinculada a tu cuenta',
    subtitlePlural: 'propiedades vinculadas a tu cuenta',
    btnConnectCode: 'Conectar código',
    noPropsTitle: 'Sin propiedades conectadas',
    noPropsDesc: 'Usa el botón superior para vincular tu primera propiedad.',
  },
  en: {
    title: 'Connected Properties',
    subtitleSingle: 'property linked to your account',
    subtitlePlural: 'properties linked to your account',
    btnConnectCode: 'Connect code',
    noPropsTitle: 'No connected properties',
    noPropsDesc: 'Use the button above to link your first property.',
  },
  sv: {
    title: 'Kopplade fastigheter',
    subtitleSingle: 'fastighet kopplad till ditt konto',
    subtitlePlural: 'fastigheter kopplade till ditt konto',
    btnConnectCode: 'Koppla med kod',
    noPropsTitle: 'Inga kopplade fastigheter',
    noPropsDesc: 'Använd knappen ovan för att koppla din första fastighet.',
  },
};

export default function PropertyList({ properties = [], onRefresh, lang = 'es' }: PropertyListProps) {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectionsMap, setConnectionsMap] = useState<Record<string, any>>({});

  // Kraschsäker hämtning med inbyggd reservöversättning
  const txt =
    (translations as any)?.propertyList?.[lang] ||
    (translations as any)?.propertyList?.es ||
    defaultPropListTexts[lang] ||
    defaultPropListTexts.es;

  const fetchConnections = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('property_connections')
        .select('id, property_id, internal_notes, cleaning_time')
        .eq('cleaner_id', session.user.id);

      if (error) {
        console.error('Kunde inte hämta property_connections:', error);
        return;
      }

      if (data) {
        const map: Record<string, any> = {};
        data.forEach((item: any) => { map[item.property_id] = item; });
        setConnectionsMap(map);
      }
    } catch (err) {
      console.error('Fel vid hämtning av anslutningar:', err);
    }
  };

  useEffect(() => { fetchConnections(); }, [properties]);

  return (
    <div className="space-y-4">
      {/* SEKTIONSHUVUD */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-400" /> {txt.title}
          </h3>
          <p className="text-[11px] font-semibold text-slate-400">
            {properties.length} {properties.length === 1 ? txt.subtitleSingle : txt.subtitlePlural}
          </p>
        </div>

        <button
          onClick={() => setShowConnectModal(true)}
          className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-sky-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{txt.btnConnectCode}</span>
        </button>
      </div>

      {/* MODAL */}
      <ConnectPropertyModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={onRefresh}
        lang={lang}
      />

      {/* FASTIGHETSLISTA */}
      <div className="space-y-3">
        {properties.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-slate-400 text-xs space-y-2">
            <Building className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-bold text-white">{txt.noPropsTitle}</p>
            <p>{txt.noPropsDesc}</p>
          </div>
        ) : (
          properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              connectionData={connectionsMap[p.id]}
              lang={lang}
              onRefresh={() => { fetchConnections(); onRefresh(); }}
            />
          ))
        )}
      </div>
    </div>
  );
}