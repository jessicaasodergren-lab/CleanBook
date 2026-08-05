// src/services/propertyService.ts
import { supabase, type Property } from '../lib/supabase';

export const propertyService = {
  /**
   * Hämtar alla fastigheter som ägs av den inloggade värden
   */
  async getHostProperties(userId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('host_id', userId)
      .order('name');

    if (error) throw error;
    return (data as Property[]) || [];
  },

  /**
   * Skapar en ny fastighet och genererar inbjudningskod
   */
  async createProperty(payload: {
    hostId: string;
    hostName: string;
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
        host_name: payload.hostName,
        invite_code: inviteCode,
        kvm: payload.kvm || null,
        rooms: payload.rooms || null,
        bathrooms: payload.bathrooms || null,
        property_notes: payload.property_notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Property;
  },

  /**
   * Hämtar städerskans kopplade fastigheter inkl. privata anteckningar & städtid
   */
  async getCleanerProperties(cleanerId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('property_connections')
      .select('cleaning_time, internal_notes, properties(*)')
      .eq('cleaner_id', cleanerId);

    if (error) throw error;

    return (data || [])
      .map((item: any) => {
        if (!item.properties) return null;
        return {
          ...item.properties,
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
      .or(`invite_code.eq.${formattedCode},passcode.eq.${formattedCode}`)
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