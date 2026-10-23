// src/services/propertyService.ts
import { supabase, type Property } from '../lib/supabase';

export const propertyService = {
  /**
   * Hämtar alla fastigheter som ägs av den inloggade värden och inkluderar kopplade städerskor i 1 anrop
   */
  async getHostProperties(hostId: string): Promise<Property[]> {
    // 1. Hämta fastigheterna (detta funkar nu!)
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (propError) throw propError;
    if (!properties) return [];

    // 2. Hämta alla kopplingar för dessa fastigheter i ett svep
    const propertyIds = properties.map(p => p.id);
    const { data: connections } = await supabase
      .from('property_connections')
      .select(`
        property_id,
        cleaner:profiles (id, full_name, phone, email)
      `)
      .in('property_id', propertyIds);

    // 3. Pussla ihop dem i webbläsaren istället för i databasen
    return properties.map(p => ({
      ...p,
      cleaners: connections
        ?.filter(c => c.property_id === p.id)
        .map(c => c.cleaner) || []
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

    return (properties || []).map(p => {
      const conn = connections.find(c => c.property_id === p.id);
      return {
        ...p,
        host_name: 'Värd', // Förenklat för test
        cleaning_time: conn?.cleaning_time,
        internal_notes: conn?.internal_notes,
      } as Property;
    });
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