// src/services/bookingService.ts
import { supabase, type Booking, type BookingStatus, translateToSpanish } from '../lib/supabase';

export const bookingService = {
  /**
   * Hämtar alla bokningar för fastigheter som ägs av den inloggade värden
   */
  async getHostBookings(hostId: string): Promise<Booking[]> {
    const { data: props, error: propErr } = await supabase
      .from('properties')
      .select('id')
      .eq('host_id', hostId);

    if (propErr) throw propErr;
    if (!props || props.length === 0) return [];

    const propIds = props.map((p) => p.id);

    const { data: bookings, error: bookErr } = await supabase
      .from('bookings')
      .select('*')
      .in('property_id', propIds)
      .order('check_in_date', { ascending: true });

    if (bookErr) throw bookErr;
    return (bookings as Booking[]) || [];
  },

  /**
   * Hämtar alla bokningar för fastigheter som städerskan är kopplad till
   * Inkluderar värdnamn via join
   */
  async getCleanerBookings(cleanerId: string): Promise<Booking[]> {
    const { data: conns } = await supabase
      .from('property_connections')
      .select('property_id')
      .eq('cleaner_id', cleanerId);

    if (!conns || conns.length === 0) return [];

    const propIds = conns.map((c) => c.property_id);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        properties (
          name,
          address,
          profiles (full_name, phone)
        )
      `)
      .in('property_id', propIds)
      .order('check_in_date', { ascending: true });

    if (error) throw error;

    return (data || []).map((b: any) => ({
      ...b,
      host_name: b.properties?.profiles?.full_name || 'Okänd Värd',
      host_phone: b.properties?.profiles?.phone || ''
    }));
  },

  /**
   * Skapar en ny gästbokning
   */
  async createBooking(payload: Omit<Booking, 'id' | 'created_at' | 'status'>): Promise<Booking> {
    let notesEs: string | null = null;
    const cleanNotes = payload.notes?.trim();

    if (cleanNotes) {
      try {
        const safeText = cleanNotes.length > 450 ? cleanNotes.slice(0, 450) : cleanNotes;
        const translated = await translateToSpanish(safeText);
        notesEs = (translated && !translated.toUpperCase().includes('QUERY LENGTH LIMIT')) ? translated : cleanNotes;
      } catch {
        notesEs = cleanNotes;
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...payload,
        notes: cleanNotes || null,
        notes_es: notesEs,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  /**
   * Uppdaterar en hel bokning
   */
  async updateBooking(
    bookingId: string,
    payload: Partial<Omit<Booking, 'id' | 'created_at'>>
  ): Promise<Booking> {
    let notesEs = payload.notes_es;

    if (payload.notes !== undefined) {
      const cleanNotes = payload.notes?.trim();
      if (cleanNotes) {
        try {
          const safeText = cleanNotes.length > 450 ? cleanNotes.slice(0, 450) : cleanNotes;
          const translated = await translateToSpanish(safeText);
          notesEs = (translated && !translated.toUpperCase().includes('QUERY LENGTH LIMIT')) ? translated : cleanNotes;
        } catch {
          notesEs = cleanNotes;
        }
      } else {
        notesEs = null;
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        ...payload,
        ...(payload.notes !== undefined ? { notes_es: notesEs } : {}),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  async updateStatus(bookingId: string, status: BookingStatus): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) throw error;
  },

  async deleteBooking(bookingId: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) throw error;
  },
};