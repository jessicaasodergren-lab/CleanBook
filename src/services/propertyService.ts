// src/services/propertyService.ts
import { supabase, type Property } from '../lib/supabase';

export const propertyService = {
  /**
   * Hämtar alla fastigheter som ägs av den inloggade värden och kopplar på värdens namn från profiles
   */
  async getHostProperties(userId: string): Promise<Property[]> {
    // 1. Hämtar fastigheterna direkt utan beroende på databasrelationer
    const { data: props, error: propErr } = await supabase
      .from('properties')
      .select('*')
      .eq('host_id', userId)
      .order('name');

    if (propErr) throw propErr;
    if (!props || props.length === 0) return [];

    // 2. Hämtar värdens namn från profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const hostName = profile?.full_name || 'Värd';

    return props.map((p) => ({
      ...p,
      host_name: hostName,
    })) as Property[];
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