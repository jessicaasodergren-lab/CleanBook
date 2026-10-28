// src/services/propertyService.ts
import { supabase, type Property } from '../lib/supabase';

export const propertyService = {
  /**
   * Hämtar alla fastigheter som ägs av den inloggade värden och inkluderar kopplade städerskor i 1 anrop
   */
  async getHostProperties(hostId: string): Promise<Property[]> {
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('host_id', hostId);

    if (propError || !properties) return [];

    const propertyIds = properties.map(p => p.id);

    // Hämta kopplingar separat
    const { data: connections, error: connError } = await supabase
      .from('property_connections')
      .select('property_id, cleaner_id');

    if (connError) return properties;

    // Hämta profilerna för de städare vi hittade i kopplingarna
    const cleanerIds = connections.map(c => c.cleaner_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email')
      .in('id', cleanerIds);

    return properties.map(p => {
      const conn = connections.filter(c => c.property_id === p.id);
      return {
        ...p,
        cleaners: conn.map(c => profiles?.find(prof => prof.id === c.cleaner_id)).filter(Boolean)
      };
    });
  },

  /**
   * Skapar en ny fastighet
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
   * Uppdaterar en befintlig fastighet i Supabase
   */
  async updateProperty(
    propertyId: string,
    payload: {
      name: string;
      address: string;
      kvm?: string | null;
      rooms?: string | null;
      bathrooms?: string | null;
      property_notes?: string | null;
    }
  ): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .update({
        name: payload.name,
        address: payload.address,
        kvm: payload.kvm || null,
        rooms: payload.rooms || null,
        bathrooms: payload.bathrooms || null,
        property_notes: payload.property_notes || null,
        notes_updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .select('*')
      .single();

    if (error) throw error;
    return data as Property;
  },

  /**
   * Hämtar städerskans kopplade fastigheter och värdens namn i 1 anrop
   */
  async getCleanerProperties(cleanerId: string): Promise<Property[]> {
    console.log("Hämtar för cleanerId:", cleanerId);

    // 1. Hämta kopplingar
    const { data: connections, error: connError } = await supabase
      .from('property_connections')
      .select('property_id, cleaning_time, internal_notes')
      .eq('cleaner_id', cleanerId);

    console.log("Kopplingar hittade:", connections);

    if (connError) { console.error("Kopplingsfel:", connError); throw connError; }
    if (!connections || connections.length === 0) return [];

    const propertyIds = connections.map(c => c.property_id);

    // 2. Hämta fastigheter (vi tar bort joinen för att utesluta fel i relationsnamnet)
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .in('id', propertyIds);

    console.log("Fastigheter hittade:", properties);

    if (propError) { console.error("Fastighetsfel:", propError); throw propError; }

    const hostIds = [...new Set((properties || []).map(p => p.host_id).filter(Boolean))];
    const { data: hosts, error: hostError } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', hostIds);

    if (hostError) throw hostError;

    return (properties || []).map(p => {
      const conn = connections.find(c => c.property_id === p.id);
      const host = hosts?.find(h => h.id === p.host_id);
      return {
        ...p,
        host_name: host?.full_name || 'Värd',
        host_phone: host?.phone || null,
        cleaning_time: conn?.cleaning_time,
        internal_notes: conn?.internal_notes,
      } as Property;
    });
  },
  /**
   * Kopplar en städerska till en fastighet via invite_code
   */
  async connectByInviteCode(code: string): Promise<void> {
    const { error } = await supabase.rpc('connect_cleaner_by_invite', { p_code: code });

    if (error) {
      if (error.message.includes('INVALID_CODE')) throw new Error('INVALID_CODE');
      if (error.message.includes('ALREADY_CONNECTED')) throw new Error('ALREADY_CONNECTED');
      throw error;
    }
  },

  /**
   * Uppdaterar städerskans privata anteckningar & uppskattade städtid
   */
  async updateCleanerConnection(
    cleanerId: string,
    propertyId: string,
    time: string | null,
    notes: string | null
  ): Promise<void> {
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