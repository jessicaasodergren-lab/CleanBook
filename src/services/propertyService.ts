// src/services/propertyService.ts
import { supabase, type Property } from '../lib/supabase';

export const propertyService = {
  /**
   * Hämtar alla fastigheter som ägs av den inloggade värden och inkluderar kopplade städerskor i 1 anrop
   */
  async getHostProperties(hostId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        property_connections (
          cleaner:profiles!property_connections_cleaner_id_fkey (
            id,
            full_name,
            phone,
            email
          )
        )
      `)
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fel vid hämtning av fastigheter:', error);
      throw error;
    }

    if (!data) return [];

    return data.map((prop: any) => ({
      ...prop,
      cleaners: (prop.property_connections || [])
        .map((conn: any) => conn.cleaner)
        .filter(Boolean),
    }));
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
    const { data, error } = await supabase
      .from('property_connections')
      .select(`
        cleaning_time,
        internal_notes,
        properties:property_id (
          *,
          host:profiles!properties_host_id_fkey (
            full_name
          )
        )
      `)
      .eq('cleaner_id', cleanerId);

    if (error) throw error;
    if (!data) return [];

    return data
      .map((item: any) => {
        if (!item.properties) return null;
        return {
          ...item.properties,
          host_name: item.properties.host?.full_name || 'Värd',
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