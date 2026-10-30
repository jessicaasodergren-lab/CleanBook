// src/services/propertyService.ts
import { supabase, type Property } from '../lib/supabase';

export const propertyService = {
  /**
   * Hämtar alla fastigheter som ägs av den inloggade värden och inkluderar aktiva städerskor i 1 anrop
   */
  async getHostProperties(hostId: string): Promise<Property[]> {
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('host_id', hostId);

    if (propError || !properties) return [];

    const { data: connections, error: connError } = await supabase
      .from('property_connections')
      .select('id, property_id, cleaner_id')
      .eq('status', 'active');

    if (connError) return properties;

    const cleanerIds = connections.map(c => c.cleaner_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email')
      .in('id', cleanerIds);

    return properties.map(p => {
      const conn = connections.filter(c => c.property_id === p.id);
      return {
        ...p,
        cleaners: conn.flatMap(c => {
          const profile = profiles?.find(prof => prof.id === c.cleaner_id);
          return profile ? [{ ...profile, connection_id: c.id }] : [];
        })
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
    const { data, error } = await supabase
      .from('properties')
      .insert({
        host_id: payload.hostId,
        name: payload.name,
        address: payload.address || payload.name,
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
   * Hämtar städerskans aktiva fastigheter, hennes privata inställningar och värdens namn i 1 anrop
   */
  async getCleanerProperties(cleanerId: string): Promise<Property[]> {
    const { data: connections, error: connError } = await supabase
      .from('property_connections')
      .select('id, property_id')
      .eq('cleaner_id', cleanerId)
      .eq('status', 'active');

    if (connError) throw connError;
    if (!connections || connections.length === 0) return [];

    const propertyIds = connections.map(c => c.property_id);

    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .in('id', propertyIds);

    if (propError) throw propError;

    const { data: settings, error: settingsError } = await supabase
      .from('cleaner_property_settings')
      .select('property_id, cleaning_time, internal_notes')
      .eq('cleaner_id', cleanerId);

    if (settingsError) throw settingsError;

    const hostIds = [...new Set((properties || []).map(p => p.host_id).filter(Boolean))];
    const { data: hosts, error: hostError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, language')
      .in('id', hostIds);

    if (hostError) throw hostError;

    return (properties || []).map(p => {
      const conn = connections.find(c => c.property_id === p.id);
      const setting = settings?.find(s => s.property_id === p.id);
      const host = hosts?.find(h => h.id === p.host_id);
      return {
        ...p,
        host_name: host?.full_name || 'Värd',
        host_phone: host?.phone || null,
        host_language: host?.language || null,
        connection_id: conn?.id ?? null,
        cleaning_time: setting?.cleaning_time,
        internal_notes: setting?.internal_notes,
      } as Property;
    });
  },

  /**
   * Skapar en engångsinbjudningskod för en fastighet (visas bara en gång)
   */
  async createInvitation(propertyId: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_property_invitation', { p_property_id: propertyId });

    if (error) throw error;
    if (typeof data !== 'string') throw new Error('INVALID_RESPONSE');
    return data;
  },

  /**
   * Kopplar en städerska till en fastighet via en engångsinbjudningskod
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
      .from('cleaner_property_settings')
      .upsert(
        {
          cleaner_id: cleanerId,
          property_id: propertyId,
          cleaning_time: time?.trim() || null,
          internal_notes: notes?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'cleaner_id,property_id' }
      );

    if (error) throw error;
  },

  /**
   * Avslutar en koppling mellan städerska och fastighet (från både värd och städerska)
   */
  async endConnection(connectionId: string): Promise<void> {
    const { error } = await supabase.rpc('end_connection', { p_connection_id: connectionId });

    if (error) throw error;
  },
};
