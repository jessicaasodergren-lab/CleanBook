// src/services/propertyService.ts
import { supabase, type Property } from '../lib/supabase';

export const propertyService = {
  /**
   * Hämtar alla fastigheter som ägs av den inloggade värden och kopplar på värdens namn från profiles
   */
  // Ersätt getHostProperties i src/services/propertyService.ts
async getHostProperties(hostId: string): Promise<Property[]> {
  // 1. Hämta värdens alla fastigheter först
  const { data: props, error } = await supabase
    .from('properties')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fel vid hämtning av fastigheter:', error);
    throw error;
  }

  if (!props || props.length === 0) return [];

  const propIds = props.map((p) => p.id);

  // 2. Hämta kopplade städerskor i separata anrop för att förhindra krasch om en relation saknas
  try {
    const { data: conns } = await supabase
      .from('property_connections')
      .select('property_id, cleaner_id')
      .in('property_id', propIds);

    if (conns && conns.length > 0) {
      const cleanerIds = Array.from(new Set(conns.map((c) => c.cleaner_id)));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email')
        .in('id', cleanerIds);

      if (profiles) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        const propCleanersMap: Record<string, CleanerInfo[]> = {};

        conns.forEach((c) => {
          const profile = profileMap.get(c.cleaner_id);
          if (profile) {
            if (!propCleanersMap[c.property_id]) propCleanersMap[c.property_id] = [];
            propCleanersMap[c.property_id].push({
              id: profile.id,
              full_name: profile.full_name || null,
              phone: profile.phone || null,
              email: profile.email,
            });
          }
        });

        return props.map((p) => ({
          ...p,
          cleaners: propCleanersMap[p.id] || [],
        }));
      }
    }
  } catch (err) {
    console.warn('Kunde inte läsa in städerskor, visar fastigheter ändå:', err);
  }

  return props;
},
  /**
   * Skapar en ny fastighet (utan host_name i databaskolumnen)
   */
  async createProperty(payload: {
    hostId: string;
    name: string;
    address: string;
    kvm?: string | null;
    rooms?: string | null;
    bathrooms?: string | null;
    property_notes?: string | null;
  }): Promise<Property> {
    const inviteCode = `CLEAN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data, error } = await supabase
      .from('properties')
      .insert({
        host_id: payload.hostId,
        name: payload.name,
        address: payload.address || payload.name,
        invite_code: inviteCode,
        kvm: payload.kvm || null,
        rooms: payload.rooms || null,
        bathrooms: payload.bathrooms || null,
        property_notes: payload.property_notes || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Hämtar namnet på skaparen från profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payload.hostId)
      .maybeSingle();

    return {
      ...(data as Property),
      host_name: profile?.full_name || 'Värd',
    };
  },

  /**
   * Hämtar städerskans kopplade fastigheter och slår ihop värdarnas namn säkert
   */
  async getCleanerProperties(cleanerId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('property_connections')
      .select('cleaning_time, internal_notes, properties(*)')
      .eq('cleaner_id', cleanerId);

    if (error) throw error;
    if (!data) return [];

    // Samlar alla unika host_ids
    const hostIds = Array.from(
      new Set(data.map((item: any) => item.properties?.host_id).filter(Boolean))
    );

    let profileMap: Record<string, string> = {};
    if (hostIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', hostIds);

      if (profiles) {
        profiles.forEach((pr) => {
          if (pr.full_name) profileMap[pr.id] = pr.full_name;
        });
      }
    }

    return data
      .map((item: any) => {
        if (!item.properties) return null;
        const hId = item.properties.host_id;
        return {
          ...item.properties,
          host_name: profileMap[hId] || 'Värd',
          cleaning_time: item.cleaning_time,
          internal_notes: item.internal_notes,
        };
      })
      .filter(Boolean) as Property[];
  },

  /**
   * Kopplar en städerska till en fastighet via invite_code
   */
  async connectByInviteCode(cleanerId: string, code: string): Promise<void> {
    const formattedCode = code.trim().toUpperCase();

    // Söker enbart mot invite_code
    const { data: prop, error: propErr } = await supabase
      .from('properties')
      .select('id')
      .eq('invite_code', formattedCode)
      .maybeSingle();

    if (propErr) throw propErr;
    if (!prop) throw new Error('INVALID_CODE');

    const { error: connectErr } = await supabase
      .from('property_connections')
      .insert({
        property_id: prop.id,
        cleaner_id: cleanerId,
      });

    if (connectErr) {
      if (connectErr.code === '23505') throw new Error('ALREADY_CONNECTED');
      throw connectErr;
    }
  },

  /**
   * Uppdaterar städerskans privata anteckningar & uppskattade städtid
   */
  async updateCleanerConnection(cleanerId: string, propertyId: string, time: string | null, notes: string | null): Promise<void> {
    const { error } = await supabase
      .from('property_connections')
      .update({
        cleaning_time: time?.trim() || null,
        internal_notes: notes?.trim() || null,
      })
      .eq('property_id', propertyId)
      .eq('cleaner_id', cleanerId);

    if (error) throw error;
  },

  /**
   * Kopplar från en fastighet från städerskan
   */
  async disconnectProperty(cleanerId: string, propertyId: string): Promise<void> {
    const { error } = await supabase
      .from('property_connections')
      .delete()
      .eq('property_id', propertyId)
      .eq('cleaner_id', cleanerId);

    if (error) throw error;
  },
};